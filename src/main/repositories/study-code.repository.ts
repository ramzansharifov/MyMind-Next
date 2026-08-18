import { createHash, randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'

import type {
  ApplyStudyCodeInput,
  PreviewStudyCodeInput,
  StudyBlock,
  StudyCodeApplyResult,
  StudyCodeChangeSummary,
  StudyCodeDiagnostic,
  StudyCodePreviewResult,
  StudyCodeSnapshot,
  StudyDocument,
  StudyFolderIconName,
  StudyLocalAsset,
  StudyNode
} from '../../shared/contracts/study'
import {
  STUDY_DOCUMENT_LIMITS,
  STUDY_FOLDER_ICON_NAMES,
  STUDY_SAFE_ID_PATTERN
} from '../../shared/contracts/study'
import {
  parseStudyCode,
  serializeStudyCodeTree,
  type StudyCodeAttributeValue,
  type StudyCodeBlockAst,
  type StudyCodeMaterialAst,
  type StudyCodeTreeAst,
  type StudyCodeTreeFolder,
  type StudyCodeTreeMaterial,
  type StudyCodeTreeNode
} from '../../shared/study-code'
import { createCanonicalStudyAssetUrl } from '../../shared/study-assets'
import { studyDocumentSchema, studyNodeSchema } from '../../shared/validation/study'
import { getDatabase } from '../database/client'
import { boardNodes, studyLinkTargets, studyMaterials, studyNodes } from '../database/schema'
import { documentToPlainText } from '../domain/study-document-index'
import {
  cleanupStudyAssetsForDocument,
  removeStudyAssetsForMaterials,
  validateStudyDocumentAssets
} from '../services/study-assets'
import { studyMaterialCoordinator } from '../services/study-material-coordinator'
import { cleanupBoardsForStudyDocument } from './boards.repository'

interface ScopeState {
  root: typeof studyNodes.$inferSelect
  rows: Array<typeof studyNodes.$inferSelect>
  rowsById: Map<string, typeof studyNodes.$inferSelect>
  materials: Map<string, StudyDocument>
  materialRows: Map<string, typeof studyMaterials.$inferSelect>
  revision: string
}

interface DesiredNode {
  id: string
  type: 'folder' | 'material'
  title: string
  icon: StudyFolderIconName | null
  parentId: string | null
  position: number
  existing: typeof studyNodes.$inferSelect | null
  document?: StudyDocument
  ast: StudyCodeTreeAst
}

interface StudyCodePlan {
  scope: ScopeState
  desired: DesiredNode[]
  summary: StudyCodeChangeSummary
  destructive: boolean
  deletedMaterialIds: string[]
}

class StudyCodeSemanticError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column: number
  ) {
    super(message)
    this.name = 'StudyCodeSemanticError'
  }
}

const folderIconSet = new Set<string>(STUDY_FOLDER_ICON_NAMES)

export function getStudyCodeSnapshot(nodeId: string): StudyCodeSnapshot {
  const scope = loadScope(nodeId)
  const tree = scopeToSerializedTree(scope)

  return {
    nodeId,
    nodeType: scope.root.type,
    title: scope.root.title,
    source: serializeStudyCodeTree(tree),
    revision: scope.revision
  }
}

