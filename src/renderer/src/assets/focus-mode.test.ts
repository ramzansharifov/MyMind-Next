import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const focusModeStyles = readFileSync(new URL('./focus-mode.css', import.meta.url), 'utf8')

describe('focus-mode header action ordering', () => {
  it('places the internal-link return action before material rename or focus exit', () => {
    expect(focusModeStyles).toMatch(
      /header:has\(> button\[aria-label='Вернуться к внутренней ссылке'\]\)[\s\S]*?> button\[aria-label='Вернуться к внутренней ссылке'\][\s\S]*?order: 1;/
    )
    expect(focusModeStyles).toMatch(
      /header:has\(> button\[aria-label='Вернуться к внутренней ссылке'\]\)[\s\S]*?> button\[aria-label='Переименовать материал'\][\s\S]*?order: 2;/
    )
    expect(focusModeStyles).toMatch(
      /header:has\(> button\[aria-label='Вернуться к внутренней ссылке'\]\)[\s\S]*?> button\[aria-label='Выйти из режима фокуса'\][\s\S]*?order: 2;/
    )
  })

  it('places the board return action before board rename or focus exit', () => {
    expect(focusModeStyles).toMatch(
      /header:has\(> button\[aria-label='Назад к материалу'\]\)[\s\S]*?> button\[aria-label='Назад к материалу'\][\s\S]*?order: 1;/
    )
    expect(focusModeStyles).toMatch(
      /header:has\(> button\[aria-label='Назад к материалу'\]\)[\s\S]*?> button\[aria-label='Переименовать доску'\][\s\S]*?order: 2;/
    )
  })

  it('does not reorder regular headers without a return action', () => {
    expect(focusModeStyles).not.toContain(
      "[data-study-material-focus='false']\n  > header\n  > button[aria-label='Переименовать материал']"
    )
    expect(focusModeStyles).not.toContain(
      "[data-board-workspace-focus='false'] > header > button[aria-label='Переименовать доску']"
    )
  })
})
