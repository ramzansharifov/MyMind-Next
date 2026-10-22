import { test, expect, open, navigate, createNote } from './helpers'
import { navigationRoutes, routeTitles } from '../../mobile/src/app/navigation'

test('Android shell: shared header, module cards and drawer work at phone size', async ({
  page
}) => {
  await open(page, 'home')
  await expect(page.locator('.app-header')).toContainText('Главная')
  await expect(page.locator('.connection')).not.toBeInViewport()
  const modules = navigationRoutes.filter((route) => route !== 'home' && route !== 'settings')
  await expect(page.locator('.module').getByRole('button')).toHaveText(
    modules.map((route) => routeTitles[route])
  )
  for (const title of modules.map((route) => routeTitles[route]))
    await expect(page.getByRole('button', { name: title, exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Открыть меню навигации', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Закрыть меню', exact: true })).toBeVisible()
  const drawerButtons = page.locator('[role="dialog"]').getByRole('button')
  await expect
    .poll(() =>
      drawerButtons.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('aria-label'))
      )
    )
    .toEqual([
      'Закрыть меню',
      ...navigationRoutes.map((route) => routeTitles[route]),
      'Закрыть меню навигации'
    ])
  await page.screenshot({
    path: `.data/pwa-android-drawer-${test.info().project.name}.png`,
    animations: 'disabled'
  })
  await page.getByRole('button', { name: 'Задачи', exact: true }).last().click()
  await expect(page.locator('.app-header')).toContainText('Задачи')
  await page.getByRole('button', { name: 'Открыть меню навигации', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Закрыть меню', exact: true })).toHaveCount(0)
})

test('Android settings: theme and accent controls persist and browser Back closes a subpage', async ({
  page
}) => {
  await open(page, 'home')
  await navigate(page, 'settings')
  await page.getByRole('button', { name: 'Внешний вид', exact: true }).click()
  await page.getByRole('button', { name: 'Светлая', exact: true }).click()
  await page.getByRole('button', { name: 'Синий', exact: true }).click()
  await expect(page.locator('.pwa')).toHaveClass(/light/)
  await expect(page.getByRole('button', { name: 'Синий', exact: true })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await page.screenshot({
    path: `.data/pwa-android-appearance-${test.info().project.name}.png`,
    animations: 'disabled'
  })
  await page.goBack()
  await expect(
    page.getByRole('button', { name: 'Профиль и синхронизация', exact: true })
  ).toBeVisible()
  await expect(page).toHaveURL(/#settings$/)
  await open(page, 'settings')
  await expect(page.getByText('Светлая · Синий', { exact: true })).toBeVisible()
  await expect(page.locator('.pwa')).toHaveClass(/light/)
})

test('Android note: formatting, browser Back and resized viewport preserve the document', async ({
  page
}) => {
  await open(page, 'home')
  await navigate(page, 'notes')
  await createNote(page, 'Android formatted note')
  const editor = page.locator('.notes-editor')
  await page.getByRole('button', { name: 'Форматирование текста', exact: true }).click()
  await page.getByRole('button', { name: 'Жирный', exact: true }).click()
  await page.getByRole('button', { name: 'Закрыть', exact: true }).last().click()
  await editor.pressSequentially('Formatted on this device')
  await expect(editor.locator('strong')).toContainText('Formatted on this device')
  await page.getByRole('button', { name: 'Форматирование текста', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Закрыть', exact: true }).last()).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('button', { name: 'Закрыть', exact: true })).toHaveCount(0)
  await expect(editor).toBeVisible()
  await page.setViewportSize({ width: 390, height: 520 })
  await expect(
    page.getByRole('button', { name: 'Форматирование текста', exact: true })
  ).toBeInViewport()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({
    path: `.data/pwa-android-editor-${test.info().project.name}.png`,
    animations: 'disabled'
  })
  await page.goBack()
  await expect(
    page.getByRole('button', { name: 'Android formatted note', exact: true })
  ).toBeVisible()
  await expect(page.locator('.app-header')).toContainText('Заметки')
  await open(page, 'notes')
  await page.getByRole('button', { name: 'Android formatted note', exact: true }).click()
  await expect(editor.locator('strong')).toContainText('Formatted on this device')
  await page.getByRole('button', { name: 'Чтение', exact: true }).click()
  await expect(editor).toHaveAttribute('contenteditable', 'false')
  await page.getByRole('button', { name: 'Редактирование', exact: true }).click()
  await expect(editor).toHaveAttribute('contenteditable', 'true')
})

test('Android drawer remains scrollable and reachable on compact phone screens', async ({
  page
}) => {
  await page.setViewportSize({ width: 320, height: 480 })
  await open(page, 'home')
  await page.getByRole('button', { name: 'Открыть меню навигации', exact: true }).click()

  const list = page.getByTestId('mymind-navigation-items')
  await expect(list).toBeVisible()
  const layout = await list.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight
  }))
  expect(layout.height).toBeGreaterThan(100)
  expect(layout.height).toBeLessThan(480)
  expect(layout.scrollHeight).toBeGreaterThan(layout.clientHeight)

  await page.getByRole('button', { name: 'Настройки', exact: true }).last().click()
  await expect(page.locator('.app-header')).toContainText('Настройки')
})
