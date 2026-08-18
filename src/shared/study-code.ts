import type { StudyBlockType, StudyFolderIconName } from './contracts/study'

export const STUDY_CODE_VERSION = 1 as const
export const STUDY_CODE_MAX_SOURCE_LENGTH = 24 * 1024 * 1024

export type StudyCodeAttributeValue = string | number | boolean

export interface StudyCodeLocation {
  line: number
  column: number
}

interface StudyCodeAstBase extends StudyCodeLocation {
  id?: string
}

export interface StudyCodeFolderAst extends StudyCodeAstBase {
  kind: 'folder'
  title: string
  attributes: Record<string, StudyCodeAttributeValue>
  children: StudyCodeTreeAst[]
}

export interface StudyCodeMaterialAst extends StudyCodeAstBase {
  kind: 'material'
  title: string
  attributes: Record<string, StudyCodeAttributeValue>
  blocks: StudyCodeBlockAst[]
}

export type StudyCodeTreeAst = StudyCodeFolderAst | StudyCodeMaterialAst

export interface StudyCodeBlockAst extends StudyCodeAstBase {
  kind: 'block'
  blockType: StudyBlockType
  headingLevel?: 1 | 2 | 3
  title?: string
  attributes: Record<string, StudyCodeAttributeValue>
  body?: string
  html?: string
}

export interface StudyCodeDocumentAst {
  version: typeof STUDY_CODE_VERSION
  root: StudyCodeTreeAst
}

export interface StudyCodeTreeFolder {
  kind: 'folder'
  id: string
  title: string
  icon?: StudyFolderIconName
  children: StudyCodeTreeNode[]
}

export interface StudyCodeTreeMaterial {
  kind: 'material'
  id: string
  title: string
  blocks: StudyCodeSerializedBlock[]
}

export type StudyCodeTreeNode = StudyCodeTreeFolder | StudyCodeTreeMaterial

export interface StudyCodeSerializedBlock {
  id: string
  type: StudyBlockType
  headingLevel?: 1 | 2 | 3
  title?: string
  attributes?: Record<string, StudyCodeAttributeValue>
  body?: string
  html?: string
}

export interface StudyCodeDiagnosticLike extends StudyCodeLocation {
  message: string
}

export class StudyCodeSyntaxError extends Error implements StudyCodeLocation {
  readonly line: number
  readonly column: number

  constructor(message: string, line: number, column: number) {
    super(message)
    this.name = 'StudyCodeSyntaxError'
    this.line = line
    this.column = column
  }
}

const blockTypes = new Set<StudyBlockType>([
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
  'board'
])

const multilineBlockTypes = new Set<StudyBlockType>([
  'text',
  'code',
  'markdown',
  'latex',
  'mermaid'
])

export function parseStudyCode(source: string): StudyCodeDocumentAst {
  if (source.length > STUDY_CODE_MAX_SOURCE_LENGTH) {
    throw new StudyCodeSyntaxError('Код превышает допустимый размер', 1, 1)
  }

  const parser = new StudyCodeParser(source.replace(/\r\n?/g, '\n'))
  return parser.parse()
}

export function parseStudyCodeSafe(
  source: string
): { success: true; value: StudyCodeDocumentAst } | { success: false; diagnostic: StudyCodeDiagnosticLike } {
  try {
    return { success: true, value: parseStudyCode(source) }
  } catch (reason: unknown) {
    if (reason instanceof StudyCodeSyntaxError) {
      return {
        success: false,
        diagnostic: {
          line: reason.line,
          column: reason.column,
          message: reason.message
        }
      }
    }

    return {
      success: false,
      diagnostic: {
        line: 1,
        column: 1,
        message: reason instanceof Error ? reason.message : 'Не удалось разобрать код'
      }
    }
  }
}

export function formatStudyCodeSource(source: string): string {
  return serializeStudyCodeAst(parseStudyCode(source))
}

export function serializeStudyCodeTree(root: StudyCodeTreeNode): string {
  return serializeStudyCodeAst({
    version: STUDY_CODE_VERSION,
    root: treeNodeToAst(root, 1, 1)
  })
}

export function serializeStudyCodeAst(document: StudyCodeDocumentAst): string {
  const lines: string[] = [`@version(${document.version})`, '']
  writeTreeAst(document.root, 0, lines)
  return `${lines.join('\n').replace(/\n+$/g, '')}\n`
}

