import { describe, expect, it } from 'vitest'

import { readRepoText } from '../test/read-repo-text'

const styles = readRepoText('src/renderer/src/assets/notes-home-header.css')
const entrypoint = readRepoText('src/renderer/src/main.tsx')
const studyHome = readRepoText('src/renderer/src/modules/study/components/StudyHome.tsx')
const workspacePrimitives = readRepoText('src/renderer/src/shared/ui/WorkspacePrimitives.tsx')

describe('Notes home header', () => {
  it('uses one raised panel for the full module hero', () => {
    expect(styles).toContain('[data-notes-hero]')
    expect(styles).toContain('border: 1px solid var(--app-border)')
    expect(styles).toContain('border-radius: 1.5rem')
    expect(styles).toContain('background: var(--app-surface)')
    expect(styles).toContain('box-shadow: 0 20px 70px')
    expect(styles).toContain('[data-notes-hero-stats]')
  })

  it('uses the same nested surface hierarchy as the Study home header', () => {
    expect(studyHome).toContain('bg-[var(--app-workspace)]')
    expect(workspacePrimitives).toContain('bg-[var(--app-card)]')
    expect(workspacePrimitives).toContain('shadow-[var(--app-shadow-card)]')

    expect(styles).toContain('background: var(--app-workspace)')
    expect(styles).toContain('background: var(--app-card)')
    expect(styles).toContain('box-shadow: var(--app-shadow-card)')
    expect(styles).toContain('background: var(--app-card-hover)')
    expect(styles).toContain('box-shadow: var(--app-shadow-hover)')
  })

  it('uses the selected accent for the module icon without theme-specific geometry', () => {
    expect(styles).toContain('[data-notes-hero]::before')
    expect(styles).toContain('[data-notes-hero]::after')
    expect(styles).toContain('[data-notes-hero] > header > :first-child::before')
    expect(styles).toContain('[data-notes-hero] > header > :first-child::after')
    expect(styles).toContain('mask: url(')
    expect(styles).toContain('background: var(--app-accent-500)')
    expect(styles).not.toContain('%23a78bfa')
    expect(styles).not.toContain('[data-theme=')
  })

  it('loads the Notes header layer after shared module visual styles', () => {
    const sharedStyles = entrypoint.indexOf('./assets/module-sidebar-design.css')
    const notesHeaderStyles = entrypoint.indexOf('./assets/notes-home-header.css')

    expect(sharedStyles).toBeGreaterThanOrEqual(0)
    expect(notesHeaderStyles).toBeGreaterThan(sharedStyles)
  })
})
