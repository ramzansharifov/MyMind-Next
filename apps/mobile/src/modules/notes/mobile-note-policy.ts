import { MOBILE_NOTE_APPEND_BLOCK_PREFIX, type NoteDocument } from '@mymind/contracts/notes'
import type { StudyTextBlock } from '@mymind/contracts/study'

export function isTextOnlyNote(document: NoteDocument): boolean {
  return document.blocks.every((block) => block.type === 'text')
}

export function createMobileAppendTextBlock(id: string): StudyTextBlock {
  return {
    id: `${MOBILE_NOTE_APPEND_BLOCK_PREFIX}${id}`,
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
