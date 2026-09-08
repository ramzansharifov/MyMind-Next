import { randomUUID } from 'expo-crypto'
import type {
  StudyCodeApplyResult,
  StudyCodeChangeSummary,
  StudyCodeDiagnostic,
  StudyCodePreviewResult,
  StudyCodeSnapshot,
  StudyDocument,
  StudyFolderIconName,
  StudyNode
} from '@mymind/contracts/study'
import { STUDY_FOLDER_ICON_NAMES, STUDY_SAFE_ID_PATTERN } from '@mymind/contracts/study'
import {
  buildStudyDocumentFromCode,
  serializeStudyBlockToCode
} from '@mymind/core/study-code-document'
import { validateStudyCodeConstraints } from '@mymind/core/study-code-constraints'
import {
  formatStudyCodeSource,
  parseStudyCode,
  serializeStudyCodeTree,
  type StudyCodeMaterialAst,
  type StudyCodeTreeAst,
  type StudyCodeTreeFolder,
  type StudyCodeTreeMaterial,
  type StudyCodeTreeNode
} from '@mymind/core/study-code'
import type { StudyRepository } from '@mymind/persistence/study'

interface ScopeState {
  root: StudyNode
  rows: StudyNode[]
  rowsById: Map<string, StudyNode>
  allRowsById: Map<string, StudyNode>
  materials: Map<string, StudyDocument>
}

interface DesiredNode {
  key: string
  ast: StudyCodeTreeAst
  existing: StudyNode | null
  parentKey: string | null
  position: number
  document?: StudyDocument
}

interface PreviewPlan {
  scope: ScopeState
  desired: DesiredNode[]
  summary: StudyCodeChangeSummary
}

const folderIconSet = new Set<string>(STUDY_FOLDER_ICON_NAMES)

export function getMobileStudyCodeSnapshot(
  repository: StudyRepository,
  nodeId: string
): StudyCodeSnapshot {
  const scope = loadScope(repository, nodeId)
  const source = serializeStudyCodeTree(scopeToSerializedTree(scope))
  return {
    nodeId,
    nodeType: scope.root.type,
    title: scope.root.title,
    source,
    revision: revisionFor(source)
  }
}

export function formatMobileStudyCode(source: string): string {
  return formatStudyCodeSource(source)
}

export function previewMobileStudyCode(
  repository: StudyRepository,
  nodeId: string,
  source: string,
  baseRevision: string
): StudyCodePreviewResult {
  const emptySummary = createEmptySummary()
  try {
    const current = getMobileStudyCodeSnapshot(repository, nodeId)
    if (current.revision !== baseRevision) return revisionConflictPreview(emptySummary)

    const constraintDiagnostics = validateStudyCodeConstraints(source)
    if (constraintDiagnostics.length > 0) {
      return {
        valid: false,
        diagnostics: constraintDiagnostics.map((diagnostic) => ({
          severity: 'error',
          ...diagnostic
        })),
        summary: emptySummary,
        destructive: false
      }
    }

    const plan = buildPlan(repository, nodeId, source)
    return {
      valid: true,
      diagnostics: [],
      summary: plan.summary,
      destructive: hasDeletions(plan.summary)
    }
  } catch (reason: unknown) {
    return {
      valid: false,
      diagnostics: [toDiagnostic(reason)],
      summary: emptySummary,
      destructive: false
    }
  }
}