export function previewStudyCode(input: PreviewStudyCodeInput): StudyCodePreviewResult {
  const emptySummary = createEmptySummary()

  try {
    const scope = loadScope(input.nodeId)
    if (scope.revision !== input.baseRevision) {
      return {
        valid: false,
        diagnostics: [revisionConflictDiagnostic()],
        summary: emptySummary,
        destructive: false
      }
    }

    const plan = buildPlan(scope, input.source)
    return {
      valid: true,
      diagnostics: [],
      summary: plan.summary,
      destructive: plan.destructive
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

export async function applyStudyCode(input: ApplyStudyCodeInput): Promise<StudyCodeApplyResult> {
  const initialScope = loadScope(input.nodeId)
  if (initialScope.revision !== input.baseRevision) {
    throw new Error(revisionConflictDiagnostic().message)
  }

  const lockedMaterialIds = initialScope.rows
    .filter((row) => row.type === 'material')
    .map((row) => row.id)

  return studyMaterialCoordinator.runForMany(lockedMaterialIds, async () => {
    let scope = loadScope(input.nodeId)
    if (scope.revision !== input.baseRevision) {
      throw new Error(revisionConflictDiagnostic().message)
    }

    let plan = buildPlan(scope, input.source)
    if (plan.destructive && !input.confirmDestructive) {
      throw new Error('Изменения содержат удаления. Сначала подтвердите деструктивное сохранение.')
    }

    for (const node of plan.desired) {
      if (node.type === 'material' && node.document) {
        await validateStudyDocumentAssets(node.id, node.document)
      }
    }

    scope = loadScope(input.nodeId)
    if (scope.revision !== input.baseRevision) {
      throw new Error(revisionConflictDiagnostic().message)
    }

    // Rebuild after asynchronous asset validation so the write plan is based on the exact current tree.
    plan = buildPlan(scope, input.source)
    if (plan.destructive && !input.confirmDestructive) {
      throw new Error('Изменения содержат удаления. Сначала подтвердите деструктивное сохранение.')
    }

    applyPlanTransaction(plan)

    const retainedMaterials = plan.desired.filter(
      (node): node is DesiredNode & { type: 'material'; document: StudyDocument } =>
        node.type === 'material' && node.document !== undefined
    )

    retainedMaterials.forEach((node) => {
      cleanupBoardsForStudyDocument(node.id, node.document)
    })

    for (const node of retainedMaterials) {
      await cleanupStudyAssetsForDocument(node.id, node.document).catch((reason: unknown) => {
        console.error('Failed to clean up study assets after Code Mode apply', reason)
      })
    }

    if (plan.deletedMaterialIds.length > 0) {
      await removeStudyAssetsForMaterials(plan.deletedMaterialIds).catch((reason: unknown) => {
        console.error('Failed to remove study assets after Code Mode deletion', reason)
      })
    }

    const snapshot = getStudyCodeSnapshot(input.nodeId)

    return {
      rootId: input.nodeId,
      nodes: listMappedStudyNodes(),
      source: snapshot.source,
      revision: snapshot.revision,
      summary: plan.summary
    }
  })
}

function loadScope(nodeId: string): ScopeState {
  const database = getDatabase()
  const allRows = database.select().from(studyNodes).all()
  const root = allRows.find((row) => row.id === nodeId)

  if (!root) throw new Error('Элемент обучения не найден')

  const rowsById = new Map(allRows.map((row) => [row.id, row]))
  const included = new Set<string>([root.id])
  let changed = true

  while (changed) {
    changed = false
    allRows.forEach((row) => {
      if (row.parentId && included.has(row.parentId) && !included.has(row.id)) {
        included.add(row.id)
        changed = true
      }
    })
  }

  const rows = allRows.filter((row) => included.has(row.id))
  const materialRows = new Map<string, typeof studyMaterials.$inferSelect>()
  const materials = new Map<string, StudyDocument>()

  rows
    .filter((row) => row.type === 'material')
    .forEach((row) => {
      const material = database
        .select()
        .from(studyMaterials)
        .where(eq(studyMaterials.nodeId, row.id))
        .get()

      if (material) materialRows.set(row.id, material)
      const parsed = studyDocumentSchema.safeParse(material?.document)
      materials.set(row.id, parsed.success ? parsed.data : createEmptyDocument())
    })

  return {
    root,
    rows,
    rowsById,
    materials,
    materialRows,
    revision: calculateRevision(root.id, rows, materials)
  }
}

function calculateRevision(
  rootId: string,
  rows: Array<typeof studyNodes.$inferSelect>,
  materials: ReadonlyMap<string, StudyDocument>
): string {
  const hash = createHash('sha256')
  hash.update(`study-code-v1:${rootId}\n`)

  rows
    .slice()
    .sort((first, second) => first.id.localeCompare(second.id))
    .forEach((row) => {
      hash.update(
        JSON.stringify({
          id: row.id,
          type: row.type,
          parentId: row.parentId,
          title: row.title,
          icon: row.icon,
          position: row.position,
          isExpanded: row.isExpanded
        })
      )
      if (row.type === 'material') hash.update(JSON.stringify(materials.get(row.id) ?? null))
      hash.update('\n')
    })

  return hash.digest('hex')
}

function scopeToSerializedTree(scope: ScopeState): StudyCodeTreeNode {
  const childrenByParent = new Map<string, Array<typeof studyNodes.$inferSelect>>()
  scope.rows.forEach((row) => {
    if (!row.parentId) return
    const children = childrenByParent.get(row.parentId) ?? []
    children.push(row)
    childrenByParent.set(row.parentId, children)
  })
  childrenByParent.forEach((children) => children.sort((a, b) => a.position - b.position))

  const build = (row: typeof studyNodes.$inferSelect): StudyCodeTreeNode => {
    if (row.type === 'folder') {
      const folder: StudyCodeTreeFolder = {
        kind: 'folder',
        id: row.id,
        title: row.title,
        icon: (row.icon ?? 'folder') as StudyFolderIconName,
        children: (childrenByParent.get(row.id) ?? []).map(build)
      }
      return folder
    }

    const document = scope.materials.get(row.id) ?? createEmptyDocument()
    const material: StudyCodeTreeMaterial = {
      kind: 'material',
      id: row.id,
      title: row.title,
      blocks: document.blocks.map(serializeBlock)
    }
    return material
  }

  return build(scope.root)
}

function serializeBlock(block: StudyBlock): StudyCodeTreeMaterial['blocks'][number] {
  switch (block.type) {
    case 'text':
      return { id: block.id, type: block.type, body: block.text, html: block.html }
    case 'heading':
      return {
        id: block.id,
        type: block.type,
        headingLevel: block.level,
        title: block.text,
        attributes: compactAttributes({ color: block.color, background: block.backgroundColor })
      }
    case 'code':
      return {
        id: block.id,
        type: block.type,
        body: block.source,
        attributes: { language: block.language }
      }
    case 'markdown':
      return {
        id: block.id,
        type: block.type,
        body: block.source,
        attributes: compactAttributes({ view: block.viewMode })
      }
    case 'latex':
      return {
        id: block.id,
        type: block.type,
        body: block.source,
        attributes: compactAttributes({
          view: block.viewMode,
          display: block.displayMode,
          align: block.alignment,
          scale: block.scale
        })
      }
    case 'mermaid':
      return {
        id: block.id,
        type: block.type,
        body: block.source,
        attributes: compactAttributes({ view: block.viewMode, theme: block.theme, scale: block.scale })
      }
    case 'image':
      return {
        id: block.id,
        type: block.type,
        attributes: compactAttributes({
          ...serializeAssetSource(block.source),
          title: block.title,
          fit: block.imageFit,
          height: block.imageHeight
        })
      }
    case 'video':
    case 'audio':
    case 'file':
      return {
        id: block.id,
        type: block.type,
        attributes: compactAttributes({ ...serializeAssetSource(block.source), title: block.title })
      }
    case 'divider':
      return {
        id: block.id,
        type: block.type,
        attributes: compactAttributes({
          variant: block.variant,
          thickness: block.thickness,
          color: block.color
        })
      }
    case 'board':
      return {
        id: block.id,
        type: block.type,
        title: block.title,
        attributes: compactAttributes({ board: block.boardId })
      }
  }
}

function serializeAssetSource(
  source: { type: 'local'; asset?: StudyLocalAsset } | { type: 'url'; url: string }
): Record<string, StudyCodeAttributeValue | undefined> {
  if (source.type === 'url') return { url: source.url }
  if (!source.asset) return {}
  return {
    asset: source.asset.id,
    name: source.asset.name,
    mime: source.asset.mimeType,
    size: source.asset.size
  }
}

function compactAttributes(
  values: Record<string, StudyCodeAttributeValue | undefined>
): Record<string, StudyCodeAttributeValue> {
  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, StudyCodeAttributeValue] => entry[1] !== undefined)
  )
}

