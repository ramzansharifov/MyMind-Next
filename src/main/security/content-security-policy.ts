import type { Session } from 'electron'

const directives = [
  "default-src 'self'",
  "script-src 'self'",
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
  const connectSources = development
    ? "connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*"
    : "connect-src 'self'"

  return [...directives, connectSources].join('; ')
}

export function installContentSecurityPolicy(targetSession: Session, development: boolean): void {
  const policy = createContentSecurityPolicy(development)

  targetSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [policy]
      }
    })
  })
}
