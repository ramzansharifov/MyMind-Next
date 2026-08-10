import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

function interfaceBlock(source: string, name: string): string {
  const match = source.match(new RegExp(`export interface ${name}[^\\{]*\\{[\\s\\S]*?\\n\\}`))
  expect(match, `${name} interface`).not.toBeNull()
  return match?.[0] ?? ''
}

describe('diary architecture', () => {
  it('keeps diary color out of contracts, storage and forms', () => {
    const contract = read('src/shared/contracts/diary.ts')
    const schema = read('src/main/database/schema/diary.ts')
    const dialog = read('src/renderer/src/modules/diary/components/DiaryDialog.tsx')

    expect(interfaceBlock(contract, 'DiarySummary')).not.toContain('color')
    expect(interfaceBlock(contract, 'CreateDiaryInput')).not.toContain('color')
    expect(schema).not.toContain("color: text('color')")
    expect(dialog).not.toContain('ColorPicker')
    expect(dialog).not.toContain('name="color"')
  })

  it('enforces one page per diary and local calendar day in SQLite', () => {
    const schema = read('src/main/database/schema/diary.ts')
    const migration = read('drizzle/0018_diary_module.sql')

    expect(schema).toContain(
      "uniqueIndex('diary_days_diary_day_uq').on(table.diaryId, table.dayKey)"
    )
    expect(migration).toContain(
      'CREATE UNIQUE INDEX `diary_days_diary_day_uq` ON `diary_days` (`diary_id`,`day_key`)'
    )
  })

  it('seeds a default diary and cascades its pages and entries', () => {
    const migration = read('drizzle/0018_diary_module.sql')

    expect(migration).toContain("'diary-default'")
    expect(migration).toContain("'Личный дневник'")
    expect(migration.match(/ON DELETE cascade/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('keeps reader and editor text on one shared ruled-paper rhythm', () => {
    const css = read('src/renderer/src/modules/diary/diary.css')
    const reader = read('src/renderer/src/modules/diary/components/DiaryReader.tsx')
    const today = read('src/renderer/src/modules/diary/components/DiaryToday.tsx')

    expect(css).toContain('--diary-rule-step: 36px')
    expect(css).toContain('--diary-rule-baseline: 27px')
    expect(css.match(/line-height: var\(--diary-rule-step\)/g)?.length).toBeGreaterThanOrEqual(4)
    expect(reader).toContain('diary-ruled-surface')
    expect(reader).toContain('diary-entry-row')
    expect(today).toContain('diary-ruled-surface')
    expect(today).toContain('diary-composer-input')
    expect(reader).not.toContain('leading-8')
    expect(today).not.toContain('leading-8')
  })
})
