import {
  STUDY_DOCUMENT_LIMITS,
  STUDY_FOLDER_ICON_NAMES,
  STUDY_SAFE_ID_PATTERN,
  type StudyBlockType
} from './contracts/study'
import { isSafeStudyAssetFileName } from './study-assets'
import { parseStudyCode, type StudyCodeBlockAst, type StudyCodeTreeAst } from './study-code'
import { normalizeStudyRemoteImageUrl, parseStudyYouTubeUrl } from './study-remote-media'

export interface StudyCodeConstraintDiagnostic {
  line: number
  column: number
  message: string
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const folderIconSet = new Set<string>(STUDY_FOLDER_ICON_NAMES)

const blockAttributes: Record<StudyBlockType, readonly string[]> = {
  text: [],
  heading: ['color', 'background', 'align', 'backgroundScope'],
  code: ['language'],
  markdown: ['view'],
  latex: ['view', 'display', 'align', 'scale'],
  mermaid: ['view', 'theme', 'scale'],
  image: ['asset', 'name', 'mime', 'size', 'url', 'title', 'fit', 'height'],
  video: ['asset', 'name', 'mime', 'size', 'url', 'title'],
  audio: ['asset', 'name', 'mime', 'size', 'title'],
  file: ['asset', 'name', 'mime', 'size', 'title'],
  divider: ['variant', 'thickness', 'color'],
  board: ['board']
}

const blockLabels: Record<StudyBlockType, string> = {
  text: 'Текст',
  heading: 'Заголовок',
  code: 'Код',
  markdown: 'Markdown',
  latex: 'LaTeX',
  mermaid: 'Mermaid',
  image: 'Изображение',
  video: 'Видео',
  audio: 'Аудио',
  file: 'Файл',
  divider: 'Разделитель',
  board: 'Доска'
}

export function validateStudyCodeConstraints(source: string): StudyCodeConstraintDiagnostic[] {
  const normalizedSource = source.replace(/\r\n?/g, '\n')
  const document = parseStudyCode(normalizedSource)
  const lines = normalizedSource.split('\n')
  const diagnostics: StudyCodeConstraintDiagnostic[] = []

  const report = (
    location: { line: number; column: number },
    message: string,
    attribute?: string
  ): void => {
    if (diagnostics.length >= 50) return
    diagnostics.push({
      ...findLocation(lines, location, attribute),
      message
    })
  }

  const visit = (node: StudyCodeTreeAst): void => {
    validateNode(node, report)

    if (node.kind === 'folder') {
      node.children.forEach(visit)
      return
    }

    if (node.blocks.length > STUDY_DOCUMENT_LIMITS.maxBlocks) {
      report(
        node,
        `Материал содержит слишком много блоков: максимум ${STUDY_DOCUMENT_LIMITS.maxBlocks}`
      )
    }

    node.blocks.forEach((block) => validateBlock(block, report))
  }

  visit(document.root)
  return diagnostics
}

function validateNode(node: StudyCodeTreeAst, report: ReportDiagnostic): void {
  const title = node.title.trim()
  if (!title) report(node, 'Название не может быть пустым')
  if (title.length > STUDY_DOCUMENT_LIMITS.maxTitleLength) {
    report(node, `Название не должно быть длиннее ${STUDY_DOCUMENT_LIMITS.maxTitleLength} символов`)
  }

  const allowed = node.kind === 'folder' ? ['icon'] : []
  validateAllowedAttributes(node, allowed, report)

  if (node.kind === 'folder' && node.attributes.icon !== undefined) {
    const icon = requireStringAttribute(node, 'icon', report)
    if (icon !== undefined && !folderIconSet.has(icon)) {
      report(node, `Неизвестная иконка папки «${icon}»`, 'icon')
    }
  }
}

function validateBlock(block: StudyCodeBlockAst, report: ReportDiagnostic): void {
  const label = blockLabels[block.blockType]
  validateAllowedAttributes(block, blockAttributes[block.blockType], report)

  switch (block.blockType) {
    case 'text':
      validateMaxLength(
        block,
        block.body ?? '',
        STUDY_DOCUMENT_LIMITS.maxTextLength,
        `${label}: текст`,
        report
      )
      if (block.html !== undefined) {
        validateMaxLength(
          block,
          block.html,
          STUDY_DOCUMENT_LIMITS.maxHtmlLength,
          `${label}: HTML`,
          report
        )
      }
      return
    case 'heading':
      validateMaxLength(
        block,
        block.title ?? '',
        STUDY_DOCUMENT_LIMITS.maxTitleLength,
        `${label}: текст`,
        report
      )
      validateColor(block, 'color', report)
      validateColor(block, 'background', report)
      validateEnum(block, 'align', ['left', 'center', 'right'], report)
      validateEnum(block, 'backgroundScope', ['text', 'container'], report)
      return
    case 'code': {
      validateMaxLength(
        block,
        block.body ?? '',
        STUDY_DOCUMENT_LIMITS.maxSourceLength,
        `${label}: исходник`,
        report
      )
      const language = optionalStringAttribute(block, 'language', report)
      if (language !== undefined && language.length > 80) {
        report(block, 'Код: параметр language не должен быть длиннее 80 символов', 'language')
      }
      return
    }
    case 'markdown':
      validateMaxLength(
        block,
        block.body ?? '',
        STUDY_DOCUMENT_LIMITS.maxSourceLength,
        `${label}: исходник`,
        report
      )
      validateEnum(block, 'view', ['write', 'split', 'preview'], report)
      return
    case 'latex':
      validateMaxLength(
        block,
        block.body ?? '',
        STUDY_DOCUMENT_LIMITS.maxLatexSourceLength,
        `${label}: исходник`,
        report
      )
      validateEnum(block, 'view', ['write', 'split', 'preview'], report)
      validateEnum(block, 'display', ['display', 'inline'], report)
      validateEnum(block, 'align', ['left', 'center', 'right'], report)
      validateIntegerRange(
        block,
        'scale',
        70,
        180,
        'LaTeX: масштаб должен быть от 70 до 180%',
        report
      )
      return
    case 'mermaid':
      validateMaxLength(
        block,
        block.body ?? '',
        STUDY_DOCUMENT_LIMITS.maxMermaidSourceLength,
        `${label}: исходник`,
        report
      )
      validateEnum(block, 'view', ['write', 'split', 'preview'], report)
      validateEnum(block, 'theme', ['dark', 'default', 'neutral', 'forest'], report)
      validateIntegerRange(
        block,
        'scale',
        60,
        180,
        'Mermaid: масштаб должен быть от 60 до 180%',
        report
      )
      return
    case 'image':
      validateAssetBlock(block, true, report)
      validateOptionalTitle(block, report)
      validateEnum(block, 'fit', ['contain', 'cover'], report)
      validateIntegerRange(
        block,
        'height',
        180,
        720,
        'Изображение: высота должна быть от 180 до 720 px',
        report
      )
      return
    case 'video':
      validateAssetBlock(block, true, report)
      validateOptionalTitle(block, report)
      return
    case 'audio':
    case 'file':
      validateAssetBlock(block, false, report)
      validateOptionalTitle(block, report)
      return
    case 'divider':
      validateEnum(block, 'variant', ['solid', 'tapered', 'dashed', 'dotted'], report)
      validateIntegerRange(
        block,
        'thickness',
        1,
        12,
        'Разделитель: толщина должна быть целым числом от 1 до 12',
        report
      )
      validateColor(block, 'color', report)
      return
    case 'board': {
      validateMaxLength(
        block,
        block.title ?? '',
        STUDY_DOCUMENT_LIMITS.maxTitleLength,
        'Доска: название',
        report
      )
      const boardId = optionalStringAttribute(block, 'board', report)
      if (boardId !== undefined && !STUDY_SAFE_ID_PATTERN.test(boardId)) {
        report(block, 'Доска: параметр board содержит некорректный идентификатор', 'board')
      }
      return
    }
  }
}

function validateAssetBlock(
  block: StudyCodeBlockAst,
  allowUrl: boolean,
  report: ReportDiagnostic
): void {
  const asset = optionalStringAttribute(block, 'asset', report)
  const url = optionalStringAttribute(block, 'url', report)
  const name = optionalStringAttribute(block, 'name', report)
  const mime = optionalStringAttribute(block, 'mime', report)
  const size = optionalNumberAttribute(block, 'size', report)

  if (url !== undefined && !allowUrl) {
    report(block, `${blockLabels[block.blockType]} поддерживает только локальное вложение`, 'url')
  }
  if (url !== undefined && asset !== undefined) {
    report(block, 'Нельзя одновременно указывать asset и url', 'url')
  }

  if (url !== undefined) {
    if (url.length > STUDY_DOCUMENT_LIMITS.maxRemoteUrlLength) {
      report(
        block,
        `Ссылка не должна быть длиннее ${STUDY_DOCUMENT_LIMITS.maxRemoteUrlLength} символов`,
        'url'
      )
    } else if (block.blockType === 'image' && normalizeStudyRemoteImageUrl(url) === null) {
      report(block, 'Изображение: укажите корректную HTTPS-ссылку', 'url')
    } else if (block.blockType === 'video' && parseStudyYouTubeUrl(url) === null) {
      report(block, 'Видео: укажите корректную ссылку YouTube', 'url')
    }
  }

  const detachedMetadata = [
    ['name', name],
    ['mime', mime],
    ['size', size]
  ] as const

  if (asset === undefined && detachedMetadata.some(([, value]) => value !== undefined)) {
    const key = detachedMetadata.find(([, value]) => value !== undefined)?.[0]
    report(block, 'Параметры name, mime и size используются только вместе с asset', key)
  }

  if (url !== undefined && detachedMetadata.some(([, value]) => value !== undefined)) {
    const key = detachedMetadata.find(([, value]) => value !== undefined)?.[0]
    report(block, 'При использовании url параметры name, mime и size не нужны', key)
  }

  if (asset === undefined) return

  if (!UUID_PATTERN.test(asset)) {
    report(block, 'Параметр asset должен содержать UUID существующего вложения', 'asset')
  }
  if (name === undefined) report(block, 'Для локального вложения требуется параметр name', 'asset')
  else if (!isSafeStudyAssetFileName(name)) {
    report(block, 'Некорректное имя локального вложения', 'name')
  }
  if (mime === undefined || mime.length === 0) {
    report(block, 'Для локального вложения требуется параметр mime', 'asset')
  } else if (mime.length > 120) {
    report(block, 'Параметр mime не должен быть длиннее 120 символов', 'mime')
  }
  if (size === undefined) {
    report(block, 'Для локального вложения требуется параметр size', 'asset')
  } else if (!Number.isInteger(size) || size < 0) {
    report(block, 'Параметр size должен быть целым неотрицательным числом', 'size')
  }
}

function validateOptionalTitle(block: StudyCodeBlockAst, report: ReportDiagnostic): void {
  const title = optionalStringAttribute(block, 'title', report)
  if (title !== undefined && title.length > STUDY_DOCUMENT_LIMITS.maxTitleLength) {
    report(
      block,
      `Название не должно быть длиннее ${STUDY_DOCUMENT_LIMITS.maxTitleLength} символов`,
      'title'
    )
  }
}

function validateAllowedAttributes(
  ast: { attributes: Record<string, unknown>; line: number; column: number },
  allowed: readonly string[],
  report: ReportDiagnostic
): void {
  const allowedSet = new Set(allowed)
  Object.keys(ast.attributes).forEach((key) => {
    if (!allowedSet.has(key)) report(ast, `Неизвестный параметр «${key}»`, key)
  })
}

function validateColor(block: StudyCodeBlockAst, key: string, report: ReportDiagnostic): void {
  const value = optionalStringAttribute(block, key, report)
  if (value !== undefined && !HEX_COLOR_PATTERN.test(value)) {
    report(block, `Параметр ${key} должен быть цветом в формате #RRGGBB`, key)
  }
}

function validateEnum(
  block: StudyCodeBlockAst,
  key: string,
  allowed: readonly string[],
  report: ReportDiagnostic
): void {
  const value = optionalStringAttribute(block, key, report)
  if (value !== undefined && !allowed.includes(value)) {
    report(block, `Параметр ${key}: допустимые значения — ${allowed.join(', ')}`, key)
  }
}

function validateIntegerRange(
  block: StudyCodeBlockAst,
  key: string,
  minimum: number,
  maximum: number,
  message: string,
  report: ReportDiagnostic
): void {
  const value = optionalNumberAttribute(block, key, report)
  if (value !== undefined && (!Number.isInteger(value) || value < minimum || value > maximum)) {
    report(block, message, key)
  }
}

function validateMaxLength(
  block: StudyCodeBlockAst,
  value: string,
  maximum: number,
  label: string,
  report: ReportDiagnostic
): void {
  if (value.length > maximum) {
    report(block, `${label} превышает допустимую длину (${maximum} символов)`)
  }
}

function optionalStringAttribute(
  block: StudyCodeBlockAst,
  key: string,
  report: ReportDiagnostic
): string | undefined {
  const value = block.attributes[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string') {
    report(block, `Параметр ${key} должен быть строкой`, key)
    return undefined
  }
  return value
}

function requireStringAttribute(
  ast: { attributes: Record<string, unknown>; line: number; column: number },
  key: string,
  report: ReportDiagnostic
): string | undefined {
  const value = ast.attributes[key]
  if (typeof value === 'string') return value
  report(ast, `Параметр ${key} должен быть строкой`, key)
  return undefined
}

function optionalNumberAttribute(
  block: StudyCodeBlockAst,
  key: string,
  report: ReportDiagnostic
): number | undefined {
  const value = block.attributes[key]
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    report(block, `Параметр ${key} должен быть числом`, key)
    return undefined
  }
  return value
}

function findLocation(
  lines: readonly string[],
  fallback: { line: number; column: number },
  attribute?: string
): { line: number; column: number } {
  if (!attribute) return fallback
  const line = lines[fallback.line - 1] ?? ''
  const pattern = new RegExp(`\\b${escapeRegExp(attribute)}\\s*=`)
  const match = pattern.exec(line)
  return {
    line: fallback.line,
    column: match ? match.index + 1 : fallback.column
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

type ReportDiagnostic = (
  location: { line: number; column: number },
  message: string,
  attribute?: string
) => void
