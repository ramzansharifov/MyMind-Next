import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'

import type { StudyBlockType, StudyDocument } from '../../shared/contracts/study'
import { STUDY_SAFE_ID_PATTERN } from '../../shared/contracts/study'
import {
  parseStudyCode,
  serializeStudyCodeAst,
  STUDY_CODE_NAME_PATTERN,
  type StudyCodeBlockAst,
  type StudyCodeDocumentAst,
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

export interface StudyCodeNameAssignment {
  kind: 'node' | 'block'
  entityId: string
  materialId?: string
  name: string
}

export interface StudyCodeIdentityTranslation {
  source: string
  assignments: StudyCodeNameAssignment[]
}

class StudyCodeIdentityError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column: number
  ) {
    super(message)
    this.name = 'StudyCodeIdentityError'
  }
}

interface IdentityState {
  nodeNameById: Map<string, string>
  nodeIdByNameKey: Map<string, string>
  blockNameById: Map<string, { materialId: string; name: string }>
  blockIdByMaterialAndNameKey: Map<string, string>
  blockOwners: Map<string, Set<string>>
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

const blockNamePrefixes: Record<StudyBlockType, string> = {
  text: 'Text',
  heading: 'Heading',
  code: 'Code',
  markdown: 'Markdown',
  latex: 'Latex',
  mermaid: 'Mermaid',
  image: 'Image',
  video: 'Video',
  audio: 'Audio',
  file: 'File',
  divider: 'Divider',
  board: 'Board'
}

export function toReadableStudyCodeSource(internalSource: string): string {
  const document = parseStudyCode(internalSource)
  const state = loadIdentityState(true)
  const pendingAssignments: StudyCodeNameAssignment[] = []
  const usedNodeKeys = new Set(state.nodeIdByNameKey.keys())
  const usedBlockKeysByMaterial = collectUsedBlockKeysByMaterial(state)

  const visit = (node: StudyCodeTreeAst): void => {
    if (!node.id) {
      identityFail(node, 'Внутреннее представление DSL не содержит идентификатор элемента')
    }

    const nodeId = node.id
    let nodeName = state.nodeNameById.get(nodeId)
    if (!nodeName) {
      nodeName = createGeneratedName(node.kind === 'folder' ? 'Folder' : 'Material', usedNodeKeys)
      usedNodeKeys.add(nameKey(nodeName))
      state.nodeNameById.set(nodeId, nodeName)
      state.nodeIdByNameKey.set(nameKey(nodeName), nodeId)
      pendingAssignments.push({ kind: 'node', entityId: nodeId, name: nodeName })
    }

    node.name = nodeName
    node.id = undefined

    if (node.kind === 'folder') {
      node.children.forEach(visit)
      return
    }

    const materialId = nodeId
    const retainedBlockIds = new Set<string>()
    const usedBlockKeys = usedBlockKeysByMaterial.get(materialId) ?? new Set<string>()
    usedBlockKeysByMaterial.set(materialId, usedBlockKeys)

    node.blocks.forEach((block) => {
      if (!block.id) {
        identityFail(block, 'Внутреннее представление DSL не содержит идентификатор блока')
      }

      const blockId = block.id
      retainedBlockIds.add(blockId)
      let blockName = state.blockNameById.get(blockId)?.name

      if (!blockName) {
        blockName = createGeneratedName(blockNamePrefixes[block.blockType], usedBlockKeys)
        usedBlockKeys.add(nameKey(blockName))
        state.blockNameById.set(blockId, { materialId, name: blockName })
        state.blockIdByMaterialAndNameKey.set(blockScopeKey(materialId, blockName), blockId)
        pendingAssignments.push({
          kind: 'block',
          entityId: blockId,
          materialId,
          name: blockName
        })
      }

      block.name = blockName
      block.id = undefined
    })

    removeStaleBlockNameRows(materialId, retainedBlockIds)
  }

  visit(document.root)
  persistStudyCodeNameAssignments(pendingAssignments)
  return serializeStudyCodeAst(document)
}

export function translateReadableStudyCodeSource(
  nodeId: string,
  source: string
): StudyCodeIdentityTranslation {
  const document = parseStudyCode(source)
  const database = getDatabase()
  const allNodes = database.select().from(studyNodes).all()
  const root = allNodes.find((node) => node.id === nodeId)
  if (!root) throw new Error('Элемент обучения не найден')

  const scopeNodeIds = collectSubtreeIds(nodeId, allNodes)
  const allNodeIds = new Set(allNodes.map((node) => node.id))
  const state = loadIdentityState(true)
  const assignments: StudyCodeNameAssignment[] = []
  const pendingNodeIdsByNameKey = new Map<string, string>()
  const pendingBlockIdsByScopeKey = new Map<string, string>()
  const desiredNodeIds = new Set<string>()
  const claimedBlockOwners = new Map<string, string>()

  const resolveNode = (node: StudyCodeTreeAst, isRoot: boolean): string => {
    validateReadableName(node.name, node)

    let resolvedId: string
    if (isRoot) {
      if (node.id && node.id !== nodeId) {
        identityFail(node, 'Идентификатор корневого элемента нельзя менять')
      }
      resolvedId = nodeId
      bindNodeName(node, resolvedId, state, assignments, pendingNodeIdsByNameKey)
    } else if (node.id) {
      if (!STUDY_SAFE_ID_PATTERN.test(node.id)) identityFail(node, 'Некорректный @id')
      if (!scopeNodeIds.has(node.id)) {
        identityFail(
          node,
          allNodeIds.has(node.id)
            ? 'Существующий @id принадлежит другой ветке обучения'
            : 'Существующий @id должен принадлежать выбранной ветке обучения'
        )
      }
      resolvedId = node.id
      bindNodeName(node, resolvedId, state, assignments, pendingNodeIdsByNameKey)
    } else if (node.name) {
      const key = nameKey(node.name)
      const mappedId = pendingNodeIdsByNameKey.get(key) ?? state.nodeIdByNameKey.get(key)
      if (mappedId) {
        if (!scopeNodeIds.has(mappedId)) {
          identityFail(node, `Имя ${node.name} принадлежит другой ветке обучения`)
        }
        resolvedId = mappedId
      } else {
        resolvedId = createUniqueId(new Set([...allNodeIds, ...desiredNodeIds]))
        assignments.push({ kind: 'node', entityId: resolvedId, name: node.name })
        pendingNodeIdsByNameKey.set(key, resolvedId)
      }
    } else {
      resolvedId = createUniqueId(new Set([...allNodeIds, ...desiredNodeIds]))
    }

    if (desiredNodeIds.has(resolvedId)) {
      identityFail(node, 'Один элемент DSL указан несколько раз')
    }
    desiredNodeIds.add(resolvedId)

    node.id = resolvedId
    node.name = undefined

    if (node.kind === 'folder') {
      node.children.forEach((child) => resolveNode(child, false))
    } else {
      resolveMaterialBlocks(
        node,
        resolvedId,
        state,
        assignments,
        pendingBlockIdsByScopeKey,
        claimedBlockOwners
      )
    }

    return resolvedId
  }

  resolveNode(document.root, true)

  return {
    source: serializeStudyCodeAst(document),
    assignments
  }
}

export function persistStudyCodeNameAssignments(assignments: StudyCodeNameAssignment[]): void {
  if (assignments.length === 0) return

  const database = getDatabase()
  const now = new Date()
  const state = loadIdentityState(false)
  const existingNodeIds = new Set(database.select({ id: studyNodes.id }).from(studyNodes).all().map((row) => row.id))
  const blockOwners = loadBlockOwners()

  database.transaction((transaction) => {
    assignments.forEach((assignment) => {
      if (assignment.kind === 'node') {
        if (!existingNodeIds.has(assignment.entityId)) return
        const existingName = state.nodeNameById.get(assignment.entityId)
        if (existingName) return

        const key = nameKey(assignment.name)
        const occupied = state.nodeIdByNameKey.get(key)
        if (occupied && occupied !== assignment.entityId) {
          throw new Error(`Имя DSL «${assignment.name}» уже занято`)
        }

        transaction
          .insert(studyCodeNodeNames)
          .values({
            nodeId: assignment.entityId,
            name: assignment.name,
            nameKey: key,
            createdAt: now,
            updatedAt: now
          })
          .run()
        state.nodeNameById.set(assignment.entityId, assignment.name)
        state.nodeIdByNameKey.set(key, assignment.entityId)
        return
      }

      const materialId = assignment.materialId
      if (!materialId || !existingNodeIds.has(materialId)) return
      if (!blockOwners.get(assignment.entityId)?.has(materialId)) return

      const existingName = state.blockNameById.get(assignment.entityId)
      if (existingName) return

      const scopedKey = blockScopeKey(materialId, assignment.name)
      const occupied = state.blockIdByMaterialAndNameKey.get(scopedKey)
      if (occupied && occupied !== assignment.entityId) {
        throw new Error(`Имя блока DSL «${assignment.name}» уже занято в материале`)
      }

      transaction
        .insert(studyCodeBlockNames)
        .values({
          blockId: assignment.entityId,
          materialId,
          name: assignment.name,
          nameKey: nameKey(assignment.name),
          createdAt: now,
          updatedAt: now
        })
        .run()
      state.blockNameById.set(assignment.entityId, { materialId, name: assignment.name })
      state.blockIdByMaterialAndNameKey.set(scopedKey, assignment.entityId)
    })
  })
}

function resolveMaterialBlocks(
  material: StudyCodeMaterialAst,
  materialId: string,
  state: IdentityState,
  assignments: StudyCodeNameAssignment[],
  pendingBlockIdsByScopeKey: Map<string, string>,
  claimedBlockOwners: Map<string, string>
): void {
  const allKnownBlockIds = new Set(state.blockNameById.keys())

  material.blocks.forEach((block) => {
    validateReadableName(block.name, block)

    let resolvedId: string
    if (block.id) {
      if (!STUDY_SAFE_ID_PATTERN.test(block.id)) identityFail(block, 'Некорректный @id блока')
      const owners = state.blockOwners.get(block.id)
      if (owners && (owners.size !== 1 || !owners.has(materialId))) {
        identityFail(block, 'Идентификатор блока уже принадлежит другому материалу')
      }
      resolvedId = block.id
      bindBlockName(
        block,
        resolvedId,
        materialId,
        state,
        assignments,
        pendingBlockIdsByScopeKey
      )
    } else if (block.name) {
      const scopedKey = blockScopeKey(materialId, block.name)
      const mappedId =
        pendingBlockIdsByScopeKey.get(scopedKey) ?? state.blockIdByMaterialAndNameKey.get(scopedKey)
      if (mappedId) {
        resolvedId = mappedId
      } else {
        resolvedId = createUniqueId(new Set([...allKnownBlockIds, ...claimedBlockOwners.keys()]))
        assignments.push({
          kind: 'block',
          entityId: resolvedId,
          materialId,
          name: block.name
        })
        pendingBlockIdsByScopeKey.set(scopedKey, resolvedId)
        allKnownBlockIds.add(resolvedId)
      }
    } else {
      resolvedId = createUniqueId(new Set([...allKnownBlockIds, ...claimedBlockOwners.keys()]))
      allKnownBlockIds.add(resolvedId)
    }

    const claimedOwner = claimedBlockOwners.get(resolvedId)
    if (claimedOwner) {
      identityFail(
        block,
        claimedOwner === materialId
          ? 'Один блок указан в материале несколько раз'
          : 'Один идентификатор блока нельзя использовать в разных материалах'
      )
    }
    claimedBlockOwners.set(resolvedId, materialId)

    block.id = resolvedId
    block.name = undefined
  })
}

function bindNodeName(
  node: StudyCodeTreeAst,
  nodeId: string,
  state: IdentityState,
  assignments: StudyCodeNameAssignment[],
  pendingNodeIdsByNameKey: Map<string, string>
): void {
  if (!node.name) return

  const key = nameKey(node.name)
  const existingForId = state.nodeNameById.get(nodeId)
  if (existingForId && nameKey(existingForId) !== key) {
    identityFail(
      node,
      `Имя существующего элемента — ${existingForId}. Для переименования измените обычное название, а не DSL-имя.`
    )
  }

  const occupied = pendingNodeIdsByNameKey.get(key) ?? state.nodeIdByNameKey.get(key)
  if (occupied && occupied !== nodeId) {
    identityFail(node, `Имя DSL «${node.name}» уже используется другим элементом`)
  }

  if (!existingForId) {
    assignments.push({ kind: 'node', entityId: nodeId, name: node.name })
    pendingNodeIdsByNameKey.set(key, nodeId)
  }
}

function bindBlockName(
  block: StudyCodeBlockAst,
  blockId: string,
  materialId: string,
  state: IdentityState,
  assignments: StudyCodeNameAssignment[],
  pendingBlockIdsByScopeKey: Map<string, string>
): void {
  if (!block.name) return

  const key = nameKey(block.name)
  const existingForId = state.blockNameById.get(blockId)
  if (existingForId) {
    if (existingForId.materialId !== materialId || nameKey(existingForId.name) !== key) {
      identityFail(
        block,
        `Имя существующего блока — ${existingForId.name}. DSL-имя является стабильной ссылкой и не переименовывается.`
      )
    }
    return
  }

  const scopedKey = blockScopeKey(materialId, block.name)
  const occupied =
    pendingBlockIdsByScopeKey.get(scopedKey) ?? state.blockIdByMaterialAndNameKey.get(scopedKey)
  if (occupied && occupied !== blockId) {
    identityFail(block, `Имя блока DSL «${block.name}» уже используется в этом материале`)
  }

  assignments.push({ kind: 'block', entityId: blockId, materialId, name: block.name })
  pendingBlockIdsByScopeKey.set(scopedKey, blockId)
}

function loadIdentityState(cleanStaleBlocks: boolean): IdentityState {
  if (cleanStaleBlocks) removeAllStaleBlockNameRows()

  const database = getDatabase()
  const nodeRows = database.select().from(studyCodeNodeNames).all()
  const blockRows = database.select().from(studyCodeBlockNames).all()

  const nodeNameById = new Map(nodeRows.map((row) => [row.nodeId, row.name]))
  const nodeIdByNameKey = new Map(nodeRows.map((row) => [row.nameKey, row.nodeId]))
  const blockNameById = new Map(
    blockRows.map((row) => [row.blockId, { materialId: row.materialId, name: row.name }])
  )
  const blockIdByMaterialAndNameKey = new Map(
    blockRows.map((row) => [`${row.materialId}:${row.nameKey}`, row.blockId])
  )

  return {
    nodeNameById,
    nodeIdByNameKey,
    blockNameById,
    blockIdByMaterialAndNameKey,
    blockOwners: loadBlockOwners()
  }
}

function loadBlockOwners(): Map<string, Set<string>> {
  const owners = new Map<string, Set<string>>()
  getDatabase()
    .select()
    .from(studyMaterials)
    .all()
    .forEach((material) => {
      const parsed = studyDocumentSchema.safeParse(material.document)
      if (!parsed.success) return
      parsed.data.blocks.forEach((block) => {
        const materialIds = owners.get(block.id) ?? new Set<string>()
        materialIds.add(material.nodeId)
        owners.set(block.id, materialIds)
      })
    })
  return owners
}

function removeAllStaleBlockNameRows(): void {
  const database = getDatabase()
  const liveOwners = loadBlockOwners()
  database
    .select()
    .from(studyCodeBlockNames)
    .all()
    .forEach((row) => {
      if (!liveOwners.get(row.blockId)?.has(row.materialId)) {
        database.delete(studyCodeBlockNames).where(eq(studyCodeBlockNames.blockId, row.blockId)).run()
      }
    })
}

function removeStaleBlockNameRows(materialId: string, retainedBlockIds: ReadonlySet<string>): void {
  const database = getDatabase()
  database
    .select()
    .from(studyCodeBlockNames)
    .where(eq(studyCodeBlockNames.materialId, materialId))
    .all()
    .forEach((row) => {
      if (!retainedBlockIds.has(row.blockId)) {
        database.delete(studyCodeBlockNames).where(eq(studyCodeBlockNames.blockId, row.blockId)).run()
      }
    })
}

function collectUsedBlockKeysByMaterial(state: IdentityState): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()
  state.blockNameById.forEach(({ materialId, name }) => {
    const keys = result.get(materialId) ?? new Set<string>()
    keys.add(nameKey(name))
    result.set(materialId, keys)
  })
  return result
}

function collectSubtreeIds(
  rootId: string,
  rows: Array<typeof studyNodes.$inferSelect>
): Set<string> {
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

function validateReadableName(
  name: string | undefined,
  location: { line: number; column: number }
): void {
  if (!name) return
  if (!STUDY_CODE_NAME_PATTERN.test(name)) {
    identityFail(
      location,
      'DSL-имя должно начинаться с буквы или _, содержать только латинские буквы, цифры и _ и быть не длиннее 80 символов'
    )
  }
  if (reservedNames.has(nameKey(name))) {
    identityFail(location, `Имя DSL «${name}» зарезервировано языком`)
  }
}

function createGeneratedName(prefix: string, usedKeys: ReadonlySet<string>): string {
  let index = 1
  while (usedKeys.has(nameKey(`${prefix}${index}`))) index += 1
  return `${prefix}${index}`
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

function identityFail(location: { line: number; column: number }, message: string): never {
  throw new StudyCodeIdentityError(message, location.line, location.column)
}