export async function applyMobileStudyCode(
  repository: StudyRepository,
  nodeId: string,
  source: string,
  baseRevision: string,
  confirmDestructive = false,
  validateDocumentAssets?: (ownerId: string, document: StudyDocument) => Promise<void>
): Promise<StudyCodeApplyResult> {
  const preview = previewMobileStudyCode(repository, nodeId, source, baseRevision)
  if (!preview.valid) throw diagnosticError(preview.diagnostics[0])
  if (preview.destructive && !confirmDestructive) {
    throw diagnosticError({
      severity: 'error',
      line: 1,
      column: 1,
      message: 'Изменения содержат удаления. Сначала подтвердите деструктивное сохранение.'
    })
  }

  const snapshot = getMobileStudyCodeSnapshot(repository, nodeId)
  if (snapshot.revision !== baseRevision) throw diagnosticError(revisionConflictDiagnostic())

  const plan = buildPlan(repository, nodeId, source)
  if (validateDocumentAssets) {
    for (const desired of plan.desired) {
      if (desired.ast.kind === 'material' && desired.existing && desired.document) {
        await validateDocumentAssets(desired.existing.id, desired.document)
      }
    }
  }
  const documentAst = parseStudyCode(source)
  const originalIds = new Set(plan.scope.rows.map((row) => row.id))
  const actualIds = new Map<StudyCodeTreeAst, string>()
  const referencedOriginalIds = new Set<string>([plan.scope.root.id])

  const createMissing = (
    ast: StudyCodeTreeAst,
    parentId: string | null,
    position: number,
    root: boolean
  ): void => {
    let id: string
    if (root) {
      id = plan.scope.root.id
    } else if (ast.id) {
      id = ast.id
      referencedOriginalIds.add(id)
    } else {
      const created = repository.createNode({
        type: ast.kind,
        parentId,
        title: ast.title.trim(),
        icon: ast.kind === 'folder' ? resolveFolderIcon(ast, null) : undefined
      })
      id = created.id
    }
    actualIds.set(ast, id)
    if (ast.kind === 'folder') {
      ast.children.forEach((child, childPosition) => createMissing(child, id, childPosition, false))
    }
  }

  createMissing(documentAst.root, plan.scope.root.parentId, plan.scope.root.position, true)

  const updateNodes = (
    ast: StudyCodeTreeAst,
    parentId: string | null,
    position: number,
    root: boolean
  ): void => {
    const id = requireActualId(actualIds, ast)
    const current = repository.listNodes().find((node) => node.id === id)
    if (!current) throw new Error('Элемент обучения исчез во время применения кода')
    const title = ast.title.trim()
    if (current.title !== title) repository.renameNode(id, title)
    if (ast.kind === 'folder') {
      const icon = resolveFolderIcon(ast, current)
      if ((current.icon ?? 'folder') !== icon) repository.updateFolderIcon(id, icon)
    }
    if (!root && (current.parentId !== parentId || current.position !== position)) {
      repository.moveNode({ id, parentId, position })
    }
    if (ast.kind === 'folder') {
      ast.children.forEach((child, childPosition) => updateNodes(child, id, childPosition, false))
    }
  }

  updateNodes(documentAst.root, plan.scope.root.parentId, plan.scope.root.position, true)

  const blockOwners = collectBlockOwners(repository)
  const saveMaterials = async (ast: StudyCodeTreeAst): Promise<void> => {
    const id = requireActualId(actualIds, ast)
    if (ast.kind === 'material') {
      const existing = repository.getMaterial(id).document
      const outsideOwners = new Map([...blockOwners].filter(([, owner]) => owner !== id))
      const next = buildStudyDocumentFromCode(ast, id, existing, {
        createId: randomUUID,
        outsideBlockOwners: outsideOwners
      })
      await repository.saveMaterial({ nodeId: id, document: next })
      return
    }
    for (const child of ast.children) await saveMaterials(child)
  }

  await saveMaterials(documentAst.root)

  const removed = plan.scope.rows.filter(
    (row) =>
      row.id !== plan.scope.root.id && originalIds.has(row.id) && !referencedOriginalIds.has(row.id)
  )
  const removedIds = new Set(removed.map((row) => row.id))
  const topLevelRemoved = removed.filter((row) => !row.parentId || !removedIds.has(row.parentId))
  for (const row of topLevelRemoved) await repository.deleteNode(row.id)

  const next = getMobileStudyCodeSnapshot(repository, nodeId)
  return {
    rootId: nodeId,
    nodes: repository.listNodes(),
    source: next.source,
    revision: next.revision,
    summary: preview.summary
  }
}

