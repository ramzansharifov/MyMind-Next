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
})
