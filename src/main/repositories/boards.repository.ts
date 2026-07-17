import { and, asc, eq, isNull } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

import {
  BOARD_SYSTEM_ROOT_ID,
  type BoardDocument,
  type BoardNode,
  type BoardSnapshot,
  type CreateBoardNodeInput,
  type EnsureStudyBoardInput,
  type MoveBoardNodeInput,
  type StudyBoardBlock
} from '../../shared/contracts/boards'
import type { StudyDocument } from '../../shared/contracts/study'
import { boardDocumentSchema, boardNodeSchema } from '../../shared/validation/boards'
import { studyDocumentSchema } from '../../shared/validation/study'
import { getDatabase } from '../database/client'
import { boardDocuments, boardNodes, studyMaterials, studyNodes } from '../database/schema'

function mapBoardNode(row: typeof boardNodes.$inferSelect): BoardNode {
  return boardNodeSchema.parse({
    ...row,
    sourceStudyNodeId: row.sourceStudyNodeId ?? undefined,
    sourceMaterialId: row.sourceMaterialId ?? undefined,
    sourceBlockId: row.sourceBlockId ?? undefined,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime()
  })
}

function mapBoardDocument(row: typeof boardDocuments.$inferSelect): BoardDocument {
  return boardDocumentSchema.parse({
    nodeId: row.nodeId,
    snapshot: row.snapshot ?? null,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime()
  })
}

function getNextBoardPosition(parentId: string | null): number {
  const database = getDatabase()
  const siblings = database
    .select({ position: boardNodes.position })
    .from(boardNodes)
    .where(parentId === null ? isNull(boardNodes.parentId) : eq(boardNodes.parentId, parentId))
    .all()

  return siblings.reduce((maximum, sibling) => Math.max(maximum, sibling.position), -1) + 1
}

function assertBoardFolder(parentId: string | null): void {
  if (parentId === null) {
    return
  }

  const parent = getDatabase().select().from(boardNodes).where(eq(boardNodes.id, parentId)).get()

  if (!parent || parent.type !== 'folder') {
    throw new Error('Целевая папка досок не найдена')
  }
}

export function ensureBoardsSystemRoot(): BoardNode {
  const database = getDatabase()
  const now = new Date()
  const existing = database
    .select()
    .from(boardNodes)
    .where(eq(boardNodes.id, BOARD_SYSTEM_ROOT_ID))
    .get()

  if (!existing) {
    database
      .insert(boardNodes)
      .values({
        id: BOARD_SYSTEM_ROOT_ID,
        type: 'folder',
        parentId: null,
        title: 'Обучение',
        position: 0,
        isExpanded: true,
        isSystem: true,
        createdAt: now,
        updatedAt: now
      })
      .run()
  } else if (
    existing.type !== 'folder' ||
    existing.parentId !== null ||
    existing.title !== 'Обучение' ||
    !existing.isSystem
  ) {
    database
      .update(boardNodes)
      .set({
        type: 'folder',
        parentId: null,
        title: 'Обучение',
        position: 0,
        isSystem: true,
        updatedAt: now
      })
      .where(eq(boardNodes.id, BOARD_SYSTEM_ROOT_ID))
      .run()
  }

  const root = database
    .select()
    .from(boardNodes)
    .where(eq(boardNodes.id, BOARD_SYSTEM_ROOT_ID))
    .get()

  if (!root) {
    throw new Error('Не удалось создать системную папку досок')
  }

  return mapBoardNode(root)
}

export function listBoardNodes(): BoardNode[] {
  ensureBoardsSystemRoot()

  return getDatabase()
    .select()
    .from(boardNodes)
    .orderBy(asc(boardNodes.parentId), asc(boardNodes.position), asc(boardNodes.title))
    .all()
    .map(mapBoardNode)
}

