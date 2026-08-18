import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'

import type { StudyDocument } from '../../shared/contracts/study'
import { STUDY_SAFE_ID_PATTERN } from '../../shared/contracts/study'
import {
  parseStudyCode,
  serializeStudyCodeAst,
  STUDY_CODE_NAME_PATTERN,
  type StudyCodeBlockAst,
  type StudyCodeMaterialAst,
  type StudyCodeTreeAst
} from '../../shared/study-code'
import { studyDocumentSchema } from '../../shared/validation/study'
import { getDatabase } from '../database/client'
import {
  studyCodeBlockNames,
  studyCodeNodeNames,
  studyMaterials,
  studyNodes
} from '../database/schema'
import {
  resolveStudyCodeSymbolicInternalLinks,
  type StudyCodeInternalLinkReference,
  type StudyCodeResolvedInternalLink
} from './study-code-internal-links'
import {
  persistStudyCodeNameAssignments,
  type StudyCodeNameAssignment
} from './study-code-name-store'

export type StudyCodePendingNameAssignment =
  | { kind: 'node'; path: number[]; name: string }
  | { kind: 'block'; materialPath: number[]; blockIndex: number; name: string }

export interface StudyCodeReadableTranslation {
  source: string
  pendingNames: StudyCodePendingNameAssignment[]
}

class StudyCodeReadableIdentityError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column: number
  ) {
    super(message)
    this.name = 'StudyCodeReadableIdentityError'
  }
}

interface ReadableIdentityState {
  nodeNameById: Map<string, string>
  nodeIdByNameKey: Map<string, string>
  blockNameById: Map<string, { materialId: string; name: string }>
  blockIdByMaterialAndNameKey: Map<string, string>
  blockOwners: Map<string, Set<string>>
  documents: Map<string, StudyDocument>
}

interface PlannedNodeMetadata {
  id: string
  kind: 'folder' | 'material'
  title: string
  parentId: string | null
  ast: StudyCodeTreeAst
}

const reservedNames = new Set(
  [
    'folder',
    'material',
    'text',
    'heading',
    'code',
    'markdown',
    'latex',
    'mermaid',
    'image',
    'video',
    'audio',
    'file',
    'divider',
    'board',
    'html',
    'true',
    'false',
    'id',
    'version'
  ].map((name) => name.toLowerCase())
)

