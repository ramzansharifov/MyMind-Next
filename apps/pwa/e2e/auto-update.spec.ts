import { test, expect, open } from './helpers'

test('installed PWA checks for new site versions at launch and on return without reloading', async ({
  page
}) => {
  await page.addInitScript(() => {
    const original = ServiceWorkerRegistration.prototype.update
    ServiceWorkerRegistration.prototype.update = function () {
      const target = window as typeof window & { __pwaUpdateChecks?: number }
      target.__pwaUpdateChecks = (target.__pwaUpdateChecks ?? 0) + 1
      return original.call(this)
    }
  })

  await open(page, 'home')
  const checks = (): Promise<number> =>
    page.evaluate(
      () => (window as typeof window & { __pwaUpdateChecks?: number }).__pwaUpdateChecks ?? 0
    )
  await expect.poll(checks).toBeGreaterThan(0)

  const initialChecks = await checks()
  // Foreground checks are throttled so an active installation does not poll
  // repeatedly as the user switches quickly between apps.
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect.poll(checks).toBe(initialChecks)

  // Simulate the next foreground event after the throttle window.
  await page.evaluate(() => {
    const original = Date.now
    Date.now = () => original() + 61_000
    window.dispatchEvent(new Event('focus'))
    Date.now = original
  })
  await expect.poll(checks).toBe(initialChecks + 1)
  await expect(page.locator('.save-status')).toHaveText('Сохранено на устройстве')
})
