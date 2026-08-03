import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const styles = readFileSync(new URL('./module-sidebar-design.css', import.meta.url), 'utf8')

describe('module sidebar design', () => {
  it('uses the same selected-row selector for Study and Boards', () => {
    expect(styles).toContain('[data-study-tree-node-id]')
    expect(styles).toContain('[data-board-tree-node]')
    expect(styles).toContain("[class*='bg-violet']")
    expect(styles).toContain("[class*='text-violet-200']")
  })

  it('locks expanded-row geometry across themes and legacy selectors', () => {
    expect(styles).toContain('width: 100%')
    expect(styles).toContain('min-height: 2rem')
    expect(styles).toContain('margin: 0')
    expect(styles).toContain('border-radius: 0 !important')
    expect(styles).toContain('inset 3px 0 0 var(--app-accent-500) !important')
  })

  it('retains compact button rounding only for the collapsed sidebar', () => {
    expect(styles).toContain("[data-module-sidebar][data-collapsed='true']")
    expect(styles).toContain('width: auto')
    expect(styles).toContain('border-radius: 0.75rem !important')
  })

  it('shows one real divider on the right edge of both module sidebars', () => {
    expect(styles).toContain('[data-module-sidebar]')
    expect(styles).toContain('border-right: 1px solid var(--app-border) !important')
  })

  it('changes only color tokens in the light theme', () => {
    expect(styles).toContain(":root[data-theme='light'] [data-module-sidebar]")
    expect(styles).toContain('--module-tree-active-text: var(--app-accent-700)')
    expect(styles).not.toMatch(/:root\[data-theme='light'\][\s\S]*border-radius:/)
  })
})