function treeNodeToAst(node: StudyCodeTreeNode, line: number, column: number): StudyCodeTreeAst {
  if (node.kind === 'folder') {
    return {
      kind: 'folder',
      id: node.id,
      title: node.title,
      line,
      column,
      attributes: node.icon ? { icon: node.icon } : {},
      children: node.children.map((child) => treeNodeToAst(child, line, column))
    }
  }

  return {
    kind: 'material',
    id: node.id,
    title: node.title,
    line,
    column,
    attributes: {},
    blocks: node.blocks.map((block) => ({
      kind: 'block',
      blockType: block.type,
      id: block.id,
      headingLevel: block.headingLevel,
      title: block.title,
      attributes: block.attributes ?? {},
      body: block.body,
      html: block.html,
      line,
      column
    }))
  }
}

function writeTreeAst(node: StudyCodeTreeAst, indent: number, lines: string[]): void {
  const prefix = '  '.repeat(indent)
  const attributes = formatAttributes(node.id, node.attributes)
  lines.push(`${prefix}${node.kind} ${quote(node.title)}${attributes} {`)

  if (node.kind === 'folder') {
    node.children.forEach((child, index) => {
      if (index > 0) lines.push('')
      writeTreeAst(child, indent + 1, lines)
    })
  } else {
    node.blocks.forEach((block, index) => {
      if (index > 0) lines.push('')
      writeBlockAst(block, indent + 1, lines)
    })
  }

  lines.push(`${prefix}}`)
}

function writeBlockAst(block: StudyCodeBlockAst, indent: number, lines: string[]): void {
  const prefix = '  '.repeat(indent)
  const attributes = formatAttributes(block.id, block.attributes)

  if (block.blockType === 'heading') {
    lines.push(
      `${prefix}heading ${block.headingLevel ?? 1} ${quote(block.title ?? '')}${attributes}`
    )
    return
  }

  if (block.blockType === 'board') {
    const title = block.title === undefined ? '' : ` ${quote(block.title)}`
    lines.push(`${prefix}board${title}${attributes}`)
    return
  }

  if (!multilineBlockTypes.has(block.blockType)) {
    lines.push(`${prefix}${block.blockType}${attributes}`)
    return
  }

  const body = block.body ?? ''
  writeMultilineDeclaration(`${prefix}${block.blockType}${attributes}`, body, indent, lines)

  if (block.blockType === 'text' && block.html !== undefined) {
    writeMultilineDeclaration(`${prefix}html`, block.html, indent, lines)
  }
}

function writeMultilineDeclaration(
  declaration: string,
  body: string,
  indent: number,
  lines: string[]
): void {
  const delimiter = chooseMultilineDelimiter(body)
  const bodyPrefix = '  '.repeat(indent + 1)
  const closingPrefix = '  '.repeat(indent)

  lines.push(`${declaration} ${delimiter}`)
  if (body) {
    body.split('\n').forEach((line) => lines.push(`${bodyPrefix}${line}`))
  }
  lines.push(`${closingPrefix}${delimiter}`)
}

function chooseMultilineDelimiter(value: string): string {
  let maximumRun = 0
  let currentRun = 0

  for (const character of value) {
    if (character === '"') {
      currentRun += 1
      maximumRun = Math.max(maximumRun, currentRun)
    } else {
      currentRun = 0
    }
  }

  return '"'.repeat(Math.max(3, maximumRun + 1))
}

function formatAttributes(
  id: string | undefined,
  attributes: Record<string, StudyCodeAttributeValue>
): string {
  const parts: string[] = []
  if (id) parts.push(`@id(${quote(id)})`)

  Object.keys(attributes)
    .sort()
    .forEach((key) => {
      const value = attributes[key]
      parts.push(`${key}=${formatAttributeValue(value)}`)
    })

  return parts.length > 0 ? ` ${parts.join(' ')}` : ''
}

function formatAttributeValue(value: StudyCodeAttributeValue): string {
  if (typeof value === 'string') return quote(value)
  return String(value)
}

function quote(value: string): string {
  return JSON.stringify(value)
}

class StudyCodeParser {
  private index = 0
  private line = 1
  private column = 1

  constructor(private readonly source: string) {}

