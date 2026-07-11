import { asc, eq, isNull } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

import { studyLinkTargets, studyMaterials, studyNodes } from '../database/schema/study'
import { getDatabase } from '../database/client'
import type {
  CreateStudyNodeInput,
  MoveStudyNodeInput,
  ResolveStudyInternalLinkTargetInput,
  SaveStudyMaterialInput,
  SearchStudyInternalLinkTargetsInput,
  StudyBlock,
  StudyDocument,
  StudyFolderIconName,
  StudyInternalLinkTarget,
  StudyMaterial,
  StudyNode
} from '../../shared/contracts/study'
import {
  studyDocumentSchema,
  studyMaterialSchema,
  studyNodeSchema
} from '../../shared/validation/study'
import {
  cleanupStudyAssetsForDocument,
  removeStudyAssetsForMaterials
} from '../services/study-assets'

function createEmptyStudyDocument(): StudyDocument {
  return {
    version: 1,
    blocks: [
      {
        id: randomUUID(),
        type: 'text',
        text: ''
      }
    ]
  }
}

function documentToPlainText(document: StudyDocument): string {
  return document.blocks
    .map((block: StudyBlock) => {
      if (block.type === 'text') {
        return block.text
      }

      if (block.type === 'heading') {
        return block.text
      }

      if (block.type === 'code') {
        return block.source
      }
      if (block.type === 'markdown') {
        return block.source
      }

      if (block.type === 'latex') {
        return block.source
      }

      if (block.type === 'mermaid') {
        return block.source
      }
      if (
        block.type === 'image' ||
        block.type === 'video' ||
        block.type === 'audio' ||
        block.type === 'file'
      ) {
        const sourceName =
          block.source.type === 'local' ? block.source.asset?.name : block.source.url

        return [block.title, sourceName]
          .filter((value): value is string => Boolean(value))
          .join('\n')
      }

      return ''
    })
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

function mapStudyNode(row: typeof studyNodes.$inferSelect): StudyNode {
  return studyNodeSchema.parse({
    ...row,
    icon: row.icon ?? undefined,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime()
  })
}

function mapStudyMaterial(row: typeof studyMaterials.$inferSelect): StudyMaterial {
  return studyMaterialSchema.parse({
    nodeId: row.nodeId,
    document: row.document,
    plainText: row.plainText,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime()
  })
}
type StudyNodeRow = typeof studyNodes.$inferSelect

type StudyLinkTargetRow = typeof studyLinkTargets.$inferSelect

function normalizeStudyLinkSearch(...values: string[]): string {
  return values.join(' ').trim().toLocaleLowerCase('ru-RU')
}

function buildStudyLinkTargetRows(
  materialId: string,
  materialTitle: string,
  document: StudyDocument,
  updatedAt: Date
): Array<typeof studyLinkTargets.$inferInsert> {
  const materialTarget = {
    id: `material:${materialId}`,
    kind: 'material' as const,
    materialId,
    headingId: null,
    title: materialTitle,
    headingLevel: null,
    position: -1,
    searchText: normalizeStudyLinkSearch(materialTitle),
    updatedAt
  }

  const headingTargets = document.blocks.flatMap((block, position) => {
    if (block.type !== 'heading' || !block.text.trim()) {
      return []
    }

    const title = block.text.trim()

    return [
      {
        id: `heading:${materialId}:${block.id}`,
        kind: 'heading' as const,
        materialId,
        headingId: block.id,
        title,
        headingLevel: block.level,
        position,
        searchText: normalizeStudyLinkSearch(title, materialTitle),
        updatedAt
      }
    ]
  })

  return [materialTarget, ...headingTargets]
}

function getStudyMaterialFolderPath(
  material: StudyNodeRow,
  nodesById: Map<string, StudyNodeRow>
): string[] {
  const path: string[] = []
  const visited = new Set<string>()

  let parentId = material.parentId

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)

    const parent = nodesById.get(parentId)

    if (!parent) {
      break
    }

    if (parent.type === 'folder') {
      path.unshift(parent.title)
    }

    parentId = parent.parentId
  }

  return path
}