function buildPlan(scope: ScopeState, source: string): StudyCodePlan {
  let ast
  try {
    ast = parseStudyCode(source)
  } catch (reason: unknown) {
    throw reason
  }

  if (ast.root.kind !== scope.root.type) {
    semanticFail(ast.root, `Корень должен оставаться ${scope.root.type}`)
  }
  if (ast.root.id && ast.root.id !== scope.root.id) {
    semanticFail(ast.root, 'Идентификатор корневого элемента нельзя менять')
  }

  const existingIds = new Set(scope.rows.map((row) => row.id))
  const desiredIds = new Set<string>()
  const globallyUsedBlockIds = collectBlockOwnersOutsideScope(scope)
  const desired: DesiredNode[] = []

  const visit = (
    nodeAst: StudyCodeTreeAst,
    parentId: string | null,
    position: number,
    isRoot: boolean
  ): DesiredNode => {
    const id = isRoot ? scope.root.id : resolveNodeId(nodeAst, scope, desiredIds)
    if (desiredIds.has(id)) semanticFail(nodeAst, `Идентификатор ${id} используется несколько раз`)
    desiredIds.add(id)

    const existing = scope.rowsById.get(id) ?? null
    if (existing && existing.type !== nodeAst.kind) {
      semanticFail(nodeAst, 'Тип существующего элемента нельзя менять')
    }

    validateTitle(nodeAst.title, nodeAst)
    const icon = resolveFolderIcon(nodeAst, existing)
    const desiredNode: DesiredNode = {
      id,
      type: nodeAst.kind,
      title: nodeAst.title.trim(),
      icon,
      parentId: isRoot ? scope.root.parentId : parentId,
      position: isRoot ? scope.root.position : position,
      existing,
      ast: nodeAst
    }
    desired.push(desiredNode)

    if (nodeAst.kind === 'folder') {
      assertAllowedAttributes(nodeAst, ['icon'])
      nodeAst.children.forEach((child, childPosition) => {
        visit(child, id, childPosition, false)
      })
    } else {
      assertAllowedAttributes(nodeAst, [])
      desiredNode.document = buildMaterialDocument(
        nodeAst,
        id,
        existing ? scope.materials.get(id) : undefined,
        globallyUsedBlockIds
      )
    }

    return desiredNode
  }

  visit(ast.root, scope.root.parentId, scope.root.position, true)

  // An @id may only point to an entity that already belongs to the selected subtree.
  desired.forEach((node) => {
    if (node.existing === null && node.ast.id && existingIds.has(node.ast.id)) {
      semanticFail(node.ast, 'Некорректное повторное использование идентификатора')
    }
  })

  const summary = calculateSummary(scope, desired)
  const destructive =
    summary.deletedFolders > 0 || summary.deletedMaterials > 0 || summary.deletedBlocks >= 5
  const desiredIdSet = new Set(desired.map((node) => node.id))
  const deletedMaterialIds = scope.rows
    .filter((row) => row.type === 'material' && !desiredIdSet.has(row.id))
    .map((row) => row.id)

  return { scope, desired, summary, destructive, deletedMaterialIds }
}

