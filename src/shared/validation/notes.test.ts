import { describe, expect, it } from 'vitest'

import { noteDocumentSchema, saveNoteInputSchema, saveNoteVoiceRecordingInputSchema } from './notes'

describe('notes validation', () => {
  it('accepts safe voice recording data and rejects empty recordings', () => {
    expect(
      saveNoteVoiceRecordingInputSchema.parse({
        noteId: 'note-one',
        data: new Uint8Array([1, 2, 3]),
        mimeType: 'audio/webm'
      })
    ).toMatchObject({ noteId: 'note-one', mimeType: 'audio/webm' })

    expect(() =>
      saveNoteVoiceRecordingInputSchema.parse({
        noteId: 'note-one',
        data: new Uint8Array(),
        mimeType: 'audio/webm'
      })
    ).toThrow('Запись не должна быть пустой')
  })

  it('accepts the same twelve block types as study', () => {
    expect(
      noteDocumentSchema
        .parse({
          version: 1,
          blocks: [
            { id: 'text-one', type: 'text', text: '' },
            { id: 'heading-one', type: 'heading', text: 'Раздел', level: 1 },
            {
              id: 'code-one',
              type: 'code',
              source: 'const value = 1',
              language: 'typescript'
            },
            {
              id: 'markdown-one',
              type: 'markdown',
              source: '# Markdown',
              viewMode: 'preview'
            },
            {
              id: 'latex-one',
              type: 'latex',
              source: 'E = mc^2',
              viewMode: 'preview',
              displayMode: 'display',
              alignment: 'center',
              scale: 100
            },
            {
              id: 'mermaid-one',
              type: 'mermaid',
              source: 'flowchart LR\n  A --> B',
              viewMode: 'preview',
              theme: 'dark',
              scale: 100
            },
            { id: 'image-one', type: 'image', source: { type: 'local' } },
            { id: 'video-one', type: 'video', source: { type: 'local' } },
            { id: 'audio-one', type: 'audio', source: { type: 'local' } },
            { id: 'file-one', type: 'file', source: { type: 'local' } },
            { id: 'divider-one', type: 'divider' },
            { id: 'board-one', type: 'board' }
          ]
        })
        .blocks.map((block) => block.type)
    ).toEqual([
      'text',
      'heading',
      'code',
      'markdown',
      'latex',
      'mermaid',
      'image',
      'video',
      'audio',
      'file',
      'divider',
      'board'
    ])
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
