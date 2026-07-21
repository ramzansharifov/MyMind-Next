import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const focusModeStyles = readFileSync(new URL('./focus-mode.css', import.meta.url), 'utf8')

describe('focus-mode header action ordering', () => {
  it('places the internal-link return action before material rename or focus exit', () => {
    expect(focusModeStyles).toContain(
      "button[aria-label='Вернуться к внутренней ссылке']"
    )
    expect(focusModeStyles).toContain("button[aria-label='Переименовать материал']")
    expect(focusModeStyles).toContain("button[aria-label='Выйти из режима фокуса']")
    expect(focusModeStyles).toMatch(
      /button\[aria-label='Вернуться к внутренней ссылке'\][\s\S]*?order: 1;/
    )
  })

  it('places the board return action before board rename or focus exit', () => {
    expect(focusModeStyles).toContain("button[aria-label='Назад к материалу']")
    expect(focusModeStyles).toContain("button[aria-label='Переименовать доску']")
    expect(focusModeStyles).toMatch(/button\[aria-label='Назад к материалу'\][\s\S]*?order: 1;/)
  })
})
