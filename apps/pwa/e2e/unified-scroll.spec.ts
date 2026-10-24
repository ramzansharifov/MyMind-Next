import { test, expect, open } from './helpers'
import type { Page } from '@playwright/test'

/** A scrollable ancestor must belong to the module, not an unrelated popup or the browser body. */
async function moduleScrollAncestor(
  page: Page,
  label: string | RegExp,
  role: 'button' | 'tab' = 'button'
): Promise<boolean> {
  const control = page.locator('.module').getByRole(role, { name: label }).first()
  await expect(control).toBeVisible()
  return control.evaluate((element) => {
    const module = element.closest('.module')
    for (
      let parent = element.parentElement;
      parent && parent !== module;
      parent = parent.parentElement
    ) {
      const overflow = getComputedStyle(parent).overflowY
      if (overflow === 'auto' || overflow === 'scroll') return true
    }
    return false
  })
}

test('calendar grid and day events share a single vertical scroll on a short phone', async ({
  page,
  browserName
}) => {
  await page.setViewportSize({ width: 390, height: 480 })
  await open(page, 'calendar')
  const today = page.locator('.module').getByRole('button', { name: 'Сегодня', exact: true })
  await expect(today).toBeVisible()
  expect(await moduleScrollAncestor(page, 'Сегодня')).toBe(true)

  const before = await today.evaluate((element) => element.getBoundingClientRect().top)
  const scroll = async (delta: number): Promise<void> => {
    if (browserName !== 'webkit') {
      await page.mouse.move(180, 325)
      await page.mouse.wheel(0, delta)
      return
    }
    // Playwright cannot inject wheel events into mobile WebKit. Check actual DOM
    // scrolling and resulting geometry there; trusted touch is covered in Chrome.
    await today.evaluate((element, amount) => {
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (['auto', 'scroll'].includes(getComputedStyle(parent).overflowY)) {
          parent.scrollTop += amount
          return
        }
      }
      throw new Error('Calendar has no scroll container')
    }, delta)
  }
  await scroll(650)
  await expect
    .poll(() => today.evaluate((element) => element.getBoundingClientRect().top))
    .toBeLessThan(before - 40)

  await scroll(-900)
  await expect(today).toBeInViewport()
  await page.getByRole('button', { name: 'Следующий месяц', exact: true }).click()
  await expect(page.locator('.module')).toContainText('Выбранный день')
})

test('tasks, habits, finance and nutrition put their top controls inside their main scroll', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 520 })
  for (const [route, label] of [
    ['tasks', /Группы/],
    ['habits', /Группы/],
    ['finance', 'Главная'],
    ['nutrition', 'Сегодня']
  ] as const) {
    await open(page, route)
    await expect
      .poll(
        () =>
          moduleScrollAncestor(
            page,
            label,
            route === 'finance' || route === 'nutrition' ? 'tab' : 'button'
          ),
        { message: `${route}: header must move with list` }
      )
      .toBe(true)
  }
})