export function translateReadableStudyCodeSource(
  nodeId: string,
  source: string
): StudyCodeReadableTranslation {
  const document = parseStudyCode(source)
  const database = getDatabase()
  const allNodes = database.select().from(studyNodes).all()
  const allNodesById = new Map(allNodes.map((node) => [node.id, node]))
  const root = allNodesById.get(nodeId)
  if (!root) throw new Error('Элемент обучения не найден')

  const scopeNodeIds = collectSubtreeIds(nodeId, allNodes)
  const allNodeIds = new Set(allNodes.map((node) => node.id))
  const state = loadReadableIdentityState()
  const allBlockIds = new Set(state.blockOwners.keys())
  const pendingNames: StudyCodePendingNameAssignment[] = []
  const claimedExistingNodes = new Set<string>()
  const claimedNodeNameKeys = new Set<string>()
  const claimedBlockIds = new Set<string>()

  const assignNodeIdentities = (
    node: StudyCodeTreeAst,
    isRoot: boolean,
    path: number[]
  ): void => {
    validateReadableName(node.name, node)

    if (node.name) {
      const key = nameKey(node.name)
      if (claimedNodeNameKeys.has(key)) fail(node, `Имя DSL «${node.name}» используется несколько раз`)
      claimedNodeNameKeys.add(key)
    }

    let resolvedId: string | undefined

    if (isRoot) {
      if (node.id && node.id !== nodeId) fail(node, 'Идентификатор корневого элемента нельзя менять')
      resolvedId = nodeId
      validateExistingNodeName(node, resolvedId, state)
    } else if (node.id) {
      if (!STUDY_SAFE_ID_PATTERN.test(node.id)) fail(node, 'Некорректный @id')
      if (!scopeNodeIds.has(node.id)) {
        fail(
          node,
          allNodeIds.has(node.id)
            ? 'Существующий @id принадлежит другой ветке обучения'
            : 'Существующий @id должен принадлежать выбранной ветке обучения'
        )
      }
      resolvedId = node.id
      validateExistingNodeName(node, resolvedId, state)
    } else if (node.name) {
      const mappedId = state.nodeIdByNameKey.get(nameKey(node.name))
      if (mappedId) {
        if (!scopeNodeIds.has(mappedId)) fail(node, `Имя ${node.name} принадлежит другой ветке обучения`)
        resolvedId = mappedId
      } else {
        resolvedId = createUniqueId(allNodeIds)
        allNodeIds.add(resolvedId)
        pendingNames.push({ kind: 'node', path: [...path], name: node.name })
      }
    }

    if (resolvedId) {
      if (claimedExistingNodes.has(resolvedId)) fail(node, 'Один элемент DSL указан несколько раз')
      claimedExistingNodes.add(resolvedId)
    }

    node.id = resolvedId

    if (node.kind === 'folder') {
      node.children.forEach((child, index) => assignNodeIdentities(child, false, [...path, index]))
      return
    }

    assignMaterialBlockIdentities(
      node,
      resolvedId,
      path,
      state,
      pendingNames,
      claimedBlockIds,
      allBlockIds
    )
  }

  assignNodeIdentities(document.root, true, [])

  const plannedNodesById = new Map<string, PlannedNodeMetadata>()
  const plannedNodesByName = new Map<string, PlannedNodeMetadata>()
  const plannedHeadingsByMaterialAndName = new Map<
    string,
    { id: string; title: string; level: 1 | 2 | 3 }
  >()

  const indexPlannedTree = (node: StudyCodeTreeAst, parentId: string | null): void => {
    if (!node.id) fail(node, 'Не удалось назначить внутренний идентификатор элементу DSL')
    const metadata: PlannedNodeMetadata = {
      id: node.id,
      kind: node.kind,
      title: node.title,
      parentId,
      ast: node
    }
    plannedNodesById.set(node.id, metadata)
    if (node.name) plannedNodesByName.set(nameKey(node.name), metadata)

    if (node.kind === 'folder') {
      node.children.forEach((child) => indexPlannedTree(child, node.id!))
      return
    }

    node.blocks.forEach((block) => {
      if (block.blockType !== 'heading' || !block.name || !block.id) return
      plannedHeadingsByMaterialAndName.set(blockScopeKey(node.id!, block.name), {
        id: block.id,
        title: block.title ?? '',
        level: block.headingLevel ?? 1
      })
    })
  }

  indexPlannedTree(document.root, root.parentId)

  const resolveInternalLink = (
    reference: StudyCodeInternalLinkReference,
    location: { line: number; column: number }
  ): StudyCodeResolvedInternalLink => {
    const materialKey = nameKey(reference.materialName)
    const plannedTarget = plannedNodesByName.get(materialKey)
    const storedTargetId = state.nodeIdByNameKey.get(materialKey)
    const materialId = plannedTarget?.id ?? storedTargetId

    if (!materialId) {
      fail(location, `Внутренняя ссылка: материал DSL «${reference.materialName}» не найден`)
    }

    const plannedMaterial = plannedNodesById.get(materialId)
    const storedMaterial = allNodesById.get(materialId)
    const kind = plannedMaterial?.kind ?? storedMaterial?.type
    if (kind !== 'material') {
      fail(location, `Внутренняя ссылка «${reference.materialName}» должна указывать на материал`)
    }

    const materialTitle = plannedMaterial?.title ?? storedMaterial?.title ?? reference.materialName
    let headingId: string | null = null
    let headingLevel: 1 | 2 | 3 | null = null
    let title = materialTitle

    if (reference.headingName) {
      const plannedHeading = plannedHeadingsByMaterialAndName.get(
        blockScopeKey(materialId, reference.headingName)
      )
      const storedHeadingId = state.blockIdByMaterialAndNameKey.get(
        blockScopeKey(materialId, reference.headingName)
      )
      const storedHeading = storedHeadingId
        ? state.documents
            .get(materialId)
            ?.blocks.find((block) => block.id === storedHeadingId && block.type === 'heading')
        : undefined

      if (!plannedHeading && !storedHeading) {
        fail(
          location,
          `Внутренняя ссылка: heading DSL «${reference.materialName}.${reference.headingName}» не найден`
        )
      }

      headingId = plannedHeading?.id ?? storedHeading?.id ?? null
      headingLevel = plannedHeading?.level ?? (storedHeading?.type === 'heading' ? storedHeading.level : null)
      title = plannedHeading?.title ?? (storedHeading?.type === 'heading' ? storedHeading.text : materialTitle)
    }

    return {
      kind: headingId ? 'heading' : 'material',
      materialId,
      headingId,
      headingLevel,
      title,
      materialTitle,
      folderPath: getPlannedFolderPath(materialId, plannedNodesById, allNodesById)
    }
  }

  const resolveLinks = (node: StudyCodeTreeAst): void => {
    if (node.kind === 'folder') {
      node.children.forEach(resolveLinks)
      return
    }

    node.blocks.forEach((block) => {
      if (block.blockType !== 'text') return
      const resolved = resolveStudyCodeSymbolicInternalLinks(
        block.body ?? '',
        block.html,
        (reference) => resolveInternalLink(reference, block)
      )
      block.body = resolved.text
      block.html = resolved.html
    })
  }

  resolveLinks(document.root)

  return { source: serializeStudyCodeAst(document), pendingNames }
}