function resolveNodeId(
  ast: StudyCodeTreeAst,
  scope: ScopeState,
  desiredIds: ReadonlySet<string>
): string {
  if (!ast.id) return createUniqueId(new Set([...scope.rowsById.keys(), ...desiredIds]))
  if (!STUDY_SAFE_ID_PATTERN.test(ast.id)) semanticFail(ast, 'Некорректный @id')
  const existing = scope.rowsById.get(ast.id)
  if (existing) return ast.id

  const occupiedOutsideScope = getDatabase()
    .select({ id: studyNodes.id })
    .from(studyNodes)
    .where(eq(studyNodes.id, ast.id))
    .get()

  if (occupiedOutsideScope) {
    semanticFail(ast, 'Существующий @id принадлежит другой ветке обучения')
  }

  // The readable DSL service may pre-allocate a UUID for a newly named node so symbolic
  // internal links can be resolved before the atomic apply. User-provided new @id values are
  // rejected by that service before this internal representation reaches the repository.
  return ast.id
}

function resolveFolderIcon(
  ast: StudyCodeTreeAst,
  existing: typeof studyNodes.$inferSelect | null
): StudyFolderIconName | null {
  if (ast.kind !== 'folder') return null
  const raw = ast.attributes.icon
  if (raw === undefined) return (existing?.icon ?? 'folder') as StudyFolderIconName
  if (typeof raw !== 'string' || !folderIconSet.has(raw)) semanticFail(ast, 'Неизвестная иконка папки')
  return raw as StudyFolderIconName
}

function buildMaterialDocument(
  materialAst: StudyCodeMaterialAst,
  materialId: string,
  existingDocument: StudyDocument | undefined,
  outsideBlockOwners: ReadonlyMap<string, string>
): StudyDocument {
  const oldBlocks = new Map((existingDocument?.blocks ?? []).map((block) => [block.id, block]))
  const usedIds = new Set<string>()
  const blocks = materialAst.blocks.map((blockAst) => {
    const id = resolveBlockId(blockAst, oldBlocks, usedIds, outsideBlockOwners)
    usedIds.add(id)
    return buildBlock(blockAst, id, materialId, oldBlocks.get(id))
  })

  const parsed = studyDocumentSchema.safeParse({ version: 1, blocks })
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    semanticFail(materialAst, issue?.message ?? 'Некорректный документ материала')
  }
  return parsed.data
}

