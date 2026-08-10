import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

function expectRegisteredNumberInput(source: string, field: string): void {
  expect(source).toMatch(new RegExp(`register\\('${field}'\\)[\\s\\S]{0,180}?type=\\"number\\"`))
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

  it('removes scheduling, reminders and template state from contracts, IPC and SQLite', () => {
    const contract = read('src/shared/contracts/finance.ts')
    const ipc = read('src/main/ipc/register-finance-ipc.ts')
    const schema = read('src/main/database/schema/finance.ts')
    const migration = read('drizzle/0015_simplify_finance_templates_limits.sql')
    const templateContract = contract.match(/export interface FinanceTemplate \{[\s\S]*?\n\}/)?.[0]
    const templateSchema = schema.match(
      /export const financeTransactionTemplates = sqliteTable\([\s\S]*?\n\)\n\nexport const financeTransactions/
    )?.[0]

    expect(templateContract).toBeDefined()
    for (const legacyField of [
      'scheduleType',
      'scheduleInterval',
      'nextOccurrenceAt',
      'reminderEnabled',
      'state:',
      'lastUsedAt'
    ]) {
      expect(templateContract).not.toContain(legacyField)
    }
    expect(templateSchema).toBeDefined()
    expect(templateSchema).not.toContain('scheduleType')
    expect(templateSchema).not.toContain('reminderEnabled')
    expect(templateSchema).not.toContain('lastUsedAt')
    expect(contract).not.toContain('setTemplateState:')
    expect(contract).not.toContain('snoozeTemplate:')
    expect(contract).not.toContain('skipTemplate:')
    expect(ipc).not.toContain('setTemplateStateInputSchema')
    expect(ipc).not.toContain('snoozeFinanceTemplateInputSchema')
    expect(migration).toContain('DROP COLUMN `schedule_type`')
    expect(migration).toContain('DROP COLUMN `reminder_enabled`')
    expect(migration).toContain('DROP COLUMN `state`')
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
    const limit = read('src/renderer/src/modules/finance/components/dialogs/FinanceLimitDialog.tsx')

    expectRegisteredNumberInput(account, 'initialBalance')
    expectRegisteredNumberInput(transaction, 'amount')
    expectRegisteredNumberInput(template, 'sourceAmount')
    expectRegisteredNumberInput(limit, 'amount')
  })
})
