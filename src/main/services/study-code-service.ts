import type {
  ApplyStudyCodeInput,
  PreviewStudyCodeInput,
  StudyCodeApplyResult,
  StudyCodeChangeSummary,
  StudyCodeDiagnostic,
  StudyCodePreviewResult,
  StudyCodeSnapshot,
  StudyDocument
} from '../../shared/contracts/study'
import {
  parseStudyCode,
  type StudyCodeBlockAst,
  type StudyCodeMaterialAst,
  type StudyCodeTreeAst
} from '../../shared/study-code'
import { studyDocumentSchema } from '../../shared/validation/study'
import { getDatabase } from '../database/client'
import { studyMaterials, studyNodes } from '../database/schema'
import {
  applyStudyCode as applyStudyCodeEngine,
  getStudyCodeSnapshot as getStudyCodeSnapshotEngine,
  previewStudyCode as previewStudyCodeEngine
} from '../repositories/study-code.repository'
import { listStudyNodes, renameStudyNode } from '../repositories/study.repository'

class StudyCodeSafetyError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column: number
  ) {
    super(message)
    this.name = 'StudyCodeSafetyError'
  }
}

interface StudyCodeOwnershipContext {
  scopeNodeIds: Set<string>
  allNodeIds: Set<string>
  documents: Map<string, StudyDocument>
  blockOwners: Map<string, Set<string>>
}

export function getStudyCodeSnapshot(nodeId: string): StudyCodeSnapshot {
  return getStudyCodeSnapshotEngine(nodeId)
}

export function previewStudyCode(input: PreviewStudyCodeInput): StudyCodePreviewResult {
  const enginePreview = previewStudyCodeEngine(input)

  if (!enginePreview.valid) {
    return enginePreview
  }

  try {
    validateStudyCodeOwnership(input.nodeId, input.source)
  } catch (reason: unknown) {
    return {
      valid: false,
      diagnostics: [toDiagnostic(reason)],
      summary: enginePreview.summary,
      destructive: false
    }
  }

  return {
    ...enginePreview,
    destructive: hasDeletions(enginePreview.summary)
  }
}

export async function applyStudyCode(input: ApplyStudyCodeInput): Promise<StudyCodeApplyResult> {
  const preview = previewStudyCode(input)

  if (!preview.valid) {
    const diagnostic = preview.diagnostics[0]
    throw new StudyCodeSafetyError(
      diagnostic?.message ?? 'DSL содержит некорректные изменения',
      diagnostic?.line ?? 1,
      diagnostic?.column ?? 1
    )
  }

  if (preview.destructive && !input.confirmDestructive) {
    throw new StudyCodeSafetyError(
      'Изменения содержат удаления. Сначала подтвердите деструктивное сохранение.',
      1,
      1
    )
  }

  const result = await applyStudyCodeEngine(input)

  /*
   * The selected Code Mode scope can start below the root of the Study tree.
   * Re-running the existing rename/index path with the unchanged current title
   * rebuilds derived link targets from the complete live tree, including
   * ancestors that are intentionally outside the editable DSL scope.
   */
  const appliedRoot = listStudyNodes().find((node) => node.id === input.nodeId)

  if (!appliedRoot) {
    throw new Error('Корневой элемент режима «Код» не найден после сохранения')
  }

  renameStudyNode(appliedRoot.id, appliedRoot.title)

  const snapshot = getStudyCodeSnapshotEngine(input.nodeId)

  return {
    ...result,
    nodes: listStudyNodes(),
    source: snapshot.source,
    revision: snapshot.revision
  }
}

function validateStudyCodeOwnership(nodeId: string, source: string): void {
  const document = parseStudyCode(source)
  const context = loadOwnershipContext(nodeId)
  const claimedBlockOwners = new Map<string, string>()
  let generatedMaterialSequence = 0

  const visit = (node: StudyCodeTreeAst, isRoot: boolean): void => {
    const existingNodeId = isRoot ? nodeId : node.id

    if (!isRoot && node.id) {
      if (!context.scopeNodeIds.has(node.id)) {
        safetyFail(
          node,
          context.allNodeIds.has(node.id)
            ? 'Существующий @id принадлежит другой ветке обучения'
            : 'Существующий @id должен принадлежать выбранной ветке обучения'
        )
      }
    }

    if (node.kind === 'folder') {
      node.children.forEach((child) => visit(child, false))
      return
    }

    const materialOwner = existingNodeId ?? `new-material:${generatedMaterialSequence++}`
    validateMaterialBlockOwnership(node, materialOwner, existingNodeId ?? null, context, claimedBlockOwners)
  }

  visit(document.root, true)
}

