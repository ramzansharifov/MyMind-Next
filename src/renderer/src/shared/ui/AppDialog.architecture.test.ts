import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const moduleDialogFiles = [
  '../../modules/boards/BoardsPage.tsx',
  '../../modules/notes/components/NoteNameDialog.tsx',
  '../../modules/study/StudyPage.tsx',
  '../../modules/study/components/DeleteConfirmationDialog.tsx',
  '../../modules/study/components/RenameStudyNodeDialog.tsx',
  '../../modules/study/components/source/StudySourceBlockShell.tsx',
  '../../modules/finance/components/dialogs/FinanceAccountDialog.tsx',
  '../../modules/finance/components/dialogs/FinanceClearAccountDialog.tsx',
  '../../modules/finance/components/dialogs/FinanceConfirmDialog.tsx',
  '../../modules/finance/components/dialogs/FinanceCurrencyDialog.tsx',
  '../../modules/finance/components/dialogs/FinanceLimitDialog.tsx',
  '../../modules/finance/components/dialogs/FinanceTagDialog.tsx',
  '../../modules/finance/components/dialogs/FinanceTemplateDialog.tsx',
  '../../modules/finance/components/dialogs/FinanceTransactionDialog.tsx'
]

describe('shared dialog architecture', () => {
  it('keeps Radix dialog primitives inside shared UI instead of feature modules', () => {
    for (const relativePath of moduleDialogFiles) {
      const source = readFileSync(new URL(relativePath, import.meta.url), 'utf8')
      expect(source, relativePath).not.toMatch(/@radix-ui\/react-(?:alert-)?dialog/)
    }
  })

  it('uses the shared dialog shell for the transition blocker in study', () => {
    const source = readFileSync(new URL('../../modules/study/StudyPage.tsx', import.meta.url), 'utf8')
    expect(source).toContain('StudyBlockedTransitionDialog')
    expect(source).not.toContain('aria-labelledby="study-transition-error-title"')
  })
})
