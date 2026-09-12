import type {
  ResolveStudyInternalLinkTargetInput,
  StudyInternalLinkTarget,
  StudyTextBlock
} from '@mymind/contracts/study'

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const INTERNAL_LINK_SPAN_PATTERN =
  /<span\b(?=[^>]*\bdata-study-internal-link\s*=\s*(?:"true"|'true'))([^>]*)>([\s\S]*?)<\/span\s*>/gi

function attribute(attributes: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(
    attributes
  )
  return match?.[1] ?? match?.[2] ?? null
}

export function getStudyTextBlockHtml(block: StudyTextBlock): string {
  return block.html?.trim()
    ? block.html
    : `<p>${escapeHtml(block.text).replace(/\n/g, '<br />') || '&nbsp;'}</p>`
}

export function resolveStudyRichTextHtml(
  block: StudyTextBlock,
  resolveInternalLinkTarget?: (
    input: ResolveStudyInternalLinkTargetInput
  ) => StudyInternalLinkTarget | null
): string {
  const source = getStudyTextBlockHtml(block)
  if (!resolveInternalLinkTarget || !/data-study-internal-link\s*=/i.test(source)) return source

  INTERNAL_LINK_SPAN_PATTERN.lastIndex = 0
  return source.replace(
    INTERNAL_LINK_SPAN_PATTERN,
    (_match, attributes: string, innerHtml: string) => {
      const materialId = attribute(attributes, 'data-material-id') ?? ''
      const kind = attribute(attributes, 'data-target-kind') === 'heading' ? 'heading' : 'material'
      const headingId = attribute(attributes, 'data-heading-id')
      const labelMode = attribute(attributes, 'data-label-mode') === 'custom' ? 'custom' : 'auto'
      const resolved = materialId
        ? resolveInternalLinkTarget({ kind, materialId, headingId })
        : null
      const missing = resolved === null
      const displayLabel = labelMode === 'custom' ? null : resolved?.title
      const missingAttribute = missing ? ' data-missing="true"' : ''

      return `<span${attributes}${missingAttribute}>${
        displayLabel ? escapeHtml(displayLabel) : innerHtml
      }</span>`
    }
  )
}
