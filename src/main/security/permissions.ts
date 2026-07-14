import type { Session, WebContents } from 'electron'

export type PermissionPolicySession = Pick<
  Session,
  'setPermissionCheckHandler' | 'setPermissionRequestHandler'
>

export interface PermissionPolicyOptions {
  rendererUrl: string
  getTrustedWebContents(): WebContents | null
}

export type PermissionPolicySource = 'check' | 'request'

export interface PermissionPolicyContext {
  source: PermissionPolicySource
  permission: string
  requestingUrl?: string
  requestingOrigin?: string
  embeddingOrigin?: string
  topLevelUrl?: string
  isMainFrame: boolean
  isTrustedWebContents: boolean
}

const YOUTUBE_EMBED_ORIGIN = 'https://www.youtube-nocookie.com'

function sameDocumentUrl(first: string | undefined, second: string): boolean {
  if (!first) {
    return false
  }

  try {
    const firstUrl = new URL(first)
    const secondUrl = new URL(second)

    firstUrl.hash = ''
    secondUrl.hash = ''

    return firstUrl.href === secondUrl.href
  } catch {
    return false
  }
}

function normalizeOrigin(value: string | undefined): string | null {
  if (!value) {
    return null
  }

  if (value === 'null') {
    return 'file://'
  }

  try {
    const parsedUrl = new URL(value)

    if (parsedUrl.protocol === 'file:') {
      return 'file://'
    }

    return parsedUrl.origin
  } catch {
    return null
  }
}

function matchesOrigin(
  expectedUrlOrOrigin: string,
  ...candidates: Array<string | undefined>
): boolean {
  const expectedOrigin = normalizeOrigin(expectedUrlOrOrigin)

  if (!expectedOrigin) {
    return false
  }

  return candidates.some((candidate) => normalizeOrigin(candidate) === expectedOrigin)
}

function isTrustedRendererDocument(context: PermissionPolicyContext, rendererUrl: string): boolean {
  return context.isTrustedWebContents && sameDocumentUrl(context.topLevelUrl, rendererUrl)
}

function isTrustedRendererMainFrame(
  context: PermissionPolicyContext,
  rendererUrl: string
): boolean {
  if (!context.isMainFrame || !isTrustedRendererDocument(context, rendererUrl)) {
    return false
  }

  return (
    sameDocumentUrl(context.requestingUrl, rendererUrl) ||
    matchesOrigin(rendererUrl, context.requestingOrigin, context.requestingUrl)
  )
}

function isTrustedYouTubeFullscreenRequest(
  context: PermissionPolicyContext,
  rendererUrl: string
): boolean {
  if (
    context.isMainFrame ||
    !matchesOrigin(YOUTUBE_EMBED_ORIGIN, context.requestingOrigin, context.requestingUrl)
  ) {
    return false
  }

  if (context.source === 'check') {
    return matchesOrigin(rendererUrl, context.embeddingOrigin)
  }

  if (!isTrustedRendererDocument(context, rendererUrl)) {
    return false
  }

  return (
    context.embeddingOrigin === undefined || matchesOrigin(rendererUrl, context.embeddingOrigin)
  )
}

export function isAppPermissionAllowed(
  context: PermissionPolicyContext,
  rendererUrl: string
): boolean {
  if (context.permission === 'clipboard-sanitized-write') {
    return isTrustedRendererMainFrame(context, rendererUrl)
  }

  if (context.permission === 'fullscreen') {
    return isTrustedYouTubeFullscreenRequest(context, rendererUrl)
  }

  return false
}

export function installPermissionPolicy(
  targetSession: PermissionPolicySession,
  options: PermissionPolicyOptions
): void {
  targetSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) =>
    isAppPermissionAllowed(
      {
        source: 'check',
        permission,
        requestingUrl: details.requestingUrl,
        requestingOrigin,
        embeddingOrigin: details.embeddingOrigin,
        topLevelUrl: webContents?.getURL(),
        isMainFrame: details.isMainFrame,
        isTrustedWebContents:
          webContents !== null && webContents === options.getTrustedWebContents()
      },
      options.rendererUrl
    )
  )

  targetSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    callback(
      isAppPermissionAllowed(
        {
          source: 'request',
          permission,
          requestingUrl: details.requestingUrl,
          requestingOrigin: details.requestingUrl,
          topLevelUrl: webContents.getURL(),
          isMainFrame: details.isMainFrame,
          isTrustedWebContents: webContents === options.getTrustedWebContents()
        },
        options.rendererUrl
      )
    )
  })
}

export { YOUTUBE_EMBED_ORIGIN }
