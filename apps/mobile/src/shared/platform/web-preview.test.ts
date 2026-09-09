import { describe, expect, it } from 'vitest'
import { getSafeWebPreviewRedirect } from './web-preview'

describe('mobile web preview redirect', () => {
  it('redirects direct Metro access to the SQLite-safe preview and preserves the URL', () => {
    expect(
      getSafeWebPreviewRedirect(
        'http://localhost:8082/notes?group=recent#top',
        'http://localhost:8081'
      )
    ).toBe('http://localhost:8081/notes?group=recent#top')
  })

  it('does not redirect when the browser is already on the safe preview', () => {
    expect(
      getSafeWebPreviewRedirect('http://localhost:8081/', 'http://localhost:8081')
    ).toBeNull()
  })

  it('supports loopback host aliases for local preview access', () => {
    expect(
      getSafeWebPreviewRedirect('http://127.0.0.1:8082/', 'http://localhost:8081')
    ).toBe('http://localhost:8081/')
  })

  it('does not redirect unrelated non-local web origins', () => {
    expect(
      getSafeWebPreviewRedirect('https://example.com/', 'http://localhost:8081')
    ).toBeNull()
  })

  it('ignores missing or invalid preview configuration', () => {
    expect(getSafeWebPreviewRedirect('http://localhost:8082/', undefined)).toBeNull()
    expect(getSafeWebPreviewRedirect('http://localhost:8082/', 'not-a-url')).toBeNull()
  })
})
