import katex from 'katex'
import type {
  StudyBlock,
  StudyDocument,
  StudyInternalLinkTarget,
  StudyLocalAsset
} from '@mymind/contracts/study'
import {
  parseStudyRichTextSegments,
  type StudyRichTextInternalLink
} from '../../shared/ui/studyRichText'

export interface StudyPdfBuildOptions {
  title: string
  document: StudyDocument
  resolveAssetDataUri?: (asset: StudyLocalAsset) => Promise<string | null>
  resolveInternalLinkTarget?: (link: StudyRichTextInternalLink) => StudyInternalLinkTarget | null
  resolveMermaidSvg?: (blockId: string) => string | null
}

const INTERNAL_LINK_PATTERN =
  /<span\b(?=[^>]*\bdata-study-internal-link\s*=\s*(?:"true"|'true'))([^>]*)>([\s\S]*?)<\/span\s*>/gi

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;')
}

function safeRemoteUrl(value: string): string | null {
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : null
}

function safeHeadingColor(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return /^(?:#[\da-f]{3,8}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-z]+)$/i.test(trimmed)
    ? trimmed
    : null
}

function sanitizeRichTextHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form)\b[^>]*\/?\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|src)\s*=\s*("|')\s*javascript:[\s\S]*?\2/gi, ' $1="#"')
}

function refreshInternalLinkLabels(
  html: string,
  resolver: StudyPdfBuildOptions['resolveInternalLinkTarget']
): string {
  if (!resolver || !/data-study-internal-link\s*=/i.test(html)) return html
  const links = parseStudyRichTextSegments(html, '')
    .filter((segment) => segment.type === 'internal-link')
    .map((segment) => segment.link)
  let linkIndex = 0
  INTERNAL_LINK_PATTERN.lastIndex = 0
  return html.replace(INTERNAL_LINK_PATTERN, (whole: string) => {
    const link = links[linkIndex++]
    if (!link) return whole
    const target = resolver(link)
    const label =
      link.labelMode === 'custom'
        ? link.label
        : target?.title || link.label || link.materialTitle || 'Внутренняя ссылка'
    const openingEnd = whole.indexOf('>')
    if (openingEnd < 0) return whole
    const opening = whole.slice(0, openingEnd + 1)
    const unavailable = target ? '' : ' <span class="internal-link-missing">(недоступно)</span>'
    return `${opening}${escapeHtml(label)}${unavailable}</span>`
  })
}

function renderRichText(
  block: Extract<StudyBlock, { type: 'text' }>,
  resolver: StudyPdfBuildOptions['resolveInternalLinkTarget']
): string {
  if (!block.html) return `<p>${escapeHtml(block.text).replace(/\n/g, '<br>')}</p>`
  return sanitizeRichTextHtml(refreshInternalLinkLabels(block.html, resolver))
}

function renderInlineMarkdown(value: string): string {
  let output = escapeHtml(value)
  const inlineCode: string[] = []
  output = output.replace(/`([^`]+)`/g, (_whole, code: string) => {
    const index = inlineCode.push(`<code>${code}</code>`) - 1
    return `\uE000CODE${index}\uE001`
  })
  output = output.replace(
    /\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)/gi,
    (_whole, label: string, url: string) => `<a href="${escapeAttribute(url)}">${label}</a>`
  )
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  output = output.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  output = output.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  output = output.replace(/_([^_]+)_/g, '<em>$1</em>')
  output = output.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  output = output.replace(/\uE000CODE(\d+)\uE001/g, (_whole, index: string) => {
    return inlineCode[Number(index)] ?? ''
  })
  return output
}

function isMarkdownTableSeparator(line: string): boolean {
  const cells = line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim())
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

function markdownCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim())
}

function startsMarkdownStructure(lines: string[], index: number): boolean {
  const line = lines[index] ?? ''
  if (!line.trim()) return true
  if (/^```/.test(line.trim())) return true
  if (/^#{1,6}\s+/.test(line)) return true
  if (/^>\s?/.test(line)) return true
  if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) return true
  if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) return true
  return Boolean(
    lines[index + 1] && line.includes('|') && isMarkdownTableSeparator(lines[index + 1]!)
  )
}

