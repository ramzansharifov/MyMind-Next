import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const moneyFields = [
  ['components/dialogs/FinanceAccountDialog.tsx', 'initialBalance'],
  ['components/dialogs/FinanceTransactionDialog.tsx', 'amount'],
  ['components/dialogs/FinanceTemplateDialog.tsx', 'sourceAmount'],
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

  it('keeps transfers on a single editable amount in transactions and templates', () => {
    const financeRoot = resolve(process.cwd(), 'src/renderer/src/modules/finance')
    const transactionDialog = readFileSync(
      resolve(financeRoot, 'components/dialogs/FinanceTransactionDialog.tsx'),
      'utf8'
    )
    const templateDialog = readFileSync(
      resolve(financeRoot, 'components/dialogs/FinanceTemplateDialog.tsx'),
      'utf8'
    )

    expect(transactionDialog).not.toContain("register('destinationAmount')")
    expect(transactionDialog).not.toContain('Сумма зачисления')
    expect(transactionDialog).not.toContain('Сумма списания')
    expect(templateDialog).not.toContain("register('destinationAmount')")
    expect(templateDialog).not.toContain('Сумма зачисления')
    expect(templateDialog).not.toContain('Сумма списания')
  })
})
