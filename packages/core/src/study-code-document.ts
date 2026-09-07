import type {
  StudyBlock,
  StudyDocument,
  StudyLocalAsset
} from '@mymind/contracts/study'
import { STUDY_SAFE_ID_PATTERN } from '@mymind/contracts/study'
import { createCanonicalStudyAssetUrl } from './study-assets'
import type {
  StudyCodeAttributeValue,
  StudyCodeBlockAst,
  StudyCodeMaterialAst,
  StudyCodeSerializedBlock
} from './study-code'
import { studyDocumentSchema } from './validation/study'

export class StudyCodeSemanticError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column: number
  ) {
    super(message)
    this.name = 'StudyCodeSemanticError'
  }
}

export interface StudyCodeDocumentBuildOptions {
  createId(): string
  outsideBlockOwners?: ReadonlyMap<string, string>
}

export function serializeStudyBlockToCode(block: StudyBlock): StudyCodeSerializedBlock {
  switch (block.type) {
    case 'text':
      return { id: block.id, type: block.type, body: block.text, html: block.html }
    case 'heading':
      return {
        id: block.id,
        type: block.type,
        headingLevel: block.level,
        title: block.text,
        attributes: compactAttributes({
          color: block.color,
          background: block.backgroundColor,
          align: block.alignment,
          backgroundScope: block.backgroundScope
        })
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
        attributes: compactAttributes({
          view: block.viewMode,
          theme: block.theme,
          scale: block.scale
        })
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

export function buildStudyDocumentFromCode(
  materialAst: StudyCodeMaterialAst,
  materialId: string,
  existingDocument: StudyDocument | undefined,
  options: StudyCodeDocumentBuildOptions
): StudyDocument {
  const oldBlocks = new Map((existingDocument?.blocks ?? []).map((block) => [block.id, block]))
  const outsideBlockOwners = options.outsideBlockOwners ?? new Map<string, string>()
  const usedIds = new Set<string>()
  const blocks = materialAst.blocks.map((blockAst) => {
    const id = resolveBlockId(blockAst, oldBlocks, usedIds, outsideBlockOwners, options.createId)
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
  outsideBlockOwners: ReadonlyMap<string, string>,
  createId: () => string
): string {
  if (!ast.id) return createUniqueId(new Set([...oldBlocks.keys(), ...usedIds, ...outsideBlockOwners.keys()]), createId)
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
      assertAllowedAttributes(ast, ['color', 'background', 'align', 'backgroundScope'])
      return compactObject({
        id,
        type: 'heading' as const,
        text: ast.title ?? '',
        level: ast.headingLevel ?? 1,
        color: optionalString(attributes, 'color', ast),
        backgroundColor: optionalString(attributes, 'background', ast),
        alignment: optionalEnum(attributes, 'align', ['left', 'center', 'right'], ast),
        backgroundScope: optionalEnum(
          attributes,
          'backgroundScope',
          ['text', 'container'],
          ast
        )
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

function compactAttributes(
  values: Record<string, StudyCodeAttributeValue | undefined>
): Record<string, StudyCodeAttributeValue> {
  return Object.fromEntries(
    Object.entries(values).filter(
      (entry): entry is [string, StudyCodeAttributeValue] => entry[1] !== undefined
    )
  )
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

function createUniqueId(existing: ReadonlySet<string>, createId: () => string): string {
  let id = createId()
  while (existing.has(id)) id = createId()
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

function semanticFail(node: { line: number; column: number }, message: string): never {
  throw new StudyCodeSemanticError(message, node.line, node.column)
}
