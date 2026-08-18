export interface StudyCodeFindOptions {
  matchCase: boolean
  wholeWord: boolean
  useRegex: boolean
}

export interface StudyCodeFindMatch {
  start: number
  end: number
  text: string
  groups: Array<string | undefined>
  namedGroups?: Record<string, string | undefined>
}

export interface StudyCodeFindResult {
  matches: StudyCodeFindMatch[]
  total: number
  truncated: boolean
  error: string | null
}

export interface StudyCodeMatchSegment {
  line: number
  column: number
  length: number
}

const MAX_STORED_MATCHES = 50_000
const WORD_CHARACTER_CLASS = '\\p{L}\\p{N}_'

export function findStudyCodeMatches(
  source: string,
  query: string,
  options: StudyCodeFindOptions
): StudyCodeFindResult {
  if (!query) return { matches: [], total: 0, truncated: false, error: null }

  const compiled = createSearchRegex(query, options)
  if (compiled.error || !compiled.regex) {
    return { matches: [], total: 0, truncated: false, error: compiled.error }
  }

  const matches: StudyCodeFindMatch[] = []
  let total = 0
  let match: RegExpExecArray | null

  while ((match = compiled.regex.exec(source)) !== null) {
    if (match[0].length === 0) {
      return {
        matches: [],
        total: 0,
        truncated: false,
        error: 'Регулярное выражение не должно находить пустую строку'
      }
    }

    total += 1
    if (matches.length < MAX_STORED_MATCHES) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        groups: match.slice(1),
        namedGroups: match.groups ? { ...match.groups } : undefined
      })
    }
  }

  return {
    matches,
    total,
    truncated: total > matches.length,
    error: null
  }
}

export function replaceStudyCodeMatch(
  source: string,
  query: string,
  replacement: string,
  target: StudyCodeFindMatch,
  options: StudyCodeFindOptions
): { source: string; replaced: boolean; error: string | null } {
  const result = findStudyCodeMatches(source, query, options)
  if (result.error) return { source, replaced: false, error: result.error }

  const current = result.matches.find(
    (match) => match.start === target.start && match.end === target.end && match.text === target.text
  )
  if (!current) return { source, replaced: false, error: null }

  const nextValue = options.useRegex
    ? expandRegexReplacement(replacement, current, source)
    : replacement

  return {
    source: `${source.slice(0, current.start)}${nextValue}${source.slice(current.end)}`,
    replaced: true,
    error: null
  }
}

export function replaceAllStudyCodeMatches(
  source: string,
  query: string,
  replacement: string,
  options: StudyCodeFindOptions
): { source: string; replacements: number; error: string | null } {
  const result = findStudyCodeMatches(source, query, options)
  if (result.error) return { source, replacements: 0, error: result.error }
  if (result.total === 0) return { source, replacements: 0, error: null }

  const compiled = createSearchRegex(query, options)
  if (compiled.error || !compiled.regex) {
    return { source, replacements: 0, error: compiled.error }
  }

  const nextSource = options.useRegex
    ? source.replace(compiled.regex, replacement)
    : source.replace(compiled.regex, () => replacement)

  return { source: nextSource, replacements: result.total, error: null }
}

export function getStudyCodeMatchSegments(
  source: string,
  match: StudyCodeFindMatch
): StudyCodeMatchSegment[] {
  const prefix = source.slice(0, match.start)
  const startLine = countNewLines(prefix)
  const previousBreak = prefix.lastIndexOf('\n')
  const startColumn = match.start - (previousBreak + 1)
  const parts = source.slice(match.start, match.end).split('\n')

  return parts.map((part, index) => ({
    line: startLine + index,
    column: index === 0 ? startColumn : 0,
    length: Math.max(part.length, 1)
  }))
}

export function getStudyCodeSourcePosition(
  source: string,
  index: number
): { line: number; column: number } {
  const safeIndex = Math.max(0, Math.min(index, source.length))
  const prefix = source.slice(0, safeIndex)
  const line = countNewLines(prefix)
  const previousBreak = prefix.lastIndexOf('\n')
  return { line, column: safeIndex - (previousBreak + 1) }
}

function createSearchRegex(
  query: string,
  options: StudyCodeFindOptions
): { regex: RegExp | null; error: string | null } {
  try {
    let pattern = options.useRegex ? query : escapeRegExp(query)
    if (options.wholeWord) {
      pattern = `(?<![${WORD_CHARACTER_CLASS}])(?:${pattern})(?![${WORD_CHARACTER_CLASS}])`
    }

    return {
      regex: new RegExp(pattern, `gu${options.matchCase ? '' : 'i'}`),
      error: null
    }
  } catch (reason: unknown) {
    const message = reason instanceof Error ? reason.message.replace(/^Invalid regular expression:\s*/i, '') : ''
    return {
      regex: null,
      error: message ? `Некорректное регулярное выражение: ${message}` : 'Некорректное регулярное выражение'
    }
  }
}

function expandRegexReplacement(
  replacement: string,
  match: StudyCodeFindMatch,
  source: string
): string {
  return replacement.replace(/\$(\$|&|`|'|<[^>]+>|\d{1,2})/g, (token, marker: string) => {
    if (marker === '$') return '$'
    if (marker === '&') return match.text
    if (marker === '`') return source.slice(0, match.start)
    if (marker === "'") return source.slice(match.end)

    if (marker.startsWith('<') && marker.endsWith('>')) {
      if (!match.namedGroups) return token
      return match.namedGroups[marker.slice(1, -1)] ?? ''
    }

    const groupIndex = Number(marker)
    if (!Number.isInteger(groupIndex) || groupIndex <= 0 || groupIndex > match.groups.length) {
      return token
    }
    return match.groups[groupIndex - 1] ?? ''
  })
}

function countNewLines(value: string): number {
  let count = 0
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) === 10) count += 1
  }
  return count
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