function buildPlan(repository: StudyRepository, nodeId: string, source: string): PreviewPlan {
  const scope = loadScope(repository, nodeId)
  const ast = parseStudyCode(source)
  if (ast.root.kind !== scope.root.type)
    semanticFail(ast.root, `Корень должен оставаться ${scope.root.type}`)
  if (ast.root.id && ast.root.id !== scope.root.id) {
    semanticFail(ast.root, 'Идентификатор корневого элемента нельзя менять')
  }

  const desired: DesiredNode[] = []
  const usedKeys = new Set<string>()
  let syntheticNodeIndex = 0
  let syntheticBlockIndex = 0
  const blockOwners = collectBlockOwners(repository)

  const visit = (
    nodeAst: StudyCodeTreeAst,
    parentKey: string | null,
    position: number,
    root: boolean
  ): DesiredNode => {
    let key: string
    let existing: StudyNode | null
    if (root) {
      key = scope.root.id
      existing = scope.root
    } else if (nodeAst.id) {
      if (!STUDY_SAFE_ID_PATTERN.test(nodeAst.id)) semanticFail(nodeAst, 'Некорректный @id')
      const scoped = scope.rowsById.get(nodeAst.id)
      if (!scoped) {
        if (scope.allRowsById.has(nodeAst.id)) {
          semanticFail(nodeAst, 'Существующий @id принадлежит другой ветке обучения')
        }
        semanticFail(nodeAst, 'Новые элементы создаются без @id')
      }
      key = nodeAst.id
      existing = scoped
    } else {
      syntheticNodeIndex += 1
      key = `__preview_node_${syntheticNodeIndex}`
      existing = null
    }

    if (usedKeys.has(key)) semanticFail(nodeAst, `Идентификатор ${key} используется несколько раз`)
    usedKeys.add(key)
    if (existing && existing.type !== nodeAst.kind)
      semanticFail(nodeAst, 'Тип существующего элемента нельзя менять')

    const desiredNode: DesiredNode = { key, ast: nodeAst, existing, parentKey, position }
    desired.push(desiredNode)

    if (nodeAst.kind === 'folder') {
      resolveFolderIcon(nodeAst, existing)
      nodeAst.children.forEach((child, childPosition) => visit(child, key, childPosition, false))
    } else {
      const existingDocument = existing ? scope.materials.get(existing.id) : undefined
      validateNewBlockIdentities(nodeAst, existingDocument, blockOwners)
      if (!existing) validateNewMaterialAssets(nodeAst)
      const outsideOwners = new Map([...blockOwners].filter(([, owner]) => owner !== existing?.id))
      desiredNode.document = buildStudyDocumentFromCode(
        nodeAst,
        existing?.id ?? key,
        existingDocument,
        {
          createId: () => `__preview_block_${++syntheticBlockIndex}`,
          outsideBlockOwners: outsideOwners
        }
      )
    }
    return desiredNode
  }

  visit(ast.root, scope.root.parentId, scope.root.position, true)
  return { scope, desired, summary: calculateSummary(scope, desired) }
}

function loadScope(repository: StudyRepository, nodeId: string): ScopeState {
  const allRows = repository.listNodes()
  const root = allRows.find((row) => row.id === nodeId)
  if (!root) throw new Error('Элемент обучения не найден')
  const allRowsById = new Map(allRows.map((row) => [row.id, row]))
  const included = new Set<string>([root.id])
  let changed = true
  while (changed) {
    changed = false
    for (const row of allRows) {
      if (row.parentId && included.has(row.parentId) && !included.has(row.id)) {
        included.add(row.id)
        changed = true
      }
    }
  }
  const rows = allRows.filter((row) => included.has(row.id))
  const materials = new Map<string, StudyDocument>()
  for (const row of rows)
    if (row.type === 'material') materials.set(row.id, repository.getMaterial(row.id).document)
  return { root, rows, rowsById: new Map(rows.map((row) => [row.id, row])), allRowsById, materials }
}

