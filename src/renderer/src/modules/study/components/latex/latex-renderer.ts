import katex, { type KatexOptions } from 'katex'

import type { StudyLatexDisplayMode } from '../../../../../../shared/contracts/study'

export interface StudyLatexRenderResult {
  html: string | null
  error: string | null
}

const DOCUMENT_ENVIRONMENT_PATTERN =
  /^\s*(?:\\displaystyle\s*)?\\begin\{(align\*?|alignat\*?|aligned|alignedat|gather\*?|gathered|array)\}(?:\[[^\]]*\])?(?:\{[^{}]*\})?\s*([\s\S]*?)\s*\\end\{\1\}\s*$/

export function renderStudyLatex(
  source: string,
  displayMode: StudyLatexDisplayMode
): StudyLatexRenderResult {
  const trimmedSource = source.trim()

  if (!trimmedSource) {
    return {
      html: null,
      error: null
    }
  }

  try {
    const documentRows = displayMode === 'display' ? extractDocumentRows(trimmedSource) : null
    const html = documentRows
      ? renderDocumentRows(documentRows)
      : katex.renderToString(trimmedSource, createKatexOptions(displayMode === 'display'))

    return {
      html,
      error: null
    }
  } catch (reason: unknown) {
    return {
      html: null,
      error: getLatexErrorMessage(reason)
    }
  }
}

function createKatexOptions(displayMode: boolean): KatexOptions {
  return {
    displayMode,
    output: 'htmlAndMathml',
    throwOnError: true,
    trust: false,
    strict: 'ignore',
    maxExpand: 500,
    maxSize: 20
  }
}

function extractDocumentRows(source: string): string[] | null {
  const match = source.match(DOCUMENT_ENVIRONMENT_PATTERN)

  if (!match) {
    return null
  }

  const rows = splitTopLevelRows(match[2])
    .map(normalizeDocumentRow)
    .filter(Boolean)

  if (!isDocumentLikeRows(rows, source)) {
    return null
  }

  return rows
}

function isDocumentLikeRows(rows: string[], source: string): boolean {
  if (rows.length < 3 || source.length < 120) {
    return false
  }

  if (rows.some((row) => /\\(?:tag|label|notag|nonumber)\b/.test(row))) {
    return false
  }

  return rows.some((row) => /\\(?:text|textbf|textit|textrm|mathrm)\s*\{/.test(row))
}

function splitTopLevelRows(source: string): string[] {
  const rows: string[] = []
  let current = ''
  let braceDepth = 0
  let environmentDepth = 0
  let index = 0

  const pushCurrentRow = (): void => {
    rows.push(current)
    current = ''
  }

  while (index < source.length) {
    const rest = source.slice(index)
    const beginMatch = rest.match(/^\\begin\{[^{}]+\}/)

    if (beginMatch) {
      environmentDepth += 1
      current += beginMatch[0]
      index += beginMatch[0].length
      continue
    }

    const endMatch = rest.match(/^\\end\{[^{}]+\}/)

    if (endMatch) {
      environmentDepth = Math.max(0, environmentDepth - 1)
      current += endMatch[0]
      index += endMatch[0].length
      continue
    }

    if (environmentDepth === 0 && braceDepth === 0 && source.startsWith('\\\\', index)) {
      pushCurrentRow()
      index += 2
      index = skipOptionalRowGap(source, index)
      continue
    }

    if (
      environmentDepth === 0 &&
      braceDepth === 0 &&
      source.startsWith('\\cr', index) &&
      !/[A-Za-z]/.test(source[index + 3] ?? '')
    ) {
      pushCurrentRow()
      index += 3
      index = skipOptionalRowGap(source, index)
      continue
    }

    const character = source[index]

    if (!isEscaped(source, index)) {
      if (character === '{') {
        braceDepth += 1
      } else if (character === '}') {
        braceDepth = Math.max(0, braceDepth - 1)
      }
    }

    current += character
    index += 1
  }

  pushCurrentRow()
  return rows
}

function skipOptionalRowGap(source: string, startIndex: number): number {
  let index = startIndex

  while (source[index] === ' ' || source[index] === '\t') {
    index += 1
  }

  if (source[index] !== '[') {
    return startIndex
  }

  const closingIndex = source.indexOf(']', index + 1)
  return closingIndex >= 0 ? closingIndex + 1 : startIndex
}

function normalizeDocumentRow(source: string): string {
  let result = ''
  let braceDepth = 0
  let environmentDepth = 0
  let index = 0

  while (index < source.length) {
    const rest = source.slice(index)
    const beginMatch = rest.match(/^\\begin\{[^{}]+\}/)

    if (beginMatch) {
      environmentDepth += 1
      result += beginMatch[0]
      index += beginMatch[0].length
      continue
    }

    const endMatch = rest.match(/^\\end\{[^{}]+\}/)

    if (endMatch) {
      environmentDepth = Math.max(0, environmentDepth - 1)
      result += endMatch[0]
      index += endMatch[0].length
      continue
    }

    const character = source[index]

    if (!isEscaped(source, index)) {
      if (character === '{') {
        braceDepth += 1
      } else if (character === '}') {
        braceDepth = Math.max(0, braceDepth - 1)
      } else if (character === '&' && braceDepth === 0 && environmentDepth === 0) {
        result += ' '
        index += 1
        continue
      }
    }

    result += character
    index += 1
  }

  return result.trim()
}

function renderDocumentRows(rows: string[]): string {
  const rowHtml = rows
    .map((row) => {
      const html = katex.renderToString(`\\displaystyle ${row}`, createKatexOptions(false))
      return `<div class="study-latex-document-row">${html}</div>`
    })
    .join('')

  return `<div class="study-latex-document-layout" data-study-latex-document-layout="true">${rowHtml}</div>`
}

function isEscaped(source: string, index: number): boolean {
  let slashCount = 0
  let cursor = index - 1

  while (cursor >= 0 && source[cursor] === '\\') {
    slashCount += 1
    cursor -= 1
  }

  return slashCount % 2 === 1
}

function getLatexErrorMessage(reason: unknown): string {
  if (!(reason instanceof Error)) {
    return 'Не удалось отобразить формулу'
  }

  return reason.message.replace(/^KaTeX parse error:\s*/i, '').trim()
}