export function renderMarkdownForPdf(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const parts: string[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (!line.trim()) {
      index += 1
      continue
    }

    const fence = /^```\s*([^\s`]*)/.exec(line.trim())
    if (fence) {
      const language = fence[1] ?? ''
      const code: string[] = []
      index += 1
      while (index < lines.length && !/^```\s*$/.test((lines[index] ?? '').trim())) {
        code.push(lines[index] ?? '')
        index += 1
      }
      if (index < lines.length) index += 1
      parts.push(
        `<div class="code-block"><div class="code-label">${escapeHtml(language || 'Код')}</div><pre><code>${escapeHtml(code.join('\n'))}</code></pre></div>`
      )
      continue
    }

    if (line.includes('|') && lines[index + 1] && isMarkdownTableSeparator(lines[index + 1]!)) {
      const headers = markdownCells(line)
      index += 2
      const rows: string[][] = []
      while (
        index < lines.length &&
        (lines[index] ?? '').includes('|') &&
        (lines[index] ?? '').trim()
      ) {
        rows.push(markdownCells(lines[index] ?? ''))
        index += 1
      }
      parts.push(
        `<div class="table-wrap"><table><thead><tr>${headers.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join('')}</tr></thead><tbody>${rows
          .map(
            (row) =>
              `<tr>${headers.map((_header, cellIndex) => `<td>${renderInlineMarkdown(row[cellIndex] ?? '')}</td>`).join('')}</tr>`
          )
          .join('')}</tbody></table></div>`
      )
      continue
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line)
    if (heading) {
      const level = Math.min(6, heading[1]?.length ?? 1)
      parts.push(`<h${level}>${renderInlineMarkdown(heading[2] ?? '')}</h${level}>`)
      index += 1
      continue
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (index < lines.length && /^>\s?/.test(lines[index] ?? '')) {
        quote.push((lines[index] ?? '').replace(/^>\s?/, ''))
        index += 1
      }
      parts.push(`<blockquote>${quote.map(renderInlineMarkdown).join('<br>')}</blockquote>`)
      continue
    }

    const unordered = /^\s*[-*+]\s+/.test(line)
    const ordered = /^\s*\d+[.)]\s+/.test(line)
    if (unordered || ordered) {
      const tag = ordered ? 'ol' : 'ul'
      const matcher = ordered ? /^\s*\d+[.)]\s+(.+)$/ : /^\s*[-*+]\s+(.+)$/
      const items: string[] = []
      while (index < lines.length) {
        const match = matcher.exec(lines[index] ?? '')
        if (!match) break
        items.push(`<li>${renderInlineMarkdown(match[1] ?? '')}</li>`)
        index += 1
      }
      parts.push(`<${tag}>${items.join('')}</${tag}>`)
      continue
    }

    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      parts.push('<hr>')
      index += 1
      continue
    }

    const paragraph: string[] = [line.trim()]
    index += 1
    while (index < lines.length && !startsMarkdownStructure(lines, index)) {
      paragraph.push((lines[index] ?? '').trim())
      index += 1
    }
    parts.push(`<p>${renderInlineMarkdown(paragraph.join(' '))}</p>`)
  }

  return parts.join('\n') || '<p class="muted">Пустой Markdown-блок</p>'
}

function renderLatexForPdf(block: Extract<StudyBlock, { type: 'latex' }>): string {
  try {
    const math = katex.renderToString(block.source, {
      displayMode: block.displayMode !== 'inline',
      throwOnError: true,
      strict: 'warn',
      trust: false,
      output: 'mathml'
    })
    const alignment = block.alignment ?? 'center'
    const scale = Math.max(0.5, Math.min(3, block.scale ?? 1))
    return `<div class="latex-block" style="text-align:${alignment};font-size:${scale}em">${math}</div>`
  } catch {
    return `<div class="source-fallback"><div class="source-label">LaTeX</div><pre>${escapeHtml(block.source)}</pre></div>`
  }
}

function sanitizeMermaidSvg(svg: string): string | null {
  const trimmed = svg.trim()
  if (!/^<svg\b/i.test(trimmed) || !/<\/svg>\s*$/i.test(trimmed)) return null
  return trimmed
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject\s*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|xlink:href)\s*=\s*("|')\s*javascript:[\s\S]*?\2/gi, ' $1="#"')
}

function renderMermaidForPdf(
  block: Extract<StudyBlock, { type: 'mermaid' }>,
  resolver: StudyPdfBuildOptions['resolveMermaidSvg']
): string {
  const rendered = resolver ? sanitizeMermaidSvg(resolver(block.id) ?? '') : null
  if (rendered) {
    return '<figure class="mermaid-block">' + rendered + '</figure>'
  }
  return (
    '<section class="source-fallback mermaid-fallback"><div class="source-label">Диаграмма Mermaid</div><pre>' +
    escapeHtml(block.source) +
    '</pre><p>Исходный код диаграммы сохранён в PDF.</p></section>'
  )
}

function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return '0 Б'
  if (size < 1024) return `${Math.round(size)} Б`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} КБ`
  return `${(size / (1024 * 1024)).toFixed(1)} МБ`
}

function assetLabel(asset: StudyLocalAsset | undefined, fallback: string): string {
  return asset?.name || fallback
}

async function renderImageBlock(
  block: Extract<StudyBlock, { type: 'image' }>,
  resolveAssetDataUri: StudyPdfBuildOptions['resolveAssetDataUri']
): Promise<string> {
  let source: string | null = null
  let label = block.title || 'Изображение'
  if (block.source.type === 'url') {
    source = safeRemoteUrl(block.source.url)
    label = block.title || block.source.url
  } else if (block.source.asset) {
    label = block.title || block.source.asset.name
    source = resolveAssetDataUri ? await resolveAssetDataUri(block.source.asset) : null
  }
  const caption = `<figcaption>${escapeHtml(label)}</figcaption>`
  if (!source)
    return `<figure class="media-card media-missing"><div>Изображение недоступно</div>${caption}</figure>`
  const fit = block.imageFit === 'cover' ? 'cover' : 'contain'
  return `<figure class="image-block"><img src="${escapeAttribute(source)}" alt="${escapeAttribute(label)}" style="object-fit:${fit}">${caption}</figure>`
}

function renderMediaCard(block: Extract<StudyBlock, { type: 'video' | 'audio' | 'file' }>): string {
  const asset = block.source.type === 'local' ? block.source.asset : undefined
  const fallback = block.type === 'video' ? 'Видео' : block.type === 'audio' ? 'Аудио' : 'Файл'
  const label = block.title || assetLabel(asset, fallback)
  const meta = asset
    ? `${asset.mimeType || fallback} · ${formatFileSize(asset.size)}`
    : block.source.type === 'url'
      ? block.source.url
      : 'Локальное вложение недоступно'
  return `<section class="media-card"><div class="media-kind">${escapeHtml(fallback)}</div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(meta)}</span></section>`
}

function renderHeading(block: Extract<StudyBlock, { type: 'heading' }>): string {
  const color = safeHeadingColor(block.color)
  const background = safeHeadingColor(block.backgroundColor)
  const alignment = block.alignment ?? 'left'
  const styles = [
    `text-align:${alignment}`,
    color ? `color:${color}` : '',
    background ? `background:${background}` : ''
  ]
    .filter(Boolean)
    .join(';')
  return `<h${block.level} id="study-heading-${escapeAttribute(block.id)}"${styles ? ` style="${styles}"` : ''}>${escapeHtml(block.text)}</h${block.level}>`
}

function renderDivider(block: Extract<StudyBlock, { type: 'divider' }>): string {
  const color = safeHeadingColor(block.color) ?? '#d9dee7'
  const thickness = Math.max(1, Math.min(12, block.thickness ?? 1))
  const style =
    block.variant === 'dashed' ? 'dashed' : block.variant === 'dotted' ? 'dotted' : 'solid'
  return `<hr style="border-top:${thickness}px ${style} ${color}">`
}

async function renderBlock(block: StudyBlock, options: StudyPdfBuildOptions): Promise<string> {
  switch (block.type) {
    case 'text':
      return `<section class="rich-text">${renderRichText(block, options.resolveInternalLinkTarget)}</section>`
    case 'heading':
      return renderHeading(block)
    case 'code':
      return `<section class="code-block"><div class="code-label">${escapeHtml(block.language || 'Код')}</div><pre><code>${escapeHtml(block.source)}</code></pre></section>`
    case 'markdown':
      return `<section class="markdown-block">${renderMarkdownForPdf(block.source)}</section>`
    case 'latex':
      return renderLatexForPdf(block)
    case 'mermaid':
      return renderMermaidForPdf(block, options.resolveMermaidSvg)
    case 'image':
      return renderImageBlock(block, options.resolveAssetDataUri)
    case 'video':
    case 'audio':
    case 'file':
      return renderMediaCard(block)
    case 'divider':
      return renderDivider(block)
    case 'board':
      return `<section class="board-card"><div class="media-kind">Доска</div><strong>${escapeHtml(block.title || 'Доска материала')}</strong><span>${block.boardId ? 'Связанная доска сохранена локально.' : 'Доска ещё не была создана.'}</span></section>`
  }
}

export async function buildStudyMaterialPdfHtml(options: StudyPdfBuildOptions): Promise<string> {
  const blocks: string[] = []
  for (const block of options.document.blocks) blocks.push(await renderBlock(block, options))
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(options.title)}</title>
<style>${PDF_STYLES}</style>
</head>
<body>
<main class="document">
<header class="document-title"><p>MyMind · Обучение</p><h1>${escapeHtml(options.title)}</h1></header>
<article class="content">${blocks.join('\n')}</article>
</main>
</body>
</html>`
}

const PDF_STYLES = `
@page { size: A4 portrait; margin: 10mm 11mm 12mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #fff; color: #111827; }
body { font: 9.5pt/1.52 -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; overflow-wrap: anywhere; }
.document { width: 100%; }
.document-title { margin: 0 0 6mm; padding-bottom: 4mm; border-bottom: 1px solid #d9dee7; }
.document-title p { margin: 0 0 1.5mm; color: #6b7280; font-size: 8pt; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
.document-title h1 { margin: 0; font-size: 18pt; line-height: 1.18; letter-spacing: -.02em; }
.content > * { margin-top: 0; margin-bottom: 4.5mm; }
h1, h2, h3, h4, h5, h6 { break-after: avoid-page; line-height: 1.23; }
.content > h1 { font-size: 18pt; padding: 1.5mm 2mm; }
.content > h2 { font-size: 14pt; padding: 1.5mm 2mm; }
.content > h3 { font-size: 11.5pt; padding: 1.5mm 2mm; }
p { margin: 0 0 2.5mm; }
a, .internal-link { color: #6d28d9; text-decoration: underline; text-underline-offset: 2px; }
.internal-link-missing { color: #9ca3af; font-size: .9em; text-decoration: none; }
.rich-text > :first-child, .markdown-block > :first-child { margin-top: 0; }
.rich-text > :last-child, .markdown-block > :last-child { margin-bottom: 0; }
blockquote { margin: 2.5mm 0; padding: 1.5mm 3mm; border-left: 3px solid #c4b5fd; background: #faf9ff; color: #4b5563; }
ul, ol { margin: 2mm 0; padding-left: 6mm; }
li + li { margin-top: 1mm; }
code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace; }
.rich-text code, .markdown-block code { padding: .4mm 1mm; border: 1px solid #e5e7eb; border-radius: 1.5mm; background: #f8fafc; }
.code-block, .source-fallback { width: 100%; border: 1px solid #d9dee7; border-radius: 3mm; background: #f8fafc; overflow: hidden; break-inside: auto; }
.code-label, .source-label, .media-kind { color: #6d28d9; font-size: 7.5pt; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.code-label, .source-label { padding: 2mm 3mm 0; }
pre { margin: 0; padding: 2.5mm 3mm 3mm; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; font: 8.25pt/1.42 "SFMono-Regular", Consolas, "Liberation Mono", monospace; }
.source-fallback p { margin: 0; padding: 0 3mm 3mm; color: #6b7280; font-size: 8pt; }
.latex-block { width: 100%; padding: 2.5mm; overflow: visible; break-inside: avoid-page; }
.latex-block math { max-width: 100%; color: #111827; }
.mermaid-block { width: 100%; margin-left: 0; margin-right: 0; padding: 2mm; border: 1px solid #e5e7eb; border-radius: 3mm; background: #fff; break-inside: avoid-page; }
.mermaid-block svg { display: block; width: auto; max-width: 100%; height: auto; max-height: 235mm; margin: 0 auto; }
.table-wrap { width: 100%; overflow: visible; border: 1px solid #d9dee7; border-radius: 2mm; }
table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 8.5pt; }
thead { display: table-header-group; }
tr { break-inside: avoid-page; }
th, td { padding: 1.5mm 2mm; border: 1px solid #d9dee7; text-align: left; white-space: normal; word-break: break-word; }
th { background: #f8fafc; }
.image-block { margin-left: 0; margin-right: 0; break-inside: avoid-page; }
.image-block img { display: block; width: auto; max-width: 100%; max-height: 220mm; margin: 0 auto; border-radius: 2mm; }
figcaption { margin-top: 1.5mm; color: #6b7280; font-size: 8pt; text-align: center; }
.media-card, .board-card { display: flex; flex-direction: column; gap: 1mm; padding: 3mm; border: 1px solid #d9dee7; border-radius: 3mm; background: #f8fafc; break-inside: avoid-page; }
.media-card strong, .board-card strong { font-size: 10pt; }
.media-card span, .board-card span { color: #6b7280; font-size: 8pt; }
.media-missing { color: #6b7280; text-align: center; }
hr { margin: 4mm 0; height: 0; border: 0; break-after: avoid-page; }
img, svg, canvas { max-width: 100%; }
`
