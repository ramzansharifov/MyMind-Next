export interface StudyCodeInternalLinkReference {
  materialName: string
  headingName?: string
  label?: string
}

export interface StudyCodeResolvedInternalLink {
  kind: 'material' | 'heading'
  materialId: string
  headingId: string | null
  headingLevel: 1 | 2 | 3 | null
  title: string
  materialTitle: string
  folderPath: string[]
}

export interface StudyCodeInternalLinkSymbol {
  materialName: string
  headingName?: string
}

const symbolicLinkPattern = /\[\[([A-Za-z_][A-Za-z0-9_]{0,79})(?:\.([A-Za-z_][A-Za-z0-9_]{0,79}))?(?:\|([^\]\r\n]+))?\]\]/g
const storedInternalLinkPattern = /<span\b([^>]*\bdata-study-internal-link=(?:"true"|'true')[^>]*)>([\s\S]*?)<\/span>/gi

export function hasStudyCodeSymbolicInternalLinks(value: string | undefined): boolean {
  if (!value) return false
  symbolicLinkPattern.lastIndex = 0
  return symbolicLinkPattern.test(value)
}

export function resolveStudyCodeSymbolicInternalLinks(
  text: string,
  html: string | undefined,
  resolve: (reference: StudyCodeInternalLinkReference) => StudyCodeResolvedInternalLink
): { text: string; html?: string } {
  const bodyContainsLinks = hasStudyCodeSymbolicInternalLinks(text)
  const htmlContainsLinks = hasStudyCodeSymbolicInternalLinks(html)

  const resolvedText = replaceSymbolicLinks(text, resolve, false)

  if (htmlContainsLinks && html !== undefined) {
    return {
      text: resolvedText,
      html: replaceSymbolicLinks(html, resolve, true)
    }
  }

  if (bodyContainsLinks) {
    return {
      text: resolvedText,
      html: plainTextWithSymbolicLinksToHtml(text, resolve)
    }
  }

  return html === undefined ? { text: resolvedText } : { text: resolvedText, html }
}

export function symbolizeStoredStudyInternalLinks(
  text: string,
  html: string | undefined,
  resolve: (input: {
    materialId: string
    headingId: string | null
  }) => StudyCodeInternalLinkSymbol | null
): { text: string; html?: string } {
  if (!html || !/data-study-internal-link=(?:"true"|'true')/i.test(html)) {
    return html === undefined ? { text } : { text, html }
  }

  const replacements: Array<{ label: string; token: string }> = []
  const nextHtml = html.replace(storedInternalLinkPattern, (full, rawAttributes: string, content: string) => {
    const materialId = readHtmlAttribute(rawAttributes, 'data-material-id')
    if (!materialId) return full

    const headingId = readHtmlAttribute(rawAttributes, 'data-heading-id')
    const symbol = resolve({ materialId, headingId })
    if (!symbol) return full

    const labelMode = readHtmlAttribute(rawAttributes, 'data-label-mode') === 'custom' ? 'custom' : 'auto'
    const storedLabel = readHtmlAttribute(rawAttributes, 'data-label')
    const visibleLabel = decodeHtml(stripTags(content)) || storedLabel || ''
    const customLabel = labelMode === 'custom' ? storedLabel || visibleLabel : undefined

    if (customLabel?.includes(']]') || customLabel?.includes('\n') || customLabel?.includes('\r')) {
      return full
    }

    const reference = symbol.headingName
      ? `${symbol.materialName}.${symbol.headingName}`
      : symbol.materialName
    const token = `[[${reference}${customLabel ? `|${customLabel}` : ''}]]`
    replacements.push({ label: visibleLabel, token })
    return token
  })

  if (replacements.length === 0) return { text, html }

  let nextText = text
  let searchFrom = 0

  replacements.forEach(({ label, token }) => {
    if (!label) return
    const index = nextText.indexOf(label, searchFrom)
    if (index < 0) return
    nextText = `${nextText.slice(0, index)}${token}${nextText.slice(index + label.length)}`
    searchFrom = index + token.length
  })

  return { text: nextText, html: nextHtml }
}

function replaceSymbolicLinks(
  value: string,
  resolve: (reference: StudyCodeInternalLinkReference) => StudyCodeResolvedInternalLink,
  renderHtml: boolean
): string {
  symbolicLinkPattern.lastIndex = 0
  return value.replace(
    symbolicLinkPattern,
    (_full, materialName: string, headingName: string | undefined, label: string | undefined) => {
      const target = resolve({ materialName, headingName, label })
      const displayLabel = label ?? target.title
      return renderHtml ? renderInternalLinkHtml(target, displayLabel, label !== undefined) : displayLabel
    }
  )
}

function plainTextWithSymbolicLinksToHtml(
  value: string,
  resolve: (reference: StudyCodeInternalLinkReference) => StudyCodeResolvedInternalLink
): string {
  const paragraphs = value.replace(/\r\n?/g, '\n').split(/\n{2,}/)

  return paragraphs
    .map((paragraph) => `<p>${renderPlainTextParagraph(paragraph, resolve)}</p>`)
    .join('')
}

function renderPlainTextParagraph(
  value: string,
  resolve: (reference: StudyCodeInternalLinkReference) => StudyCodeResolvedInternalLink
): string {
  symbolicLinkPattern.lastIndex = 0
  let result = ''
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = symbolicLinkPattern.exec(value)) !== null) {
    result += escapeHtml(value.slice(cursor, match.index)).replace(/\n/g, '<br>')
    const target = resolve({
      materialName: match[1],
      headingName: match[2] || undefined,
      label: match[3] || undefined
    })
    const displayLabel = match[3] ?? target.title
    result += renderInternalLinkHtml(target, displayLabel, match[3] !== undefined)
    cursor = match.index + match[0].length
  }

  result += escapeHtml(value.slice(cursor)).replace(/\n/g, '<br>')
  return result
}

function renderInternalLinkHtml(
  target: StudyCodeResolvedInternalLink,
  label: string,
  customLabel: boolean
): string {
  const attributes = [
    ['data-study-internal-link', 'true'],
    ['data-target-kind', target.kind],
    ['data-material-id', target.materialId],
    ['data-heading-id', target.headingId],
    ['data-heading-level', target.headingLevel ? String(target.headingLevel) : null],
    ['data-label-mode', customLabel ? 'custom' : 'auto'],
    ['data-label', label],
    ['data-material-title', target.materialTitle],
    ['data-folder-path', JSON.stringify(target.folderPath)]
  ]
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .map(([key, value]) => `${key}="${escapeHtmlAttribute(value)}"`)
    .join(' ')

  return `<span ${attributes}>${escapeHtml(label)}</span>`
}

function readHtmlAttribute(attributes: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = attributes.match(new RegExp(`${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'))
  return match ? decodeHtml(match[1] ?? match[2] ?? '') : null
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, '')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value)
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}
