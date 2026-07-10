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
