import { describe, expect, it } from 'vitest'

import { parseStudyYouTubeUrl } from './file-utils'

const videoId = 'dQw4w9WgXcQ'

describe('parseStudyYouTubeUrl', () => {
  it.each([
    `https://www.youtube.com/watch?v=${videoId}`,
    `https://youtu.be/${videoId}`,
    `https://www.youtube.com/shorts/${videoId}`,
    `https://youtube.com/live/${videoId}`,
    `https://www.youtube-nocookie.com/embed/${videoId}`
  ])('normalizes supported YouTube URL %s', (url) => {
    expect(parseStudyYouTubeUrl(url)).toEqual({
      id: videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`
    })
  })

  it.each([
    'https://vimeo.com/123456',
    'https://example.com/video.mp4',
    'http://youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=invalid',
    'javascript:alert(1)'
  ])('rejects unsupported or unsafe URL %s', (url) => {
    expect(parseStudyYouTubeUrl(url)).toBeNull()
  })
})
