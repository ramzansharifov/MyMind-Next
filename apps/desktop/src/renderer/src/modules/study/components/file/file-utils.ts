export {
  isValidStudyRemoteImageUrl as isValidStudyRemoteMediaUrl,
  isValidStudyYouTubeUrl,
  normalizeStudyRemoteImageUrl as normalizeStudyRemoteMediaUrl,
  parseStudyYouTubeUrl,
  type StudyYouTubeVideo
} from '../../../../../../shared/study-remote-media'

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
