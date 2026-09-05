import { describe, expect, it } from 'vitest'

import { studyDocumentSchema } from '../../shared/validation/study'

function remoteBlock(type: 'image' | 'video', url: string): unknown {
  return { version: 1, blocks: [{ id: `${type}-1`, type, source: { type: 'url', url } }] }
}

describe('remote study media validation', () => {
  it('accepts HTTPS images without credentials', () => {
    expect(
      studyDocumentSchema.safeParse(remoteBlock('image', 'https://cdn.example/photo.png')).success
    ).toBe(true)
  })

  it.each([
    'http://cdn.example/photo.png',
    'javascript:alert(1)',
    'data:image/png;base64,AA==',
    'https://user:password@cdn.example/photo.png'
  ])('rejects unsafe image URL %s', (url) => {
    expect(studyDocumentSchema.safeParse(remoteBlock('image', url)).success).toBe(false)
  })

  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
  ])('accepts supported YouTube URL %s', (url) => {
    expect(studyDocumentSchema.safeParse(remoteBlock('video', url)).success).toBe(true)
  })

  it.each([
    'https://notyoutube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=invalid',
    `https://youtube.com/watch?v=dQw4w9WgXcQ&x=${'a'.repeat(4_096)}`
  ])('rejects unsupported YouTube URL %s', (url) => {
    expect(studyDocumentSchema.safeParse(remoteBlock('video', url)).success).toBe(false)
  })
})