  parse(): StudyCodeDocumentAst {
    this.skipTrivia()

    let version = STUDY_CODE_VERSION
    if (this.peek() === '@' && this.source.startsWith('@version', this.index)) {
      this.expect('@')
      this.expectIdentifier('version')
      this.skipHorizontalWhitespace()
      this.expect('(')
      this.skipHorizontalWhitespace()
      const parsedVersion = this.readNumber()
      if (parsedVersion !== STUDY_CODE_VERSION) {
        this.fail(`Поддерживается только версия DSL ${STUDY_CODE_VERSION}`)
      }
      version = STUDY_CODE_VERSION
      this.skipHorizontalWhitespace()
      this.expect(')')
      this.skipTrivia()
    }

    const root = this.parseTreeNode()
    this.skipTrivia()

    if (!this.eof()) {
      this.fail('После корневой декларации найден лишний код')
    }

    return { version, root }
  }

  private parseTreeNode(): StudyCodeTreeAst {
    const location = this.location()
    const kind = this.readIdentifier()
    if (kind !== 'folder' && kind !== 'material') {
      this.fail('Ожидалась декларация folder или material', location)
    }

    this.requireWhitespace('После типа элемента ожидается название')
    const title = this.readString()
    const { id, attributes } = this.readInlineMetadataUntil('{')
    this.skipWhitespace()
    this.expect('{')
    this.skipTrivia()

    if (kind === 'folder') {
      const children: StudyCodeTreeAst[] = []
      while (!this.eof() && this.peek() !== '}') {
        children.push(this.parseTreeNode())
        this.skipTrivia()
      }
      this.expect('}')
      return { kind, title, id, attributes, children, ...location }
    }

    const blocks: StudyCodeBlockAst[] = []
    while (!this.eof() && this.peek() !== '}') {
      blocks.push(this.parseBlock())
      this.skipTrivia()
    }
    this.expect('}')
    return { kind, title, id, attributes, blocks, ...location }
  }

  private parseBlock(): StudyCodeBlockAst {
    const location = this.location()
    const identifier = this.readIdentifier()

    if (!blockTypes.has(identifier as StudyBlockType)) {
      this.fail(`Неизвестный тип блока «${identifier}»`, location)
    }

    const blockType = identifier as StudyBlockType
    let headingLevel: 1 | 2 | 3 | undefined
    let title: string | undefined

    if (blockType === 'heading') {
      this.requireWhitespace('После heading ожидается уровень заголовка')
      const level = this.readNumber()
      if (level !== 1 && level !== 2 && level !== 3) {
        this.fail('Уровень heading должен быть 1, 2 или 3')
      }
      headingLevel = level
      this.requireWhitespace('После уровня heading ожидается текст заголовка')
      title = this.readString()
    } else if (blockType === 'board') {
      const checkpoint = this.index
      this.skipHorizontalWhitespace()
      if (this.peek() === '"' && !this.isMultilineDelimiter()) {
        title = this.readString()
      } else {
        this.index = checkpoint
        this.recalculateLocation()
      }
    }

    const needsBody = multilineBlockTypes.has(blockType)
    const metadata = needsBody
      ? this.readInlineMetadataUntilMultiline()
      : this.readInlineMetadataUntilLineEnd()

    let body: string | undefined
    let html: string | undefined

    if (needsBody) {
      this.skipWhitespace()
      if (!this.isMultilineDelimiter()) {
        this.fail(`Блок ${blockType} должен содержать многострочное значение`)
      }
      body = this.readMultilineString()

      if (blockType === 'text') {
        const checkpoint = this.snapshot()
        this.skipTrivia()
        if (this.isIdentifierAhead('html')) {
          this.expectIdentifier('html')
          this.skipWhitespace()
          if (!this.isMultilineDelimiter()) {
            this.fail('После html ожидается многострочное значение')
          }
          html = this.readMultilineString()
        } else {
          this.restore(checkpoint)
        }
      }
    }

    return {
      kind: 'block',
      blockType,
      id: metadata.id,
      attributes: metadata.attributes,
      headingLevel,
      title,
      body,
      html,
      ...location
    }
  }

