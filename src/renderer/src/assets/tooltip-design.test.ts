import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const styles = readFileSync(new URL('./tooltip-design.css', import.meta.url), 'utf8')

describe('tooltip design', () => {
  it('provides high-contrast shared and tldraw tooltip surfaces', () => {
    expect(styles).toContain("[data-mymind-tooltip='true']")
    expect(styles).toContain('.tlui-tooltip__content')
    expect(styles).toContain('color: #ffffff !important')
    expect(styles).toContain('opacity: 1 !important')
  })

  it('styles shortcut hints and the light theme', () => {
    expect(styles).toContain('.tlui-kbd')
    expect(styles).toContain(":root[data-theme='light']")
    expect(styles).toContain('--app-tooltip: #172131')
  })
})
