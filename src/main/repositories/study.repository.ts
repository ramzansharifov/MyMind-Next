import { asc, eq, isNull, or, sql, type SQLWrapper } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

import { appMeta, studyLinkTargets, studyMaterials, studyNodes } from '../database/schema'
import { getDatabase } from '../database/client'
import type {
  CreateStudyNodeInput,
  DuplicateStudyNodeResult,
  MoveStudyNodeInput,
  ResolveStudyInternalLinkTargetInput,
  SaveStudyMaterialInput,
  SearchStudyInternalLinkTargetsInput,
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
  duplicateStudyAssetsForDocument,
  removeStudyAssetsForMaterials,
  validateStudyDocumentAssets
} from '../services/study-assets'
import { studyMaterialCoordinator } from '../services/study-material-coordinator'
import { documentToPlainText } from '../domain/study-document-index'

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

interface StudyPathNode {
  id: string
  type: 'folder' | 'material'
  parentId: string | null
  title: string
}

type StudyLinkTargetRow = typeof studyLinkTargets.$inferSelect

function normalizeStudyLinkSearch(...values: string[]): string {
  return values.join(' ').trim().toLocaleLowerCase('ru-RU')
}

function buildStudyLinkTargetRows(
  materialId: string,
  materialTitle: string,
  folderPath: string[],
  document: StudyDocument,
  updatedAt: Date
): Array<typeof studyLinkTargets.$inferInsert> {
  const materialTarget = {
    id: `material:${materialId}`,
    kind: 'material' as const,
    materialId,
    headingId: null,
    title: materialTitle,
    titleSearch: normalizeStudyLinkSearch(materialTitle),
    materialTitle,
    materialTitleSearch: normalizeStudyLinkSearch(materialTitle),
    folderPath,
    folderPathSearch: normalizeStudyLinkSearch(...folderPath),
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
        titleSearch: normalizeStudyLinkSearch(title),
        materialTitle,
        materialTitleSearch: normalizeStudyLinkSearch(materialTitle),
        folderPath,
        folderPathSearch: normalizeStudyLinkSearch(...folderPath),
        headingLevel: block.level,
        position,
        searchText: normalizeStudyLinkSearch(title, materialTitle),
        updatedAt
      }
    ]
  })

  return [materialTarget, ...headingTargets]
}

function getStudyFolderPath(
  parentId: string | null,
  nodesById: ReadonlyMap<string, StudyPathNode>
): string[] {
  const path: string[] = []
  const visited = new Set<string>()

  let currentParentId = parentId

  while (currentParentId && !visited.has(currentParentId)) {
    visited.add(currentParentId)

    const parent = nodesById.get(currentParentId)

    if (!parent) {
      break
    }

    if (parent.type === 'folder') {
      path.unshift(parent.title)
    }

    currentParentId = parent.parentId
  }

  return path
}

function mapStudyInternalLinkTarget(row: StudyLinkTargetRow): StudyInternalLinkTarget {
  const headingLevel =
    row.kind === 'heading' &&
    (row.headingLevel === 1 || row.headingLevel === 2 || row.headingLevel === 3)
      ? row.headingLevel
      : null

  return {
    kind: row.kind,
    materialId: row.materialId,
    headingId: row.kind === 'heading' ? row.headingId : null,
    title: row.title,
    materialTitle: row.materialTitle,
    folderPath: row.folderPath,
    headingLevel
  }
}

const STUDY_LINK_TARGETS_MAINTENANCE_KEY = 'study_link_targets_version'
const STUDY_LINK_TARGETS_MAINTENANCE_VERSION = '2'

export function runStudyLinkTargetsMaintenance(): void {
  const database = getDatabase()

  const completed = database
    .select()
    .from(appMeta)
    .where(eq(appMeta.key, STUDY_LINK_TARGETS_MAINTENANCE_KEY))
    .get()

  if (completed?.value === STUDY_LINK_TARGETS_MAINTENANCE_VERSION) return

  const materialNodes = database
    .select()
    .from(studyNodes)
    .where(eq(studyNodes.type, 'material'))
    .all()

  const nodeRows = database.select().from(studyNodes).all()
  const nodesById = new Map(nodeRows.map((node) => [node.id, node]))
  const targetRows = materialNodes.flatMap((materialNode) => {
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
      getStudyFolderPath(materialNode.parentId, nodesById),
      document,
      updatedAt
    )

    return targets
  })

  const now = new Date()
  database.transaction((transaction) => {
    transaction.delete(studyLinkTargets).run()
    if (targetRows.length > 0) transaction.insert(studyLinkTargets).values(targetRows).run()
    transaction
      .insert(appMeta)
      .values({
        key: STUDY_LINK_TARGETS_MAINTENANCE_KEY,
        value: STUDY_LINK_TARGETS_MAINTENANCE_VERSION,
        updatedAt: now
      })
      .onConflictDoUpdate({
        target: appMeta.key,
        set: { value: STUDY_LINK_TARGETS_MAINTENANCE_VERSION, updatedAt: now }
      })
      .run()
  })
}

