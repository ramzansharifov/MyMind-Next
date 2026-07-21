import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const styles = readFileSync(new URL('./board-managed-hierarchy.css', import.meta.url), 'utf8')

describe('managed board hierarchy styles', () => {
  it('removes managed folder actions without hiding managed board actions', () => {
    expect(styles).toContain('[data-boards-focus-mode]')
    expect(styles).toContain("[data-study-managed='true']")
    expect(styles).toContain("button[aria-label='Свернуть папку']")
    expect(styles).toContain("button[aria-label='Развернуть папку']")
    expect(styles).toContain("button[aria-label^='Действия:']")
    expect(styles).not.toContain("[data-study-managed='true'] > button[aria-label^='Действия:']")
  })

  it('suppresses managed folder context menus while preserving board rename and delete menus', () => {
    expect(styles).toContain("[data-board-tree-action='create-folder']")
    expect(styles).toContain(":not(\n    :has(> [data-board-tree-action='delete'])")
  })

  it('hides creation controls on fixed and synchronized folder pages', () => {
    expect(styles).toContain('.lucide-lock-keyhole')
    expect(styles).toContain('.lucide-folder-plus')
    expect(styles).toContain('.lucide-pencil')
    expect(styles).toContain(':not(:has(.lucide-palette))')
  })
})
