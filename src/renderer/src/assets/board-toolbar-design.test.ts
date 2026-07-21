import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const styles = readFileSync(new URL('./board-toolbar-design.css', import.meta.url), 'utf8')

describe('board toolbar design', () => {
  it('scopes the toolbar treatment to the MyMind board canvas', () => {
    expect(styles).toContain('.mymind-board-canvas .tlui-toolbar')
    expect(styles).toContain('.tlui-button__tool')
  })

  it('covers hover and active tool states for both tldraw state attributes', () => {
    expect(styles).toContain("[aria-pressed='true']")
    expect(styles).toContain("[data-isactive='true']")
    expect(styles).toContain(':hover::after')
  })

  it('provides a dedicated light-theme treatment and a compact responsive layout', () => {
    expect(styles).toContain(":root[data-theme='light']")
    expect(styles).toContain('@media (max-width: 720px)')
  })
})
