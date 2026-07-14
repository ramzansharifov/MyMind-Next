import type { Session } from 'electron'

export interface AppContentSecurityPolicyRequest {
  url: string
  resourceType: string
}

export interface AppContentSecurityPolicyOptions {
  development: boolean
  rendererUrl: string
}

const directives = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https: mymind-asset:",
  "media-src 'self' data: blob: https: mymind-asset:",
  'frame-src https://www.youtube-nocookie.com',
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
]

export function createContentSecurityPolicy(development: boolean): string {
  // Vite injects the React Refresh preamble as an inline module in development.
  // Packaged builds keep the stricter self-only script policy.
  const scriptSources = development ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'"
  const connectSources = development
    ? "connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*"
    : "connect-src 'self'"

  return [...directives, scriptSources, connectSources].join('; ')
}

function normalizeDocumentUrl(value: string): string | null {
  try {
    const url = new URL(value)
    url.hash = ''
    return url.href
  } catch {
    return null
  }
}

export function shouldApplyAppContentSecurityPolicy(
  request: AppContentSecurityPolicyRequest,
  options: AppContentSecurityPolicyOptions
): boolean {
  if (request.resourceType !== 'mainFrame') return false

  const requestUrl = normalizeDocumentUrl(request.url)
  const rendererUrl = normalizeDocumentUrl(options.rendererUrl)

  return requestUrl !== null && rendererUrl !== null && requestUrl === rendererUrl
}

export function installContentSecurityPolicy(
  targetSession: Session,
  options: AppContentSecurityPolicyOptions
): void {
  const policy = createContentSecurityPolicy(options.development)

  targetSession.webRequest.onHeadersReceived((details, callback) => {
    if (!shouldApplyAppContentSecurityPolicy(details, options)) {
      callback({ responseHeaders: details.responseHeaders })
      return
    }

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [policy]
      }
    })
  })
}
