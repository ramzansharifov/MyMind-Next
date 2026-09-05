import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('finance limit architecture', () => {
  it('keeps legacy fields and independent names out of the user-facing limit form', () => {
    const dialog = read(
      'src/renderer/src/modules/finance/components/dialogs/FinanceLimitDialog.tsx'
    )

    expect(dialog).not.toContain('label="Название"')
    expect(dialog).not.toContain("register('name')")
    expect(dialog).not.toContain('Дата начала')
    expect(dialog).not.toContain('Область действия')
    expect(dialog).not.toContain('Собственный диапазон')
    expect(dialog).not.toContain("register('startsAt')")
    expect(dialog).not.toContain("register('currencyCode')")
    expect(dialog).toContain('FinanceLimitAccountPicker')
    expect(dialog).toContain('FinanceTagCardPicker')
  })

  it('does not keep an independent limit name in the public contract or database schema', () => {
    const contract = read('src/shared/contracts/finance.ts')
    const schema = read('src/main/database/schema/finance.ts')
    const migration = read('drizzle/0015_simplify_finance_templates_limits.sql')
    const financeLimitContract = contract.match(/export interface FinanceLimit \{[\s\S]*?\n\}/)?.[0]
    const financeLimitSchema = schema.match(
      /export const financeLimits = sqliteTable\([\s\S]*?\n\)\n\nexport const financeLimitAccounts/
    )?.[0]

    expect(financeLimitContract).toBeDefined()
    expect(financeLimitContract).not.toContain('name:')
    expect(financeLimitSchema).toBeDefined()
    expect(financeLimitSchema).not.toContain("name: text('name')")
    expect(migration).toContain('ALTER TABLE `finance_limits` DROP COLUMN `name`')
  })

  it('persists multi-account selections through a dedicated relation table', () => {
    const migration = read('drizzle/0014_finance_limit_accounts.sql')
    const schema = read('src/main/database/schema/finance.ts')

    expect(migration).toContain('CREATE TABLE `finance_limit_accounts`')
    expect(migration).toContain('INSERT OR IGNORE INTO `finance_limit_accounts`')
    expect(schema).toContain("sqliteTable(\n  'finance_limit_accounts'")
  })
})