function loadOwnershipContext(nodeId: string): StudyCodeOwnershipContext {
  const database = getDatabase()
  const allNodes = database.select().from(studyNodes).all()
  const root = allNodes.find((node) => node.id === nodeId)

  if (!root) {
    throw new Error('Элемент обучения не найден')
  }

  const scopeNodeIds = new Set<string>([root.id])
  let changed = true

  while (changed) {
    changed = false

    allNodes.forEach((node) => {
      if (node.parentId && scopeNodeIds.has(node.parentId) && !scopeNodeIds.has(node.id)) {
        scopeNodeIds.add(node.id)
        changed = true
      }
    })
  }

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
        const owners = blockOwners.get(block.id) ?? new Set<string>()
        owners.add(material.nodeId)
        blockOwners.set(block.id, owners)
      })
    })

  return {
    scopeNodeIds,
    allNodeIds: new Set(allNodes.map((node) => node.id)),
    documents,
    blockOwners
  }
}

function validateMaterialBlockOwnership(
  materialAst: StudyCodeMaterialAst,
  materialOwner: string,
  existingMaterialId: string | null,
  context: StudyCodeOwnershipContext,
  claimedBlockOwners: Map<string, string>
): void {
  const existingBlocks = new Map(
    (existingMaterialId ? context.documents.get(existingMaterialId)?.blocks : undefined)?.map((block) => [
      block.id,
      block
    ]) ?? []
  )

  materialAst.blocks.forEach((block) => {
    validateBlockOwnership(
      block,
      materialOwner,
      existingMaterialId,
      existingBlocks,
      context,
      claimedBlockOwners
    )
  })
}

function validateBlockOwnership(
  block: StudyCodeBlockAst,
  materialOwner: string,
  existingMaterialId: string | null,
  existingBlocks: ReadonlyMap<string, StudyDocument['blocks'][number]>,
  context: StudyCodeOwnershipContext,
  claimedBlockOwners: Map<string, string>
): void {
  if (block.id) {
    const existingOwners = context.blockOwners.get(block.id)

    if (existingOwners && (existingOwners.size !== 1 || !existingMaterialId || !existingOwners.has(existingMaterialId))) {
      safetyFail(block, 'Идентификатор блока уже принадлежит другому материалу')
    }

    const claimedOwner = claimedBlockOwners.get(block.id)
    if (claimedOwner && claimedOwner !== materialOwner) {
      safetyFail(block, 'Один идентификатор блока нельзя использовать в разных материалах')
    }

    claimedBlockOwners.set(block.id, materialOwner)
  }

  if (block.blockType !== 'board' || !('board' in block.attributes)) {
    return
  }

  const requestedBoardId = block.attributes.board
  if (typeof requestedBoardId !== 'string') {
    return
  }

  const existingBlock = block.id ? existingBlocks.get(block.id) : undefined

  if (
    !existingBlock ||
    existingBlock.type !== 'board' ||
    !existingBlock.boardId ||
    existingBlock.boardId !== requestedBoardId
  ) {
    safetyFail(block, 'Нельзя назначить или подменить связанную доску через DSL')
  }
}

function hasDeletions(summary: StudyCodeChangeSummary): boolean {
  return (
    summary.deletedFolders > 0 ||
    summary.deletedMaterials > 0 ||
    summary.deletedBlocks > 0
  )
}

function safetyFail(node: { line: number; column: number }, message: string): never {
  throw new StudyCodeSafetyError(message, node.line, node.column)
}

function toDiagnostic(reason: unknown): StudyCodeDiagnostic {
  if (reason instanceof StudyCodeSafetyError) {
    return {
      severity: 'error',
      line: reason.line,
      column: reason.column,
      message: reason.message
    }
  }

  return {
    severity: 'error',
    line: 1,
    column: 1,
    message: reason instanceof Error ? reason.message : 'Некорректный код'
  }
}