function mapStudyInternalLinkTarget(
  row: StudyLinkTargetRow,
  nodesById: Map<string, StudyNodeRow>
): StudyInternalLinkTarget | null {
  const material = nodesById.get(row.materialId)

  if (!material || material.type !== 'material') {
    return null
  }

  const headingLevel =
    row.kind === 'heading' &&
    (row.headingLevel === 1 || row.headingLevel === 2 || row.headingLevel === 3)
      ? row.headingLevel
      : null

  return {
    kind: row.kind,
    materialId: row.materialId,
    headingId: row.kind === 'heading' ? row.headingId : null,
    title: row.kind === 'material' ? material.title : row.title,
    materialTitle: material.title,
    folderPath: getStudyMaterialFolderPath(material, nodesById),
    headingLevel
  }
}

function ensureStudyLinkTargets(): void {
  const database = getDatabase()

  const materialNodes = database
    .select()
    .from(studyNodes)
    .where(eq(studyNodes.type, 'material'))
    .all()

  const existingMaterialTargets = new Set(
    database
      .select({
        materialId: studyLinkTargets.materialId,
        kind: studyLinkTargets.kind
      })
      .from(studyLinkTargets)
      .all()
      .filter((target) => target.kind === 'material')
      .map((target) => target.materialId)
  )

  materialNodes.forEach((materialNode) => {
    if (existingMaterialTargets.has(materialNode.id)) {
      return
    }

    const material = database
      .select()
      .from(studyMaterials)
      .where(eq(studyMaterials.nodeId, materialNode.id))
      .get()

    const parsedDocument = studyDocumentSchema.safeParse(material?.document)

    const document = parsedDocument.success ? parsedDocument.data : createEmptyStudyDocument()

    const updatedAt = material?.updatedAt ?? materialNode.updatedAt

    const targets = buildStudyLinkTargetRows(
      materialNode.id,
      materialNode.title,
      document,
      updatedAt
    )

    database.transaction((transaction) => {
      transaction
        .delete(studyLinkTargets)
        .where(eq(studyLinkTargets.materialId, materialNode.id))
        .run()

      transaction.insert(studyLinkTargets).values(targets).run()
    })
  })
}

function getStudyLinkTargetScore(
  target: StudyInternalLinkTarget,
  normalizedQuery: string,
  currentMaterialId?: string
): number | null {
  let score = 100

  if (normalizedQuery) {
    const normalizedTitle = target.title.toLocaleLowerCase('ru-RU')

    const normalizedMaterialTitle = target.materialTitle.toLocaleLowerCase('ru-RU')

    const normalizedPath = target.folderPath.join(' ').toLocaleLowerCase('ru-RU')

    if (normalizedTitle === normalizedQuery) {
      score = 0
    } else if (normalizedTitle.startsWith(normalizedQuery)) {
      score = 10
    } else if (normalizedTitle.includes(normalizedQuery)) {
      score = 20
    } else if (normalizedMaterialTitle.includes(normalizedQuery)) {
      score = 30
    } else if (normalizedPath.includes(normalizedQuery)) {
      score = 40
    } else {
      return null
    }
  }

  if (currentMaterialId && target.materialId === currentMaterialId) {
    score -= target.kind === 'heading' ? 8 : 4
  }

  if (target.kind === 'material') {
    score -= 1
  }

  return score
}

export function listStudyNodes(): StudyNode[] {
  const rows = getDatabase()
    .select()
    .from(studyNodes)
    .orderBy(asc(studyNodes.parentId), asc(studyNodes.position))
    .all()

  return rows.map(mapStudyNode)
}

