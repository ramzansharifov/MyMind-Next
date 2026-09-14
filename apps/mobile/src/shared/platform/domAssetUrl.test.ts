import { describe, expect, it } from 'vitest'
import { normalizeBundledDomAssetUrl } from './domAssetUrl'

describe('normalizeBundledDomAssetUrl', () => {
  it('keeps ready URLs unchanged', () => {
    expect(normalizeBundledDomAssetUrl('file:///asset.svg')).toBe('file:///asset.svg')
  })

  it('unwraps Metro uri and default modules', () => {
    expect(normalizeBundledDomAssetUrl({ uri: 'asset:///icon.svg' })).toBe('asset:///icon.svg')
    expect(normalizeBundledDomAssetUrl({ default: { uri: 'asset:///font.woff2' } })).toBe(
      'asset:///font.woff2'
    )
  })

  it('turns parsed JSON modules into fetchable data URLs', () => {
    const url = normalizeBundledDomAssetUrl({ hello: 'Привет' })
    expect(url.startsWith('data:application/json;charset=utf-8,')).toBe(true)

    const encoded = url.slice(url.indexOf(',') + 1)
    expect(JSON.parse(decodeURIComponent(encoded))).toEqual({ hello: 'Привет' })
  })
})
