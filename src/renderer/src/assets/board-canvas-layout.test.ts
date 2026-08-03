import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const styles = readFileSync(new URL('./board-canvas-layout.css', import.meta.url), 'utf8')
const entrypoint = readFileSync(new URL('../main.tsx', import.meta.url), 'utf8')

describe('board canvas layout', () => {
  it('does not turn the full-height tldraw layout rail into a visual panel', () => {
    expect(styles).toContain('.mymind-board-canvas .tlui-layout__top__left')
    expect(styles).toContain('margin: 0')
    expect(styles).toContain('border: 0')
    expect(styles).toContain('background: transparent')
    expect(styles).toContain('box-shadow: none')
  })

  it('loads the corrective layout layer after the other visual styles', () => {
    const sidebarStyles = entrypoint.indexOf("./assets/module-sidebar-design.css")
    const canvasLayoutStyles = entrypoint.indexOf("./assets/board-canvas-layout.css")

    expect(sidebarStyles).toBeGreaterThanOrEqual(0)
    expect(canvasLayoutStyles).toBeGreaterThan(sidebarStyles)
  })
})