function scopeToSerializedTree(scope: ScopeState): StudyCodeTreeNode {
  const childrenByParent = new Map<string, StudyNode[]>()
  for (const row of scope.rows) {
    if (!row.parentId) continue
    const children = childrenByParent.get(row.parentId) ?? []
    children.push(row)
    childrenByParent.set(row.parentId, children)
  }
  for (const children of childrenByParent.values()) children.sort((a, b) => a.position - b.position)

  const build = (row: StudyNode): StudyCodeTreeNode => {
    if (row.type === 'folder') {
      const folder: StudyCodeTreeFolder = {
        kind: 'folder',
        id: row.id,
        title: row.title,
        icon: row.icon ?? 'folder',
        children: (childrenByParent.get(row.id) ?? []).map(build)
      }
      return folder
    }
    const material: StudyCodeTreeMaterial = {
      kind: 'material',
      id: row.id,
      title: row.title,
      blocks: (scope.materials.get(row.id)?.blocks ?? []).map(serializeStudyBlockToCode)
    }
    return material
  }
  return build(scope.root)
}

function collectBlockOwners(repository: StudyRepository): Map<string, string> {
  const owners = new Map<string, string>()
  for (const node of repository.listNodes()) {
    if (node.type !== 'material') continue
    const material = repository.getMaterial(node.id)
    for (const block of material.document.blocks) owners.set(block.id, node.id)
  }
  return owners
}

function validateNewBlockIdentities(
  ast: StudyCodeMaterialAst,
  existing: StudyDocument | undefined,
  owners: ReadonlyMap<string, string>
): void {
  const old = new Set((existing?.blocks ?? []).map((block) => block.id))
  const used = new Set<string>()
  for (const block of ast.blocks) {
    if (!block.id) continue
    if (used.has(block.id))
      semanticFail(block, `Идентификатор блока ${block.id} используется несколько раз`)
    used.add(block.id)
    if (!old.has(block.id)) {
      if (owners.has(block.id))
        semanticFail(block, 'Идентификатор блока уже принадлежит другому материалу')
      semanticFail(block, 'Новые блоки создаются без @id')
    }
  }
}

function validateNewMaterialAssets(ast: StudyCodeMaterialAst): void {
  const block = ast.blocks.find((candidate) => candidate.attributes.asset !== undefined)
  if (block)
    semanticFail(block, 'Новый материал не может ссылаться на существующее локальное вложение')
}

function resolveFolderIcon(ast: StudyCodeTreeAst, existing: StudyNode | null): StudyFolderIconName {
  if (ast.kind !== 'folder') return 'folder'
  const raw = ast.attributes.icon
  if (raw === undefined) return existing?.icon ?? 'folder'
  if (typeof raw !== 'string' || !folderIconSet.has(raw))
    semanticFail(ast, 'Неизвестная иконка папки')
  return raw as StudyFolderIconName
}

