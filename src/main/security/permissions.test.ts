import type { WebContents } from 'electron'
import { describe, expect, it, vi } from 'vitest'

import {
  installPermissionPolicy,
  isAppPermissionAllowed,
  type PermissionPolicySession
} from './permissions'

const rendererUrl = 'http://localhost:5173/'
const baseContext = {
  requestingUrl: rendererUrl,
  topLevelUrl: rendererUrl,
  isMainFrame: true,
  isTrustedWebContents: true
}

describe('isAppPermissionAllowed', () => {
  it('allows sanitized clipboard writes only from the trusted renderer main frame', () => {
    expect(
      isAppPermissionAllowed(
        { ...baseContext, permission: 'clipboard-sanitized-write' },
        rendererUrl
      )
    ).toBe(true)
    expect(
      isAppPermissionAllowed(
        {
          ...baseContext,
          permission: 'clipboard-sanitized-write',
          requestingUrl: 'https://example.com/'
        },
        rendererUrl
      )
    ).toBe(false)
  })

  it('allows fullscreen only for a YouTube privacy-enhanced embed subframe', () => {
    expect(
      isAppPermissionAllowed(
        {
          ...baseContext,
          permission: 'fullscreen',
          requestingUrl: 'https://www.youtube-nocookie.com/embed/abc',
          isMainFrame: false
        },
        rendererUrl
      )
    ).toBe(true)
    expect(
      isAppPermissionAllowed(
        {
          ...baseContext,
          permission: 'fullscreen',
          requestingUrl: 'https://youtube.com/embed/abc',
          isMainFrame: false
        },
        rendererUrl
      )
    ).toBe(false)
  })

  it.each(['clipboard-read', 'media', 'geolocation', 'notifications', 'midi'])(
    'denies %s even for the trusted renderer',
    (permission) => {
      expect(isAppPermissionAllowed({ ...baseContext, permission }, rendererUrl)).toBe(false)
    }
  )

  it('denies all permissions for untrusted WebContents or top-level URLs', () => {
    expect(
      isAppPermissionAllowed(
        { ...baseContext, permission: 'clipboard-sanitized-write', isTrustedWebContents: false },
        rendererUrl
      )
    ).toBe(false)
    expect(
      isAppPermissionAllowed(
        {
          ...baseContext,
          permission: 'fullscreen',
          requestingUrl: 'https://www.youtube-nocookie.com/embed/abc',
          topLevelUrl: 'https://evil.example/',
          isMainFrame: false
        },
        rendererUrl
      )
    ).toBe(false)
  })

  it('denies malformed requesting and top-level URLs', () => {
    expect(
      isAppPermissionAllowed(
        {
          ...baseContext,
          permission: 'clipboard-sanitized-write',
          requestingUrl: 'not a url'
        },
        rendererUrl
      )
    ).toBe(false)
    expect(
      isAppPermissionAllowed(
        {
          ...baseContext,
          permission: 'fullscreen',
          requestingUrl: 'not a url',
          isMainFrame: false
        },
        rendererUrl
      )
    ).toBe(false)
    expect(
      isAppPermissionAllowed(
        { ...baseContext, permission: 'clipboard-sanitized-write' },
        'not a url'
      )
    ).toBe(false)
  })

  it('applies the same contextual policy in Electron check and request handlers', () => {
    type CheckHandler = NonNullable<
      Parameters<PermissionPolicySession['setPermissionCheckHandler']>[0]
    >
    type RequestHandler = NonNullable<
      Parameters<PermissionPolicySession['setPermissionRequestHandler']>[0]
    >
    const handlers: { check?: CheckHandler; request?: RequestHandler } = {}
    const trustedWebContents = {
      getURL: () => rendererUrl
    } as WebContents

    installPermissionPolicy(
      {
        setPermissionCheckHandler: (handler) => {
          if (handler) handlers.check = handler
        },
        setPermissionRequestHandler: (handler) => {
          if (handler) handlers.request = handler
        }
      },
      { rendererUrl, getTrustedWebContents: () => trustedWebContents }
    )

    expect(
      handlers.check?.(trustedWebContents, 'clipboard-sanitized-write', rendererUrl, {
        isMainFrame: true
      })
    ).toBe(true)
    expect(
      handlers.check?.(null, 'clipboard-sanitized-write', rendererUrl, { isMainFrame: true })
    ).toBe(false)

    const callback = vi.fn()
    handlers.request?.(trustedWebContents, 'fullscreen', callback, {
      isMainFrame: false,
      requestingUrl: 'https://www.youtube-nocookie.com/embed/video'
    })
    expect(callback).toHaveBeenCalledWith(true)
  })

  it('installs both Electron permission handlers', () => {
    const setPermissionCheckHandler = vi.fn()
    const setPermissionRequestHandler = vi.fn()

    installPermissionPolicy(
      { setPermissionCheckHandler, setPermissionRequestHandler },
      { rendererUrl, getTrustedWebContents: () => null }
    )

    expect(setPermissionCheckHandler).toHaveBeenCalledOnce()
    expect(setPermissionRequestHandler).toHaveBeenCalledOnce()
  })
})