export function createStudyNode(input: CreateStudyNodeInput): StudyNode {
  const database = getDatabase()
  const now = new Date()
  const id = randomUUID()

  const siblings = database
    .select({
      position: studyNodes.position
    })
    .from(studyNodes)
    .where(
      input.parentId === null
        ? isNull(studyNodes.parentId)
        : eq(studyNodes.parentId, input.parentId)
    )
    .all()

  const nextPosition =
    siblings.reduce((maximum, sibling) => Math.max(maximum, sibling.position), -1) + 1

  const title = input.title?.trim() || (input.type === 'folder' ? 'Новая папка' : 'Новый материал')

  database.transaction((transaction) => {
    transaction
      .insert(studyNodes)
      .values({
        id,
        type: input.type,
        parentId: input.parentId,
        title,
        position: nextPosition,
        icon: input.type === 'folder' ? (input.icon ?? 'folder') : null,
        isExpanded: true,
        createdAt: now,
        updatedAt: now
      })
      .run()

    if (input.type === 'material') {
      const emptyDocument = createEmptyStudyDocument()

      transaction
        .insert(studyMaterials)
        .values({
          nodeId: id,
          document: emptyDocument,
          plainText: '',
          createdAt: now,
          updatedAt: now
        })
        .run()

      transaction
        .insert(studyLinkTargets)
        .values(buildStudyLinkTargetRows(id, title, emptyDocument, now))
        .run()
    }

    if (input.parentId) {
      transaction
        .update(studyNodes)
        .set({
          isExpanded: true,
          updatedAt: now
        })
        .where(eq(studyNodes.id, input.parentId))
        .run()
    }
  })

  const created = database.select().from(studyNodes).where(eq(studyNodes.id, id)).get()

  if (!created) {
    throw new Error('Study node was not created')
  }

  return mapStudyNode(created)
}

export function renameStudyNode(id: string, title: string): StudyNode {
  const database = getDatabase()

  database
    .update(studyNodes)
    .set({
      title: title.trim(),
      updatedAt: new Date()
    })
    .where(eq(studyNodes.id, id))
    .run()

  const updated = database.select().from(studyNodes).where(eq(studyNodes.id, id)).get()

  if (!updated) {
    throw new Error('Study node was not found')
  }

  return mapStudyNode(updated)
}
export function updateStudyFolderIcon(id: string, icon: StudyFolderIconName): StudyNode {
  const database = getDatabase()

  const folder = database.select().from(studyNodes).where(eq(studyNodes.id, id)).get()

  if (!folder || folder.type !== 'folder') {
    throw new Error('Study folder was not found')
  }

  database
    .update(studyNodes)
    .set({
      icon,
      updatedAt: new Date()
    })
    .where(eq(studyNodes.id, id))
    .run()

  const updated = database.select().from(studyNodes).where(eq(studyNodes.id, id)).get()

  if (!updated) {
    throw new Error('Study folder was not found')
  }

  return mapStudyNode(updated)
}

export function updateStudyNodeExpansion(id: string, isExpanded: boolean): StudyNode {
  const database = getDatabase()

  database
    .update(studyNodes)
    .set({
      isExpanded,
      updatedAt: new Date()
    })
    .where(eq(studyNodes.id, id))
    .run()

  const updated = database.select().from(studyNodes).where(eq(studyNodes.id, id)).get()

  if (!updated) {
    throw new Error('Study folder was not found')
  }

  return mapStudyNode(updated)
}

