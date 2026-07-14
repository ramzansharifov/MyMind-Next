import type { Session, WebContents } from 'electron'

export type PermissionPolicySession = Pick<
  Session,
  'setPermissionCheckHandler' | 'setPermissionRequestHandler'
>

export interface PermissionPolicyOptions {
  rendererUrl: string
  getTrustedWebContents(): WebContents | null
}

export interface PermissionPolicyContext {
  permission: string
  requestingUrl: string
  topLevelUrl: string
  isMainFrame: boolean
  isTrustedWebContents: boolean
}

const YOUTUBE_EMBED_ORIGIN = 'https://www.youtube-nocookie.com'

function sameDocumentUrl(first: string, second: string): boolean {
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

function hasOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin
  } catch {
    return false
  }
}

export function isAppPermissionAllowed(
  context: PermissionPolicyContext,
  rendererUrl: string
): boolean {
  if (!context.isTrustedWebContents || !sameDocumentUrl(context.topLevelUrl, rendererUrl)) {
    return false
  }

  if (context.permission === 'clipboard-sanitized-write') {
    return context.isMainFrame && sameDocumentUrl(context.requestingUrl, rendererUrl)
  }

  if (context.permission === 'fullscreen') {
    return !context.isMainFrame && hasOrigin(context.requestingUrl, YOUTUBE_EMBED_ORIGIN)
  }

  return false
}

export function installPermissionPolicy(
  targetSession: PermissionPolicySession,
  options: PermissionPolicyOptions
): void {
  const createContext = (
    webContents: WebContents | null,
    permission: string,
    requestingUrl: string,
    isMainFrame: boolean
  ): PermissionPolicyContext => ({
    permission,
    requestingUrl,
    topLevelUrl: webContents?.getURL() ?? '',
    isMainFrame,
    isTrustedWebContents: webContents !== null && webContents === options.getTrustedWebContents()
  })

  targetSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) =>
    isAppPermissionAllowed(
      createContext(
        webContents,
        permission,
        details.requestingUrl ?? requestingOrigin,
        details.isMainFrame
      ),
      options.rendererUrl
    )
  )

  targetSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    callback(
      isAppPermissionAllowed(
        createContext(webContents, permission, details.requestingUrl, details.isMainFrame),
        options.rendererUrl
      )
    )
  })
}

export { YOUTUBE_EMBED_ORIGIN }