export function createBoardNode(input: CreateBoardNodeInput): BoardNode {
  ensureBoardsSystemRoot()
  assertBoardFolder(input.parentId)

  const database = getDatabase()
  const now = new Date()
  const id = randomUUID()
  const title = input.title?.trim() || (input.type === 'folder' ? 'Новая папка' : 'Новая доска')

  database.transaction((transaction) => {
    transaction
      .insert(boardNodes)
      .values({
        id,
        type: input.type,
        parentId: input.parentId,
        title,
        position: getNextBoardPosition(input.parentId),
        isExpanded: true,
        isSystem: false,
        createdAt: now,
        updatedAt: now
      })
      .run()

    if (input.type === 'board') {
      transaction
        .insert(boardDocuments)
        .values({
          nodeId: id,
          snapshot: null,
          createdAt: now,
          updatedAt: now
        })
        .run()
    }

    if (input.parentId) {
      transaction
        .update(boardNodes)
        .set({ isExpanded: true, updatedAt: now })
        .where(eq(boardNodes.id, input.parentId))
        .run()
    }
  })

  const created = database.select().from(boardNodes).where(eq(boardNodes.id, id)).get()

  if (!created) {
    throw new Error('Не удалось создать элемент досок')
  }

  return mapBoardNode(created)
}

export function renameBoardNode(id: string, title: string): BoardNode {
  if (id === BOARD_SYSTEM_ROOT_ID) {
    throw new Error('Системную папку «Обучение» нельзя переименовать')
  }

  const database = getDatabase()
  const existing = database.select().from(boardNodes).where(eq(boardNodes.id, id)).get()

  if (!existing) {
    throw new Error('Элемент досок не найден')
  }

  database
    .update(boardNodes)
    .set({ title: title.trim(), updatedAt: new Date() })
    .where(eq(boardNodes.id, id))
    .run()

  const updated = database.select().from(boardNodes).where(eq(boardNodes.id, id)).get()

  if (!updated) {
    throw new Error('Элемент досок не найден')
  }

  return mapBoardNode(updated)
}

export function deleteBoardNode(id: string): boolean {
  if (id === BOARD_SYSTEM_ROOT_ID) {
    throw new Error('Системную папку «Обучение» нельзя удалить')
  }

  return getDatabase().delete(boardNodes).where(eq(boardNodes.id, id)).run().changes > 0
}

export function updateBoardNodeExpansion(id: string, isExpanded: boolean): BoardNode {
  const database = getDatabase()
  const folder = database.select().from(boardNodes).where(eq(boardNodes.id, id)).get()

  if (!folder || folder.type !== 'folder') {
    throw new Error('Папка досок не найдена')
  }

  database
    .update(boardNodes)
    .set({ isExpanded, updatedAt: new Date() })
    .where(eq(boardNodes.id, id))
    .run()

  const updated = database.select().from(boardNodes).where(eq(boardNodes.id, id)).get()

  if (!updated) {
    throw new Error('Папка досок не найдена')
  }

  return mapBoardNode(updated)
}