export function moveStudyNode(input: MoveStudyNodeInput): StudyNode[] {
  const database = getDatabase()

  const rows = database.select().from(studyNodes).all()

  const source = rows.find((node) => node.id === input.id)

  if (!source) {
    throw new Error('Study node was not found')
  }

  const nodesById = new Map(rows.map((node) => [node.id, node]))

  if (input.parentId === source.id) {
    throw new Error('A node cannot be moved into itself')
  }

  if (input.parentId !== null) {
    const parent = nodesById.get(input.parentId)

    if (!parent || parent.type !== 'folder') {
      throw new Error('Target study folder was not found')
    }

    if (source.type === 'folder') {
      let ancestor: typeof parent | undefined = parent

      while (ancestor) {
        if (ancestor.id === source.id) {
          throw new Error('A folder cannot be moved into its descendant')
        }

        ancestor = ancestor.parentId ? nodesById.get(ancestor.parentId) : undefined
      }
    }
  }

  const sameParent = source.parentId === input.parentId

  const sourceSiblings = rows
    .filter((node) => node.parentId === source.parentId && node.id !== source.id)
    .sort((first, second) => first.position - second.position)

  const targetSiblings = rows
    .filter((node) => node.parentId === input.parentId && node.id !== source.id)
    .sort((first, second) => first.position - second.position)

  const nextPosition = Math.max(0, Math.min(input.position, targetSiblings.length))

  const currentPosition = rows
    .filter((node) => node.parentId === source.parentId)
    .sort((first, second) => first.position - second.position)
    .findIndex((node) => node.id === source.id)

  if (sameParent && currentPosition === nextPosition) {
    return listStudyNodes()
  }

  const now = new Date()

  database.transaction((transaction) => {
    if (!sameParent) {
      sourceSiblings.forEach((node, position) => {
        transaction
          .update(studyNodes)
          .set({
            position,
            updatedAt: now
          })
          .where(eq(studyNodes.id, node.id))
          .run()
      })
    }

    const arrangedTarget = [...targetSiblings]

    arrangedTarget.splice(nextPosition, 0, source)

    arrangedTarget.forEach((node, position) => {
      transaction
        .update(studyNodes)
        .set({
          parentId: input.parentId,
          position,
          updatedAt: now
        })
        .where(eq(studyNodes.id, node.id))
        .run()
    })

    if (input.parentId) {
      transaction
        .update(studyNodes)
        .set({
          isExpanded: true,
          updatedAt: now
        })
        .where(eq(studyNodes.id, input.parentId))
        .run()
    }
  })

  return listStudyNodes()
}
function getMaterialIdsInStudySubtree(rootId: string): string[] {
  const rows = getDatabase()
    .select({
      id: studyNodes.id,
      type: studyNodes.type,
      parentId: studyNodes.parentId
    })
    .from(studyNodes)
    .all()

  const includedIds = new Set<string>([rootId])

  let changed = true

  while (changed) {
    changed = false

    rows.forEach((row) => {
      if (row.parentId && includedIds.has(row.parentId) && !includedIds.has(row.id)) {
        includedIds.add(row.id)
        changed = true
      }
    })
  }

  return rows
    .filter((row) => row.type === 'material' && includedIds.has(row.id))
    .map((row) => row.id)
}
export async function deleteStudyNode(id: string): Promise<boolean> {
  const materialIds = getMaterialIdsInStudySubtree(id)

  const result = getDatabase().delete(studyNodes).where(eq(studyNodes.id, id)).run()

  if (result.changes > 0) {
    await removeStudyAssetsForMaterials(materialIds).catch(() => undefined)
  }

  return result.changes > 0
}
export function searchStudyInternalLinkTargets(
  input: SearchStudyInternalLinkTargetsInput
): StudyInternalLinkTarget[] {
  ensureStudyLinkTargets()

  const database = getDatabase()

  const nodeRows = database.select().from(studyNodes).all()

  const nodesById = new Map(nodeRows.map((node) => [node.id, node]))

  const normalizedQuery = normalizeStudyLinkSearch(input.query)

  const limit = Math.max(1, Math.min(input.limit ?? 40, 100))

  return database
    .select()
    .from(studyLinkTargets)
    .all()
    .map((row) => mapStudyInternalLinkTarget(row, nodesById))
    .filter((target): target is StudyInternalLinkTarget => target !== null)
    .map((target) => ({
      target,
      score: getStudyLinkTargetScore(target, normalizedQuery, input.currentMaterialId)
    }))
    .filter(
      (
        entry
      ): entry is {
        target: StudyInternalLinkTarget
        score: number
      } => entry.score !== null
    )
    .sort((first, second) => {
      if (first.score !== second.score) {
        return first.score - second.score
      }

      const pathComparison = first.target.folderPath
        .join('/')
        .localeCompare(second.target.folderPath.join('/'), 'ru-RU')

      if (pathComparison !== 0) {
        return pathComparison
      }

      const materialComparison = first.target.materialTitle.localeCompare(
        second.target.materialTitle,
        'ru-RU'
      )

      if (materialComparison !== 0) {
        return materialComparison
      }

      return first.target.title.localeCompare(second.target.title, 'ru-RU')
    })
    .slice(0, limit)
    .map((entry) => entry.target)
}

