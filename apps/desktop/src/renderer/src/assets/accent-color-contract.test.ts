import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const mainCss = readFileSync(join(process.cwd(), 'src/renderer/src/assets/main.css'), 'utf8')
const lightThemeCss = readFileSync(
  join(process.cwd(), 'src/renderer/src/assets/light-theme.css'),
  'utf8'
)
const builtInPurpleNamespace = ['vio', 'let'].join('')

describe('semantic accent color contract', () => {
  it('exposes the application accent through its own Tailwind color namespace', () => {
    expect(mainCss).toContain('@theme {')
    expect(mainCss).toContain('--color-accent-300: var(--app-accent-300);')
    expect(mainCss).toContain('--color-accent-500: var(--app-accent-500);')
    expect(mainCss).toContain('--color-accent-950: var(--app-accent-950);')
  })

  it('does not hijack the built-in Tailwind purple namespace', () => {
    expect(mainCss).not.toContain(`--color-${builtInPurpleNamespace}-300: var(--app-accent-300);`)
    expect(mainCss).not.toContain(`--color-${builtInPurpleNamespace}-500: var(--app-accent-500);`)
  })

  it('keeps the light-theme contrast adjustments on the semantic accent namespace', () => {
    expect(lightThemeCss).toContain('--color-accent-300: var(--app-accent-700);')
    expect(lightThemeCss).toContain('--color-accent-500: var(--app-accent-600);')
    expect(lightThemeCss).not.toContain(
      `--color-${builtInPurpleNamespace}-300: var(--app-accent-700);`
    )
  })
})
