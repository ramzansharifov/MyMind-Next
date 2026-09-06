import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import type { RepositoryRuntime, SqlDatabasePort } from '@mymind/contracts/storage'
import { BOARD_NOTES_SYSTEM_ROOT_ID, BOARD_SYSTEM_ROOT_ID } from '@mymind/contracts/boards'
import { mobileSchemaV1 } from './mobile-schema'
import { mobileSchemaV2 } from './mobile-schema-v2'
import { mobileSchemaV3 } from './mobile-schema-v3'
import { mobileSchemaV4 } from './mobile-schema-v4'
import { createBoardsRepository, type BoardsRepository } from './boards'
import { createNotesRepository } from './notes'
import { createStudyRepository } from './study'

const databases: Database.Database[] = []

function setup(): {
  db: Database.Database
  runtime: RepositoryRuntime
} {
  const db = new Database(':memory:')
  databases.push(db)
  db.pragma('foreign_keys = ON')
  for (const schema of [mobileSchemaV1, mobileSchemaV2, mobileSchemaV3, mobileSchemaV4])
    for (const sql of schema) db.exec(sql)
  let id = 0
  let now = 1_000
  return {
    db,
    runtime: {
      database: () => db as unknown as SqlDatabasePort,
      createId: () => `id-${++id}`,
      now: () => ++now
    }
  }
}

afterEach(() => {
  for (const db of databases.splice(0)) db.close()
})

describe('shared Boards persistence', () => {
  it('creates protected system roots while allowing ordinary board trees to move', () => {
    const { runtime } = setup()
    const boards = createBoardsRepository(runtime)
    const folder = boards.createNode({ type: 'folder', parentId: null, title: 'Проект' })
    const board = boards.createNode({ type: 'board', parentId: null, title: 'Идеи' })

    expect(boards.listNodes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: BOARD_SYSTEM_ROOT_ID, title: 'Обучение', isSystem: true }),
        expect.objectContaining({ id: BOARD_NOTES_SYSTEM_ROOT_ID, title: 'Заметки', isSystem: true })
      ])
    )
    expect(boards.moveNode({ id: board.id, parentId: folder.id, position: 0 })).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: board.id, parentId: folder.id })])
    )
    expect(() => boards.moveNode({ id: board.id, parentId: BOARD_SYSTEM_ROOT_ID, position: 0 })).toThrow(
      'управляемого раздела'
    )
    expect(() => boards.renameNode(BOARD_SYSTEM_ROOT_ID, 'Другое')).toThrow('Системную папку')
  })

  it('round-trips an opaque tldraw-compatible snapshot without changing its shape', () => {
    const { runtime } = setup()
    const boards = createBoardsRepository(runtime)
    const board = boards.createNode({ type: 'board', parentId: null, title: 'Canvas' })
    const snapshot = {
      document: {
        store: {
          'document:document': {
            id: 'document:document',
            typeName: 'document',
            name: 'Canvas'
          }
        },
        schema: { schemaVersion: 2, sequences: {} }
      },
      session: { currentPageId: 'page:page' }
    }

    expect(boards.getDocument(board.id).snapshot).toBeNull()
    expect(boards.saveDocument(board.id, snapshot).snapshot).toEqual(snapshot)
    expect(boards.getDocument(board.id).snapshot).toEqual(snapshot)
  })

  it('mirrors Study folder ancestry and removes a linked board through the Study save queue', async () => {
    const { runtime } = setup()
    let boards: BoardsRepository
    const study = createStudyRepository(runtime, {
      afterDocumentSaved: (materialId, document) => boards.cleanupStudyDocument(materialId, document)
    })
    boards = createBoardsRepository(runtime, {
      removeStudyBoardBlock: async (materialId, blockId) => {
        const current = study.getMaterial(materialId)
        await study.saveMaterial({
          nodeId: materialId,
          document: {
            ...current.document,
            blocks: current.document.blocks.filter((block) => block.id !== blockId)
          }
        })
      }
    })
    const course = study.createNode({ type: 'folder', parentId: null, title: 'Курс', icon: 'book' })
    const chapter = study.createNode({
      type: 'folder',
      parentId: course.id,
      title: 'Глава',
      icon: 'science'
    })
    const material = study.createNode({
      type: 'material',
      parentId: chapter.id,
      title: 'Материал'
    })
    await study.saveMaterial({
      nodeId: material.id,
      document: {
        version: 1,
        blocks: [{ id: 'board-block', type: 'board', title: 'Схема' }]
      }
    })

    const linked = boards.ensureStudyBoard({ materialId: material.id, blockId: 'board-block' })
    const nodes = boards.listNodes()
    const linkedChapter = nodes.find((node) => node.sourceStudyNodeId === chapter.id)
    const linkedCourse = nodes.find((node) => node.sourceStudyNodeId === course.id)
    expect(linked).toMatchObject({
      type: 'board',
      sourceMaterialId: material.id,
      sourceBlockId: 'board-block'
    })
    expect(linkedChapter).toMatchObject({ title: 'Глава', icon: 'science' })
    expect(linkedCourse).toMatchObject({ title: 'Курс', icon: 'book', parentId: BOARD_SYSTEM_ROOT_ID })
    expect(linkedChapter?.parentId).toBe(linkedCourse?.id)

    await expect(boards.deleteNode(linked.id)).resolves.toBe(true)
    expect(study.getMaterial(material.id).document.blocks).toEqual([])
    expect(boards.listNodes().some((node) => node.id === linked.id)).toBe(false)
  })

  it('links Note board blocks and cleans them when the source document changes', async () => {
    const { runtime } = setup()
    let boards: BoardsRepository
    const notes = createNotesRepository(runtime, {
      afterDocumentSaved: (noteId, document) => boards.cleanupNoteDocument(noteId, document)
    })
    boards = createBoardsRepository(runtime, {
      removeNoteBoardBlock: async (noteId, blockId) => {
        const note = notes.getNote(noteId)
        await notes.saveNote({
          id: noteId,
          document: {
            ...note.document,
            blocks: note.document.blocks.filter((block) => block.id !== blockId)
          }
        })
      }
    })
    const note = notes.createNote({ groupId: null, title: 'Идеи' })
    await notes.saveNote({
      id: note.id,
      document: { version: 1, blocks: [{ id: 'note-board', type: 'board', title: 'Карта' }] }
    })

    const linked = boards.ensureNoteBoard({ noteId: note.id, blockId: 'note-board' })
    expect(linked).toMatchObject({
      parentId: BOARD_NOTES_SYSTEM_ROOT_ID,
      sourceNoteId: note.id,
      sourceBlockId: 'note-board'
    })

    await notes.saveNote({ id: note.id, document: { version: 1, blocks: [] } })
    expect(boards.listNodes().some((node) => node.id === linked.id)).toBe(false)
  })
})