function resolveBlockId(
  ast: StudyCodeBlockAst,
  oldBlocks: ReadonlyMap<string, StudyBlock>,
  usedIds: ReadonlySet<string>,
  outsideBlockOwners: ReadonlyMap<string, string>
): string {
  if (!ast.id) return createUniqueId(new Set([...oldBlocks.keys(), ...usedIds, ...outsideBlockOwners.keys()]))
  if (!STUDY_SAFE_ID_PATTERN.test(ast.id)) semanticFail(ast, 'Некорректный @id блока')
  if (usedIds.has(ast.id)) semanticFail(ast, `Идентификатор блока ${ast.id} используется несколько раз`)

  const old = oldBlocks.get(ast.id)
  if (old && old.type !== ast.blockType) semanticFail(ast, 'Тип существующего блока нельзя менять')
  if (!old && outsideBlockOwners.has(ast.id)) {
    semanticFail(ast, 'Идентификатор блока уже принадлежит другому материалу')
  }
  return ast.id
}

function buildBlock(
  ast: StudyCodeBlockAst,
  id: string,
  materialId: string,
  existing: StudyBlock | undefined
): StudyBlock {
  const attributes = ast.attributes

  switch (ast.blockType) {
    case 'text': {
      assertAllowedAttributes(ast, [])
      const text = ast.body ?? ''
      let html = ast.html
      if (
        existing?.type === 'text' &&
        html !== undefined &&
        text !== existing.text &&
        html === existing.html
      ) {
        html = plainTextToHtml(text)
      }
      return compactObject({ id, type: 'text' as const, text, html })
    }
    case 'heading':
      assertAllowedAttributes(ast, ['color', 'background'])
      return compactObject({
        id,
        type: 'heading' as const,
        text: ast.title ?? '',
        level: ast.headingLevel ?? 1,
        color: optionalString(attributes, 'color', ast),
        backgroundColor: optionalString(attributes, 'background', ast)
      })
    case 'code':
      assertAllowedAttributes(ast, ['language'])
      return {
        id,
        type: 'code',
        source: ast.body ?? '',
        language: optionalString(attributes, 'language', ast) ?? 'plaintext'
      }
    case 'markdown':
      assertAllowedAttributes(ast, ['view'])
      return compactObject({
        id,
        type: 'markdown' as const,
        source: ast.body ?? '',
        viewMode: optionalEnum(attributes, 'view', ['write', 'split', 'preview'], ast)
      })
    case 'latex':
      assertAllowedAttributes(ast, ['view', 'display', 'align', 'scale'])
      return compactObject({
        id,
        type: 'latex' as const,
        source: ast.body ?? '',
        viewMode: optionalEnum(attributes, 'view', ['write', 'split', 'preview'], ast),
        displayMode: optionalEnum(attributes, 'display', ['display', 'inline'], ast),
        alignment: optionalEnum(attributes, 'align', ['left', 'center', 'right'], ast),
        scale: optionalNumber(attributes, 'scale', ast)
      })
    case 'mermaid':
      assertAllowedAttributes(ast, ['view', 'theme', 'scale'])
      return compactObject({
        id,
        type: 'mermaid' as const,
        source: ast.body ?? '',
        viewMode: optionalEnum(attributes, 'view', ['write', 'split', 'preview'], ast),
        theme: optionalEnum(attributes, 'theme', ['dark', 'default', 'neutral', 'forest'], ast),
        scale: optionalNumber(attributes, 'scale', ast)
      })
    case 'image':
      assertAllowedAttributes(ast, ['asset', 'name', 'mime', 'size', 'url', 'title', 'fit', 'height'])
      return compactObject({
        id,
        type: 'image' as const,
        source: resolveAssetSource(ast, materialId, true),
        title: optionalString(attributes, 'title', ast),
        imageFit: optionalEnum(attributes, 'fit', ['contain', 'cover'], ast),
        imageHeight: optionalNumber(attributes, 'height', ast)
      })
    case 'video':
      assertAllowedAttributes(ast, ['asset', 'name', 'mime', 'size', 'url', 'title'])
      return compactObject({
        id,
        type: 'video' as const,
        source: resolveAssetSource(ast, materialId, true),
        title: optionalString(attributes, 'title', ast)
      })
    case 'audio':
    case 'file':
      assertAllowedAttributes(ast, ['asset', 'name', 'mime', 'size', 'title'])
      return compactObject({
        id,
        type: ast.blockType,
        source: resolveAssetSource(ast, materialId, false),
        title: optionalString(attributes, 'title', ast)
      }) as StudyBlock
    case 'divider':
      assertAllowedAttributes(ast, ['variant', 'thickness', 'color'])
      return compactObject({
        id,
        type: 'divider' as const,
        variant: optionalEnum(attributes, 'variant', ['solid', 'tapered', 'dashed', 'dotted'], ast),
        thickness: optionalNumber(attributes, 'thickness', ast),
        color: optionalString(attributes, 'color', ast)
      })
    case 'board': {
      assertAllowedAttributes(ast, ['board'])
      const boardId = optionalString(attributes, 'board', ast)
      if (boardId && existing?.type !== 'board') {
        semanticFail(ast, 'Новая доска создаётся без board. Откройте блок после сохранения.')
      }
      if (boardId && existing?.type === 'board' && existing.boardId && boardId !== existing.boardId) {
        semanticFail(ast, 'Нельзя подменить связанную доску через DSL')
      }
      return compactObject({ id, type: 'board' as const, boardId, title: ast.title })
    }
  }
}

