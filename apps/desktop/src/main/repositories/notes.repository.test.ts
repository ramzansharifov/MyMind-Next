import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { BOARD_NOTES_SYSTEM_ROOT_ID } from '../../shared/contracts/boards'
import type { NoteDocument } from '../../shared/contracts/notes'
import { closeDatabase, getDatabase, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import { noteGroups, notes } from '../database/schema'
import { setStudyAssetsRootForTesting } from '../services/study-assets'
import { deleteBoardNode, ensureNoteBoard, listBoardNodes } from './boards.repository'
import {
  createNote,
  createNoteGroup,
  deleteNote,
  deleteNoteGroup,
  getNote,
  listNotesOverview,
  moveNote,
  renameNote,
  saveNote,
  updateNoteGroupIcon
} from './notes.repository'

let testRoot = ''
let assetsRoot = ''

beforeAll(async () => {
  testRoot = await mkdtemp(join(tmpdir(), 'mymind-notes-'))
  assetsRoot = join(testRoot, 'attachments')
  await mkdir(assetsRoot, { recursive: true })
  initializeDatabaseForTesting(join(testRoot, 'notes.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
  setStudyAssetsRootForTesting(assetsRoot)
})

beforeEach(() => {
  const database = getDatabase()
  database.delete(notes).run()
  database.delete(noteGroups).run()
})

afterAll(async () => {
  setStudyAssetsRootForTesting(null)
  closeDatabase()
  await rm(testRoot, { recursive: true, force: true })
})

describe('notes repository', () => {
  it('creates groups and notes and moves notes between groups', () => {
    const first = createNoteGroup('Работа')
    const second = createNoteGroup('Личное')

    expect(first.icon).toBe('folder')
    expect(updateNoteGroupIcon(first.id, 'science').icon).toBe('science')
    const note = createNote({ groupId: first.id, title: 'План' })

    expect(note.groupId).toBe(first.id)
    expect(note.document.blocks[0]?.type).toBe('text')

    const moved = moveNote(note.id, second.id)
    expect(moved.groupId).toBe(second.id)

    const renamed = renameNote(note.id, 'Новый план')
    expect(renamed.title).toBe('Новый план')
  })

  it('moves notes to the ungrouped section when a group is deleted', () => {
    const group = createNoteGroup('Временная')
    const note = createNote({ groupId: group.id, title: 'Не потерять' })

    expect(deleteNoteGroup(group.id)).toBe(true)
    expect(getNote(note.id).groupId).toBeNull()
    expect(listNotesOverview().groups).toEqual([])
  })

  it('persists a simple note document and derived plain text', async () => {
    const note = createNote({ groupId: null, title: 'Текст' })
    const document: NoteDocument = {
      version: 1,
      blocks: [
        { id: 'text-one', type: 'text', text: 'Содержимое заметки' },
        { id: 'divider-one', type: 'divider' }
      ]
    }

    const saved = await saveNote({ id: note.id, document })

    expect(saved.document).toEqual(document)
    expect(saved.plainText).toContain('Содержимое заметки')
    expect(getNote(note.id).document).toEqual(document)
  })

  it('creates note boards in the protected Notes folder and keeps both sides synchronized', async () => {
    const note = createNote({ groupId: null, title: 'Идеи' })
    const boardDocument: NoteDocument = {
      version: 1,
      blocks: [{ id: 'board-one', type: 'board' }]
    }

    await saveNote({ id: note.id, document: boardDocument })
    const board = ensureNoteBoard({ noteId: note.id, blockId: 'board-one' })

    expect(board).toMatchObject({
      parentId: BOARD_NOTES_SYSTEM_ROOT_ID,
      sourceNoteId: note.id,
      sourceBlockId: 'board-one',
      title: 'Идеи — доска'
    })
    expect(listBoardNodes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: BOARD_NOTES_SYSTEM_ROOT_ID,
          title: 'Заметки',
          isSystem: true
        })
      ])
    )

    await saveNote({
      id: note.id,
      document: { version: 1, blocks: [{ id: 'text-one', type: 'text', text: 'Готово' }] }
    })
    expect(listBoardNodes().some((node) => node.id === board.id)).toBe(false)

    await saveNote({ id: note.id, document: boardDocument })
    const recreated = ensureNoteBoard({ noteId: note.id, blockId: 'board-one' })
    await expect(deleteBoardNode(recreated.id)).resolves.toBe(true)
    expect(getNote(note.id).document.blocks).toEqual([])
  })

  it('validates and removes local assets with the note', async () => {
    const note = createNote({ groupId: null, title: 'Фото' })
    const assetId = '11111111-1111-4111-8111-111111111111'
    const assetDirectory = join(assetsRoot, note.id, assetId)
    await mkdir(assetDirectory, { recursive: true })
    await writeFile(join(assetDirectory, 'photo.png'), 'image')

    await saveNote({
      id: note.id,
      document: {
        version: 1,
        blocks: [
          {
            id: 'image-one',
            type: 'image',
            source: {
              type: 'local',
              asset: {
                id: assetId,
                materialId: note.id,
                name: 'photo.png',
                mimeType: 'image/png',
                size: 5,
                url: `mymind-asset://local/${note.id}/${assetId}/photo.png`
              }
            }
          }
        ]
      }
    })

    await expect(deleteNote(note.id)).resolves.toBe(true)
    await expect(access(assetDirectory)).rejects.toThrow()
  })
})
