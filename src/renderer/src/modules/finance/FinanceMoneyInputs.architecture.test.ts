import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const moneyFields = [
  ['components/dialogs/FinanceAccountDialog.tsx', 'initialBalance'],
  ['components/dialogs/FinanceTransactionDialog.tsx', 'amount'],
  ['components/dialogs/FinanceTransactionDialog.tsx', 'destinationAmount'],
  ['components/dialogs/FinanceTemplateDialog.tsx', 'sourceAmount'],
  ['components/dialogs/FinanceTemplateDialog.tsx', 'destinationAmount'],
  ['components/dialogs/FinanceLimitDialog.tsx', 'amount']
] as const

function inputForField(content: string, field: string): string | undefined {
  return (content.match(/<input[\s\S]*?\/>/g) ?? []).find((input) =>
    input.includes(`register('${field}')`)
  )
}

describe('finance money inputs', () => {
  it('uses numeric HTML inputs for every editable money amount', () => {
    const financeRoot = resolve(process.cwd(), 'src/renderer/src/modules/finance')

    for (const [relativePath, field] of moneyFields) {
      const content = readFileSync(resolve(financeRoot, relativePath), 'utf8')
      const input = inputForField(content, field)

      expect(input, `${relativePath}: ${field}`).toBeDefined()
      expect(input, `${relativePath}: ${field}`).toContain('type="number"')
      expect(input, `${relativePath}: ${field}`).toContain('inputMode="decimal"')
    }
  })
})
