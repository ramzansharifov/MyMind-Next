import type {
  BoardDocument,
  BoardNode,
  BoardSnapshot,
  CreateBoardNodeInput,
  EnsureNoteBoardInput,
  EnsureStudyBoardInput,
  MoveBoardNodeInput,
  StudyBoardBlock,
  UpdateBoardFolderIconInput
} from '@mymind/contracts/boards'
import {
  BOARD_NOTES_SYSTEM_ROOT_ID,
  BOARD_SYSTEM_ROOT_ID,
  isBoardSystemRootId
} from '@mymind/contracts/boards'
import type { NoteDocument } from '@mymind/contracts/notes'
import type { RepositoryRuntime } from '@mymind/contracts/storage'
import type { StudyDocument, StudyFolderIconName } from '@mymind/contracts/study'
import {
  boardDocumentSchema,
  boardNodeSchema,
  boardSnapshotSchema,
  createBoardNodeInputSchema,
  moveBoardNodeInputSchema,
  renameBoardNodeInputSchema,
  updateBoardFolderIconInputSchema
} from '@mymind/core/validation/boards'
import { noteDocumentSchema } from '@mymind/core/validation/notes'
import { studyDocumentSchema } from '@mymind/core/validation/study'

export interface BoardsPersistenceHooks {
  removeStudyBoardBlock?(materialId: string, blockId: string, boardId: string): Promise<void>
  removeNoteBoardBlock?(noteId: string, blockId: string, boardId: string): Promise<void>
}

export interface BoardsRepository {
  listNodes(): BoardNode[]
  createNode(input: CreateBoardNodeInput): BoardNode
  renameNode(id: string, title: string): BoardNode
  updateFolderIcon(input: UpdateBoardFolderIconInput): BoardNode
  deleteNode(id: string): Promise<boolean>
  updateExpansion(id: string, isExpanded: boolean): BoardNode
  moveNode(input: MoveBoardNodeInput): BoardNode[]
  getDocument(nodeId: string): BoardDocument
  saveDocument(nodeId: string, snapshot: BoardSnapshot): BoardDocument
  ensureStudyBoard(input: EnsureStudyBoardInput): BoardNode
  ensureNoteBoard(input: EnsureNoteBoardInput): BoardNode
  cleanupStudyDocument(materialId: string, document: StudyDocument): void
  cleanupNoteDocument(noteId: string, document: NoteDocument): void
}

interface BoardNodeRow {
  id: string
  type: 'folder' | 'board'
  parent_id: string | null
  title: string
  icon: StudyFolderIconName | null
  position: number
  is_expanded: number
  is_system: number
  source_study_node_id: string | null
  source_material_id: string | null
  source_note_id: string | null
  source_block_id: string | null
  created_at: number
  updated_at: number
}

interface BoardDocumentRow {
  node_id: string
  snapshot: string | null
  created_at: number
  updated_at: number
}

interface StudyNodeRow {
  id: string
  type: 'folder' | 'material'
  parent_id: string | null
  title: string
  icon: StudyFolderIconName | null
  position: number
  is_expanded: number
  created_at: number
  updated_at: number
}

interface StudyMaterialRow {
  node_id: string
  document: string
}

interface NoteRow {
  id: string
  title: string
  document: string
}

const NODE_SELECT = `SELECT id, type, parent_id, title, icon, position, is_expanded, is_system,
  source_study_node_id, source_material_id, source_note_id, source_block_id, created_at, updated_at
  FROM board_nodes`
const DOCUMENT_SELECT = 'SELECT node_id, snapshot, created_at, updated_at FROM board_documents'
const STUDY_NODE_SELECT =
  'SELECT id, type, parent_id, title, icon, position, is_expanded, created_at, updated_at FROM study_nodes'

interface SystemRootDefinition {
  id: string
  title: string
  icon: StudyFolderIconName
  position: number
}

const STUDY_ROOT: SystemRootDefinition = {
  id: BOARD_SYSTEM_ROOT_ID,
  title: 'Обучение',
  icon: 'graduation',
  position: 0
}

const NOTES_ROOT: SystemRootDefinition = {
  id: BOARD_NOTES_SYSTEM_ROOT_ID,
  title: 'Заметки',
  icon: 'notes',
  position: 1
}