export function persistAppliedStudyCodeNames(
  rootId: string,
  assignments: StudyCodePendingNameAssignment[]
): void {
  if (assignments.length === 0) return

  const database = getDatabase()
  const rows = database.select().from(studyNodes).all()
  const root = rows.find((row) => row.id === rootId)
  if (!root) throw new Error('Корневой элемент режима «Код» не найден после сохранения')

  const childrenByParent = new Map<string, Array<typeof studyNodes.$inferSelect>>()
  rows.forEach((row) => {
    if (!row.parentId) return
    const children = childrenByParent.get(row.parentId) ?? []
    children.push(row)
    childrenByParent.set(row.parentId, children)
  })
  childrenByParent.forEach((children) => children.sort((a, b) => a.position - b.position))

  const resolvePath = (path: readonly number[]): typeof studyNodes.$inferSelect => {
    let current = root
    for (const childIndex of path) {
      const child = childrenByParent.get(current.id)?.[childIndex]
      if (!child) throw new Error('Не удалось сопоставить созданный элемент с DSL после сохранения')
      current = child
    }
    return current
  }

  const concrete: StudyCodeNameAssignment[] = assignments.map((assignment) => {
    if (assignment.kind === 'node') {
      const node = resolvePath(assignment.path)
      return { kind: 'node', entityId: node.id, name: assignment.name }
    }

    const materialNode = resolvePath(assignment.materialPath)
    if (materialNode.type !== 'material') {
      throw new Error('Не удалось сопоставить созданный блок с материалом после сохранения')
    }

    const material = database
      .select()
      .from(studyMaterials)
      .where(eq(studyMaterials.nodeId, materialNode.id))
      .get()
    const parsed = studyDocumentSchema.safeParse(material?.document)
    if (!parsed.success) throw new Error('Не удалось прочитать созданный материал после сохранения')
    const block = parsed.data.blocks[assignment.blockIndex]
    if (!block) throw new Error('Не удалось сопоставить созданный блок с DSL после сохранения')

    return {
      kind: 'block',
      entityId: block.id,
      materialId: materialNode.id,
      name: assignment.name
    }
  })

  persistStudyCodeNameAssignments(concrete)
}

