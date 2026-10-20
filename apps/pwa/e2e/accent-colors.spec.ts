import { test, expect, open } from './helpers'

const accents = [
  { name: 'Синий', hex: '#3b82f6' },
  { name: 'Изумрудный', hex: '#10b981' },
  { name: 'Розовый', hex: '#f43f5e' }
] as const

async function setAccent(page: import('@playwright/test').Page, name: string): Promise<void> {
  await open(page, 'settings')
  await page.getByRole('button', { name: 'Внешний вид', exact: true }).click()
  await page.getByRole('button', { name, exact: true }).click()
  await expect(page.locator('.save-status')).toHaveText('Сохранено на устройстве')
}

test('selected accent reaches document-level portal controls and persists across restart', async ({
  page
}) => {
  for (const accent of accents) {
    await setAccent(page, accent.name)
    await expect
      .poll(() =>
        page.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
        )
      )
      .toBe(accent.hex)
    await expect(page.locator('.pwa')).toHaveCSS('--accent', accent.hex)
    await open(page, 'movies')
    await page.getByRole('button', { name: 'Добавить фильм', exact: true }).click()
    const dialog = page.getByRole('dialog').last()
    await expect(dialog).toBeVisible()
    await expect
      .poll(() =>
        dialog.evaluate((element) => getComputedStyle(element).getPropertyValue('--accent').trim())
      )
      .toBe(accent.hex)
  }
  await page.reload()
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
      )
    )
    .toBe('#f43f5e')
})

test('movie watchlist badge follows the selected accent instead of fixed purple', async ({
  page
}) => {
  await setAccent(page, 'Изумрудный')
  await open(page, 'movies')
  await page.getByRole('button', { name: 'Добавить фильм', exact: true }).click()
  await page.getByRole('button', { name: 'Из JSON', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'JSON фильмов', exact: true })
    .fill(JSON.stringify([{ title: 'Accent test movie', year: 2026, genres: ['Драма'] }]))
  await page.getByRole('button', { name: 'Применить JSON', exact: true }).click()
  const badge = page.getByText('Хочу посмотреть', { exact: true }).first()
  await expect(badge).toBeVisible()
  await expect(badge).toHaveCSS('color', 'rgb(16, 185, 129)')
})
