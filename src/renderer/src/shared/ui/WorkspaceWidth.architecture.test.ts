import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const rendererRoot = join(process.cwd(), 'src/renderer/src')
const directWorkspaceFiles = [
  'modules/notes/components/NotesHome.tsx',
  'modules/study/components/StudyHome.tsx',
  'modules/boards/BoardsPage.tsx'
]

describe('workspace width', () => {
  it('keeps the shared inner content width at 1240px across module workspaces', () => {
    for (const relativePath of directWorkspaceFiles) {
      const source = readFileSync(join(rendererRoot, relativePath), 'utf8')
      expect(source, relativePath).toContain('mx-auto w-full max-w-[1240px]')
    }

    const finance = readFileSync(join(rendererRoot, 'modules/finance/FinancePage.tsx'), 'utf8')
    const standardPage = readFileSync(
      join(rendererRoot, 'shared/ui/StandardModulePage.tsx'),
      'utf8'
    )
    const mainCss = readFileSync(join(rendererRoot, 'assets/main.css'), 'utf8')

    expect(finance).toContain('<StandardModulePage>')
    expect(standardPage).toContain('max-w-[var(--app-standard-content-width)]')
    expect(mainCss).toContain('--app-standard-content-width: 1240px;')
  })
})
