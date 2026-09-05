// @vitest-environment node

import { describe, expect, it } from 'vitest'

import { resolveStudyAssetByteRange } from './study-asset-range'

describe('resolveStudyAssetByteRange', () => {
  it('uses the full file when the request has no range', () => {
    expect(resolveStudyAssetByteRange(null, 1000)).toEqual({ kind: 'full' })
  })

  it('resolves bounded and open byte ranges', () => {
    expect(resolveStudyAssetByteRange('bytes=100-299', 1000)).toEqual({
      kind: 'partial',
      start: 100,
      end: 299
    })
    expect(resolveStudyAssetByteRange('bytes=900-', 1000)).toEqual({
      kind: 'partial',
      start: 900,
      end: 999
    })
  })

  it('resolves suffix ranges and clamps them to the file size', () => {
    expect(resolveStudyAssetByteRange('bytes=-200', 1000)).toEqual({
      kind: 'partial',
      start: 800,
      end: 999
    })
    expect(resolveStudyAssetByteRange('bytes=-2000', 1000)).toEqual({
      kind: 'partial',
      start: 0,
      end: 999
    })
  })

  it('rejects invalid, multiple and out-of-bounds ranges', () => {
    expect(resolveStudyAssetByteRange('bytes=1000-', 1000)).toEqual({
      kind: 'unsatisfiable'
    })
    expect(resolveStudyAssetByteRange('bytes=300-100', 1000)).toEqual({
      kind: 'unsatisfiable'
    })
    expect(resolveStudyAssetByteRange('bytes=0-10,20-30', 1000)).toEqual({
      kind: 'unsatisfiable'
    })
  })
})
