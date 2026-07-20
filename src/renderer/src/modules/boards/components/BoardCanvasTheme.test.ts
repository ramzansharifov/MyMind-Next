import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const mainCss = readFileSync(join(process.cwd(), 'src/renderer/src/assets/main.css'), 'utf8')

describe('board canvas theme bridge', () => {
  it('maps tldraw panels and selected controls to MyMind theme variables', () => {
    expect(mainCss).toContain('.mymind-board-canvas .tl-container')
    expect(mainCss).toContain('--tl-color-panel: var(--app-surface-raised);')
    expect(mainCss).toContain('--tl-color-low: var(--app-surface);')
    expect(mainCss).toContain('--tl-color-selected: var(--app-accent-500);')
    expect(mainCss).toContain('--tl-color-focus: var(--app-accent-400);')
    expect(mainCss).toContain('--tl-color-selection-stroke: var(--app-accent-500);')
  })

  it('keeps tldraw menus on the shared application surfaces', () => {
    expect(mainCss).toContain('.mymind-board-canvas .tlui-menu')
    expect(mainCss).toContain('border: 1px solid var(--app-border);')
    expect(mainCss).toContain('.mymind-board-canvas .tlui-menu-zone')
  })
})
