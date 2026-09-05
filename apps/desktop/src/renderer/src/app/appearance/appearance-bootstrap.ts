const CACHE_KEY = 'mymind.appearance.v1'
const themes = new Set(['system', 'light', 'dark'])
const accents = new Set(['violet', 'blue', 'emerald', 'amber', 'rose'])

try {
  const cached: unknown = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? 'null')

  if (cached && typeof cached === 'object') {
    const theme = Reflect.get(cached, 'theme')
    const accent = Reflect.get(cached, 'accent')
    const version = Reflect.get(cached, 'version')
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (version === 1 && typeof theme === 'string' && themes.has(theme)) {
      document.documentElement.dataset.theme =
        theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
    }

    if (version === 1 && typeof accent === 'string' && accents.has(accent)) {
      document.documentElement.dataset.accent = accent
    }
  }
} catch {
  // The provider will apply validated SQLite preferences after startup.
}
