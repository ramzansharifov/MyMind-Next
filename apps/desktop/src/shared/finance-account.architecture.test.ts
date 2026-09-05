import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const forbiddenAccountTypeSymbols = [
  'FINANCE_ACCOUNT_TYPES',
  'FinanceAccountType',
  'financeAccountTypeLabels'
]

function sourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(entry) ? [path] : []
  })
}

describe('finance account architecture', () => {
  it('does not expose account type as a domain or UI concept', () => {
    const root = resolve(process.cwd(), 'src')
    const thisFile = resolve(root, 'shared/finance-account.architecture.test.ts')
    const offenders = sourceFiles(root)
      .filter((path) => path !== thisFile)
      .flatMap((path) => {
        const content = readFileSync(path, 'utf8')
        return forbiddenAccountTypeSymbols
          .filter((symbol) => content.includes(symbol))
          .map((symbol) => `${path}: ${symbol}`)
      })

    expect(offenders).toEqual([])
  })

  it('removes type from the latest finance account database snapshot', () => {
    const snapshot = JSON.parse(
      readFileSync(resolve(process.cwd(), 'drizzle/meta/0013_snapshot.json'), 'utf8')
    ) as {
      tables: Record<string, { columns: Record<string, unknown>; indexes: Record<string, unknown> }>
    }
    const accounts = snapshot.tables.finance_accounts

    expect(accounts).toBeDefined()
    expect(accounts.columns).not.toHaveProperty('type')
    expect(accounts.indexes).not.toHaveProperty('finance_accounts_type_idx')
  })
})
