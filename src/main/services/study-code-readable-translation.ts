import { eq } from 'drizzle-orm'

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
  const root = allNodes.find((node) => node.id === nodeId)
  if (!root) throw new Error('Элемент обучения не найден')

  const scopeNodeIds = collectSubtreeIds(nodeId, allNodes)
  const allNodeIds = new Set(allNodes.map((node) => node.id))
  const state = loadReadableIdentityState()
  const pendingNames: StudyCodePendingNameAssignment[] = []
  const claimedExistingNodes = new Set<string>()
  const claimedNodeNameKeys = new Set<string>()
  const claimedBlockIds = new Set<string>()

  const visit = (node: StudyCodeTreeAst, isRoot: boolean, path: number[]): void => {
    validateReadableName(node.name, node)
    let existingId: string | undefined

    if (isRoot) {
      if (node.id && node.id !== nodeId) fail(node, 'Идентификатор корневого элемента нельзя менять')
      existingId = nodeId
      validateExistingNodeName(node, existingId, state)
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
      existingId = node.id
      validateExistingNodeName(node, existingId, state)
    } else if (node.name) {
      const key = nameKey(node.name)
      if (claimedNodeNameKeys.has(key)) fail(node, `Имя DSL «${node.name}» используется несколько раз`)
      claimedNodeNameKeys.add(key)

      const mappedId = state.nodeIdByNameKey.get(key)
      if (mappedId) {
        if (!scopeNodeIds.has(mappedId)) fail(node, `Имя ${node.name} принадлежит другой ветке обучения`)
        existingId = mappedId
      } else {
        pendingNames.push({ kind: 'node', path: [...path], name: node.name })
      }
    }

    if (existingId) {
      if (claimedExistingNodes.has(existingId)) fail(node, 'Один элемент DSL указан несколько раз')
      claimedExistingNodes.add(existingId)
    }

    node.id = existingId
    node.name = undefined

    if (node.kind === 'folder') {
      node.children.forEach((child, index) => visit(child, false, [...path, index]))
      return
    }

    translateMaterialBlocks(node, existingId, path, state, pendingNames, claimedBlockIds)
  }

  visit(document.root, true, [])

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

function translateMaterialBlocks(
  material: StudyCodeMaterialAst,
  existingMaterialId: string | undefined,
  materialPath: number[],
  state: ReadableIdentityState,
  pendingNames: StudyCodePendingNameAssignment[],
  claimedBlockIds: Set<string>
): void {
  const claimedNameKeys = new Set<string>()

  material.blocks.forEach((block, blockIndex) => {
    validateReadableName(block.name, block)
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
        // Legacy input may explicitly choose an id for a new block. We accept it but never serialize it back.
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
      const key = nameKey(block.name)
      if (claimedNameKeys.has(key)) fail(block, `Имя блока DSL «${block.name}» используется несколько раз`)
      claimedNameKeys.add(key)

      if (existingMaterialId) {
        existingBlockId = state.blockIdByMaterialAndNameKey.get(
          blockScopeKey(existingMaterialId, block.name)
        )
      }

      if (!existingBlockId) {
        pendingNames.push({
          kind: 'block',
          materialPath: [...materialPath],
          blockIndex,
          name: block.name
        })
      }
    }

    if (existingBlockId && state.blockOwners.has(existingBlockId)) {
      if (claimedBlockIds.has(existingBlockId)) fail(block, 'Один идентификатор блока используется несколько раз')
      claimedBlockIds.add(existingBlockId)
    }

    block.id = existingBlockId
    block.name = undefined
  })
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
  return {
    nodeNameById: new Map(nodeRows.map((row) => [row.nodeId, row.name])),
    nodeIdByNameKey: new Map(nodeRows.map((row) => [row.nameKey, row.nodeId])),
    blockNameById: new Map(
      blockRows.map((row) => [row.blockId, { materialId: row.materialId, name: row.name }])
    ),
    blockIdByMaterialAndNameKey: new Map(
      blockRows.map((row) => [`${row.materialId}:${row.nameKey}`, row.blockId])
    ),
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

function nameKey(name: string): string {
  return name.toLowerCase()
}

function blockScopeKey(materialId: string, name: string): string {
  return `${materialId}:${nameKey(name)}`
}

function fail(location: { line: number; column: number }, message: string): never {
  throw new StudyCodeReadableIdentityError(message, location.line, location.column)
}
