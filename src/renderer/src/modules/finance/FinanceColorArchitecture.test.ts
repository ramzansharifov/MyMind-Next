import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

function interfaceBlock(source: string, name: string): string {
  const match = source.match(new RegExp(`export interface ${name} \\{[\\s\\S]*?\\n\\}`))
  expect(match, `${name} interface`).not.toBeNull()
  return match?.[0] ?? ''
}

describe('finance color architecture', () => {
  it('keeps account color out of contracts, validation, storage and renderer payloads', () => {
    const contract = read('src/shared/contracts/finance.ts')
    const validation = read('src/shared/validation/finance.ts')
    const schema = read('src/main/database/schema/finance.ts')
    const repository = read('src/main/repositories/finance.repository.ts')
    const dialog = read(
      'src/renderer/src/modules/finance/components/dialogs/FinanceAccountDialog.tsx'
    )
    const limitPicker = read(
      'src/renderer/src/modules/finance/components/FinanceLimitAccountPicker.tsx'
    )

    expect(interfaceBlock(contract, 'FinanceAccount')).not.toContain('color:')
    expect(interfaceBlock(contract, 'CreateFinanceAccountInput')).not.toContain('color:')
    expect(interfaceBlock(contract, 'UpdateFinanceAccountInput')).not.toContain('color:')
    expect(validation).not.toContain('financeColorSchema')
    expect(schema.match(/export const financeAccounts = sqliteTable\([\s\S]*?\n\)/)?.[0]).not.toContain(
      "color: text('color')"
    )
    expect(repository).not.toContain('input.color')
    expect(dialog).not.toContain('DEFAULT_ACCOUNT_COLOR')
    expect(dialog).not.toContain('account.color')
    expect(limitPicker).not.toContain('account.color')
  })

  it('accepts no custom tag color and derives the three semantic colors only from tag type', () => {
    const contract = read('src/shared/contracts/finance.ts')
    const schema = read('src/main/database/schema/finance.ts')
    const repository = read('src/main/repositories/finance.repository.ts')
    const dialog = read('src/renderer/src/modules/finance/components/dialogs/FinanceTagDialog.tsx')
    const migration = read('drizzle/0017_finance_system_tag_colors.sql')

    expect(interfaceBlock(contract, 'CreateFinanceTagInput')).not.toContain('color:')
    expect(interfaceBlock(contract, 'UpdateFinanceTagInput')).not.toContain('color:')
    expect(contract).toContain("income: '#34d399'")
    expect(contract).toContain("expense: '#f87171'")
    expect(contract).toContain("both: '#fbbf24'")
    expect(schema.match(/export const financeTags = sqliteTable\([\s\S]*?\n\)/)?.[0]).not.toContain(
      "color: text('color')"
    )
    expect(repository).toContain('getFinanceTagColor(row.type)')
    expect(repository).toContain('getFinanceTagColor(input.type)')
    expect(dialog).not.toContain('ColorPicker')
    expect(dialog).not.toContain("name=\"color\"")
    expect(migration).toContain('ALTER TABLE `finance_accounts` DROP COLUMN `color`')
    expect(migration).toContain('ALTER TABLE `finance_tags` DROP COLUMN `color`')
  })
})
