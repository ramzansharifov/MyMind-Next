import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const directWorkspaceFiles = [
  '../../modules/notes/components/NotesHome.tsx',
  '../../modules/study/components/StudyHome.tsx',
  '../../modules/boards/BoardsPage.tsx'
]

describe('workspace width', () => {
  it('keeps the shared inner content width at 1240px across module workspaces', () => {
    for (const relativePath of directWorkspaceFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
      expect(source, relativePath).toContain('mx-auto w-full max-w-[1240px]')
    }

    const finance = readFileSync(
      new URL('../../modules/finance/FinancePage.tsx', import.meta.url),
      'utf8'
    )
    const standardPage = readFileSync(new URL('./StandardModulePage.tsx', import.meta.url), 'utf8')
    const mainCss = readFileSync(new URL('../../assets/main.css', import.meta.url), 'utf8')

    expect(finance).toContain('<StandardModulePage>')
    expect(standardPage).toContain('max-w-[var(--app-standard-content-width)]')
    expect(mainCss).toContain('--app-standard-content-width: 1240px;')
  })
})
