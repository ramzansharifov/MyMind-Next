import type { StudyInternalLinkTarget, StudyInternalLinkTargetKind } from '@mymind/contracts/study'

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

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderInternalLink(link: StudyRichTextInternalLink): string {
  const attributes = [
    'data-study-internal-link="true"',
    `data-target-kind="${link.kind}"`,
    `data-material-id="${escapeHtmlAttribute(link.materialId)}"`,
    link.headingId ? `data-heading-id="${escapeHtmlAttribute(link.headingId)}"` : '',
    link.headingLevel ? `data-heading-level="${link.headingLevel}"` : '',
    `data-label-mode="${link.labelMode}"`,
    `data-label="${escapeHtmlAttribute(link.label)}"`,
    `data-material-title="${escapeHtmlAttribute(link.materialTitle)}"`,
    `data-folder-path="${escapeHtmlAttribute(JSON.stringify(link.folderPath))}"`
  ]
    .filter(Boolean)
    .join(' ')
  return `<span ${attributes}>${escapeHtmlText(link.label)}</span>`
}

export function ensureStudyRichTextEditableSegments(
  segments: readonly StudyRichTextSegment[]
): StudyRichTextSegment[] {
  const normalized: StudyRichTextSegment[] = []
  for (const segment of segments) {
    const previous = normalized.at(-1)
    if (segment.type === 'text') {
      if (previous?.type === 'text') previous.text += segment.text
      else normalized.push({ type: 'text', text: segment.text })
      continue
    }
    if (!previous || previous.type === 'internal-link') {
      normalized.push({ type: 'text', text: '' })
    }
    normalized.push({
      type: 'internal-link',
      link: { ...segment.link, folderPath: [...segment.link.folderPath] }
    })
  }
  if (normalized.length === 0 || normalized.at(-1)?.type === 'internal-link') {
    normalized.push({ type: 'text', text: '' })
  }
  return normalized
}

export function studyRichTextSegmentsToText(segments: readonly StudyRichTextSegment[]): string {
  return segments
    .map((segment) => (segment.type === 'text' ? segment.text : segment.link.label))
    .join('')
}

export function hasStudyRichTextInternalLinks(segments: readonly StudyRichTextSegment[]): boolean {
  return segments.some((segment) => segment.type === 'internal-link')
}

export function serializeStudyRichTextSegments(segments: readonly StudyRichTextSegment[]): string {
  const body = segments
    .map((segment) =>
      segment.type === 'text' ? escapeHtmlText(segment.text) : renderInternalLink(segment.link)
    )
    .join('')
  return `<p>${body}</p>`
}

export function studyRichTextLinkFromTarget(
  target: StudyInternalLinkTarget,
  customLabel?: string
): StudyRichTextInternalLink {
  const normalizedCustomLabel = customLabel?.trim() ?? ''
  return {
    kind: target.kind,
    materialId: target.materialId,
    headingId: target.kind === 'heading' ? target.headingId : null,
    headingLevel: target.kind === 'heading' ? target.headingLevel : null,
    labelMode: normalizedCustomLabel ? 'custom' : 'auto',
    label: normalizedCustomLabel || target.title,
    materialTitle: target.materialTitle,
    folderPath: [...target.folderPath]
  }
}

export function insertStudyRichTextLink(
  segments: readonly StudyRichTextSegment[],
  textSegmentIndex: number,
  offset: number,
  link: StudyRichTextInternalLink
): StudyRichTextSegment[] {
  const editable = ensureStudyRichTextEditableSegments(segments)
  const segment = editable[textSegmentIndex]
  if (!segment || segment.type !== 'text') return editable
  const safeOffset = Math.max(0, Math.min(offset, segment.text.length))
  return ensureStudyRichTextEditableSegments([
    ...editable.slice(0, textSegmentIndex),
    { type: 'text', text: segment.text.slice(0, safeOffset) },
    { type: 'internal-link', link },
    { type: 'text', text: segment.text.slice(safeOffset) },
    ...editable.slice(textSegmentIndex + 1)
  ])
}

export function updateStudyRichTextTextSegment(
  segments: readonly StudyRichTextSegment[],
  index: number,
  text: string
): StudyRichTextSegment[] {
  const editable = ensureStudyRichTextEditableSegments(segments)
  if (editable[index]?.type !== 'text') return editable
  return editable.map((segment, current) =>
    current === index && segment.type === 'text' ? { type: 'text', text } : segment
  )
}

export function replaceStudyRichTextLink(
  segments: readonly StudyRichTextSegment[],
  index: number,
  link: StudyRichTextInternalLink
): StudyRichTextSegment[] {
  const editable = ensureStudyRichTextEditableSegments(segments)
  if (editable[index]?.type !== 'internal-link') return editable
  return editable.map((segment, current) =>
    current === index ? { type: 'internal-link', link } : segment
  )
}

export function removeStudyRichTextLink(
  segments: readonly StudyRichTextSegment[],
  index: number
): StudyRichTextSegment[] {
  const editable = ensureStudyRichTextEditableSegments(segments)
  if (editable[index]?.type !== 'internal-link') return editable
  return ensureStudyRichTextEditableSegments(editable.filter((_, current) => current !== index))
}
