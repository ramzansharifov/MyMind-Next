import { test, expect, open } from './helpers'

const themes = [
  { label: 'Светлая', color: '#eef2f6', rgb: 'rgb(238, 242, 246)', scheme: 'light' },
  { label: 'Тёмная', color: '#0a0b0d', rgb: 'rgb(10, 11, 13)', scheme: 'dark' }
] as const

test('browser and system bars match selected appearance across navigation and restart', async ({
  page
}) => {
  await open(page, 'settings')
  await page.getByRole('button', { name: 'Внешний вид', exact: true }).click()

  for (const theme of themes) {
    await page.getByRole('button', { name: theme.label, exact: true }).click()
    await expect
      .poll(() =>
        page.evaluate(() => ({
          html: getComputedStyle(document.documentElement).backgroundColor,
          body: getComputedStyle(document.body).backgroundColor,
          app: getComputedStyle(document.querySelector('.pwa')!).backgroundColor,
          scheme: getComputedStyle(document.documentElement).colorScheme,
          meta: document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content
        }))
      )
      .toEqual({
        html: theme.rgb,
        body: theme.rgb,
        app: theme.rgb,
        scheme: theme.scheme,
        meta: theme.color
      })
  }

  await open(page, 'calendar')
  await page.reload()
  await expect(page.locator('.save-status')).toHaveText('Сохранено на устройстве')
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe('rgb(10, 11, 13)')
})

test('PWA manifest and initial theme use matching, non-purple background', async ({ page }) => {
  const response = await page.request.get('/manifest.webmanifest')
  expect(response.ok()).toBe(true)
  const manifest = await response.json()
  expect(manifest.background_color).toBe('#0a0b0d')
  expect(manifest.theme_color).toBe('#0a0b0d')
  await open(page, 'home')
  await expect(page.locator('.pwa')).toHaveCSS('background-color', 'rgb(10, 11, 13)')
  await expect(page.locator('.module')).toBeVisible()
})