function resolveAssetSource(
  ast: StudyCodeBlockAst,
  materialId: string,
  allowUrl: boolean
): { type: 'local'; asset?: StudyLocalAsset } | { type: 'url'; url: string } {
  const attributes = ast.attributes
  const url = optionalString(attributes, 'url', ast)
  const assetId = optionalString(attributes, 'asset', ast)

  if (url !== undefined) {
    if (!allowUrl) semanticFail(ast, `${ast.blockType} поддерживает только локальное вложение`)
    if (assetId !== undefined) semanticFail(ast, 'Нельзя одновременно указывать asset и url')
    return { type: 'url', url }
  }

  if (assetId === undefined) return { type: 'local' }

  const name = requiredString(attributes, 'name', ast)
  const mimeType = requiredString(attributes, 'mime', ast)
  const size = requiredNumber(attributes, 'size', ast)

  return {
    type: 'local',
    asset: {
      id: assetId,
      materialId,
      name,
      mimeType,
      size,
      url: createCanonicalStudyAssetUrl({ materialId, assetId, fileName: name })
    }
  }
}

function collectBlockOwnersOutsideScope(scope: ScopeState): Map<string, string> {
  const database = getDatabase()
  const scopeIds = new Set(scope.rows.map((row) => row.id))
  const owners = new Map<string, string>()

  database
    .select()
    .from(studyMaterials)
    .all()
    .forEach((material) => {
      if (scopeIds.has(material.nodeId)) return
      const parsed = studyDocumentSchema.safeParse(material.document)
      if (!parsed.success) return
      parsed.data.blocks.forEach((block) => owners.set(block.id, material.nodeId))
    })

  return owners
}

function calculateSummary(scope: ScopeState, desired: DesiredNode[]): StudyCodeChangeSummary {
  const summary = createEmptySummary()
  const desiredById = new Map(desired.map((node) => [node.id, node]))

  desired.forEach((node) => {
    if (!node.existing) {
      if (node.type === 'folder') summary.createdFolders += 1
      else summary.createdMaterials += 1
      if (node.type === 'material') summary.createdBlocks += node.document?.blocks.length ?? 0
      return
    }

    if (node.title !== node.existing.title) summary.renamedNodes += 1
    if (node.parentId !== node.existing.parentId || node.position !== node.existing.position) {
      summary.movedNodes += 1
    }

    if (node.type === 'material' && node.document) {
      const oldDocument = scope.materials.get(node.id) ?? createEmptyDocument()
      const oldById = new Map(oldDocument.blocks.map((block) => [block.id, block]))
      const newById = new Map(node.document.blocks.map((block) => [block.id, block]))

      node.document.blocks.forEach((block) => {
        const old = oldById.get(block.id)
        if (!old) summary.createdBlocks += 1
        else if (JSON.stringify(old) !== JSON.stringify(block)) summary.updatedBlocks += 1
      })
      oldDocument.blocks.forEach((block) => {
        if (!newById.has(block.id)) summary.deletedBlocks += 1
      })

      const oldCommon = oldDocument.blocks.filter((block) => newById.has(block.id)).map((block) => block.id)
      const newCommon = node.document.blocks.filter((block) => oldById.has(block.id)).map((block) => block.id)
      oldCommon.forEach((id, index) => {
        if (newCommon[index] !== id) summary.reorderedBlocks += 1
      })
    }
  })

  scope.rows.forEach((row) => {
    if (row.id === scope.root.id || desiredById.has(row.id)) return
    if (row.type === 'folder') summary.deletedFolders += 1
    else summary.deletedMaterials += 1
  })

  return summary
}

