import { describe, expect, it } from 'vitest'
import {
  MOBILE_BACKUP_FORMAT,
  MOBILE_BACKUP_HEADER_SIZE,
  MOBILE_BACKUP_VERSION,
  decodeMobileBackupHeader,
  decodeMobileBackupManifest,
  encodeMobileBackupHeader,
  encodeMobileBackupManifest,
  type MobileBackupManifestV1
} from './archive'

function manifest(): MobileBackupManifestV1 {
  return {
    format: MOBILE_BACKUP_FORMAT,
    version: MOBILE_BACKUP_VERSION,
    schemaVersion: 8,
    createdAt: 1_800_000_000_000,
    entries: [
      {
        path: 'database/mymind.sqlite',
        kind: 'database',
        size: 4,
        offset: 0,
        sha256: 'a'.repeat(64)
      },
      {
        path: 'document-assets/material-1/asset-1/file.pdf',
        kind: 'file',
        size: 3,
        offset: 4,
        sha256: 'b'.repeat(64)
      }
    ]
  }
}

describe('mobile backup archive contract', () => {
  it('round-trips the header and manifest with exact archive size', () => {
    const source = manifest()
    const body = encodeMobileBackupManifest(source)
    const header = encodeMobileBackupHeader(body.length)

    expect(header).toHaveLength(MOBILE_BACKUP_HEADER_SIZE)
    expect(decodeMobileBackupHeader(header)).toBe(body.length)
    expect(
      decodeMobileBackupManifest(body, MOBILE_BACKUP_HEADER_SIZE + body.length + 7)
    ).toEqual(source)
  })

  it('rejects path traversal and Windows separator aliases', () => {
    for (const path of [
      '../document-assets/file',
      'document-assets/../file',
      '/document-assets/file',
      'document-assets\\file'
    ]) {
      const source = manifest()
      source.entries[1] = { ...source.entries[1], path }
      expect(() => encodeMobileBackupManifest(source)).toThrow(/путь/i)
    }
  })

  it('rejects duplicate paths and overlapping or gapped payload offsets', () => {
    const duplicate = manifest()
    duplicate.entries.push({ ...duplicate.entries[1], offset: 7 })
    expect(() => encodeMobileBackupManifest(duplicate)).toThrow(/повторяющийся путь/i)

    const gap = manifest()
    gap.entries[1] = { ...gap.entries[1], offset: 5 }
    expect(() => encodeMobileBackupManifest(gap)).toThrow(/смещений/i)
  })

  it('requires exactly one database entry and supported file roots', () => {
    const missingDb = manifest()
    missingDb.entries = [missingDb.entries[1]]
    missingDb.entries[0] = { ...missingDb.entries[0], offset: 0 }
    expect(() => encodeMobileBackupManifest(missingDb)).toThrow(/ровно одну базу/i)

    const unsupported = manifest()
    unsupported.entries[1] = { ...unsupported.entries[1], path: 'cache/file.bin' }
    expect(() => encodeMobileBackupManifest(unsupported)).toThrow(/неподдерживаемый/i)
  })

  it('rejects trailing bytes not described by the manifest', () => {
    const body = encodeMobileBackupManifest(manifest())
    expect(() =>
      decodeMobileBackupManifest(body, MOBILE_BACKUP_HEADER_SIZE + body.length + 8)
    ).toThrow(/размер backup/i)
  })

  it('rejects an invalid magic prefix', () => {
    const header = encodeMobileBackupHeader(10)
    header[0] = 0
    expect(() => decodeMobileBackupHeader(header)).toThrow(/не backup MyMind/i)
  })
})