interface PreparedStudyMaterialDuplicate {
  nodeId: string
  title: string
  document: StudyDocument
  plainText: string
}

function getStudySubtreeRows(rootId: string, rows: StudyNodeRow[]): StudyNodeRow[] {
  const nodesById = new Map(rows.map((node) => [node.id, node]))

  const childrenByParent = new Map<string | null, StudyNodeRow[]>()

  rows.forEach((node) => {
    const children = childrenByParent.get(node.parentId) ?? []

    children.push(node)

    childrenByParent.set(node.parentId, children)
  })

  childrenByParent.forEach((children) => {
    children.sort((first, second) => first.position - second.position)
  })

  const subtree: StudyNodeRow[] = []
  const visited = new Set<string>()

  function visit(nodeId: string): void {
    if (visited.has(nodeId)) {
      return
    }

    const node = nodesById.get(nodeId)

    if (!node) {
      return
    }

    visited.add(nodeId)
    subtree.push(node)

    const children = childrenByParent.get(nodeId) ?? []

    children.forEach((child) => {
      visit(child.id)
    })
  }

  visit(rootId)

  return subtree
}

function createStudyDuplicateTitle(title: string, siblingTitles: string[]): string {
  const normalizedTitles = new Set(
    siblingTitles.map((value) => value.trim().toLocaleLowerCase('ru-RU'))
  )

  const baseTitle = `${title} — копия`

  if (!normalizedTitles.has(baseTitle.toLocaleLowerCase('ru-RU'))) {
    return baseTitle
  }

  let index = 2

  while (normalizedTitles.has(`${baseTitle} ${index}`.toLocaleLowerCase('ru-RU'))) {
    index += 1
  }

  return `${baseTitle} ${index}`
}

