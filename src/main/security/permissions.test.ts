import type { WebContents } from 'electron'
import { describe, expect, it, vi } from 'vitest'

import {
  installPermissionPolicy,
  isAppPermissionAllowed,
  YOUTUBE_EMBED_ORIGIN,
  type PermissionPolicyContext,
  type PermissionPolicySession
} from './permissions'

const rendererUrl = 'http://localhost:5173/'
const rendererOrigin = 'http://localhost:5173'

const trustedRendererRequest: PermissionPolicyContext = {
  source: 'request',
  permission: 'clipboard-sanitized-write',
  requestingUrl: rendererUrl,
  requestingOrigin: rendererOrigin,
  topLevelUrl: rendererUrl,
  isMainFrame: true,
  isTrustedWebContents: true
}

describe('isAppPermissionAllowed', () => {
  it('allows sanitized clipboard writes only from the trusted renderer main frame', () => {
    expect(isAppPermissionAllowed(trustedRendererRequest, rendererUrl)).toBe(true)

    expect(
      isAppPermissionAllowed(
        {
          ...trustedRendererRequest,
          requestingUrl: 'https://example.com/',
          requestingOrigin: 'https://example.com'
        },
        rendererUrl
      )
    ).toBe(false)

    expect(
      isAppPermissionAllowed(
        {
          ...trustedRendererRequest,
          isMainFrame: false
        },
        rendererUrl
      )
    ).toBe(false)

    expect(
      isAppPermissionAllowed(
        {
          ...trustedRendererRequest,
          isTrustedWebContents: false
        },
        rendererUrl
      )
    ).toBe(false)
  })

  it('allows a YouTube fullscreen permission check with null WebContents context', () => {
    expect(
      isAppPermissionAllowed(
        {
          source: 'check',
          permission: 'fullscreen',
          requestingOrigin: YOUTUBE_EMBED_ORIGIN,
          embeddingOrigin: rendererOrigin,
          isMainFrame: false,
          isTrustedWebContents: false
        },
        rendererUrl
      )
    ).toBe(true)
  })

  it('rejects a YouTube fullscreen check embedded by an unknown origin', () => {
    expect(
      isAppPermissionAllowed(
        {
          source: 'check',
          permission: 'fullscreen',
          requestingOrigin: YOUTUBE_EMBED_ORIGIN,
          embeddingOrigin: 'https://evil.example',
          isMainFrame: false,
          isTrustedWebContents: false
        },
        rendererUrl
      )
    ).toBe(false)
  })

  it('allows a YouTube fullscreen request only inside the trusted renderer', () => {
    expect(
      isAppPermissionAllowed(
        {
          source: 'request',
          permission: 'fullscreen',
          requestingUrl: `${YOUTUBE_EMBED_ORIGIN}/embed/video-id`,
          requestingOrigin: YOUTUBE_EMBED_ORIGIN,
          topLevelUrl: rendererUrl,
          isMainFrame: false,
          isTrustedWebContents: true
        },
        rendererUrl
      )
    ).toBe(true)

    expect(
      isAppPermissionAllowed(
        {
          source: 'request',
          permission: 'fullscreen',
          requestingUrl: `${YOUTUBE_EMBED_ORIGIN}/embed/video-id`,
          requestingOrigin: YOUTUBE_EMBED_ORIGIN,
          topLevelUrl: rendererUrl,
          isMainFrame: false,
          isTrustedWebContents: false
        },
        rendererUrl
      )
    ).toBe(false)
  })

  it('rejects fullscreen for other websites and for the main frame', () => {
    expect(
      isAppPermissionAllowed(
        {
          source: 'request',
          permission: 'fullscreen',
          requestingUrl: 'https://youtube.com/embed/video-id',
          requestingOrigin: 'https://youtube.com',
          topLevelUrl: rendererUrl,
          isMainFrame: false,
          isTrustedWebContents: true
        },
        rendererUrl
      )
    ).toBe(false)

    expect(
      isAppPermissionAllowed(
        {
          source: 'request',
          permission: 'fullscreen',
          requestingUrl: `${YOUTUBE_EMBED_ORIGIN}/embed/video-id`,
          requestingOrigin: YOUTUBE_EMBED_ORIGIN,
          topLevelUrl: rendererUrl,
          isMainFrame: true,
          isTrustedWebContents: true
        },
        rendererUrl
      )
    ).toBe(false)
  })

  it('supports a production file renderer as the embedding origin', () => {
    const productionRendererUrl = 'file:///C:/Program%20Files/MyMind/out/renderer/index.html'

    expect(
      isAppPermissionAllowed(
        {
          source: 'check',
          permission: 'fullscreen',
          requestingOrigin: YOUTUBE_EMBED_ORIGIN,
          embeddingOrigin: 'file://',
          isMainFrame: false,
          isTrustedWebContents: false
        },
        productionRendererUrl
      )
    ).toBe(true)

    expect(
      isAppPermissionAllowed(
        {
          source: 'check',
          permission: 'fullscreen',
          requestingOrigin: YOUTUBE_EMBED_ORIGIN,
          embeddingOrigin: 'null',
          isMainFrame: false,
          isTrustedWebContents: false
        },
        productionRendererUrl
      )
    ).toBe(true)
  })

  it.each([
    'clipboard-read',
    'media',
    'camera',
    'microphone',
    'geolocation',
    'notifications',
    'midi',
    'midiSysex',
    'pointerLock',
    'openExternal',
    'fileSystem',
    'unknown'
  ])('denies %s by default', (permission) => {
    expect(
      isAppPermissionAllowed(
        {
          ...trustedRendererRequest,
          permission
        },
        rendererUrl
      )
    ).toBe(false)
  })

  it('rejects malformed renderer and requesting URLs', () => {
    expect(
      isAppPermissionAllowed(
        {
          ...trustedRendererRequest,
          requestingUrl: 'not a url',
          requestingOrigin: 'not an origin'
        },
        rendererUrl
      )
    ).toBe(false)

    expect(isAppPermissionAllowed(trustedRendererRequest, 'not a url')).toBe(false)
  })
})

