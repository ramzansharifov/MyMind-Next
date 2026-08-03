import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const styles = readFileSync(new URL('./board-toolbar-design.css', import.meta.url), 'utf8')

describe('board toolbar design', () => {
  it('scopes the treatment to the primary tldraw tool selector', () => {
    expect(styles).toContain('.mymind-board-canvas .tlui-main-toolbar__inner')
    expect(styles).toContain('.tlui-main-toolbar')
    expect(styles).not.toContain('.mymind-board-canvas .tlui-toolbar {')
  })

  it('covers hover and active tool states for both tldraw state attributes', () => {
    expect(styles).toContain("[aria-pressed='true']")
    expect(styles).toContain("[data-isactive='true']")
    expect(styles).toContain('[data-highlighted]')
  })

  it('provides a dedicated light-theme treatment and a compact responsive layout', () => {
    expect(styles).toContain(":root[data-theme='light']")
    expect(styles).toContain('@media (max-width: 720px)')
  })
})