function applyPlanTransaction(plan: StudyCodePlan): void {
  const database = getDatabase()
  const now = new Date()
  const desiredIdSet = new Set(plan.desired.map((node) => node.id))
  const removedRows = plan.scope.rows.filter(
    (row) => row.id !== plan.scope.root.id && !desiredIdSet.has(row.id)
  )
  const removedIds = new Set(removedRows.map((row) => row.id))
  const topLevelRemoved = removedRows.filter((row) => !row.parentId || !removedIds.has(row.parentId))
  const desiredPathMap = new Map(
    plan.desired.map((node) => [
      node.id,
      { id: node.id, type: node.type, parentId: node.parentId, title: node.title }
    ])
  )

  database.transaction((transaction) => {
    // New nodes are in preorder, so every new parent exists before its child is inserted.
    plan.desired
      .filter((node) => !node.existing)
      .forEach((node) => {
        transaction
          .insert(studyNodes)
          .values({
            id: node.id,
            type: node.type,
            parentId: node.parentId,
            title: node.title,
            icon: node.type === 'folder' ? (node.icon ?? 'folder') : null,
            position: node.position,
            isExpanded: true,
            createdAt: now,
            updatedAt: now
          })
          .run()
      })

    plan.desired
      .filter((node) => node.existing)
      .forEach((node) => {
        const existing = node.existing!
        const nextIcon = node.type === 'folder' ? (node.icon ?? 'folder') : null
        const changed =
          existing.parentId !== node.parentId ||
          existing.position !== node.position ||
          existing.title !== node.title ||
          existing.icon !== nextIcon
        if (!changed) return

        transaction
          .update(studyNodes)
          .set({
            parentId: node.parentId,
            position: node.position,
            title: node.title,
            icon: nextIcon,
            updatedAt: now
          })
          .where(eq(studyNodes.id, node.id))
          .run()
      })

    plan.desired
      .filter((node): node is DesiredNode & { type: 'material'; document: StudyDocument } =>
        node.type === 'material' && node.document !== undefined
      )
      .forEach((node) => {
        const existingMaterial = plan.scope.materialRows.get(node.id)
        const plainText = documentToPlainText(node.document)
        const changed =
          !existingMaterial || JSON.stringify(existingMaterial.document) !== JSON.stringify(node.document)

        if (existingMaterial) {
          if (changed) {
            transaction
              .update(studyMaterials)
              .set({ document: node.document, plainText, updatedAt: now })
              .where(eq(studyMaterials.nodeId, node.id))
              .run()
          }
        } else {
          transaction
            .insert(studyMaterials)
            .values({ nodeId: node.id, document: node.document, plainText, createdAt: now, updatedAt: now })
            .run()
        }

        transaction.delete(studyLinkTargets).where(eq(studyLinkTargets.materialId, node.id)).run()
        const targets = buildLinkTargets(
          node.id,
          node.title,
          getFolderPath(node.parentId, desiredPathMap),
          node.document,
          now
        )
        if (targets.length > 0) transaction.insert(studyLinkTargets).values(targets).run()
      })

    plan.desired
      .filter((node) => node.type === 'folder')
      .forEach((node) => {
        transaction
          .update(boardNodes)
          .set({ title: node.title, icon: node.icon ?? 'folder', updatedAt: now })
          .where(eq(boardNodes.sourceStudyNodeId, node.id))
          .run()
      })

    topLevelRemoved.forEach((row) => {
      transaction.delete(studyNodes).where(eq(studyNodes.id, row.id)).run()
    })
  })
}

function buildLinkTargets(
  materialId: string,
  materialTitle: string,
  folderPath: string[],
  document: StudyDocument,
  updatedAt: Date
): Array<typeof studyLinkTargets.$inferInsert> {
  const normalize = (...values: string[]): string =>
    values.join(' ').trim().toLocaleLowerCase('ru-RU')

  return [
    {
      id: `material:${materialId}`,
      kind: 'material' as const,
      materialId,
      headingId: null,
      title: materialTitle,
      titleSearch: normalize(materialTitle),
      materialTitle,
      materialTitleSearch: normalize(materialTitle),
      folderPath,
      folderPathSearch: normalize(...folderPath),
      headingLevel: null,
      position: -1,
      searchText: normalize(materialTitle),
      updatedAt
    },
    ...document.blocks.flatMap((block, position) => {
      if (block.type !== 'heading' || !block.text.trim()) return []
      const title = block.text.trim()
      return [
        {
          id: `heading:${materialId}:${block.id}`,
          kind: 'heading' as const,
          materialId,
          headingId: block.id,
          title,
          titleSearch: normalize(title),
          materialTitle,
          materialTitleSearch: normalize(materialTitle),
          folderPath,
          folderPathSearch: normalize(...folderPath),
          headingLevel: block.level,
          position,
          searchText: normalize(title, materialTitle),
          updatedAt
        }
      ]
    })
  ]
}

