import { describe, expect, it } from 'vitest'

import { noteDocumentSchema, saveNoteInputSchema } from './notes'

describe('notes validation', () => {
  it('accepts only the six simple note block types', () => {
    expect(
      noteDocumentSchema.parse({
        version: 1,
        blocks: [
          { id: 'text-one', type: 'text', text: '' },
          { id: 'image-one', type: 'image', source: { type: 'local' } },
          { id: 'audio-one', type: 'audio', source: { type: 'local' } },
          { id: 'video-one', type: 'video', source: { type: 'local' } },
          { id: 'file-one', type: 'file', source: { type: 'local' } },
          { id: 'divider-one', type: 'divider' }
        ]
      }).blocks.map((block) => block.type)
    ).toEqual(['text', 'image', 'audio', 'video', 'file', 'divider'])

    expect(() =>
      noteDocumentSchema.parse({
        version: 1,
        blocks: [{ id: 'heading-one', type: 'heading', text: 'Нет', level: 1 }]
      })
    ).toThrow()
  })

  it('rejects duplicate block ids', () => {
    expect(() =>
      noteDocumentSchema.parse({
        version: 1,
        blocks: [
          { id: 'same', type: 'text', text: 'A' },
          { id: 'same', type: 'divider' }
        ]
      })
    ).toThrow(/уникальными/i)
  })

  it('rejects a local asset that belongs to another note', () => {
    expect(() =>
      saveNoteInputSchema.parse({
        id: 'note-one',
        document: {
          version: 1,
          blocks: [
            {
              id: 'image-one',
              type: 'image',
              source: {
                type: 'local',
                asset: {
                  id: '11111111-1111-4111-8111-111111111111',
                  materialId: 'note-two',
                  name: 'photo.png',
                  mimeType: 'image/png',
                  size: 1,
                  url: 'mymind-asset://local/note-two/11111111-1111-4111-8111-111111111111/photo.png'
                }
              }
            }
          ]
        }
      })
    ).toThrow(/другой заметке/i)
  })
})
