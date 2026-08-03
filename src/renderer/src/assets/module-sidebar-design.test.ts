import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const styles = readFileSync(new URL('./module-sidebar-design.css', import.meta.url), 'utf8')

describe('module sidebar design', () => {
  it('uses one visual state for Study and Boards tree nodes', () => {
    expect(styles).toContain('[data-study-tree-node-id]')
    expect(styles).toContain('[data-board-tree-node]')
    expect(styles).toContain("[class~='bg-violet-500/12']")
    expect(styles).toContain('inset 3px 0 0 var(--app-accent-500)')
  })

  it('removes the hard divider beside the module sidebar', () => {
    expect(styles).toContain('[data-module-sidebar]')
    expect(styles).toContain('border-right: 0 !important')
  })

  it('keeps dedicated active-state contrast for the light theme', () => {
    expect(styles).toContain(":root[data-theme='light']")
    expect(styles).toContain('var(--app-accent-700)')
    expect(styles).toContain('var(--app-accent-600)')
  })
})