  private readInlineMetadataUntil(stopCharacter: string): {
    id?: string
    attributes: Record<string, StudyCodeAttributeValue>
  } {
    const attributes: Record<string, StudyCodeAttributeValue> = {}
    let id: string | undefined

    while (!this.eof()) {
      this.skipWhitespace()
      if (this.peek() === stopCharacter) break
      const metadata = this.readMetadataEntry()
      if (metadata.kind === 'id') {
        if (id !== undefined) this.fail('@id указан несколько раз')
        id = metadata.value
      } else {
        if (metadata.key in attributes) this.fail(`Параметр ${metadata.key} указан несколько раз`)
        attributes[metadata.key] = metadata.value
      }
    }

    return { id, attributes }
  }

  private readInlineMetadataUntilMultiline(): {
    id?: string
    attributes: Record<string, StudyCodeAttributeValue>
  } {
    const attributes: Record<string, StudyCodeAttributeValue> = {}
    let id: string | undefined

    while (!this.eof()) {
      this.skipWhitespace()
      if (this.isMultilineDelimiter()) break
      const metadata = this.readMetadataEntry()
      if (metadata.kind === 'id') {
        if (id !== undefined) this.fail('@id указан несколько раз')
        id = metadata.value
      } else {
        if (metadata.key in attributes) this.fail(`Параметр ${metadata.key} указан несколько раз`)
        attributes[metadata.key] = metadata.value
      }
    }

    return { id, attributes }
  }

  private readInlineMetadataUntilLineEnd(): {
    id?: string
    attributes: Record<string, StudyCodeAttributeValue>
  } {
    const attributes: Record<string, StudyCodeAttributeValue> = {}
    let id: string | undefined

    while (!this.eof()) {
      this.skipHorizontalWhitespace()
      if (this.peek() === '\n' || this.peek() === '}' || this.startsLineComment()) break
      const metadata = this.readMetadataEntry()
      if (metadata.kind === 'id') {
        if (id !== undefined) this.fail('@id указан несколько раз')
        id = metadata.value
      } else {
        if (metadata.key in attributes) this.fail(`Параметр ${metadata.key} указан несколько раз`)
        attributes[metadata.key] = metadata.value
      }
    }

    return { id, attributes }
  }

  private readMetadataEntry():
    | { kind: 'id'; value: string }
    | { kind: 'attribute'; key: string; value: StudyCodeAttributeValue } {
    if (this.peek() === '@') {
      this.expect('@')
      this.expectIdentifier('id')
      this.skipHorizontalWhitespace()
      this.expect('(')
      this.skipHorizontalWhitespace()
      const value = this.readString()
      this.skipHorizontalWhitespace()
      this.expect(')')
      return { kind: 'id', value }
    }

    const key = this.readIdentifier()
    this.skipHorizontalWhitespace()
    this.expect('=')
    this.skipHorizontalWhitespace()
    return { kind: 'attribute', key, value: this.readAttributeValue() }
  }

  private readAttributeValue(): StudyCodeAttributeValue {
    if (this.peek() === '"' && !this.isMultilineDelimiter()) return this.readString()
    if (this.isIdentifierAhead('true')) {
      this.expectIdentifier('true')
      return true
    }
    if (this.isIdentifierAhead('false')) {
      this.expectIdentifier('false')
      return false
    }
    return this.readNumber()
  }

  private readString(): string {
    const location = this.location()
    if (this.peek() !== '"' || this.isMultilineDelimiter()) {
      this.fail('Ожидалась строка в двойных кавычках', location)
    }

    const start = this.index
    this.advance()
    let escaped = false

    while (!this.eof()) {
      const character = this.peek()
      if (character === '\n') this.fail('Строка должна заканчиваться на той же строке', location)
      this.advance()

      if (escaped) {
        escaped = false
        continue
      }
      if (character === '\\') {
        escaped = true
        continue
      }
      if (character === '"') {
        const raw = this.source.slice(start, this.index)
        try {
          return JSON.parse(raw) as string
        } catch {
          this.fail('Некорректная строка', location)
        }
      }
    }

    this.fail('Незакрытая строка', location)
  }

