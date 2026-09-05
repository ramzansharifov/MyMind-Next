export function normalizeStudyRemoteImageUrl(value: string): string | null {
  const trimmedValue = value.trim()
  if (!trimmedValue) return null

  try {
    const url = new URL(trimmedValue)

    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) return null

    return url.href
  } catch {
    return null
  }
}

const YOUTUBE_VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/

export interface StudyYouTubeVideo {
  id: string
  embedUrl: string
}

export function parseStudyYouTubeUrl(value: string): StudyYouTubeVideo | null {
  const trimmedValue = value.trim()
  if (!trimmedValue) return null

  try {
    const url = new URL(trimmedValue)

    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname) return null

    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    const path = url.pathname.split('/').filter(Boolean)
    let videoId: string | null = null

    if (hostname === 'youtu.be') {
      videoId = path.length === 1 ? (path[0] ?? null) : null
    } else if (
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'music.youtube.com'
    ) {
      if (url.pathname === '/watch') videoId = url.searchParams.get('v')
      else if (['shorts', 'live', 'embed'].includes(path[0] ?? '') && path.length === 2) {
        videoId = path[1] ?? null
      }
    } else if (hostname === 'youtube-nocookie.com' && path[0] === 'embed' && path.length === 2) {
      videoId = path[1] ?? null
    }

    if (!videoId || !YOUTUBE_VIDEO_ID.test(videoId)) return null

    return {
      id: videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`
    }
  } catch {
    return null
  }
}

export function isValidStudyRemoteImageUrl(value: string): boolean {
  return normalizeStudyRemoteImageUrl(value) !== null
}

export function isValidStudyYouTubeUrl(value: string): boolean {
  return parseStudyYouTubeUrl(value) !== null
}
