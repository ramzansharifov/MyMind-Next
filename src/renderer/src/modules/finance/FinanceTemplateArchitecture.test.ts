import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

function expectRegisteredNumberInput(source: string, field: string): void {
  expect(source).toMatch(
    new RegExp(`register\\('${field}'\\)[\\s\\S]{0,180}?type=\\"number\\"`)
  )
}

describe('finance template architecture', () => {
  it('uses card pickers and contains no scheduling or reminder controls', () => {
    const dialog = read(
      'src/renderer/src/modules/finance/components/dialogs/FinanceTemplateDialog.tsx'
    )
    const templates = read('src/renderer/src/modules/finance/components/FinanceTemplates.tsx')
    const home = read('src/renderer/src/modules/finance/components/FinanceHome.tsx')

    expect(dialog).toContain('FinanceOperationTypePicker')
    expect(dialog).toContain('FinanceAccountCardPicker')
    expect(dialog).toContain('FinanceTagCardPicker')
    expect(dialog).not.toContain('label="Расписание"')
    expect(dialog).not.toContain('Напоминать о приближении операции')
    expect(dialog).not.toContain("register('scheduleType')")
    expect(dialog).not.toContain("register('nextOccurrenceAt')")
    expect(templates).not.toContain('Следующая:')
    expect(templates).not.toContain('Возобновить')
    expect(home).not.toContain('Предстоящие операции')
    expect(home).not.toContain('регулярных операций')
  })

  it('uses native number inputs for every user-facing money field', () => {
    const account = read(
      'src/renderer/src/modules/finance/components/dialogs/FinanceAccountDialog.tsx'
    )
    const transaction = read(
      'src/renderer/src/modules/finance/components/dialogs/FinanceTransactionDialog.tsx'
    )
    const template = read(
      'src/renderer/src/modules/finance/components/dialogs/FinanceTemplateDialog.tsx'
    )
    const limit = read(
      'src/renderer/src/modules/finance/components/dialogs/FinanceLimitDialog.tsx'
    )

    expectRegisteredNumberInput(account, 'initialBalance')
    expectRegisteredNumberInput(transaction, 'amount')
    expectRegisteredNumberInput(template, 'sourceAmount')
    expectRegisteredNumberInput(limit, 'amount')
  })
})
