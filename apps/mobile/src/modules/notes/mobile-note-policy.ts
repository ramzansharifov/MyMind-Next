import type { NoteDocument } from '@mymind/contracts/notes'
import type { StudyTextBlock } from '@mymind/contracts/study'

export const MOBILE_NOTE_APPEND_PREFIX = 'mobile-append-'

export function isTextOnlyNote(document: NoteDocument): boolean {
  return document.blocks.every((block) => block.type === 'text')
}

export function createMobileAppendTextBlock(id: string): StudyTextBlock {
  return {
    id: `${MOBILE_NOTE_APPEND_PREFIX}${id}`,
    type: 'text',
    text: '',
    html: '<p></p>'
  }
}

export function withoutNoteBlock(document: NoteDocument, blockId: string | null): NoteDocument {
  if (!blockId) return document
  return {
    ...document,
    blocks: document.blocks.filter((block) => block.id !== blockId)
  }
}