function calculateSummary(scope: ScopeState, desired: DesiredNode[]): StudyCodeChangeSummary {
  const summary = createEmptySummary()
  const desiredExistingIds = new Set<string>()
  for (const node of desired) {
    if (!node.existing) {
      if (node.ast.kind === 'folder') summary.createdFolders += 1
      else {
        summary.createdMaterials += 1
        summary.createdBlocks += node.document?.blocks.length ?? 0
      }
      continue
    }
    desiredExistingIds.add(node.existing.id)
    if (node.ast.title.trim() !== node.existing.title) summary.renamedNodes += 1
    const desiredParentId = node.parentKey?.startsWith('__preview_node_')
      ? node.parentKey
      : node.parentKey
    if (
      node.existing.id !== scope.root.id &&
      (node.existing.parentId !== desiredParentId || node.existing.position !== node.position)
    )
      summary.movedNodes += 1

    if (node.ast.kind === 'material' && node.document) {
      const oldDocument = scope.materials.get(node.existing.id) ?? { version: 1, blocks: [] }
      const oldById = new Map(oldDocument.blocks.map((block) => [block.id, block]))
      const newById = new Map(node.document.blocks.map((block) => [block.id, block]))
      for (const block of node.document.blocks) {
        const old = oldById.get(block.id)
        if (!old) summary.createdBlocks += 1
        else if (JSON.stringify(old) !== JSON.stringify(block)) summary.updatedBlocks += 1
      }
      for (const block of oldDocument.blocks) if (!newById.has(block.id)) summary.deletedBlocks += 1
      const oldCommon = oldDocument.blocks
        .filter((block) => newById.has(block.id))
        .map((block) => block.id)
      const newCommon = node.document.blocks
        .filter((block) => oldById.has(block.id))
        .map((block) => block.id)
      oldCommon.forEach((id, index) => {
        if (newCommon[index] !== id) summary.reorderedBlocks += 1
      })
    }
  }
  for (const row of scope.rows) {
    if (row.id === scope.root.id || desiredExistingIds.has(row.id)) continue
    if (row.type === 'folder') summary.deletedFolders += 1
    else summary.deletedMaterials += 1
  }
  return summary
}

function revisionFor(source: string): string {
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `mobile-study-code-v1-${(hash >>> 0).toString(16).padStart(8, '0')}-${source.length}`
}

function createEmptySummary(): StudyCodeChangeSummary {
  return {
    createdFolders: 0,
    createdMaterials: 0,
    deletedFolders: 0,
    deletedMaterials: 0,
    renamedNodes: 0,
    movedNodes: 0,
    createdBlocks: 0,
    deletedBlocks: 0,
    updatedBlocks: 0,
    reorderedBlocks: 0
  }
}

function hasDeletions(summary: StudyCodeChangeSummary): boolean {
  return summary.deletedFolders > 0 || summary.deletedMaterials > 0 || summary.deletedBlocks > 0
}

function revisionConflictDiagnostic(): StudyCodeDiagnostic {
  return {
    severity: 'error',
    line: 1,
    column: 1,
    message: 'Содержимое изменилось после открытия режима «Код». Обновите код перед сохранением.'
  }
}

function revisionConflictPreview(summary: StudyCodeChangeSummary): StudyCodePreviewResult {
  return { valid: false, diagnostics: [revisionConflictDiagnostic()], summary, destructive: false }
}

function toDiagnostic(reason: unknown): StudyCodeDiagnostic {
  if (
    reason &&
    typeof reason === 'object' &&
    'line' in reason &&
    'column' in reason &&
    typeof reason.line === 'number' &&
    typeof reason.column === 'number'
  ) {
    return {
      severity: 'error',
      line: reason.line,
      column: reason.column,
      message: reason instanceof Error ? reason.message : 'Некорректный код'
    }
  }
  return {
    severity: 'error',
    line: 1,
    column: 1,
    message: reason instanceof Error ? reason.message : 'Некорректный код'
  }
}

function diagnosticError(
  diagnostic: StudyCodeDiagnostic | undefined
): Error & { line: number; column: number } {
  const error = new Error(diagnostic?.message ?? 'Некорректный код') as Error & {
    line: number
    column: number
  }
  error.line = diagnostic?.line ?? 1
  error.column = diagnostic?.column ?? 1
  return error
}

function semanticFail(node: { line: number; column: number }, message: string): never {
  const error = new Error(message) as Error & { line: number; column: number }
  error.line = node.line
  error.column = node.column
  throw error
}

function requireActualId(
  ids: ReadonlyMap<StudyCodeTreeAst, string>,
  ast: StudyCodeTreeAst
): string {
  const id = ids.get(ast)
  if (!id) throw new Error('Не удалось сопоставить элемент DSL с локальными данными')
  return id
}