function assignMaterialBlockIdentities(
  material: StudyCodeMaterialAst,
  existingMaterialId: string | undefined,
  materialPath: number[],
  state: ReadableIdentityState,
  pendingNames: StudyCodePendingNameAssignment[],
  claimedBlockIds: Set<string>,
  allBlockIds: Set<string>
): void {
  const claimedNameKeys = new Set<string>()
  const existingDocument = existingMaterialId ? state.documents.get(existingMaterialId) : undefined

  material.blocks.forEach((block, blockIndex) => {
    validateReadableName(block.name, block)

    if (block.name) {
      const key = nameKey(block.name)
      if (claimedNameKeys.has(key)) fail(block, `Имя блока DSL «${block.name}» используется несколько раз`)
      claimedNameKeys.add(key)
    }

    let existingBlockId: string | undefined

    if (block.id) {
      if (!STUDY_SAFE_ID_PATTERN.test(block.id)) fail(block, 'Некорректный @id блока')
      const owners = state.blockOwners.get(block.id)
      if (owners) {
        if (!existingMaterialId || owners.size !== 1 || !owners.has(existingMaterialId)) {
          fail(block, 'Идентификатор блока уже принадлежит другому материалу')
        }
        existingBlockId = block.id
        validateExistingBlockName(block, block.id, existingMaterialId, state)
      } else {
        existingBlockId = block.id
        if (block.name) {
          pendingNames.push({
            kind: 'block',
            materialPath: [...materialPath],
            blockIndex,
            name: block.name
          })
        }
      }
    } else if (block.name) {
      if (existingMaterialId) {
        existingBlockId = state.blockIdByMaterialAndNameKey.get(
          blockScopeKey(existingMaterialId, block.name)
        )
      }

      if (!existingBlockId) {
        existingBlockId = createUniqueId(allBlockIds)
        allBlockIds.add(existingBlockId)
        pendingNames.push({
          kind: 'block',
          materialPath: [...materialPath],
          blockIndex,
          name: block.name
        })
      }
    }

    if (existingBlockId) {
      if (claimedBlockIds.has(existingBlockId)) fail(block, 'Один идентификатор блока используется несколько раз')
      claimedBlockIds.add(existingBlockId)
    }

    validateBoardBinding(block, existingBlockId, existingDocument)
    block.id = existingBlockId
  })
}

function validateBoardBinding(
  block: StudyCodeBlockAst,
  existingBlockId: string | undefined,
  existingDocument: StudyDocument | undefined
): void {
  if (block.blockType !== 'board') return

  const requestedBoardId = block.attributes.board
  if (typeof requestedBoardId !== 'string') return

  const existingBlock = existingBlockId
    ? existingDocument?.blocks.find((candidate) => candidate.id === existingBlockId)
    : undefined

  if (
    !existingBlock ||
    existingBlock.type !== 'board' ||
    !existingBlock.boardId ||
    existingBlock.boardId !== requestedBoardId
  ) {
    fail(block, 'Нельзя назначить или подменить связанную доску через DSL')
  }
}

function validateExistingNodeName(
  node: StudyCodeTreeAst,
  nodeId: string,
  state: ReadableIdentityState
): void {
  if (!node.name) return
  const existingName = state.nodeNameById.get(nodeId)
  if (existingName && nameKey(existingName) !== nameKey(node.name)) {
    fail(node, `Имя существующего элемента — ${existingName}. Измените обычное название, а не DSL-имя.`)
  }
  const occupied = state.nodeIdByNameKey.get(nameKey(node.name))
  if (occupied && occupied !== nodeId) fail(node, `Имя DSL «${node.name}» уже используется другим элементом`)
}

