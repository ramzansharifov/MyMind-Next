import { describe, expect, it } from 'vitest'
import type { NoteDocument } from '@mymind/contracts/notes'

import {
  createMobileAppendTextBlock,
  isTextOnlyNote,
  withoutNoteBlock
} from './mobile-note-policy'

describe('mobile note editing policy', () => {
  it('treats only text blocks as directly editable on mobile', () => {
    const textOnly: NoteDocument = {
      version: 1,
      blocks: [{ id: 'text-1', type: 'text', text: 'Текст', html: '<p>Текст</p>' }]
    }
    const desktopStructured: NoteDocument = {
      version: 1,
      blocks: [
        { id: 'heading-1', type: 'heading', text: 'Раздел', level: 2 },
        { id: 'text-1', type: 'text', text: 'Текст', html: '<p>Текст</p>' }
      ]
    }

    expect(isTextOnlyNote(textOnly)).toBe(true)
    expect(isTextOnlyNote(desktopStructured)).toBe(false)
  })

  it('creates safe append blocks and can hide the active append from the reader', () => {
    const block = createMobileAppendTextBlock('1234')
    expect(block).toEqual({
      id: 'mobile-append-1234',
      type: 'text',
      text: '',
      html: '<p></p>'
    })

    const document: NoteDocument = {
      version: 1,
      blocks: [
        { id: 'heading-1', type: 'heading', text: 'Раздел', level: 1 },
        { ...block, text: 'Дополнение', html: '<p>Дополнение</p>' }
      ]
    }

    expect(withoutNoteBlock(document, block.id).blocks).toEqual([
      { id: 'heading-1', type: 'heading', text: 'Раздел', level: 1 }
    ])
    expect(document.blocks).toHaveLength(2)
  })
})
