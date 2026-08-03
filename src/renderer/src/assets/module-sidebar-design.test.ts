import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const styles = readFileSync(new URL('./module-sidebar-design.css', import.meta.url), 'utf8')

describe('module sidebar design', () => {
  it('styles semantic tree state instead of module-specific utility classes', () => {
    expect(styles).toContain('[data-module-tree-node]')
    expect(styles).toContain("[data-selected='true']")
    expect(styles).toContain("[data-context-active='true']")
    expect(styles).not.toContain("[class*='bg-violet']")
    expect(styles).not.toContain('[data-study-tree-node-id]')
    expect(styles).not.toContain('[data-board-tree-node]')
  })

  it('locks expanded-row geometry across themes', () => {
    expect(styles).toContain('width: 100%')
    expect(styles).toContain('min-height: 2rem')
    expect(styles).toContain('margin: 0')
    expect(styles).toContain('border-radius: 0 !important')
    expect(styles).toContain('inset 3px 0 0 var(--app-accent-500) !important')
  })

  it('retains compact button rounding only for the collapsed sidebar', () => {
    expect(styles).toContain("[data-module-sidebar][data-collapsed='true'] [data-module-tree-node]")
    expect(styles).toContain('width: auto')
    expect(styles).toContain('border-radius: 0.75rem !important')
  })

  it('shows one real divider on the right edge of both module sidebars', () => {
    expect(styles).toContain('[data-module-sidebar]')
    expect(styles).toContain('border-right: 1px solid var(--app-border) !important')
  })

  it('changes only color tokens in the light theme', () => {
    const lightThemeBlock = styles.match(
      /:root\[data-theme='light'\] \[data-module-sidebar\] \{([\s\S]*?)\}/
    )?.[1]

    expect(lightThemeBlock).toContain('--module-tree-active-text: var(--app-accent-700)')
    expect(lightThemeBlock).not.toContain('border-radius:')
    expect(lightThemeBlock).not.toContain('width:')
    expect(lightThemeBlock).not.toContain('margin:')
  })
})