function validateExistingBlockName(
  block: StudyCodeBlockAst,
  blockId: string,
  materialId: string,
  state: ReadableIdentityState
): void {
  if (!block.name) return
  const existing = state.blockNameById.get(blockId)
  if (existing && (existing.materialId !== materialId || nameKey(existing.name) !== nameKey(block.name))) {
    fail(block, `Имя существующего блока — ${existing.name}. DSL-имя является стабильной ссылкой.`)
  }
  const occupied = state.blockIdByMaterialAndNameKey.get(blockScopeKey(materialId, block.name))
  if (occupied && occupied !== blockId) {
    fail(block, `Имя блока DSL «${block.name}» уже используется в этом материале`)
  }
}

function loadReadableIdentityState(): ReadableIdentityState {
  const database = getDatabase()
  const nodeRows = database.select().from(studyCodeNodeNames).all()
  const blockRows = database.select().from(studyCodeBlockNames).all()
  const documents = new Map<string, StudyDocument>()
  const blockOwners = new Map<string, Set<string>>()

  database
    .select()
    .from(studyMaterials)
    .all()
    .forEach((material) => {
      const parsed = studyDocumentSchema.safeParse(material.document)
      if (!parsed.success) return
      documents.set(material.nodeId, parsed.data)
      parsed.data.blocks.forEach((block) => {
        const materialIds = blockOwners.get(block.id) ?? new Set<string>()
        materialIds.add(material.nodeId)
        blockOwners.set(block.id, materialIds)
      })
    })

  return {
    nodeNameById: new Map(nodeRows.map((row) => [row.nodeId, row.name])),
    nodeIdByNameKey: new Map(nodeRows.map((row) => [row.nameKey, row.nodeId])),
    blockNameById: new Map(
      blockRows.map((row) => [row.blockId, { materialId: row.materialId, name: row.name }])
    ),
    blockIdByMaterialAndNameKey: new Map(
      blockRows.map((row) => [`${row.materialId}:${row.nameKey}`, row.blockId])
    ),
    blockOwners,
    documents
  }
}

function collectSubtreeIds(rootId: string, rows: Array<typeof studyNodes.$inferSelect>): Set<string> {
  const included = new Set<string>([rootId])
  let changed = true
  while (changed) {
    changed = false
    rows.forEach((row) => {
      if (row.parentId && included.has(row.parentId) && !included.has(row.id)) {
        included.add(row.id)
        changed = true
      }
    })
  }
  return included
}

function getPlannedFolderPath(
  materialId: string,
  plannedNodes: ReadonlyMap<string, PlannedNodeMetadata>,
  storedNodes: ReadonlyMap<string, typeof studyNodes.$inferSelect>
): string[] {
  const path: string[] = []
  const visited = new Set<string>()
  let parentId = plannedNodes.get(materialId)?.parentId ?? storedNodes.get(materialId)?.parentId ?? null

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    const planned = plannedNodes.get(parentId)
    const stored = storedNodes.get(parentId)
    const kind = planned?.kind ?? stored?.type
    const title = planned?.title ?? stored?.title
    if (kind === 'folder' && title) path.unshift(title)
    parentId = planned?.parentId ?? stored?.parentId ?? null
  }

  return path
}

function validateReadableName(name: string | undefined, location: { line: number; column: number }): void {
  if (!name) return
  if (!STUDY_CODE_NAME_PATTERN.test(name)) {
    fail(
      location,
      'DSL-имя должно начинаться с буквы или _, содержать только латинские буквы, цифры и _ и быть не длиннее 80 символов'
    )
  }
  if (reservedNames.has(nameKey(name))) fail(location, `Имя DSL «${name}» зарезервировано языком`)
}

function createUniqueId(existing: ReadonlySet<string>): string {
  let id = randomUUID()
  while (existing.has(id)) id = randomUUID()
  return id
}

function nameKey(name: string): string {
  return name.toLowerCase()
}

function blockScopeKey(materialId: string, name: string): string {
  return `${materialId}:${nameKey(name)}`
}

function fail(location: { line: number; column: number }, message: string): never {
  throw new StudyCodeReadableIdentityError(message, location.line, location.column)
}
