import { describe, expect, it } from 'vitest'
import {
  isSupportedStudyAssetExtension,
  sanitizeStudyAssetFileName,
  studyAssetExtension,
  studyAssetMimeType
} from './study-asset-file'

describe('study asset file helpers', () => {
  it('sanitizes unsafe names while preserving a compact extension', () => {
    expect(sanitizeStudyAssetFileName('  report<>:"/\\|?*.PDF  ')).toBe('report_________.pdf')
    expect(sanitizeStudyAssetFileName('.gitignore')).toBe('.gitignore')
    expect(sanitizeStudyAssetFileName('\u0001\u0002')).toBe('__')
  })

  it('extracts extensions without treating dot-files as extensions', () => {
    expect(studyAssetExtension('photo.JPEG')).toBe('jpeg')
    expect(studyAssetExtension('/tmp/archive.tar.gz')).toBe('gz')
    expect(studyAssetExtension('.gitignore')).toBe('')
    expect(studyAssetExtension('name.')).toBe('')
  })

  it('uses the same media allow-list semantics as desktop imports', () => {
    expect(isSupportedStudyAssetExtension('image', 'webp')).toBe(true)
    expect(isSupportedStudyAssetExtension('image', 'svg')).toBe(false)
    expect(isSupportedStudyAssetExtension('video', 'mov')).toBe(true)
    expect(isSupportedStudyAssetExtension('audio', 'm4a')).toBe(true)
    expect(isSupportedStudyAssetExtension('file', 'anything')).toBe(true)
  })

  it('maps known extensions and falls back safely', () => {
    expect(studyAssetMimeType('jpg')).toBe('image/jpeg')
    expect(studyAssetMimeType('PPTX')).toContain('presentationml')
    expect(studyAssetMimeType('unknown')).toBe('application/octet-stream')
  })
})