export function moveBoardNode(input: MoveBoardNodeInput): BoardNode[] {
  if (input.id === BOARD_SYSTEM_ROOT_ID) {
    throw new Error('Системную папку «Обучение» нельзя перемещать')
  }

  ensureBoardsSystemRoot()
  assertBoardFolder(input.parentId)

  const database = getDatabase()
  const rows = database.select().from(boardNodes).all()
  const source = rows.find((node) => node.id === input.id)

  if (!source) {
    throw new Error('Элемент досок не найден')
  }

  if (source.id === input.parentId) {
    throw new Error('Элемент нельзя переместить внутрь самого себя')
  }

  const nodesById = new Map(rows.map((node) => [node.id, node]))

  if (source.type === 'folder' && input.parentId) {
    let ancestor = nodesById.get(input.parentId)

    while (ancestor) {
      if (ancestor.id === source.id) {
        throw new Error('Папку нельзя переместить в собственную вложенную папку')
      }

      ancestor = ancestor.parentId ? nodesById.get(ancestor.parentId) : undefined
    }
  }

  const sourceSiblings = rows
    .filter((node) => node.parentId === source.parentId && node.id !== source.id)
    .sort((first, second) => first.position - second.position)
  const targetSiblings = rows
    .filter((node) => node.parentId === input.parentId && node.id !== source.id)
    .sort((first, second) => first.position - second.position)
  const targetPosition = Math.max(0, Math.min(input.position, targetSiblings.length))
  const now = new Date()

  database.transaction((transaction) => {
    if (source.parentId !== input.parentId) {
      sourceSiblings.forEach((node, position) => {
        transaction
          .update(boardNodes)
          .set({ position, updatedAt: now })
          .where(eq(boardNodes.id, node.id))
          .run()
      })
    }

    const arrangedTarget = [...targetSiblings]
    arrangedTarget.splice(targetPosition, 0, source)

    arrangedTarget.forEach((node, position) => {
      transaction
        .update(boardNodes)
        .set({ parentId: input.parentId, position, updatedAt: now })
        .where(eq(boardNodes.id, node.id))
        .run()
    })

    if (input.parentId) {
      transaction
        .update(boardNodes)
        .set({ isExpanded: true, updatedAt: now })
        .where(eq(boardNodes.id, input.parentId))
        .run()
    }
  })

  return listBoardNodes()
}

export function getBoardDocument(nodeId: string): BoardDocument {
  const database = getDatabase()
  const node = database.select().from(boardNodes).where(eq(boardNodes.id, nodeId)).get()

  if (!node || node.type !== 'board') {
    throw new Error('Доска не найдена')
  }

  let document = database
    .select()
    .from(boardDocuments)
    .where(eq(boardDocuments.nodeId, nodeId))
    .get()

  if (!document) {
    const now = new Date()
    database
      .insert(boardDocuments)
      .values({ nodeId, snapshot: null, createdAt: now, updatedAt: now })
      .run()
    document = database
      .select()
      .from(boardDocuments)
      .where(eq(boardDocuments.nodeId, nodeId))
      .get()
  }

  if (!document) {
    throw new Error('Не удалось создать документ доски')
  }

  return mapBoardDocument(document)
}

export function saveBoardDocument(nodeId: string, snapshot: BoardSnapshot): BoardDocument {
  const database = getDatabase()
  const node = database.select().from(boardNodes).where(eq(boardNodes.id, nodeId)).get()

  if (!node || node.type !== 'board') {
    throw new Error('Доска не найдена')
  }

  const existing = database
    .select()
    .from(boardDocuments)
    .where(eq(boardDocuments.nodeId, nodeId))
    .get()
  const now = new Date()

  database.transaction((transaction) => {
    if (existing) {
      transaction
        .update(boardDocuments)
        .set({ snapshot, updatedAt: now })
        .where(eq(boardDocuments.nodeId, nodeId))
        .run()
    } else {
      transaction
        .insert(boardDocuments)
        .values({ nodeId, snapshot, createdAt: now, updatedAt: now })
        .run()
    }

    transaction
      .update(boardNodes)
      .set({ updatedAt: now })
      .where(eq(boardNodes.id, nodeId))
      .run()
  })

  const saved = database
    .select()
    .from(boardDocuments)
    .where(eq(boardDocuments.nodeId, nodeId))
    .get()

  if (!saved) {
    throw new Error('Не удалось сохранить доску')
  }

  return mapBoardDocument(saved)
}

function getStudyAncestorFolders(materialId: string): Array<typeof studyNodes.$inferSelect> {
  const rows = getDatabase().select().from(studyNodes).all()
  const nodesById = new Map(rows.map((node) => [node.id, node]))
  const material = nodesById.get(materialId)
  const folders: Array<typeof studyNodes.$inferSelect> = []
  const visited = new Set<string>()
  let parentId = material?.parentId ?? null

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    const parent = nodesById.get(parentId)

    if (!parent) {
      break
    }

    if (parent.type === 'folder') {
      folders.unshift(parent)
    }

    parentId = parent.parentId
  }

  return folders
}

