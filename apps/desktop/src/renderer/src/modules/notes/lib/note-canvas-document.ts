import type { NoteBlock, NoteDocument } from '../../../../../shared/contracts/notes'
import type { StudyAssetKind, StudyTextBlock } from '../../../../../shared/contracts/study'
import { getStudyTextBlockHtml } from '../../study/lib/study-document'

type CanvasSource = Extract<NoteBlock, { type: 'text' | 'heading' }>
export type NoteAttachmentBlock = Extract<NoteBlock, { type: StudyAssetKind }>

function isAttachmentBlock(block: NoteBlock): block is NoteAttachmentBlock {
  return (
    block.type === 'image' ||
    block.type === 'video' ||
    block.type === 'audio' ||
    block.type === 'file'
  )
}

export function getNoteAttachments(document: NoteDocument): NoteAttachmentBlock[] {
  return document.blocks.filter(isAttachmentBlock)
}

function isCanvasSource(block: NoteBlock): block is CanvasSource {
  return block.type === 'text' || block.type === 'heading'
}

export function getNoteCanvas(document: NoteDocument, canvasId: string): StudyTextBlock {
  const sources = document.blocks.filter(isCanvasSource)
  // Stored attachments remain canonical blocks for asset validation and cleanup.
  // Their markers in the text canvas preserve the position within the editor.
  const referencedAttachments = new Set<string>()
  for (const source of sources) {
    if (source.type !== 'text' || !source.html) continue
    const parsed = new DOMParser().parseFromString(source.html, 'text/html')
    for (const marker of parsed.querySelectorAll('[data-note-attachment-id]')) {
      referencedAttachments.add(marker.getAttribute('data-note-attachment-id') ?? '')
    }
  }
  return {
    id: canvasId,
    type: 'text',
    text: sources.map((block) => block.text).join('\n\n'),
    html:
      document.blocks
        .map((block) => {
          if (isAttachmentBlock(block)) {
            if (referencedAttachments.has(block.id)) return ''
            return `<div data-note-attachment-id="${escapeHtml(block.id)}"></div>`
          }
          if (!isCanvasSource(block)) return ''
          if (block.type === 'text') return getStudyTextBlockHtml(block)

          const sizes = { 1: '2rem', 2: '1.65rem', 3: '1.35rem' }
          const color = block.color ? `color: ${block.color};` : ''
          const highlight = block.backgroundColor
            ? `<mark data-color="${block.backgroundColor}" style="background-color: ${block.backgroundColor}">${escapeHtml(block.text)}</mark>`
            : escapeHtml(block.text)
          return `<p style="text-align: ${block.alignment ?? 'left'}"><strong><span style="font-size: ${sizes[block.level]}; ${color}">${highlight}</span></strong></p>`
        })
        .join('') || '<p></p>'
  }
}

export function getNoteLegacyContent(document: NoteDocument): NoteBlock[] {
  return document.blocks.filter((block) => !isCanvasSource(block) && !isAttachmentBlock(block))
}

export function updateNoteCanvas(
  document: NoteDocument,
  canvas: StudyTextBlock,
  attachments: NoteAttachmentBlock[] = getNoteAttachments(document)
): NoteDocument {
  return {
    ...document,
    blocks: [canvas, ...attachments, ...getNoteLegacyContent(document)]
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return entities[character]
  })
}