function remapStudyDocumentInternalLinks(
  document: StudyDocument,
  nodeIdMap: Map<string, string>
): StudyDocument {
  return {
    ...document,
    blocks: document.blocks.map((block) => {
      if (block.type !== 'text' || !block.html) {
        return block
      }

      const html = block.html.replace(
        /data-material-id=(["'])([^"']+)\1/g,
        (match, quote: string, materialId: string) => {
          const duplicatedId = nodeIdMap.get(materialId)

          return duplicatedId ? `data-material-id=${quote}${duplicatedId}${quote}` : match
        }
      )

      return html === block.html
        ? block
        : {
            ...block,
            html
          }
    })
  }
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

  if (input.parentId !== null) {
    const parent = database.select().from(studyNodes).where(eq(studyNodes.id, input.parentId)).get()

    if (!parent) {
      throw new Error('Родительский элемент не найден')
    }

    if (parent.type !== 'folder') {
      throw new Error('Создавать элементы можно только внутри папки')
    }
  }

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
  const nodesById = new Map(
    database
      .select()
      .from(studyNodes)
      .all()
      .map((node) => [node.id, node])
  )
  const folderPath = getStudyFolderPath(input.parentId, nodesById)

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
        .values(buildStudyLinkTargetRows(id, title, folderPath, emptyDocument, now))
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
async function duplicateStudyNodeNow(id: string): Promise<DuplicateStudyNodeResult> {
  const database = getDatabase()

  const rows = database.select().from(studyNodes).all()

  const source = rows.find((node) => node.id === id)

  if (!source) {
    throw new Error('Элемент обучения не найден')
  }

  const subtree = getStudySubtreeRows(source.id, rows)

  if (subtree.length === 0) {
    throw new Error('Не удалось прочитать содержимое элемента')
  }

  const now = new Date()

  const nodeIdMap = new Map<string, string>(
    subtree.map((node): [string, string] => [node.id, randomUUID()])
  )

  const rootId = nodeIdMap.get(source.id)

  if (!rootId) {
    throw new Error('Не удалось создать идентификатор копии')
  }

  const siblingTitles = rows
    .filter((node) => node.parentId === source.parentId && node.id !== source.id)
    .map((node) => node.title)

  const rootTitle = createStudyDuplicateTitle(source.title, siblingTitles)

  const duplicatedNodeRows: Array<typeof studyNodes.$inferInsert> = []

  const duplicatedNodeRowsBySourceId = new Map<string, typeof studyNodes.$inferInsert>()

  subtree.forEach((node) => {
    const duplicatedId = nodeIdMap.get(node.id)

    if (!duplicatedId) {
      throw new Error('Не удалось подготовить копию элемента')
    }

    const duplicatedParentId =
      node.id === source.id
        ? source.parentId
        : node.parentId
          ? (nodeIdMap.get(node.parentId) ?? null)
          : null

    const duplicatedNode: typeof studyNodes.$inferInsert = {
      id: duplicatedId,
      type: node.type,
      parentId: duplicatedParentId,
      title: node.id === source.id ? rootTitle : node.title,
      icon: node.type === 'folder' ? (node.icon ?? 'folder') : null,
      position: node.id === source.id ? source.position + 1 : node.position,
      isExpanded: node.isExpanded,
      createdAt: now,
      updatedAt: now
    }

    duplicatedNodeRows.push(duplicatedNode)

    duplicatedNodeRowsBySourceId.set(node.id, duplicatedNode)
  })

  const sourceMaterialNodes = subtree.filter((node) => node.type === 'material')

  const duplicatedMaterialIds: string[] = sourceMaterialNodes
    .map((node) => nodeIdMap.get(node.id))
    .filter((materialId): materialId is string => materialId !== undefined)

  const preparedMaterials: PreparedStudyMaterialDuplicate[] = []

  try {
    for (const sourceMaterialNode of sourceMaterialNodes) {
      const duplicatedNode = duplicatedNodeRowsBySourceId.get(sourceMaterialNode.id)

      if (!duplicatedNode) {
        throw new Error('Не удалось подготовить материал')
      }

      const sourceMaterial = database
        .select()
        .from(studyMaterials)
        .where(eq(studyMaterials.nodeId, sourceMaterialNode.id))
        .get()

      if (!sourceMaterial) {
        throw new Error(`Не найдено содержимое материала «${sourceMaterialNode.title}»`)
      }

      const parsedDocument = studyDocumentSchema.safeParse(sourceMaterial.document)

      if (!parsedDocument.success) {
        throw new Error(`Содержимое материала «${sourceMaterialNode.title}» повреждено`)
      }

      const sourceDocument = parsedDocument.data

      const remappedDocument = remapStudyDocumentInternalLinks(sourceDocument, nodeIdMap)

      const duplicatedDocument = await duplicateStudyAssetsForDocument(
        duplicatedNode.id,
        remappedDocument
      )

      preparedMaterials.push({
        nodeId: duplicatedNode.id,
        title: duplicatedNode.title,
        document: duplicatedDocument,
        plainText: documentToPlainText(duplicatedDocument)
      })
    }
  } catch (reason: unknown) {
    await removeStudyAssetsForMaterials(duplicatedMaterialIds).catch(() => undefined)

    throw reason
  }

  const followingSiblings = rows.filter(
    (node) => node.parentId === source.parentId && node.position > source.position
  )
  const pathNodes = new Map<string, StudyPathNode>(
    [...rows, ...duplicatedNodeRows].map((node) => [
      node.id,
      {
        id: node.id,
        type: node.type,
        parentId: node.parentId ?? null,
        title: node.title
      }
    ])
  )

  try {
    database.transaction((transaction) => {
      followingSiblings.forEach((node) => {
        transaction
          .update(studyNodes)
          .set({
            position: node.position + 1,
            updatedAt: now
          })
          .where(eq(studyNodes.id, node.id))
          .run()
      })

      duplicatedNodeRows.forEach((node) => {
        transaction.insert(studyNodes).values(node).run()
      })

      preparedMaterials.forEach((material) => {
        transaction
          .insert(studyMaterials)
          .values({
            nodeId: material.nodeId,
            document: material.document,
            plainText: material.plainText,
            createdAt: now,
            updatedAt: now
          })
          .run()

        transaction
          .insert(studyLinkTargets)
          .values(
            buildStudyLinkTargetRows(
              material.nodeId,
              material.title,
              getStudyFolderPath(pathNodes.get(material.nodeId)?.parentId ?? null, pathNodes),
              material.document,
              now
            )
          )
          .run()
      })

      if (source.parentId) {
        transaction
          .update(studyNodes)
          .set({
            isExpanded: true,
            updatedAt: now
          })
          .where(eq(studyNodes.id, source.parentId))
          .run()
      }
    })
  } catch (reason: unknown) {
    await removeStudyAssetsForMaterials(duplicatedMaterialIds).catch(() => undefined)

    throw reason
  }

  return {
    rootId,
    nodes: listStudyNodes()
  }
}

export async function duplicateStudyNode(id: string): Promise<DuplicateStudyNodeResult> {
  const sourceMaterialIds = getMaterialIdsInStudySubtree(id)

  return studyMaterialCoordinator.runForMany(sourceMaterialIds, () => duplicateStudyNodeNow(id))
}

export function renameStudyNode(id: string, title: string): StudyNode {
  const database = getDatabase()
  const rows = database.select().from(studyNodes).all()
  const existing = rows.find((node) => node.id === id)

  if (!existing) {
    throw new Error('Элемент обучения не найден')
  }

  const nextTitle = title.trim()
  const now = new Date()
  const nextRows = rows.map((node) =>
    node.id === id ? { ...node, title: nextTitle, updatedAt: now } : node
  )
  const nodesById = new Map(nextRows.map((node) => [node.id, node]))
  const affectedMaterials = new Set(
    nextRows
      .filter((node) => {
        if (node.type !== 'material') return false
        if (existing.type === 'material') return node.id === existing.id

        let parentId = node.parentId
        while (parentId) {
          if (parentId === existing.id) return true
          parentId = nodesById.get(parentId)?.parentId ?? null
        }
        return false
      })
      .map((node) => node.id)
  )
  const affectedTargets = database
    .select()
    .from(studyLinkTargets)
    .all()
    .filter((target) => affectedMaterials.has(target.materialId))

  database.transaction((transaction) => {
    transaction
      .update(studyNodes)
      .set({ title: nextTitle, updatedAt: now })
      .where(eq(studyNodes.id, id))
      .run()

    affectedTargets.forEach((target) => {
      const material = nodesById.get(target.materialId)
      if (!material || material.type !== 'material') return

      const targetTitle = target.kind === 'material' ? material.title : target.title
      const folderPath = getStudyFolderPath(material.parentId, nodesById)
      transaction
        .update(studyLinkTargets)
        .set({
          title: targetTitle,
          titleSearch: normalizeStudyLinkSearch(targetTitle),
          materialTitle: material.title,
          materialTitleSearch: normalizeStudyLinkSearch(material.title),
          folderPath,
          folderPathSearch: normalizeStudyLinkSearch(...folderPath),
          searchText: normalizeStudyLinkSearch(targetTitle, material.title),
          updatedAt: now
        })
        .where(eq(studyLinkTargets.id, target.id))
        .run()
    })
  })

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

  const folder = database.select().from(studyNodes).where(eq(studyNodes.id, id)).get()

  if (!folder) {
    throw new Error('Элемент обучения не найден')
  }

  if (folder.type !== 'folder') {
    throw new Error('Раскрытие доступно только для папок')
  }

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
  const pathRows = rows.map((node) =>
    node.id === source.id ? { ...node, parentId: input.parentId } : node
  )
  const pathNodesById = new Map(pathRows.map((node) => [node.id, node]))
  const movedMaterialIds = new Set(
    pathRows
      .filter((node) => {
        if (node.type !== 'material') return false
        if (node.id === source.id) return true

        let parentId = node.parentId
        while (parentId) {
          if (parentId === source.id) return true
          parentId = pathNodesById.get(parentId)?.parentId ?? null
        }
        return false
      })
      .map((node) => node.id)
  )
  const movedTargets = database
    .select()
    .from(studyLinkTargets)
    .all()
    .filter((target) => movedMaterialIds.has(target.materialId))

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

    movedTargets.forEach((target) => {
      const material = pathNodesById.get(target.materialId)
      if (!material) return
      const folderPath = getStudyFolderPath(material.parentId, pathNodesById)

      transaction
        .update(studyLinkTargets)
        .set({
          folderPath,
          folderPathSearch: normalizeStudyLinkSearch(...folderPath),
          updatedAt: now
        })
        .where(eq(studyLinkTargets.id, target.id))
        .run()
    })
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

  return studyMaterialCoordinator.runForMany(materialIds, async () => {
    const result = getDatabase().delete(studyNodes).where(eq(studyNodes.id, id)).run()

    if (result.changes > 0) {
      await removeStudyAssetsForMaterials(materialIds).catch((reason: unknown) => {
        console.error('Failed to remove study assets after node deletion', reason)
      })
    }

    return result.changes > 0
  })
}
export function searchStudyInternalLinkTargets(
  input: SearchStudyInternalLinkTargetsInput
): StudyInternalLinkTarget[] {
  const database = getDatabase()
  const normalizedQuery = normalizeStudyLinkSearch(input.query)
  const limit = Math.max(1, Math.min(input.limit ?? 40, 100))
  const escapedQuery = normalizedQuery
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')
  const containsPattern = `%${escapedQuery}%`
  const prefixPattern = `${escapedQuery}%`
  const matches = (column: SQLWrapper): ReturnType<typeof sql> =>
    sql`${column} LIKE ${containsPattern} ESCAPE '\\'`
  const searchCondition = normalizedQuery
    ? or(
        matches(studyLinkTargets.titleSearch),
        matches(studyLinkTargets.materialTitleSearch),
        matches(studyLinkTargets.folderPathSearch)
      )
    : undefined
  const rank = sql<number>`
    CASE
      WHEN ${normalizedQuery} <> '' AND ${studyLinkTargets.titleSearch} = ${normalizedQuery} THEN 0
      WHEN ${normalizedQuery} <> '' AND ${studyLinkTargets.titleSearch} LIKE ${prefixPattern} ESCAPE '\\' THEN 10
      WHEN ${normalizedQuery} <> '' AND ${studyLinkTargets.titleSearch} LIKE ${containsPattern} ESCAPE '\\' THEN 20
      WHEN ${normalizedQuery} <> '' AND ${studyLinkTargets.materialTitleSearch} LIKE ${containsPattern} ESCAPE '\\' THEN 30
      WHEN ${normalizedQuery} <> '' AND ${studyLinkTargets.folderPathSearch} LIKE ${containsPattern} ESCAPE '\\' THEN 40
      ELSE 100
    END
    - CASE
        WHEN ${input.currentMaterialId ?? ''} <> ''
          AND ${studyLinkTargets.materialId} = ${input.currentMaterialId ?? ''}
        THEN CASE WHEN ${studyLinkTargets.kind} = 'heading' THEN 8 ELSE 4 END
        ELSE 0
      END
    - CASE WHEN ${studyLinkTargets.kind} = 'material' THEN 1 ELSE 0 END
  `

  return database
    .select({ target: studyLinkTargets, rank: rank.as('rank') })
    .from(studyLinkTargets)
    .where(searchCondition)
    .orderBy(
      rank,
      studyLinkTargets.folderPathSearch,
      studyLinkTargets.materialTitleSearch,
      studyLinkTargets.titleSearch
    )
    .limit(limit)
    .all()
    .map(({ target }) => mapStudyInternalLinkTarget(target))
}

export function resolveStudyInternalLinkTarget(
  input: ResolveStudyInternalLinkTargetInput
): StudyInternalLinkTarget | null {
  const database = getDatabase()

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

  return mapStudyInternalLinkTarget(targetRow)
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

async function saveStudyMaterialNow(input: SaveStudyMaterialInput): Promise<StudyMaterial> {
  const database = getDatabase()

  const document = studyDocumentSchema.parse(input.document)

  await validateStudyDocumentAssets(input.nodeId, document)

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

  const nodeRows = database.select().from(studyNodes).all()
  const nodesById = new Map(nodeRows.map((node) => [node.id, node]))
  const linkTargets = buildStudyLinkTargetRows(
    input.nodeId,
    materialNode.title,
    getStudyFolderPath(materialNode.parentId, nodesById),
    document,
    now
  )

  const savedMaterial = studyMaterialSchema.parse({
    nodeId: input.nodeId,
    document,
    plainText,
    createdAt: (existing?.createdAt ?? now).getTime(),
    updatedAt: now.getTime()
  })

  database.transaction((transaction) => {
    if (existing) {
      transaction
        .update(studyMaterials)
        .set({
          document: savedMaterial.document,
          plainText: savedMaterial.plainText,
          updatedAt: now
        })
        .where(eq(studyMaterials.nodeId, input.nodeId))
        .run()
    } else {
      transaction
        .insert(studyMaterials)
        .values({
          nodeId: input.nodeId,
          document: savedMaterial.document,
          plainText: savedMaterial.plainText,
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

  await cleanupStudyAssetsForDocument(input.nodeId, savedMaterial.document).catch(
    (reason: unknown) => {
      console.error('Failed to clean up unreferenced study assets', reason)
    }
  )

  return savedMaterial
}

export function saveStudyMaterial(input: SaveStudyMaterialInput): Promise<StudyMaterial> {
  return studyMaterialCoordinator.run(input.nodeId, () => saveStudyMaterialNow(input))
}
