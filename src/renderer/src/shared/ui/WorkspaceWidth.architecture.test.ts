import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const workspaceFiles = [
  '../../modules/notes/components/NotesHome.tsx',
  '../../modules/study/components/StudyHome.tsx',
  '../../modules/boards/BoardsPage.tsx',
  '../../modules/finance/FinancePage.tsx'
]

describe('workspace width', () => {
  it('uses the same 1240px inner content width for notes, study, boards and finance', () => {
    for (const relativePath of workspaceFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
      expect(source, relativePath).toContain('mx-auto w-full max-w-[1240px]')
    }
  })
})
