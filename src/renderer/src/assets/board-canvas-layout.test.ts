import { describe, expect, it } from 'vitest'

import { readRepoText } from '../test/read-repo-text'

const styles = readRepoText('src/renderer/src/assets/board-canvas-layout.css')
const lightThemeComponents = readRepoText('src/renderer/src/assets/light-theme-components.css')
const lightThemeFinalDetails = readRepoText(
  'src/renderer/src/assets/light-theme-final-details.css'
)
const entrypoint = readRepoText('src/renderer/src/main.tsx')

describe('board canvas layout', () => {
  it('does not turn the full-height tldraw layout rail into a visual panel', () => {
    expect(styles).toContain('.mymind-board-canvas .tlui-layout__top__left')
    expect(styles).toContain('margin: 0 !important')
    expect(styles).toContain('border: 0 !important')
    expect(styles).toContain('background: transparent !important')
    expect(styles).toContain('box-shadow: none !important')
  })

  it('uses one surface for top menu, style controls and zoom controls', () => {
    expect(styles).toContain('.mymind-board-canvas .tlui-menu-zone')
    expect(styles).toContain('.mymind-board-canvas .tlui-style-panel')
    expect(styles).toContain('.mymind-board-canvas .tlui-navigation-panel')
    expect(styles).toContain('var(--board-ui-panel-bg)')
  })

  it('removes nested toolbar and navigation backgrounds authoritatively', () => {
    expect(styles).toContain(':is(.tlui-menu-zone, .tlui-style-panel, .tlui-navigation-panel)')
    expect(styles).toContain('background: transparent !important')
    expect(styles).toContain('.tlui-navigation-panel::before')
    expect(styles).toContain('display: none !important')
  })

  it('keeps geometry shared while light theme changes only panel tokens', () => {
    const lightThemeBlock = styles.match(
      /:root\[data-theme='light'\] \.mymind-board-canvas \{([\s\S]*?)\}/
    )?.[1]

    expect(lightThemeBlock).toContain('--board-ui-panel-bg:')
    expect(lightThemeBlock).toContain('--board-ui-panel-border:')
    expect(lightThemeBlock).not.toContain('border-radius:')
    expect(lightThemeBlock).not.toContain('margin:')
  })

  it('forbids board layout geometry in light-theme component layers', () => {
    expect(lightThemeComponents).not.toContain('.tlui-layout__top__left')
    expect(lightThemeFinalDetails).not.toContain('.tlui-layout__top__left')
    expect(lightThemeComponents).not.toMatch(
      /\[data-board-tree-node\][^{]*\{[^}]*border-radius:/
    )
  })

  it('loads the corrective layout layer after the other visual styles', () => {
    const sidebarStyles = entrypoint.indexOf("./assets/module-sidebar-design.css")
    const canvasLayoutStyles = entrypoint.indexOf("./assets/board-canvas-layout.css")

    expect(sidebarStyles).toBeGreaterThanOrEqual(0)
    expect(canvasLayoutStyles).toBeGreaterThan(sidebarStyles)
  })
})
