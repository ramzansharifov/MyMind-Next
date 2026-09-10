const LOCAL_WEB_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

function normalizeHostname(hostname: string) {
  return hostname.replace(/^\[|\]$/g, '')
}

function isLocalWebHost(hostname: string) {
  return LOCAL_WEB_HOSTS.has(normalizeHostname(hostname))
}

export function getSafeWebPreviewRedirect(
  currentHref: string | undefined,
  safeOrigin: string | undefined
) {
  if (!currentHref || !safeOrigin) return null

  try {
    const currentUrl = new URL(currentHref)
    const safeUrl = new URL(safeOrigin)

    if (!isLocalWebHost(currentUrl.hostname) || !isLocalWebHost(safeUrl.hostname)) {
      return null
    }

    if (currentUrl.origin === safeUrl.origin) return null

    const redirectUrl = new URL(
      `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`,
      `${safeUrl.origin}/`
    )

    return redirectUrl.toString()
  } catch {
    return null
  }
}