export function createBoardsRepository(
  runtime: RepositoryRuntime,
  hooks: BoardsPersistenceHooks = {}
): BoardsRepository {
  function mapNode(row: BoardNodeRow): BoardNode {
    return boardNodeSchema.parse({
      id: row.id,
      type: row.type,
      parentId: row.parent_id,
      title: row.title,
      icon: row.icon ?? undefined,
      position: row.position,
      isExpanded: Boolean(row.is_expanded),
      isSystem: Boolean(row.is_system),
      sourceStudyNodeId: row.source_study_node_id ?? undefined,
      sourceMaterialId: row.source_material_id ?? undefined,
      sourceNoteId: row.source_note_id ?? undefined,
      sourceBlockId: row.source_block_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  }

  function parseSnapshot(value: string | null): BoardSnapshot | null {
    if (value === null) return null
    let parsed: unknown
    try {
      parsed = JSON.parse(value)
    } catch {
      throw new Error('Снимок доски повреждён')
    }
    return boardSnapshotSchema.parse(parsed)
  }

  function mapDocument(row: BoardDocumentRow): BoardDocument {
    return boardDocumentSchema.parse({
      nodeId: row.node_id,
      snapshot: parseSnapshot(row.snapshot),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  }

  function listRows(): BoardNodeRow[] {
    return runtime
      .database()
      .prepare(`${NODE_SELECT} ORDER BY parent_id ASC, position ASC, title ASC`)
      .all() as BoardNodeRow[]
  }

  function findRow(id: string): BoardNodeRow | null {
    const row = runtime.database().prepare(`${NODE_SELECT} WHERE id = ?`).get(id) as
      BoardNodeRow | undefined
    return row ?? null
  }

  function getNextPosition(parentId: string | null): number {
    const row = (
      parentId === null
        ? runtime
            .database()
            .prepare('SELECT MAX(position) AS maximum FROM board_nodes WHERE parent_id IS NULL')
            .get()
        : runtime
            .database()
            .prepare('SELECT MAX(position) AS maximum FROM board_nodes WHERE parent_id = ?')
            .get(parentId)
    ) as { maximum: number | null } | undefined
    return (row?.maximum ?? -1) + 1
  }

  function assertFolder(parentId: string | null): void {
    if (parentId === null) return
    const parent = findRow(parentId)
    if (!parent || parent.type !== 'folder') throw new Error('Целевая папка досок не найдена')
  }

  function ensureSystemRoot(definition: SystemRootDefinition): BoardNode {
    const database = runtime.database()
    const now = runtime.now()
    const existing = findRow(definition.id)
    if (!existing) {
      database
        .prepare(
          `INSERT INTO board_nodes(
            id, type, parent_id, title, icon, position, is_expanded, is_system,
            source_study_node_id, source_material_id, source_note_id, source_block_id,
            created_at, updated_at
          ) VALUES (?, 'folder', NULL, ?, ?, ?, 1, 1, NULL, NULL, NULL, NULL, ?, ?)`
        )
        .run(definition.id, definition.title, definition.icon, definition.position, now, now)
    } else if (
      existing.type !== 'folder' ||
      existing.parent_id !== null ||
      existing.title !== definition.title ||
      existing.icon !== definition.icon ||
      existing.position !== definition.position ||
      !existing.is_system
    ) {
      database
        .prepare(
          `UPDATE board_nodes
           SET type = 'folder', parent_id = NULL, title = ?, icon = ?, position = ?, is_system = 1, updated_at = ?
           WHERE id = ?`
        )
        .run(definition.title, definition.icon, definition.position, now, definition.id)
    }
    const root = findRow(definition.id)
    if (!root) throw new Error(`Не удалось создать системную папку досок «${definition.title}»`)
    return mapNode(root)
  }

  function ensureRoots(): void {
    ensureSystemRoot(STUDY_ROOT)
    ensureSystemRoot(NOTES_ROOT)
  }

  function isManagedAnchor(row: BoardNodeRow): boolean {
    return Boolean(
      isBoardSystemRootId(row.id) ||
      row.source_study_node_id ||
      row.source_material_id ||
      row.source_note_id ||
      row.source_block_id
    )
  }

  function managedIds(rows: BoardNodeRow[]): Set<string> {
    const byId = new Map(rows.map((row) => [row.id, row]))
    const managed = new Set<string>()
    for (const row of rows) {
      const visited = new Set<string>()
      let current: BoardNodeRow | undefined = row
      while (current && !visited.has(current.id)) {
        visited.add(current.id)
        if (isManagedAnchor(current)) {
          managed.add(row.id)
          break
        }
        current = current.parent_id ? byId.get(current.parent_id) : undefined
      }
    }
    for (const id of [...managed]) {
      const visited = new Set<string>()
      let current = byId.get(id)
      while (current?.parent_id && !visited.has(current.parent_id)) {
        visited.add(current.parent_id)
        managed.add(current.parent_id)
        current = byId.get(current.parent_id)
      }
    }
    return managed
  }

  function studyRows(): StudyNodeRow[] {
    return runtime.database().prepare(STUDY_NODE_SELECT).all() as StudyNodeRow[]
  }

  function studyAncestorFolders(materialId: string): StudyNodeRow[] {
    const rows = studyRows()
    const byId = new Map(rows.map((row) => [row.id, row]))
    const material = byId.get(materialId)
    const folders: StudyNodeRow[] = []
    const visited = new Set<string>()
    let parentId = material?.parent_id ?? null
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId)
      const parent = byId.get(parentId)
      if (!parent) break
      if (parent.type === 'folder') folders.unshift(parent)
      parentId = parent.parent_id
    }
    return folders
  }

  function ensureLinkedStudyFolder(source: StudyNodeRow, parentId: string): BoardNodeRow {
    const database = runtime.database()
    const existing = database
      .prepare(`${NODE_SELECT} WHERE source_study_node_id = ?`)
      .get(source.id) as BoardNodeRow | undefined
    const icon = source.icon ?? 'folder'
    const now = runtime.now()
    if (existing) {
      if (
        existing.parent_id !== parentId ||
        existing.title !== source.title ||
        existing.icon !== icon
      ) {
        database
          .prepare(
            'UPDATE board_nodes SET parent_id = ?, title = ?, icon = ?, updated_at = ? WHERE id = ?'
          )
          .run(parentId, source.title, icon, now, existing.id)
        const updated = findRow(existing.id)
        if (updated) return updated
      }
      return existing
    }
    const id = runtime.createId()
    database
      .prepare(
        `INSERT INTO board_nodes(
          id, type, parent_id, title, icon, position, is_expanded, is_system,
          source_study_node_id, source_material_id, source_note_id, source_block_id,
          created_at, updated_at
        ) VALUES (?, 'folder', ?, ?, ?, ?, 1, 0, ?, NULL, NULL, NULL, ?, ?)`
      )
      .run(id, parentId, source.title, icon, getNextPosition(parentId), source.id, now, now)
    const created = findRow(id)
    if (!created) throw new Error('Не удалось создать папку связанной доски')
    return created
  }

  function synchronizeLinkedStudyFolders(): void {
    const linkedFolders = listRows().filter((row) => Boolean(row.source_study_node_id))
    if (linkedFolders.length === 0) return
    const sources = studyRows()
    const sourcesById = new Map(sources.map((row) => [row.id, row]))
    for (const linked of linkedFolders) {
      if (!linked.source_study_node_id) continue
      const source = sourcesById.get(linked.source_study_node_id)
      if (!source || source.type !== 'folder') continue
      let parentId = BOARD_SYSTEM_ROOT_ID
      const ancestors = studyAncestorFolders(source.id)
      for (const ancestor of ancestors) parentId = ensureLinkedStudyFolder(ancestor, parentId).id
      ensureLinkedStudyFolder(source, parentId)
    }
  }

  function listNodes(): BoardNode[] {
    ensureRoots()
    synchronizeLinkedStudyFolders()
    return listRows().map(mapNode)
  }

  function createNode(input: CreateBoardNodeInput): BoardNode {
    const valid = createBoardNodeInputSchema.parse(input)
    ensureRoots()
    assertFolder(valid.parentId)
    const rows = listRows()
    if (valid.parentId && managedIds(rows).has(valid.parentId))
      throw new Error('В управляемых разделах нельзя создавать папки или доски вручную')
    const database = runtime.database()
    const id = runtime.createId()
    const now = runtime.now()
    const title = valid.title?.trim() || (valid.type === 'folder' ? 'Новая папка' : 'Новая доска')
    database.transaction(() => {
      database
        .prepare(
          `INSERT INTO board_nodes(
            id, type, parent_id, title, icon, position, is_expanded, is_system,
            source_study_node_id, source_material_id, source_note_id, source_block_id,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 1, 0, NULL, NULL, NULL, NULL, ?, ?)`
        )
        .run(
          id,
          valid.type,
          valid.parentId,
          title,
          valid.type === 'folder' ? (valid.icon ?? 'folder') : null,
          getNextPosition(valid.parentId),
          now,
          now
        )
      if (valid.type === 'board')
        database
          .prepare(
            'INSERT INTO board_documents(node_id, snapshot, created_at, updated_at) VALUES (?, NULL, ?, ?)'
          )
          .run(id, now, now)
      if (valid.parentId)
        database
          .prepare('UPDATE board_nodes SET is_expanded = 1, updated_at = ? WHERE id = ?')
          .run(now, valid.parentId)
    })()
    const created = findRow(id)
    if (!created) throw new Error('Не удалось создать элемент досок')
    return mapNode(created)
  }

  function renameNode(id: string, title: string): BoardNode {
    const valid = renameBoardNodeInputSchema.parse({ id, title })
    const existing = findRow(valid.id)
    if (!existing) throw new Error('Элемент досок не найден')
    if (existing.type === 'folder' && managedIds(listRows()).has(existing.id))
      throw new Error('Управляемую папку нельзя переименовать')
    const now = runtime.now()
    runtime
      .database()
      .prepare('UPDATE board_nodes SET title = ?, updated_at = ? WHERE id = ?')
      .run(valid.title, now, valid.id)
    const updated = findRow(valid.id)
    if (!updated) throw new Error('Элемент досок не найден')
    return mapNode(updated)
  }

  function updateFolderIcon(input: UpdateBoardFolderIconInput): BoardNode {
    const valid = updateBoardFolderIconInputSchema.parse(input)
    const existing = findRow(valid.id)
    if (!existing || existing.type !== 'folder') throw new Error('Папка досок не найдена')
    if (existing.is_system || existing.source_study_node_id)
      throw new Error('Иконка этой папки управляется исходным модулем')
    const now = runtime.now()
    runtime
      .database()
      .prepare('UPDATE board_nodes SET icon = ?, updated_at = ? WHERE id = ?')
      .run(valid.icon, now, valid.id)
    const updated = findRow(valid.id)
    if (!updated) throw new Error('Папка досок не найдена')
    return mapNode(updated)
  }

  function updateExpansion(id: string, isExpanded: boolean): BoardNode {
    const existing = findRow(id)
    if (!existing || existing.type !== 'folder') throw new Error('Папка досок не найдена')
    const now = runtime.now()
    runtime
      .database()
      .prepare('UPDATE board_nodes SET is_expanded = ?, updated_at = ? WHERE id = ?')
      .run(isExpanded ? 1 : 0, now, id)
    const updated = findRow(id)
    if (!updated) throw new Error('Папка досок не найдена')
    return mapNode(updated)
  }

  function subtreeIds(rootId: string): Set<string> {
    const rows = listRows()
    const included = new Set<string>([rootId])
    let changed = true
    while (changed) {
      changed = false
      for (const row of rows) {
        if (row.parent_id && included.has(row.parent_id) && !included.has(row.id)) {
          included.add(row.id)
          changed = true
        }
      }
    }
    return included
  }

  function containsLinkedStudyBoard(folderId: string): boolean {
    const included = subtreeIds(folderId)
    return listRows().some(
      (row) =>
        included.has(row.id) &&
        row.type === 'board' &&
        Boolean(row.source_material_id && row.source_block_id)
    )
  }

  function pruneLinkedStudyFolders(startParentId: string | null): void {
    const database = runtime.database()
    const visited = new Set<string>()
    let folderId = startParentId
    while (folderId && folderId !== BOARD_SYSTEM_ROOT_ID && !visited.has(folderId)) {
      visited.add(folderId)
      const folder = findRow(folderId)
      if (!folder || folder.type !== 'folder' || !folder.source_study_node_id) return
      const child = database
        .prepare('SELECT id FROM board_nodes WHERE parent_id = ? LIMIT 1')
        .get(folder.id)
      if (child) return
      database.prepare('DELETE FROM board_nodes WHERE id = ?').run(folder.id)
      folderId = folder.parent_id
    }
  }

  function deleteRowAndPrune(id: string, parentId: string | null): boolean {
    const deleted =
      runtime.database().prepare('DELETE FROM board_nodes WHERE id = ?').run(id).changes > 0
    if (deleted) pruneLinkedStudyFolders(parentId)
    return deleted
  }

  async function deleteNode(id: string): Promise<boolean> {
    if (isBoardSystemRootId(id)) throw new Error('Системную папку нельзя удалить')
    const existing = findRow(id)
    if (!existing) return false
    if (existing.type === 'folder') {
      if (existing.source_study_node_id || containsLinkedStudyBoard(existing.id))
        throw new Error(
          'Папки раздела «Обучение» удаляются автоматически после удаления последней связанной доски'
        )
      return deleteRowAndPrune(existing.id, existing.parent_id)
    }
    if (existing.source_material_id && existing.source_block_id) {
      if (!hooks.removeStudyBoardBlock)
        throw new Error('Удаление связанной доски обучения не настроено для этой платформы')
      await hooks.removeStudyBoardBlock(
        existing.source_material_id,
        existing.source_block_id,
        existing.id
      )
      return deleteRowAndPrune(existing.id, existing.parent_id)
    }
    if (existing.source_note_id && existing.source_block_id) {
      if (!hooks.removeNoteBoardBlock)
        throw new Error('Удаление связанной доски заметки не настроено для этой платформы')
      await hooks.removeNoteBoardBlock(
        existing.source_note_id,
        existing.source_block_id,
        existing.id
      )
      return deleteRowAndPrune(existing.id, existing.parent_id)
    }
    return deleteRowAndPrune(existing.id, existing.parent_id)
  }

  function moveNode(input: MoveBoardNodeInput): BoardNode[] {
    const valid = moveBoardNodeInputSchema.parse(input)
    ensureRoots()
    const rows = listRows()
    const source = rows.find((row) => row.id === valid.id)
    if (!source) throw new Error('Элемент досок не найден')
    const protectedIds = managedIds(rows)
    if (protectedIds.has(source.id))
      throw new Error('Папки и доски управляемых разделов нельзя перемещать')
    if (valid.parentId && protectedIds.has(valid.parentId))
      throw new Error('Нельзя перемещать элементы внутрь управляемого раздела')
    assertFolder(valid.parentId)
    if (source.id === valid.parentId)
      throw new Error('Элемент нельзя переместить внутрь самого себя')
    const byId = new Map(rows.map((row) => [row.id, row]))
    if (source.type === 'folder' && valid.parentId) {
      let ancestor = byId.get(valid.parentId)
      while (ancestor) {
        if (ancestor.id === source.id)
          throw new Error('Папку нельзя переместить в собственную вложенную папку')
        ancestor = ancestor.parent_id ? byId.get(ancestor.parent_id) : undefined
      }
    }
    const sourceSiblings = rows
      .filter((row) => row.parent_id === source.parent_id && row.id !== source.id)
      .sort((a, b) => a.position - b.position)
    const targetSiblings = rows
      .filter((row) => row.parent_id === valid.parentId && row.id !== source.id)
      .sort((a, b) => a.position - b.position)
    const targetPosition = Math.max(0, Math.min(valid.position, targetSiblings.length))
    const now = runtime.now()
    const database = runtime.database()
    database.transaction(() => {
      if (source.parent_id !== valid.parentId) {
        sourceSiblings.forEach((row, position) => {
          database
            .prepare('UPDATE board_nodes SET position = ?, updated_at = ? WHERE id = ?')
            .run(position, now, row.id)
        })
      }
      const arranged = [...targetSiblings]
      arranged.splice(targetPosition, 0, source)
      arranged.forEach((row, position) => {
        database
          .prepare(
            'UPDATE board_nodes SET parent_id = ?, position = ?, updated_at = ? WHERE id = ?'
          )
          .run(valid.parentId, position, now, row.id)
      })
      if (valid.parentId)
        database
          .prepare('UPDATE board_nodes SET is_expanded = 1, updated_at = ? WHERE id = ?')
          .run(now, valid.parentId)
    })()
    return listNodes()
  }

  function getDocument(nodeId: string): BoardDocument {
    const node = findRow(nodeId)
    if (!node || node.type !== 'board') throw new Error('Доска не найдена')
    const database = runtime.database()
    let row = database.prepare(`${DOCUMENT_SELECT} WHERE node_id = ?`).get(nodeId) as
      BoardDocumentRow | undefined
    if (!row) {
      const now = runtime.now()
      database
        .prepare(
          'INSERT INTO board_documents(node_id, snapshot, created_at, updated_at) VALUES (?, NULL, ?, ?)'
        )
        .run(nodeId, now, now)
      row = database.prepare(`${DOCUMENT_SELECT} WHERE node_id = ?`).get(nodeId) as
        BoardDocumentRow | undefined
    }
    if (!row) throw new Error('Не удалось создать документ доски')
    return mapDocument(row)
  }

  function saveDocument(nodeId: string, snapshot: BoardSnapshot): BoardDocument {
    const validSnapshot = boardSnapshotSchema.parse(snapshot)
    const node = findRow(nodeId)
    if (!node || node.type !== 'board') throw new Error('Доска не найдена')
    const database = runtime.database()
    const existing = database.prepare(`${DOCUMENT_SELECT} WHERE node_id = ?`).get(nodeId) as
      BoardDocumentRow | undefined
    const now = runtime.now()
    database.transaction(() => {
      if (existing)
        database
          .prepare('UPDATE board_documents SET snapshot = ?, updated_at = ? WHERE node_id = ?')
          .run(JSON.stringify(validSnapshot), now, nodeId)
      else
        database
          .prepare(
            'INSERT INTO board_documents(node_id, snapshot, created_at, updated_at) VALUES (?, ?, ?, ?)'
          )
          .run(nodeId, JSON.stringify(validSnapshot), now, now)
      database.prepare('UPDATE board_nodes SET updated_at = ? WHERE id = ?').run(now, nodeId)
    })()
    const saved = database.prepare(`${DOCUMENT_SELECT} WHERE node_id = ?`).get(nodeId) as
      BoardDocumentRow | undefined
    if (!saved) throw new Error('Не удалось сохранить доску')
    return mapDocument(saved)
  }

  function parseStudyMaterial(row: StudyMaterialRow): StudyDocument {
    let parsed: unknown
    try {
      parsed = JSON.parse(row.document)
    } catch {
      throw new Error('Содержимое материала повреждено')
    }
    return studyDocumentSchema.parse(parsed)
  }

  function parseNote(row: NoteRow): NoteDocument {
    let parsed: unknown
    try {
      parsed = JSON.parse(row.document)
    } catch {
      throw new Error('Содержимое заметки повреждено')
    }
    return noteDocumentSchema.parse(parsed)
  }

  function ensureStudyBoard(input: EnsureStudyBoardInput): BoardNode {
    const database = runtime.database()
    const existing = database
      .prepare(`${NODE_SELECT} WHERE source_material_id = ? AND source_block_id = ?`)
      .get(input.materialId, input.blockId) as BoardNodeRow | undefined
    if (existing) return mapNode(existing)
    const materialNode = database
      .prepare(`${STUDY_NODE_SELECT} WHERE id = ?`)
      .get(input.materialId) as StudyNodeRow | undefined
    const material = database
      .prepare('SELECT node_id, document FROM study_materials WHERE node_id = ?')
      .get(input.materialId) as StudyMaterialRow | undefined
    if (!materialNode || materialNode.type !== 'material' || !material)
      throw new Error('Материал для связанной доски не найден')
    const document = parseStudyMaterial(material)
    const boardBlock = document.blocks.find(
      (block): block is StudyBoardBlock => block.type === 'board' && block.id === input.blockId
    )
    if (!boardBlock) throw new Error('Блок доски не найден в материале')
    const root = ensureSystemRoot(STUDY_ROOT)
    let parentId = root.id
    for (const sourceFolder of studyAncestorFolders(input.materialId))
      parentId = ensureLinkedStudyFolder(sourceFolder, parentId).id
    const now = runtime.now()
    const id = runtime.createId()
    database.transaction(() => {
      database
        .prepare(
          `INSERT INTO board_nodes(
            id, type, parent_id, title, icon, position, is_expanded, is_system,
            source_study_node_id, source_material_id, source_note_id, source_block_id,
            created_at, updated_at
          ) VALUES (?, 'board', ?, ?, NULL, ?, 1, 0, NULL, ?, NULL, ?, ?, ?)`
        )
        .run(
          id,
          parentId,
          `${materialNode.title} — доска`,
          getNextPosition(parentId),
          input.materialId,
          input.blockId,
          now,
          now
        )
      database
        .prepare(
          'INSERT INTO board_documents(node_id, snapshot, created_at, updated_at) VALUES (?, NULL, ?, ?)'
        )
        .run(id, now, now)
    })()
    const created = findRow(id)
    if (!created) throw new Error('Не удалось создать связанную доску')
    return mapNode(created)
  }

  function ensureNoteBoard(input: EnsureNoteBoardInput): BoardNode {
    const database = runtime.database()
    const existing = database
      .prepare(`${NODE_SELECT} WHERE source_note_id = ? AND source_block_id = ?`)
      .get(input.noteId, input.blockId) as BoardNodeRow | undefined
    if (existing) return mapNode(existing)
    const note = database
      .prepare('SELECT id, title, document FROM notes WHERE id = ?')
      .get(input.noteId) as NoteRow | undefined
    if (!note) throw new Error('Заметка для связанной доски не найдена')
    const document = parseNote(note)
    const boardBlock = document.blocks.find(
      (block): block is StudyBoardBlock => block.type === 'board' && block.id === input.blockId
    )
    if (!boardBlock) throw new Error('Блок доски не найден в заметке')
    const root = ensureSystemRoot(NOTES_ROOT)
    const now = runtime.now()
    const id = runtime.createId()
    database.transaction(() => {
      database
        .prepare(
          `INSERT INTO board_nodes(
            id, type, parent_id, title, icon, position, is_expanded, is_system,
            source_study_node_id, source_material_id, source_note_id, source_block_id,
            created_at, updated_at
          ) VALUES (?, 'board', ?, ?, NULL, ?, 1, 0, NULL, NULL, ?, ?, ?, ?)`
        )
        .run(
          id,
          root.id,
          `${note.title} — доска`,
          getNextPosition(root.id),
          input.noteId,
          input.blockId,
          now,
          now
        )
      database
        .prepare(
          'INSERT INTO board_documents(node_id, snapshot, created_at, updated_at) VALUES (?, NULL, ?, ?)'
        )
        .run(id, now, now)
    })()
    const created = findRow(id)
    if (!created) throw new Error('Не удалось создать связанную доску заметки')
    return mapNode(created)
  }

  function cleanupStudyDocument(materialId: string, document: StudyDocument): void {
    const retained = new Set(
      document.blocks.filter((block) => block.type === 'board').map((block) => block.id)
    )
    const linked = runtime
      .database()
      .prepare(`${NODE_SELECT} WHERE source_material_id = ?`)
      .all(materialId) as BoardNodeRow[]
    const parents: Array<string | null> = []
    for (const board of linked) {
      if (!board.source_block_id || retained.has(board.source_block_id)) continue
      const deleted = runtime
        .database()
        .prepare('DELETE FROM board_nodes WHERE id = ?')
        .run(board.id)
      if (deleted.changes > 0) parents.push(board.parent_id)
    }
    for (const parentId of parents) pruneLinkedStudyFolders(parentId)
  }

  function cleanupNoteDocument(noteId: string, document: NoteDocument): void {
    const retained = new Set(
      document.blocks.filter((block) => block.type === 'board').map((block) => block.id)
    )
    const linked = runtime
      .database()
      .prepare(`${NODE_SELECT} WHERE source_note_id = ?`)
      .all(noteId) as BoardNodeRow[]
    for (const board of linked) {
      if (!board.source_block_id || retained.has(board.source_block_id)) continue
      runtime.database().prepare('DELETE FROM board_nodes WHERE id = ?').run(board.id)
    }
  }

  return {
    listNodes,
    createNode,
    renameNode,
    updateFolderIcon,
    deleteNode,
    updateExpansion,
    moveNode,
    getDocument,
    saveDocument,
    ensureStudyBoard,
    ensureNoteBoard,
    cleanupStudyDocument,
    cleanupNoteDocument
  }
}