  private readMultilineString(): string {
    const location = this.location()
    const delimiterLength = this.countQuoteRun()
    if (delimiterLength < 3) this.fail('Ожидалось многострочное значение', location)

    const delimiter = '"'.repeat(delimiterLength)
    for (let index = 0; index < delimiterLength; index += 1) this.advance()
    const bodyStart = this.index
    const closingIndex = this.source.indexOf(delimiter, bodyStart)

    if (closingIndex < 0) this.fail(`Ожидался закрывающий разделитель ${delimiter}`, location)

    while (this.index < closingIndex) this.advance()
    const rawBody = this.source.slice(bodyStart, closingIndex)
    for (let index = 0; index < delimiterLength; index += 1) this.advance()

    return normalizeMultilineBody(rawBody)
  }

  private readNumber(): number {
    const location = this.location()
    const match = this.source.slice(this.index).match(/^-?(?:\d+(?:\.\d+)?|\.\d+)/)
    if (!match) this.fail('Ожидалось число', location)
    const value = Number(match[0])
    for (let index = 0; index < match[0].length; index += 1) this.advance()
    return value
  }

  private readIdentifier(): string {
    const location = this.location()
    const match = this.source.slice(this.index).match(/^[A-Za-z_][A-Za-z0-9_-]*/)
    if (!match) this.fail('Ожидался идентификатор', location)
    for (let index = 0; index < match[0].length; index += 1) this.advance()
    return match[0]
  }

  private expectIdentifier(value: string): void {
    const location = this.location()
    const actual = this.readIdentifier()
    if (actual !== value) this.fail(`Ожидалось «${value}»`, location)
  }

  private isIdentifierAhead(value: string): boolean {
    if (!this.source.startsWith(value, this.index)) return false
    const next = this.source[this.index + value.length]
    return next === undefined || !/[A-Za-z0-9_-]/.test(next)
  }

  private requireWhitespace(message: string): void {
    if (!/\s/.test(this.peek() ?? '')) this.fail(message)
    this.skipWhitespace()
  }

  private skipTrivia(): void {
    while (!this.eof()) {
      if (/\s/.test(this.peek())) {
        this.advance()
        continue
      }
      if (this.startsLineComment()) {
        while (!this.eof() && this.peek() !== '\n') this.advance()
        continue
      }
      break
    }
  }

  private skipWhitespace(): void {
    while (!this.eof() && /\s/.test(this.peek())) this.advance()
  }

  private skipHorizontalWhitespace(): void {
    while (!this.eof() && (this.peek() === ' ' || this.peek() === '\t')) this.advance()
  }

  private startsLineComment(): boolean {
    return this.source.startsWith('//', this.index)
  }

  private isMultilineDelimiter(): boolean {
    return this.countQuoteRun() >= 3
  }

  private countQuoteRun(): number {
    let count = 0
    while (this.source[this.index + count] === '"') count += 1
    return count
  }

  private expect(character: string): void {
    if (this.peek() !== character) this.fail(`Ожидался символ «${character}»`)
    this.advance()
  }

  private peek(): string {
    return this.source[this.index] ?? ''
  }

  private eof(): boolean {
    return this.index >= this.source.length
  }

  private advance(): void {
    const character = this.source[this.index]
    this.index += 1
    if (character === '\n') {
      this.line += 1
      this.column = 1
    } else {
      this.column += 1
    }
  }

  private location(): StudyCodeLocation {
    return { line: this.line, column: this.column }
  }

  private snapshot(): { index: number; line: number; column: number } {
    return { index: this.index, line: this.line, column: this.column }
  }

  private restore(snapshot: { index: number; line: number; column: number }): void {
    this.index = snapshot.index
    this.line = snapshot.line
    this.column = snapshot.column
  }

  private recalculateLocation(): void {
    const prefix = this.source.slice(0, this.index)
    const lines = prefix.split('\n')
    this.line = lines.length
    this.column = (lines.at(-1)?.length ?? 0) + 1
  }

  private fail(message: string, location: StudyCodeLocation = this.location()): never {
    throw new StudyCodeSyntaxError(message, location.line, location.column)
  }
}

function normalizeMultilineBody(value: string): string {
  let body = value
  if (body.startsWith('\n')) body = body.slice(1)

  const lines = body.split('\n')
  if (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()

  const nonEmpty = lines.filter((line) => line.trim().length > 0)
  const commonIndent =
    nonEmpty.length === 0
      ? 0
      : Math.min(...nonEmpty.map((line) => line.match(/^[ \t]*/)?.[0].length ?? 0))

  return lines.map((line) => line.slice(Math.min(commonIndent, line.length))).join('\n')
}