describe('installPermissionPolicy', () => {
  type CheckHandler = NonNullable<
    Parameters<PermissionPolicySession['setPermissionCheckHandler']>[0]
  >

  type RequestHandler = NonNullable<
    Parameters<PermissionPolicySession['setPermissionRequestHandler']>[0]
  >

  function installHandlers(): {
    handlers: {
      check?: CheckHandler
      request?: RequestHandler
    }
    trustedWebContents: WebContents
  } {
    const handlers: {
      check?: CheckHandler
      request?: RequestHandler
    } = {}

    const trustedWebContents = {
      getURL: () => rendererUrl
    } as WebContents

    installPermissionPolicy(
      {
        setPermissionCheckHandler: (handler) => {
          if (handler) {
            handlers.check = handler
          }
        },
        setPermissionRequestHandler: (handler) => {
          if (handler) {
            handlers.request = handler
          }
        }
      },
      {
        rendererUrl,
        getTrustedWebContents: () => trustedWebContents
      }
    )

    return {
      handlers,
      trustedWebContents
    }
  }

  it('allows clipboard checks only for the trusted renderer main frame', () => {
    const { handlers, trustedWebContents } = installHandlers()

    expect(
      handlers.check?.(trustedWebContents, 'clipboard-sanitized-write', rendererOrigin, {
        isMainFrame: true,
        requestingUrl: rendererUrl
      })
    ).toBe(true)

    expect(
      handlers.check?.(null, 'clipboard-sanitized-write', rendererOrigin, {
        isMainFrame: true,
        requestingUrl: rendererUrl
      })
    ).toBe(false)
  })

  it('uses embeddingOrigin for cross-origin YouTube fullscreen checks', () => {
    const { handlers } = installHandlers()

    expect(
      handlers.check?.(null, 'fullscreen', YOUTUBE_EMBED_ORIGIN, {
        isMainFrame: false,
        embeddingOrigin: rendererOrigin
      })
    ).toBe(true)

    expect(
      handlers.check?.(null, 'fullscreen', YOUTUBE_EMBED_ORIGIN, {
        isMainFrame: false,
        embeddingOrigin: 'https://evil.example'
      })
    ).toBe(false)
  })

  it('allows YouTube fullscreen requests only from the trusted WebContents', () => {
    const { handlers, trustedWebContents } = installHandlers()
    const callback = vi.fn()

    handlers.request?.(trustedWebContents, 'fullscreen', callback, {
      isMainFrame: false,
      requestingUrl: `${YOUTUBE_EMBED_ORIGIN}/embed/video-id`
    })

    expect(callback).toHaveBeenCalledWith(true)

    const untrustedCallback = vi.fn()
    const untrustedWebContents = {
      getURL: () => rendererUrl
    } as WebContents

    handlers.request?.(untrustedWebContents, 'fullscreen', untrustedCallback, {
      isMainFrame: false,
      requestingUrl: `${YOUTUBE_EMBED_ORIGIN}/embed/video-id`
    })

    expect(untrustedCallback).toHaveBeenCalledWith(false)
  })

  it('installs both Electron permission handlers', () => {
    const setPermissionCheckHandler = vi.fn()
    const setPermissionRequestHandler = vi.fn()

    installPermissionPolicy(
      {
        setPermissionCheckHandler,
        setPermissionRequestHandler
      },
      {
        rendererUrl,
        getTrustedWebContents: () => null
      }
    )

    expect(setPermissionCheckHandler).toHaveBeenCalledOnce()
    expect(setPermissionRequestHandler).toHaveBeenCalledOnce()
  })
})
