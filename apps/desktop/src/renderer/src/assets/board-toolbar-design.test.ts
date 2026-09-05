import { describe, expect, it } from 'vitest'

import { readRepoText } from '../test/read-repo-text'

const styles = readRepoText('src/renderer/src/assets/board-toolbar-design.css')

describe('board toolbar design', () => {
  it('scopes the treatment to the primary tldraw tool selector', () => {
    expect(styles).toContain('.mymind-board-canvas .tlui-main-toolbar__inner')
    expect(styles).toContain('.tlui-main-toolbar')
    expect(styles).not.toContain('.mymind-board-canvas .tlui-toolbar {')
  })

  it('keeps nested tldraw toolbars visually transparent in every theme', () => {
    expect(styles).toContain(':is(.tlui-toolbar, .tlui-main-toolbar__tools)')
    expect(styles).toContain('border: 0 !important')
    expect(styles).toContain('background: transparent !important')
    expect(styles).toContain('box-shadow: none !important')
  })

  it('covers hover and active tool states for both tldraw state attributes', () => {
    expect(styles).toContain("[aria-pressed='true']")
    expect(styles).toContain("[data-isactive='true']")
    expect(styles).toContain('[data-highlighted]')
  })

  it('changes colors in the light theme while keeping responsive geometry shared', () => {
    expect(styles).toContain(":root[data-theme='light']")
    expect(styles).toContain('@media (max-width: 720px)')
  })
})
