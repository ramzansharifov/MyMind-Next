import { eq } from 'drizzle-orm'

import type { StudyBlockType } from '../../shared/contracts/study'
import {
  parseStudyCode,
  serializeStudyCodeAst,
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
  symbolizeStoredStudyInternalLinks,
  type StudyCodeInternalLinkSymbol
} from './study-code-internal-links'

export interface StudyCodeNameAssignment {
  kind: 'node' | 'block'
  entityId: string
  materialId?: string
  name: string
}

interface NameStoreState {
  nodeNameById: Map<string, string>
  nodeIdByNameKey: Map<string, string>
  blockNameById: Map<string, { materialId: string; name: string }>
  blockIdByMaterialAndNameKey: Map<string, string>
}

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
  removeAllStaleBlockNameRows()

  const database = getDatabase()
  const document = parseStudyCode(internalSource)
  const state = loadNameStoreState()
  const blockOwners = loadBlockOwners()
  const pendingAssignments: StudyCodeNameAssignment[] = []
  const usedNodeKeys = new Set(state.nodeIdByNameKey.keys())
  const usedBlockKeysByMaterial = collectUsedBlockKeysByMaterial(state)

  const assignNames = (node: StudyCodeTreeAst): void => {
    if (!node.id) throw new Error('Внутреннее представление DSL не содержит идентификатор элемента')

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
      node.children.forEach(assignNames)
      return
    }

    const materialId = nodeId
    const usedBlockKeys = usedBlockKeysByMaterial.get(materialId) ?? new Set<string>()
    const seenBlockIds = new Set<string>()
    usedBlockKeysByMaterial.set(materialId, usedBlockKeys)

    node.blocks.forEach((block) => {
      if (!block.id) throw new Error('Внутреннее представление DSL не содержит идентификатор блока')

      const blockId = block.id
      if (seenBlockIds.has(blockId)) {
        throw new Error(`В материале обнаружен повторяющийся внутренний идентификатор блока ${blockId}`)
      }
      seenBlockIds.add(blockId)

      const owners = blockOwners.get(blockId)
      if (!owners || owners.size !== 1 || !owners.has(materialId)) {
        throw new Error(`Внутренний идентификатор блока ${blockId} используется неоднозначно`)
      }

      const storedIdentity = state.blockNameById.get(blockId)
      if (storedIdentity && storedIdentity.materialId !== materialId) {
        throw new Error(`Сохранённое DSL-имя блока ${blockId} принадлежит другому материалу`)
      }

      let blockName = storedIdentity?.name
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
  }

  assignNames(document.root)

  const ensureLinkSymbol = ({
    materialId,
    headingId
  }: {
    materialId: string
    headingId: string | null
  }): StudyCodeInternalLinkSymbol | null => {
    const materialNode = database
      .select()
      .from(studyNodes)
      .where(eq(studyNodes.id, materialId))
      .get()
    if (!materialNode || materialNode.type !== 'material') return null

    let materialName = state.nodeNameById.get(materialId)
    if (!materialName) {
      materialName = createGeneratedName('Material', usedNodeKeys)
      usedNodeKeys.add(nameKey(materialName))
      state.nodeNameById.set(materialId, materialName)
      state.nodeIdByNameKey.set(nameKey(materialName), materialId)
      pendingAssignments.push({ kind: 'node', entityId: materialId, name: materialName })
    }

    if (!headingId) return { materialName }

    const material = database
      .select()
      .from(studyMaterials)
      .where(eq(studyMaterials.nodeId, materialId))
      .get()
    const parsed = studyDocumentSchema.safeParse(material?.document)
    if (!parsed.success) return null

    const heading = parsed.data.blocks.find(
      (block) => block.id === headingId && block.type === 'heading'
    )
    if (!heading || heading.type !== 'heading') return null

    const existing = state.blockNameById.get(headingId)
    if (existing && existing.materialId !== materialId) return null

    let headingName = existing?.name
    if (!headingName) {
      const usedBlockKeys = usedBlockKeysByMaterial.get(materialId) ?? new Set<string>()
      usedBlockKeysByMaterial.set(materialId, usedBlockKeys)
      headingName = createGeneratedName('Heading', usedBlockKeys)
      usedBlockKeys.add(nameKey(headingName))
      state.blockNameById.set(headingId, { materialId, name: headingName })
      state.blockIdByMaterialAndNameKey.set(blockScopeKey(materialId, headingName), headingId)
      pendingAssignments.push({
        kind: 'block',
        entityId: headingId,
        materialId,
        name: headingName
      })
    }

    return { materialName, headingName }
  }

  const symbolizeLinks = (node: StudyCodeTreeAst): void => {
    if (node.kind === 'folder') {
      node.children.forEach(symbolizeLinks)
      return
    }

    node.blocks.forEach((block) => {
      if (block.blockType !== 'text') return
      const symbolic = symbolizeStoredStudyInternalLinks(
        block.body ?? '',
        block.html,
        ensureLinkSymbol
      )
      block.body = symbolic.text
      block.html = symbolic.html
    })
  }

  symbolizeLinks(document.root)
  persistStudyCodeNameAssignments(pendingAssignments)
  return serializeStudyCodeAst(document)
}

export function persistStudyCodeNameAssignments(assignments: StudyCodeNameAssignment[]): void {
  if (assignments.length === 0) return

  const database = getDatabase()
  const now = new Date()
  const state = loadNameStoreState()
  const existingNodeIds = new Set(
    database
      .select({ id: studyNodes.id })
      .from(studyNodes)
      .all()
      .map((row) => row.id)
  )
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
      const owners = blockOwners.get(assignment.entityId)
      if (!owners || owners.size !== 1 || !owners.has(materialId)) return

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

function loadNameStoreState(): NameStoreState {
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
    )
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

function collectUsedBlockKeysByMaterial(state: NameStoreState): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>()
  state.blockNameById.forEach(({ materialId, name }) => {
    const keys = result.get(materialId) ?? new Set<string>()
    keys.add(nameKey(name))
    result.set(materialId, keys)
  })
  return result
}

function createGeneratedName(prefix: string, usedKeys: ReadonlySet<string>): string {
  let index = 1
  while (usedKeys.has(nameKey(`${prefix}${index}`))) index += 1
  return `${prefix}${index}`
}

function nameKey(name: string): string {
  return name.toLowerCase()
}

function blockScopeKey(materialId: string, name: string): string {
  return `${materialId}:${nameKey(name)}`
}
