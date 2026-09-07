import type { StudyAssetKind } from '@mymind/contracts/study'

const KIND_EXTENSIONS = {
  image: new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'bmp']),
  video: new Set(['mp4', 'm4v', 'mov', 'webm', 'ogv', 'ogg']),
  audio: new Set(['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'webm', 'weba'])
} satisfies Record<Exclude<StudyAssetKind, 'file'>, Set<string>>

const MIME_TYPES: Readonly<Record<string, string>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  weba: 'audio/webm',
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
}

function replaceControlCharacters(value: string): string {
  return Array.from(value)
    .map((character) => (character.charCodeAt(0) <= 31 ? '_' : character))
    .join('')
}

export function studyAssetExtension(fileName: string): string {
  const normalized = fileName.replace(/\\/g, '/').split('/').pop() ?? ''
  const dot = normalized.lastIndexOf('.')
  if (dot <= 0 || dot === normalized.length - 1) return ''
  return normalized.slice(dot + 1).toLocaleLowerCase('en-US')
}

export function isSupportedStudyAssetExtension(kind: StudyAssetKind, extension: string): boolean {
  if (kind === 'file') return true
  return Boolean(extension) && KIND_EXTENSIONS[kind].has(extension.toLocaleLowerCase('en-US'))
}

export function studyAssetMimeType(extension: string): string {
  return MIME_TYPES[extension.toLocaleLowerCase('en-US')] ?? 'application/octet-stream'
}

export function sanitizeStudyAssetFileName(value: string): string {
  const source = (value.replace(/\\/g, '/').split('/').pop() ?? '').normalize('NFC')
  const dot = source.lastIndexOf('.')
  const originalExtension = dot > 0 ? source.slice(dot) : ''
  const extension = originalExtension
    .replace(/[^.a-zA-Z0-9]/g, '')
    .slice(0, 16)
    .toLocaleLowerCase('en-US')
  const rawStem = originalExtension ? source.slice(0, source.length - originalExtension.length) : source
  const stem = replaceControlCharacters(rawStem)
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/[.\s]+$/g, '')
    .trim()
    .slice(0, 150)

  return `${stem || 'file'}${extension}`
}
