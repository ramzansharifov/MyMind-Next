import { test as base, expect, type Page } from '@playwright/test'
import { routeTitles, type Route } from '../src/components/navigation'

export const test = base.extend<{ healthy: void }>({
  healthy: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (message.type() !== 'error') return
        // The profile scenario deliberately requests the disabled LAN endpoint (503).
        if (message.location().url.includes('/api/lan-sync/') && message.text().includes('503'))
          return
        errors.push(`${message.location().url}: ${message.text()}`)
      })
      await use()
      expect(errors, 'uncaught browser errors').toEqual([])
    },
    { auto: true }
  ]
})
export { expect }
let formScreenshot = 0
export async function navigate(page: Page, route: string): Promise<void> {
  const menu = page.getByRole('button', { name: 'Открыть меню навигации', exact: true })
  const back = page.getByRole('button', { name: 'Назад', exact: true })
  // RN Modal hides the underlying screen until its exit animation finishes.
  await expect(menu.or(back).first()).toBeVisible()
  if (await back.isVisible()) await back.click()
  await expect(menu).toBeVisible()
  await menu.click()
  await page
    .getByRole('button', { name: routeTitles[route as Route], exact: true })
    .last()
    .click()
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
  // A distinct document URL avoids racing an old runtime's guarded hash listener during backup.
  // The origin and IndexedDB are unchanged; this must test a genuinely new application runtime.
  await page.goto(`/?runtime=${crypto.randomUUID()}#${route}`)
  await expect(page.locator('.module')).toBeVisible()
  await expect(page.locator('.save-status')).toHaveText('Сохранено на устройстве')
}
export async function save(page: Page): Promise<void> {
  await expect(page.getByRole('dialog').last()).toBeVisible()
  await page.screenshot({
    path: `.data/pwa-forms/${test.info().project.name}-${test
      .info()
      .title.replace(/[^a-z0-9-]+/gi, '-')
      .slice(0, 70)}-${formScreenshot++}.png`,
    animations: 'disabled'
  })
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Сохранить', exact: true })).toHaveCount(0)
  await expect(page.locator('.save-status')).toHaveText('Сохранено на устройстве')
}
export async function createNote(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.getByRole('button', { name: 'Новая заметка', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill(title)
  await save(page)
  await expect(page.locator('.notes-editor')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Форматирование текста', exact: true })
  ).toBeInViewport()
}
export async function localData(page: Page): Promise<void> {
  await navigate(page, 'settings')
  await page.getByRole('button', { name: 'Локальные данные', exact: true }).click()
}
export async function confirmRemoval(page: Page, label = 'Удалить'): Promise<void> {
  await page.getByRole('button', { name: label, exact: true }).click()
  await page.getByRole('button', { name: 'Удалить', exact: true }).last().click()
  await expect(page.getByRole('button', { name: 'Удалить', exact: true })).toHaveCount(0)
}