function ensureLinkedStudyFolder(
  sourceFolder: typeof studyNodes.$inferSelect,
  parentId: string
): typeof boardNodes.$inferSelect {
  const database = getDatabase()
  const existing = database
    .select()
    .from(boardNodes)
    .where(eq(boardNodes.sourceStudyNodeId, sourceFolder.id))
    .get()

  if (existing) {
    return existing
  }

  const now = new Date()
  const id = randomUUID()

  database
    .insert(boardNodes)
    .values({
      id,
      type: 'folder',
      parentId,
      title: sourceFolder.title,
      position: getNextBoardPosition(parentId),
      isExpanded: true,
      isSystem: false,
      sourceStudyNodeId: sourceFolder.id,
      createdAt: now,
      updatedAt: now
    })
    .run()

  const created = database.select().from(boardNodes).where(eq(boardNodes.id, id)).get()

  if (!created) {
    throw new Error('Не удалось создать папку связанной доски')
  }

  return created
}

export function ensureStudyBoard(input: EnsureStudyBoardInput): BoardNode {
  const database = getDatabase()
  const existing = database
    .select()
    .from(boardNodes)
    .where(
      and(
        eq(boardNodes.sourceMaterialId, input.materialId),
        eq(boardNodes.sourceBlockId, input.blockId)
      )
    )
    .get()

  if (existing) {
    return mapBoardNode(existing)
  }

  const materialNode = database
    .select()
    .from(studyNodes)
    .where(eq(studyNodes.id, input.materialId))
    .get()
  const material = database
    .select()
    .from(studyMaterials)
    .where(eq(studyMaterials.nodeId, input.materialId))
    .get()

  if (!materialNode || materialNode.type !== 'material' || !material) {
    throw new Error('Материал для связанной доски не найден')
  }

  const parsedDocument = studyDocumentSchema.parse(material.document)
  const boardBlock = parsedDocument.blocks.find(
    (block): block is StudyBoardBlock => block.type === 'board' && block.id === input.blockId
  )

  if (!boardBlock) {
    throw new Error('Блок доски не найден в материале')
  }

  const root = ensureBoardsSystemRoot()
  let parentId = root.id

  for (const sourceFolder of getStudyAncestorFolders(input.materialId)) {
    parentId = ensureLinkedStudyFolder(sourceFolder, parentId).id
  }

  const now = new Date()
  const id = randomUUID()

  database.transaction((transaction) => {
    transaction
      .insert(boardNodes)
      .values({
        id,
        type: 'board',
        parentId,
        title: `${materialNode.title} — доска`,
        position: getNextBoardPosition(parentId),
        isExpanded: true,
        isSystem: false,
        sourceMaterialId: input.materialId,
        sourceBlockId: input.blockId,
        createdAt: now,
        updatedAt: now
      })
      .run()

    transaction
      .insert(boardDocuments)
      .values({ nodeId: id, snapshot: null, createdAt: now, updatedAt: now })
      .run()
  })

  const created = database.select().from(boardNodes).where(eq(boardNodes.id, id)).get()

  if (!created) {
    throw new Error('Не удалось создать связанную доску')
  }

  return mapBoardNode(created)
}

export function cleanupBoardsForStudyDocument(materialId: string, document: StudyDocument): void {
  const retainedBlockIds = new Set(
    document.blocks.filter((block) => block.type === 'board').map((block) => block.id)
  )
  const linkedBoards = getDatabase()
    .select()
    .from(boardNodes)
    .where(eq(boardNodes.sourceMaterialId, materialId))
    .all()

  linkedBoards.forEach((board) => {
    if (!board.sourceBlockId || retainedBlockIds.has(board.sourceBlockId)) {
      return
    }

    getDatabase().delete(boardNodes).where(eq(boardNodes.id, board.id)).run()
  })
}
