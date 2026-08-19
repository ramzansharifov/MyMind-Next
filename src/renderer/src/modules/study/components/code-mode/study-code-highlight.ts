export const STUDY_CODE_HIGHLIGHT_MAX_LENGTH = 300_000

const entityKeywords = new Set(['folder', 'material'])
const blockKeywords = new Set([
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
  'html'
])
const booleanKeywords = new Set(['true', 'false'])
const annotationKeywords = new Set(['id', 'version'])
const punctuationCharacters = new Set(['{', '}', '(', ')', '='])

// Mirrors the symbolic-link syntax accepted by study-code-internal-links.ts.
const symbolicInternalLinkPattern =
  /\[\[[A-Za-z_][A-Za-z0-9_]{0,79}(?:\.[A-Za-z_][A-Za-z0-9_]{0,79})?(?:\|[^\]\r\n]+)?\]\]/g

export function highlightStudyCodeSource(source: string): string {
  if (source.length > STUDY_CODE_HIGHLIGHT_MAX_LENGTH) return escapeHighlightHtml(source)

  const output: string[] = []
  let index = 0
  let multilineDelimiter: string | null = null

  while (index < source.length) {
    if (multilineDelimiter) {
      const closingIndex = source.indexOf(multilineDelimiter, index)
      const bodyEnd = closingIndex < 0 ? source.length : closingIndex
      pushMultilineBody(output, source.slice(index, bodyEnd))
      index = bodyEnd

      if (closingIndex < 0) break

      pushToken(output, 'dsl-delimiter', multilineDelimiter)
      index += multilineDelimiter.length
      multilineDelimiter = null
      continue
    }

    const character = source[index]

    if (isWhitespace(character)) {
      const end = readWhile(source, index + 1, isWhitespace)
      output.push(escapeHighlightHtml(source.slice(index, end)))
      index = end
      continue
    }

    if (source.startsWith('//', index)) {
      const newlineIndex = source.indexOf('\n', index + 2)
      const end = newlineIndex < 0 ? source.length : newlineIndex
      pushToken(output, 'dsl-comment', source.slice(index, end))
      index = end
      continue
    }

    if (character === '"') {
      const quoteRunLength = countQuoteRun(source, index)

      if (quoteRunLength >= 3) {
        multilineDelimiter = '"'.repeat(quoteRunLength)
        pushToken(output, 'dsl-delimiter', multilineDelimiter)
        index += quoteRunLength
        continue
      }

      const end = readQuotedStringEnd(source, index)
      pushToken(output, 'dsl-string', source.slice(index, end))
      index = end
      continue
    }

    if (character === '@') {
      const annotationEnd = readIdentifierEnd(source, index + 1)
      const annotation = source.slice(index + 1, annotationEnd)

      if (annotationKeywords.has(annotation)) {
        pushToken(output, 'dsl-annotation', source.slice(index, annotationEnd))
        index = annotationEnd
        continue
      }

      pushToken(output, 'dsl-punctuation', character)
      index += 1
      continue
    }

    const numberEnd = readNumberEnd(source, index)
    if (numberEnd > index) {
      pushToken(output, 'dsl-number', source.slice(index, numberEnd))
      index = numberEnd
      continue
    }

    if (isIdentifierStart(character)) {
      const end = readIdentifierEnd(source, index)
      const identifier = source.slice(index, end)
      const token = classifyIdentifier(source, identifier, end)
      pushToken(output, token, identifier)
      index = end
      continue
    }

    if (punctuationCharacters.has(character)) {
      pushToken(output, 'dsl-punctuation', character)
      index += 1
      continue
    }

    output.push(escapeHighlightHtml(character))
    index += 1
  }

  return output.join('')
}

function classifyIdentifier(source: string, identifier: string, end: number): StudyCodeToken {
  if (entityKeywords.has(identifier)) return 'dsl-entity'
  if (blockKeywords.has(identifier)) return 'dsl-block'
  if (booleanKeywords.has(identifier)) return 'dsl-boolean'

  let cursor = end
  while (source[cursor] === ' ' || source[cursor] === '\t') cursor += 1
  if (source[cursor] === '=') return 'dsl-property'

  return 'dsl-name'
}

function pushMultilineBody(output: string[], body: string): void {
  if (!body) return

  symbolicInternalLinkPattern.lastIndex = 0
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = symbolicInternalLinkPattern.exec(body)) !== null) {
    if (match.index > cursor) {
      pushToken(output, 'dsl-body', body.slice(cursor, match.index))
    }
    pushToken(output, 'dsl-internal-link', match[0])
    cursor = match.index + match[0].length
  }

  if (cursor < body.length) pushToken(output, 'dsl-body', body.slice(cursor))
}

function pushToken(output: string[], token: StudyCodeToken, value: string): void {
  output.push(`<span class="token ${token}">${escapeHighlightHtml(value)}</span>`)
}

function readQuotedStringEnd(source: string, start: number): number {
  let index = start + 1
  let escaped = false

  while (index < source.length) {
    const character = source[index]

    if (character === '\n' || character === '\r') return index

    index += 1

    if (escaped) {
      escaped = false
      continue
    }

    if (character === '\\') {
      escaped = true
      continue
    }

    if (character === '"') return index
  }

  return source.length
}

function readNumberEnd(source: string, start: number): number {
  let index = start

  if (source[index] === '-') index += 1

  if (source[index] === '.') {
    if (!isDigit(source[index + 1])) return start
    index += 1
    while (isDigit(source[index])) index += 1
    return index
  }

  if (!isDigit(source[index])) return start
  while (isDigit(source[index])) index += 1

  if (source[index] === '.' && isDigit(source[index + 1])) {
    index += 1
    while (isDigit(source[index])) index += 1
  }

  return index
}

function readIdentifierEnd(source: string, start: number): number {
  if (!isIdentifierStart(source[start])) return start
  return readWhile(source, start + 1, isIdentifierPart)
}

function readWhile(source: string, start: number, predicate: (value: string) => boolean): number {
  let index = start
  while (index < source.length && predicate(source[index])) index += 1
  return index
}

function countQuoteRun(source: string, start: number): number {
  let count = 0
  while (source[start + count] === '"') count += 1
  return count
}

function isWhitespace(value: string): boolean {
  return value === ' ' || value === '\t' || value === '\n' || value === '\r'
}

function isIdentifierStart(value: string | undefined): boolean {
  return value !== undefined && /[A-Za-z_]/.test(value)
}

function isIdentifierPart(value: string | undefined): boolean {
  return value !== undefined && /[A-Za-z0-9_]/.test(value)
}

function isDigit(value: string | undefined): boolean {
  return value !== undefined && value >= '0' && value <= '9'
}

export function escapeHighlightHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

type StudyCodeToken =
  | 'dsl-entity'
  | 'dsl-block'
  | 'dsl-name'
  | 'dsl-property'
  | 'dsl-annotation'
  | 'dsl-string'
  | 'dsl-number'
  | 'dsl-boolean'
  | 'dsl-punctuation'
  | 'dsl-comment'
  | 'dsl-delimiter'
  | 'dsl-body'
  | 'dsl-internal-link'
