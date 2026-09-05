import { describe, expect, it } from 'vitest'

import { isAppPermissionAllowed, YOUTUBE_EMBED_ORIGIN } from './permissions'

const rendererUrl = 'http://localhost:5173/'

describe('permission policy URL edge cases', () => {
  it('rejects a trusted clipboard request when the top-level document URL is missing', () => {
    expect(
      isAppPermissionAllowed(
        {
          source: 'request',
          permission: 'clipboard-sanitized-write',
          requestingUrl: rendererUrl,
          requestingOrigin: 'http://localhost:5173',
          isMainFrame: true,
          isTrustedWebContents: true
        },
        rendererUrl
      )
    ).toBe(false)
  })

  it('rejects fullscreen checks without a requesting frame origin', () => {
    expect(
      isAppPermissionAllowed(
        {
          source: 'check',
          permission: 'fullscreen',
          embeddingOrigin: 'http://localhost:5173',
          isMainFrame: false,
          isTrustedWebContents: false
        },
        rendererUrl
      )
    ).toBe(false)
  })

  it('rejects a YouTube fullscreen check when the configured renderer URL is malformed', () => {
    expect(
      isAppPermissionAllowed(
        {
          source: 'check',
          permission: 'fullscreen',
          requestingOrigin: YOUTUBE_EMBED_ORIGIN,
          embeddingOrigin: 'http://localhost:5173',
          isMainFrame: false,
          isTrustedWebContents: false
        },
        'not a renderer URL'
      )
    ).toBe(false)
  })
})
