import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('finance limit architecture', () => {
  it('keeps legacy date fields out of the user-facing limit form', () => {
    const dialog = readFileSync(
      resolve(
        process.cwd(),
        'src/renderer/src/modules/finance/components/dialogs/FinanceLimitDialog.tsx'
      ),
      'utf8'
    )

    expect(dialog).not.toContain('Дата начала')
    expect(dialog).not.toContain('Область действия')
    expect(dialog).not.toContain('Собственный диапазон')
    expect(dialog).not.toContain("register('startsAt')")
    expect(dialog).not.toContain("register('currencyCode')")
    expect(dialog).toContain('FinanceLimitAccountPicker')
    expect(dialog).toContain('FinanceTagCardPicker')
  })

  it('persists multi-account selections through a dedicated relation table', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'drizzle/0014_finance_limit_accounts.sql'),
      'utf8'
    )
    const schema = readFileSync(
      resolve(process.cwd(), 'src/main/database/schema/finance.ts'),
      'utf8'
    )

    expect(migration).toContain('CREATE TABLE `finance_limit_accounts`')
    expect(migration).toContain('INSERT OR IGNORE INTO `finance_limit_accounts`')
    expect(schema).toContain("sqliteTable(\n  'finance_limit_accounts'")
  })
})
