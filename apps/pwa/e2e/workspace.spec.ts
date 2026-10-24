import { readFile } from 'node:fs/promises'
import { test, expect, open, navigate, createNote, localData } from './helpers'
import { navigationRoutes, routeTitles } from '../src/components/navigation'

test('every Android route opens offline without desktop screens or horizontal overflow', async ({
  page,
  context
}) => {
  await open(page, 'home')
  await expect(page.locator('.connection')).toHaveText('Готово к офлайн', { timeout: 45000 })
  await page.reload()
  await context.setOffline(true)
  await page.reload()
  for (const route of navigationRoutes) {
    await navigate(page, route)
    await expect(page.locator('.app-header')).toContainText(routeTitles[route])
    await expect(page.locator('.module .pwa-loading')).toHaveCount(0)
    await expect(page.locator('.desktop-module')).toHaveCount(0)
    await expect(page.locator('.workspace [role=alert]')).toHaveCount(0)
  }
})

test('PWA module screens fit small, phone and landscape viewports offline', async ({
  page,
  context
}) => {
  await open(page, 'home')
  await expect(page.locator('.connection')).toHaveText('Готово к офлайн', { timeout: 45000 })
  await page.reload()
  await context.setOffline(true)
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 }
  ]) {
    await page.setViewportSize(viewport)
    for (const route of navigationRoutes) {
      await open(page, route)
      await expect(page.locator('.module .pwa-loading')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        viewport.width
      )
      await page.screenshot({
        path:
          '.data/parity-' + test.info().project.name + '-' + viewport.width + '-' + route + '.png',
        animations: 'disabled'
      })
    }
  }
})

test('rich note survives reload and a real backup download/restore roundtrip', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/#notes')
  await createNote(page, 'PWA browser persistence')
  await expect(page.locator('.notes-editor')).toBeVisible()
  await page.locator('.notes-editor').fill('Saved locally in the full editor')
  await navigate(page, 'home')
  await expect(page.locator('.save-status')).toHaveText('Сохранено на устройстве')
  await page.reload()
  await navigate(page, 'notes')
  await page.getByText('PWA browser persistence', { exact: true }).first().click()
  await expect(page.locator('.notes-editor')).toContainText('Saved locally in the full editor')
  await localData(page)
  const downloading = page.waitForEvent('download', { timeout: 10_000 })
  await page.getByRole('button', { name: 'Создать backup', exact: true }).click()
  const backup = await downloading
  const backupPath = await backup.path()
  expect(backupPath).toBeTruthy()

  // Verify the downloaded file, not just its header. The check must not
  // replace the live database; invalid files must also leave it unchanged.
  const checked = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Проверить резервную копию', exact: true }).click()
  await (await checked).setFiles(backupPath!)
  await expect(page.getByText(/Резервная копия проверена:/)).toBeVisible()

  const bytes = Buffer.from(await readFile(backupPath!))
  bytes[bytes.length - 1] ^= 1
  const invalid = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Проверить резервную копию', exact: true }).click()
  const invalidChooser = await invalid
  await invalidChooser.setFiles({
    name: 'bad.mymindbackup',
    mimeType: 'application/octet-stream',
    buffer: bytes
  })
  await expect(page.getByText(/Резервная копия повреждена:/)).toBeVisible()

  await navigate(page, 'notes')
  await page.getByText('PWA browser persistence', { exact: true }).first().click()
  await page.locator('.notes-editor').fill('Changed after backup')
  await localData(page)
  await page.getByRole('button', { name: 'Восстановить из файла', exact: true }).click()
  const choosing = page.waitForEvent('filechooser', { timeout: 10_000 })
  await page.getByRole('button', { name: 'Выбрать файл', exact: true }).click()
  await (await choosing).setFiles(backupPath!)
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page.locator('.workspace')).toHaveAttribute('aria-busy', 'false')
  await navigate(page, 'notes')
  await page.getByText('PWA browser persistence', { exact: true }).first().click()
  await expect(page.locator('.notes-editor')).toContainText('Saved locally in the full editor')
  expect(errors).toEqual([])
})