function getFolderPath(
  parentId: string | null,
  nodesById: ReadonlyMap<string, { id: string; type: string; parentId: string | null; title: string }>
): string[] {
  const path: string[] = []
  const visited = new Set<string>()
  let current = parentId
  while (current && !visited.has(current)) {
    visited.add(current)
    const node = nodesById.get(current)
    if (!node) break
    if (node.type === 'folder') path.unshift(node.title)
    current = node.parentId
  }
  return path
}

function listMappedStudyNodes(): StudyNode[] {
  return getDatabase()
    .select()
    .from(studyNodes)
    .all()
    .map((row) =>
      studyNodeSchema.parse({
        ...row,
        icon: row.icon ?? undefined,
        createdAt: row.createdAt.getTime(),
        updatedAt: row.updatedAt.getTime()
      })
    )
    .sort((a, b) => (a.parentId ?? '').localeCompare(b.parentId ?? '') || a.position - b.position)
}

function createEmptyDocument(): StudyDocument {
  return { version: 1, blocks: [] }
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

function revisionConflictDiagnostic(): StudyCodeDiagnostic {
  return {
    severity: 'error',
    line: 1,
    column: 1,
    message: 'Содержимое изменилось после открытия режима «Код». Обновите код перед сохранением.'
  }
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

function semanticFail(node: { line: number; column: number }, message: string): never {
  throw new StudyCodeSemanticError(message, node.line, node.column)
}

function validateTitle(title: string, node: { line: number; column: number }): void {
  const trimmed = title.trim()
  if (!trimmed) semanticFail(node, 'Название не может быть пустым')
  if (trimmed.length > STUDY_DOCUMENT_LIMITS.maxTitleLength) {
    semanticFail(node, 'Название слишком длинное')
  }
}

function assertAllowedAttributes(
  ast: { attributes: Record<string, StudyCodeAttributeValue>; line: number; column: number },
  allowed: readonly string[]
): void {
  const allowedSet = new Set(allowed)
  const unknown = Object.keys(ast.attributes).find((key) => !allowedSet.has(key))
  if (unknown) semanticFail(ast, `Неизвестный параметр «${unknown}»`)
}

function optionalString(
  attributes: Record<string, StudyCodeAttributeValue>,
  key: string,
  ast: { line: number; column: number }
): string | undefined {
  const value = attributes[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string') semanticFail(ast, `Параметр ${key} должен быть строкой`)
  return value
}

function requiredString(
  attributes: Record<string, StudyCodeAttributeValue>,
  key: string,
  ast: { line: number; column: number }
): string {
  const value = optionalString(attributes, key, ast)
  if (value === undefined) semanticFail(ast, `Для локального вложения требуется параметр ${key}`)
  return value
}

function optionalNumber(
  attributes: Record<string, StudyCodeAttributeValue>,
  key: string,
  ast: { line: number; column: number }
): number | undefined {
  const value = attributes[key]
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    semanticFail(ast, `Параметр ${key} должен быть числом`)
  }
  return value
}

function requiredNumber(
  attributes: Record<string, StudyCodeAttributeValue>,
  key: string,
  ast: { line: number; column: number }
): number {
  const value = optionalNumber(attributes, key, ast)
  if (value === undefined) semanticFail(ast, `Для локального вложения требуется параметр ${key}`)
  return value
}

function optionalEnum<const T extends readonly string[]>(
  attributes: Record<string, StudyCodeAttributeValue>,
  key: string,
  values: T,
  ast: { line: number; column: number }
): T[number] | undefined {
  const value = optionalString(attributes, key, ast)
  if (value === undefined) return undefined
  if (!values.includes(value)) semanticFail(ast, `Некорректное значение параметра ${key}`)
  return value as T[number]
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T
}

function createUniqueId(existing: ReadonlySet<string>): string {
  let id = randomUUID()
  while (existing.has(id)) id = randomUUID()
  return id
}

function plainTextToHtml(value: string): string {
  const paragraphs = value
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
  if (paragraphs.length === 0) return '<p></p>'
  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
