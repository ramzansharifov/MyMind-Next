const MAGIC_TEXT = 'MYMIND01'
const HEADER_SIZE = 12

export const MOBILE_BACKUP_FORMAT = 'mymind-mobile-backup'
export const MOBILE_BACKUP_VERSION = 1
export const MOBILE_BACKUP_SCHEMA_VERSION = 8
export const MOBILE_BACKUP_EXTENSION = '.mymindbackup'
export const MOBILE_BACKUP_MAX_MANIFEST_BYTES = 4 * 1024 * 1024
export const MOBILE_BACKUP_MAX_ENTRIES = 25_000
export const MOBILE_BACKUP_MAX_DATABASE_BYTES = 512 * 1024 * 1024
export const MOBILE_BACKUP_MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024
export const MOBILE_BACKUP_MAX_TOTAL_BYTES = 4 * 1024 * 1024 * 1024
export const MOBILE_BACKUP_HEADER_SIZE = HEADER_SIZE

const ALLOWED_FILE_ROOTS = new Set(['document-assets', 'workout-progress'])
const HEX_256 = /^[0-9a-f]{64}$/

export type MobileBackupEntryKind = 'database' | 'file'

export interface MobileBackupEntry {
  path: string
  kind: MobileBackupEntryKind
  size: number
  offset: number
  sha256: string
}

export interface MobileBackupManifestV1 {
  format: typeof MOBILE_BACKUP_FORMAT
  version: typeof MOBILE_BACKUP_VERSION
  schemaVersion: number
  createdAt: number
  entries: MobileBackupEntry[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertInteger(value: unknown, label: string, min = 0): asserts value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min)
    throw new Error(`Некорректное поле backup: ${label}`)
}

export function assertSafeBackupPath(path: string): void {
  if (
    !path ||
    path.length > 1024 ||
    path.includes('\\') ||
    path.includes('\0') ||
    path.startsWith('/')
  )
    throw new Error('Некорректный путь внутри backup')
  const segments = path.split('/')
  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === '.' ||
        segment === '..' ||
        segment.length > 255 ||
        segment.includes('\0')
    )
  )
    throw new Error('Некорректный путь внутри backup')
}

function assertEntry(value: unknown): asserts value is MobileBackupEntry {
  if (!isRecord(value)) throw new Error('Некорректная запись backup')
  if (typeof value.path !== 'string') throw new Error('Некорректный путь backup')
  assertSafeBackupPath(value.path)
  if (value.kind !== 'database' && value.kind !== 'file')
    throw new Error('Некорректный тип записи backup')
  assertInteger(value.size, 'size')
  assertInteger(value.offset, 'offset')
  if (typeof value.sha256 !== 'string' || !HEX_256.test(value.sha256))
    throw new Error('Некорректная контрольная сумма backup')

  if (value.kind === 'database') {
    if (value.path !== 'database/mymind.sqlite')
      throw new Error('Некорректный путь базы данных backup')
    if (value.size > MOBILE_BACKUP_MAX_DATABASE_BYTES)
      throw new Error('База данных в backup слишком большая')
    return
  }

  if (value.size > MOBILE_BACKUP_MAX_FILE_BYTES) throw new Error('Файл в backup слишком большой')
  const [root, ...rest] = value.path.split('/')
  if (!ALLOWED_FILE_ROOTS.has(root) || rest.length === 0)
    throw new Error('Backup содержит неподдерживаемый файловый путь')
}

export function assertMobileBackupManifest(
  value: unknown,
  manifestBytes: number,
  archiveBytes?: number
): asserts value is MobileBackupManifestV1 {
  if (manifestBytes <= 0 || manifestBytes > MOBILE_BACKUP_MAX_MANIFEST_BYTES)
    throw new Error('Некорректный размер манифеста backup')
  if (!isRecord(value)) throw new Error('Некорректный манифест backup')
  if (value.format !== MOBILE_BACKUP_FORMAT || value.version !== MOBILE_BACKUP_VERSION)
    throw new Error('Неподдерживаемый формат backup')
  assertInteger(value.schemaVersion, 'schemaVersion', 1)
  assertInteger(value.createdAt, 'createdAt', 1)
  if (!Array.isArray(value.entries) || value.entries.length === 0)
    throw new Error('Backup не содержит данных')
  if (value.entries.length > MOBILE_BACKUP_MAX_ENTRIES)
    throw new Error('Слишком много файлов в backup')

  const seen = new Set<string>()
  let expectedOffset = 0
  let databases = 0
  for (const entry of value.entries) {
    assertEntry(entry)
    if (seen.has(entry.path)) throw new Error('Backup содержит повторяющийся путь')
    seen.add(entry.path)
    if (entry.offset !== expectedOffset) throw new Error('Некорректная таблица смещений backup')
    expectedOffset += entry.size
    if (!Number.isSafeInteger(expectedOffset) || expectedOffset > MOBILE_BACKUP_MAX_TOTAL_BYTES)
      throw new Error('Backup превышает допустимый размер')
    if (entry.kind === 'database') databases += 1
  }
  if (databases !== 1) throw new Error('Backup должен содержать ровно одну базу данных')
  if (archiveBytes !== undefined) {
    assertInteger(archiveBytes, 'archiveBytes', HEADER_SIZE + manifestBytes)
    if (archiveBytes !== HEADER_SIZE + manifestBytes + expectedOffset)
      throw new Error('Размер backup не соответствует манифесту')
  }
}

export function encodeMobileBackupManifest(manifest: MobileBackupManifestV1): Uint8Array {
  const bytes = new TextEncoder().encode(JSON.stringify(manifest))
  assertMobileBackupManifest(manifest, bytes.length)
  return bytes
}

export function decodeMobileBackupManifest(
  bytes: Uint8Array,
  archiveBytes?: number
): MobileBackupManifestV1 {
  if (bytes.length === 0 || bytes.length > MOBILE_BACKUP_MAX_MANIFEST_BYTES)
    throw new Error('Некорректный размер манифеста backup')
  let parsed: unknown
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    throw new Error('Манифест backup повреждён')
  }
  assertMobileBackupManifest(parsed, bytes.length, archiveBytes)
  return parsed
}

export function encodeMobileBackupHeader(manifestBytes: number): Uint8Array {
  assertInteger(manifestBytes, 'manifestBytes', 1)
  if (manifestBytes > MOBILE_BACKUP_MAX_MANIFEST_BYTES)
    throw new Error('Манифест backup слишком большой')
  const header = new Uint8Array(HEADER_SIZE)
  header.set(new TextEncoder().encode(MAGIC_TEXT), 0)
  new DataView(header.buffer).setUint32(8, manifestBytes, false)
  return header
}

export function decodeMobileBackupHeader(header: Uint8Array): number {
  if (header.length !== HEADER_SIZE) throw new Error('Файл backup повреждён')
  const magic = new TextDecoder().decode(header.subarray(0, 8))
  if (magic !== MAGIC_TEXT) throw new Error('Это не backup MyMind')
  const manifestBytes = new DataView(header.buffer, header.byteOffset, header.byteLength).getUint32(
    8,
    false
  )
  if (manifestBytes <= 0 || manifestBytes > MOBILE_BACKUP_MAX_MANIFEST_BYTES)
    throw new Error('Некорректный размер манифеста backup')
  return manifestBytes
}
