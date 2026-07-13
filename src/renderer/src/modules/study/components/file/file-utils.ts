export function normalizeStudyRemoteMediaUrl(value: string): string | null {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  try {
    const parsedUrl = new URL(trimmedValue)

    if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) {
      return null
    }

    return parsedUrl.href
  } catch {
    return null
  }
}

export function isValidStudyRemoteMediaUrl(value: string): boolean {
  return normalizeStudyRemoteMediaUrl(value) !== null
}

const YOUTUBE_VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/

export interface StudyYouTubeVideo {
  id: string
  embedUrl: string
}

export function parseStudyYouTubeUrl(value: string): StudyYouTubeVideo | null {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  try {
    const parsedUrl = new URL(trimmedValue)

    if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) {
      return null
    }

    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '')

    let videoId: string | null = null

    if (hostname === 'youtu.be') {
      videoId = parsedUrl.pathname.split('/').filter(Boolean)[0] ?? null
    } else if (
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'music.youtube.com' ||
      hostname === 'youtube-nocookie.com'
    ) {
      const pathSegments = parsedUrl.pathname.split('/').filter(Boolean)

      if (parsedUrl.pathname === '/watch') {
        videoId = parsedUrl.searchParams.get('v')
      } else if (['shorts', 'live', 'embed'].includes(pathSegments[0] ?? '')) {
        videoId = pathSegments[1] ?? null
      }
    }

    if (!videoId || !YOUTUBE_VIDEO_ID.test(videoId)) {
      return null
    }

    return {
      id: videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`
    }
  } catch {
    return null
  }
}

export function isValidStudyYouTubeUrl(value: string): boolean {
  return parseStudyYouTubeUrl(value) !== null
}

export function formatStudyFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return 'Неизвестный размер'
  }

  if (bytes < 1024) {
    return `${bytes} Б`
  }

  const units = ['КБ', 'МБ', 'ГБ', 'ТБ']

  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const precision = value >= 10 ? 0 : 1

  return `${value.toFixed(precision)} ${units[unitIndex]}`
}