export function resolveStudyInternalLinkTarget(
  input: ResolveStudyInternalLinkTargetInput
): StudyInternalLinkTarget | null {
  ensureStudyLinkTargets()

  const database = getDatabase()

  const nodes = database.select().from(studyNodes).all()

  const nodesById = new Map(nodes.map((node) => [node.id, node]))

  const targetRows = database
    .select()
    .from(studyLinkTargets)
    .where(eq(studyLinkTargets.materialId, input.materialId))
    .all()

  const targetRow =
    input.kind === 'material'
      ? targetRows.find((target) => target.kind === 'material')
      : targetRows.find(
          (target) => target.kind === 'heading' && target.headingId === input.headingId
        )

  if (!targetRow) {
    return null
  }

  return mapStudyInternalLinkTarget(targetRow, nodesById)
}

export function getStudyMaterial(nodeId: string): StudyMaterial {
  const database = getDatabase()

  let material = database
    .select()
    .from(studyMaterials)
    .where(eq(studyMaterials.nodeId, nodeId))
    .get()

  if (!material) {
    const node = database.select().from(studyNodes).where(eq(studyNodes.id, nodeId)).get()

    if (!node || node.type !== 'material') {
      throw new Error('Study material was not found')
    }

    const now = new Date()

    database
      .insert(studyMaterials)
      .values({
        nodeId,
        document: createEmptyStudyDocument(),
        plainText: '',
        createdAt: now,
        updatedAt: now
      })
      .run()

    material = database.select().from(studyMaterials).where(eq(studyMaterials.nodeId, nodeId)).get()
  }

  if (!material) {
    throw new Error('Study material was not created')
  }

  return mapStudyMaterial(material)
}

export async function saveStudyMaterial(input: SaveStudyMaterialInput): Promise<StudyMaterial> {
  const database = getDatabase()

  const document = studyDocumentSchema.parse(input.document)

  const plainText = documentToPlainText(document)

  const now = new Date()

  const materialNode = database
    .select()
    .from(studyNodes)
    .where(eq(studyNodes.id, input.nodeId))
    .get()

  if (!materialNode || materialNode.type !== 'material') {
    throw new Error('Study material was not found')
  }

  const existing = database
    .select()
    .from(studyMaterials)
    .where(eq(studyMaterials.nodeId, input.nodeId))
    .get()

  const linkTargets = buildStudyLinkTargetRows(input.nodeId, materialNode.title, document, now)

  database.transaction((transaction) => {
    if (existing) {
      transaction
        .update(studyMaterials)
        .set({
          document,
          plainText,
          updatedAt: now
        })
        .where(eq(studyMaterials.nodeId, input.nodeId))
        .run()
    } else {
      transaction
        .insert(studyMaterials)
        .values({
          nodeId: input.nodeId,
          document,
          plainText,
          createdAt: now,
          updatedAt: now
        })
        .run()
    }

    transaction.delete(studyLinkTargets).where(eq(studyLinkTargets.materialId, input.nodeId)).run()

    transaction.insert(studyLinkTargets).values(linkTargets).run()

    transaction
      .update(studyNodes)
      .set({
        updatedAt: now
      })
      .where(eq(studyNodes.id, input.nodeId))
      .run()
  })

  const savedMaterial = getStudyMaterial(input.nodeId)

  await cleanupStudyAssetsForDocument(input.nodeId, document).catch(() => undefined)

  return savedMaterial
}
