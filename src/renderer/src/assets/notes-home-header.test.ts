import { describe, expect, it } from 'vitest'

import { readRepoText } from '../test/read-repo-text'

const styles = readRepoText('src/renderer/src/assets/notes-home-header.css')
const entrypoint = readRepoText('src/renderer/src/main.tsx')

describe('Notes home header', () => {
  it('uses the same raised module-home panel geometry as Study and Boards', () => {
    expect(styles).toContain('[data-notes-home-container] > header')
    expect(styles).toContain('border: 1px solid var(--app-border)')
    expect(styles).toContain('border-radius: 1.5rem')
    expect(styles).toContain('background: var(--app-surface)')
    expect(styles).toContain('box-shadow: 0 20px 70px')
  })

  it('adds module decoration without introducing theme-specific geometry', () => {
    expect(styles).toContain('[data-notes-home-container] > header::before')
    expect(styles).toContain('[data-notes-home-container] > header::after')
    expect(styles).toContain('[data-notes-home-container] > header > :first-child::before')
    expect(styles).toContain('background-image: url(')
    expect(styles).not.toContain('[data-theme=')
  })

  it('loads the Notes header layer after shared module visual styles', () => {
    const sharedStyles = entrypoint.indexOf('./assets/module-sidebar-design.css')
    const notesHeaderStyles = entrypoint.indexOf('./assets/notes-home-header.css')

    expect(sharedStyles).toBeGreaterThanOrEqual(0)
    expect(notesHeaderStyles).toBeGreaterThan(sharedStyles)
  })
})
