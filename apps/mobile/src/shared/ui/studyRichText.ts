import type { StudyInternalLinkTargetKind } from '@mymind/contracts/study'

export interface StudyRichTextInternalLink {
  kind: StudyInternalLinkTargetKind
  materialId: string
  headingId: string | null
  headingLevel: 1 | 2 | 3 | null
  labelMode: 'auto' | 'custom'
  label: string
  materialTitle: string
  folderPath: string[]
}

export type StudyRichTextSegment =
  { type: 'text'; text: string } | { type: 'internal-link'; link: StudyRichTextInternalLink }

const INTERNAL_LINK_PATTERN =
  /<span\b(?=[^>]*\bdata-study-internal-link\s*=\s*(?:"true"|'true'))([^>]*)>([\s\S]*?)<\/span\s*>/gi

function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi,
    (
      match,
      decimal: string | undefined,
      hexadecimal: string | undefined,
      named: string | undefined
    ) => {
      if (decimal) {
        const codePoint = Number.parseInt(decimal, 10)
        return Number.isFinite(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : match
      }
      if (hexadecimal) {
        const codePoint = Number.parseInt(hexadecimal, 16)
        return Number.isFinite(codePoint) && codePoint <= 0x10ffff
          ? String.fromCodePoint(codePoint)
          : match
      }
      switch (named?.toLowerCase()) {
        case 'amp':
          return '&'
        case 'lt':
          return '<'
        case 'gt':
          return '>'
        case 'quot':
          return '"'
        case 'apos':
        case '#39':
          return "'"
        case 'nbsp':
          return '\u00a0'
        default:
          return match
      }
    }
  )
}

function htmlFragmentToText(value: string): string {
  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li|h[1-6])\s*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
  )
}

function attribute(attributes: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(
    attributes
  )
  const value = match?.[1] ?? match?.[2]
  return value === undefined ? null : decodeHtmlEntities(value)
}

function folderPath(attributes: string): string[] {
  const value = attribute(attributes, 'data-folder-path')
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

function headingLevel(attributes: string): 1 | 2 | 3 | null {
  const value = Number(attribute(attributes, 'data-heading-level'))
  return value === 1 || value === 2 || value === 3 ? value : null
}

function trimOuterNewlines(segments: StudyRichTextSegment[]): StudyRichTextSegment[] {
  const first = segments[0]
  if (first?.type === 'text') first.text = first.text.replace(/^\n+/, '')
  const last = segments.at(-1)
  if (last?.type === 'text') last.text = last.text.replace(/\n+$/, '')
  return segments.filter((segment) => segment.type !== 'text' || segment.text.length > 0)
}

export function parseStudyRichTextSegments(
  html: string | undefined,
  fallbackText: string
): StudyRichTextSegment[] {
  if (!html || !/data-study-internal-link\s*=/i.test(html)) {
    return [{ type: 'text', text: fallbackText }]
  }

  const segments: StudyRichTextSegment[] = []
  let cursor = 0
  let found = false
  INTERNAL_LINK_PATTERN.lastIndex = 0

  for (
    let match = INTERNAL_LINK_PATTERN.exec(html);
    match;
    match = INTERNAL_LINK_PATTERN.exec(html)
  ) {
    found = true
    if (match.index > cursor) {
      segments.push({ type: 'text', text: htmlFragmentToText(html.slice(cursor, match.index)) })
    }

    const attributes = match[1] ?? ''
    const innerHtml = match[2] ?? ''
    const targetKind =
      attribute(attributes, 'data-target-kind') === 'heading' ? 'heading' : 'material'
    const rawHeadingId = attribute(attributes, 'data-heading-id')
    const storedLabel = attribute(attributes, 'data-label') ?? htmlFragmentToText(innerHtml)

    segments.push({
      type: 'internal-link',
      link: {
        kind: targetKind,
        materialId: attribute(attributes, 'data-material-id') ?? '',
        headingId: targetKind === 'heading' && rawHeadingId ? rawHeadingId : null,
        headingLevel: targetKind === 'heading' ? headingLevel(attributes) : null,
        labelMode: attribute(attributes, 'data-label-mode') === 'custom' ? 'custom' : 'auto',
        label: storedLabel,
        materialTitle: attribute(attributes, 'data-material-title') ?? '',
        folderPath: folderPath(attributes)
      }
    })
    cursor = match.index + match[0].length
  }

  if (!found) return [{ type: 'text', text: fallbackText }]
  if (cursor < html.length) {
    segments.push({ type: 'text', text: htmlFragmentToText(html.slice(cursor)) })
  }

  return trimOuterNewlines(segments)
}
