import { test as base, expect, type Page } from '@playwright/test'

export const test = base.extend<{ healthy: void }>({
  healthy: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await use()
      expect(errors, 'uncaught browser errors').toEqual([])
    },
    { auto: true }
  ]
})
export { expect }
export async function navigate(page: Page, route: string): Promise<void> {
  const link = page.locator(`nav a[href="#${route}"]`)
  await expect(link).toBeAttached()
  if (!(await link.isVisible()))
    await page.getByRole('button', { name: 'Открыть меню навигации', exact: true }).click()
  await link.click()
  await expect(page.locator('.module')).toBeVisible()
}
export async function storedAssets(page: Page): Promise<Array<{ path: string; size: number }>> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('mymind-pwa-v1')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction('assets', 'readonly'),
            rows = tx.objectStore('assets').getAll()
          tx.oncomplete = () => {
            db.close()
            resolve(
              rows.result.map(
                (asset: { path: string; blob?: Blob; data?: { bytes: Uint8Array } }) => ({
                  path: asset.path,
                  size: asset.blob?.size ?? asset.data!.bytes.byteLength
                })
              )
            )
          }
          tx.onabort = () => {
            db.close()
            reject(tx.error)
          }
        }
      })
  )
}
export async function open(page: Page, route: string): Promise<void> {
  await page.goto(`/#${route}`)
  // Hash navigation keeps the same JS runtime; force a new document to test durable storage.
  await page.reload()
  await expect(page.locator('.module')).toBeVisible()
  await expect(page.locator('.save-status')).toHaveText('Сохранено на устройстве')
}
export async function save(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Сохранить', exact: true })).toHaveCount(0)
  await expect(page.locator('.save-status')).toHaveText('Сохранено на устройстве')
}
export async function confirmRemoval(page: Page, label = 'Удалить'): Promise<void> {
  await page.getByRole('button', { name: label, exact: true }).click()
  await page.getByRole('button', { name: 'Удалить', exact: true }).last().click()
  await expect(page.getByRole('button', { name: 'Удалить', exact: true })).toHaveCount(0)
}
