import { test, expect } from '@playwright/test'
import { navigate, createNote, localData } from './helpers'
import { routeTitles, type Route } from '../src/components/navigation'

test('study editor and drawing canvas work offline and keep their content', async ({
  page,
  context
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/#study')
  await expect(page.locator('.connection')).toHaveText('Готово к офлайн', { timeout: 45_000 })
  await page.reload()
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Новый материал', exact: true }).click()
  await expect(page.getByRole('tablist', { name: 'Режим материала' })).toBeVisible()
  await page.getByRole('tab', { name: 'Код', exact: true }).click()
  await expect(page.locator('.workspace textarea').first()).toBeVisible()
  await navigate(page, 'boards')
  await page.getByRole('button', { name: 'Новая доска', exact: true }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').fill('Offline drawing')
  await dialog.getByRole('button', { name: /Бесконечная/ }).click()
  await dialog.getByRole('button', { name: 'Создать', exact: true }).click()
  await expect(page.locator('.tl-container')).toBeVisible()
  await expect(page.locator('.workspace [role="alert"]')).toHaveCount(0)
  const canvas = await page.locator('.tl-container').boundingBox()
  const x = canvas!.x + canvas!.width / 2,
    y = canvas!.y + canvas!.height / 2
  await page.mouse.click(x, y)
  await page.keyboard.press('r')
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 100, y + 80, { steps: 10 })
  await page.mouse.up()
  await expect(page.locator('.tl-shape')).toHaveCount(1)
  await navigate(page, 'home')
  await page.reload()
  await navigate(page, 'boards')
  await page.getByText('Offline drawing', { exact: true }).first().click()
  await expect(page.locator('.tl-shape')).toHaveCount(1)
  expect(errors).toEqual([])
})

test('all modules open from the production offline cache, including full editors', async ({
  page,
  context
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('.save-status')).toHaveText('Сохранено на устройстве')
  await expect(page.locator('.connection')).toHaveText('Готово к офлайн', { timeout: 45_000 })
  await page.reload()
  await context.setOffline(true)
  await page.reload()
  await expect(page.locator('.connection')).toHaveText('Без интернета')
  for (const route of [
    'study',
    'boards',
    'workouts',
    'notes',
    'tasks',
    'habits',
    'movies',
    'music',
    'calendar',
    'diary',
    'nutrition',
    'finance',
    'passwords',
    'settings'
  ]) {
    await navigate(page, route)
    await expect(page.locator('.app-header')).toContainText(routeTitles[route as Route])
    await expect(page.locator('.module')).toBeVisible()
    await expect(page.locator('.module')).not.toContainText('Открываем раздел…')
    await expect(page.getByText('Раздел не удалось открыть')).toHaveCount(0)
    await expect(page.locator('.workspace [role="alert"]')).toHaveCount(0)
  }
  expect(errors).toEqual([])
})

test('full editors fit a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const route of ['study', 'boards', 'workouts', 'notes']) {
    await page.goto(`/#${route}`)
    await expect(page.locator('.module')).toBeVisible()
    await expect(page.locator('.module')).not.toContainText('Открываем раздел…')
    await expect(page.locator('.workspace [role="alert"]')).toHaveCount(0)
    if (route === 'study' || route === 'boards') {
      const editor = page.locator('.desktop-module > section > main')
      expect((await editor.boundingBox())!.width).toBeGreaterThan(330)
      await page
        .getByRole('button', {
          name: route === 'study' ? 'Скрыть библиотеку' : 'Скрыть дерево досок',
          exact: true
        })
        .click()
      await expect(page.locator('[data-module-sidebar-content]')).toBeHidden()
    }
    await page.screenshot({ path: `.data/pwa-${route}-phone.png` })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
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
  await page.getByRole('button', { name: 'Скачать резервную копию', exact: true }).click()
  const backup = await downloading
  const backupPath = await backup.path()
  expect(backupPath).toBeTruthy()
  await navigate(page, 'notes')
  await page.getByText('PWA browser persistence', { exact: true }).first().click()
  await page.locator('.notes-editor').fill('Changed after backup')
  await localData(page)
  await page.getByRole('button', { name: 'Восстановить из файла', exact: true }).click()
  const choosing = page.waitForEvent('filechooser', { timeout: 10_000 })
  await page.getByRole('button', { name: 'Выбрать файл и восстановить', exact: true }).click()
  await (await choosing).setFiles(backupPath!)
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page.locator('.workspace')).toHaveAttribute('aria-busy', 'false')
  await navigate(page, 'notes')
  await page.getByText('PWA browser persistence', { exact: true }).first().click()
  await expect(page.locator('.notes-editor')).toContainText('Saved locally in the full editor')
  expect(errors).toEqual([])
})
