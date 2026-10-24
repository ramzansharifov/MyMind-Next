import { test, expect, open, navigate, save } from './helpers'

test('web controls use HTML elements and modal focus returns without trapping the background', async ({
  page
}) => {
  await open(page, 'home')
  expect(
    await page
      .getByRole('button', { name: 'Заметки', exact: true })
      .evaluate((element) => element.tagName)
  ).toBe('BUTTON')
  await navigate(page, 'notes')
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.getByRole('button', { name: 'Новая заметка', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Новая заметка', exact: true })
  await expect(dialog).toBeVisible()
  expect(
    await page
      .getByRole('textbox', { name: 'Название', exact: true })
      .evaluate((element) => element.tagName)
  ).toBe('INPUT')
  await expect
    .poll(() => page.locator('.pwa').evaluate((element) => (element as HTMLElement).inert))
    .toBe(true)
  const controls = dialog.locator(
    'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]'
  )
  await controls.last().focus()
  await page.keyboard.press('Tab')
  await expect(controls.first()).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(controls.last()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect
    .poll(() => page.locator('.pwa').evaluate((element) => (element as HTMLElement).inert))
    .toBe(false)
  await expect(page.getByRole('button', { name: 'Создать', exact: true })).toBeEnabled()
})

test('native HTML fields keep decimal keyboard hints and multiline text', async ({ page }) => {
  await open(page, 'finance')
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.getByRole('button', { name: 'Новый счёт', exact: true }).click()
  const dialog = page.getByRole('dialog').last()
  await dialog.getByRole('textbox', { name: 'Название', exact: true }).fill('Web field account')
  await save(page)
  await page.getByRole('tab', { name: 'Шаблоны', exact: true }).click()
  await page.getByRole('button', { name: 'Новый шаблон', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Сумма шаблона', exact: true })).toHaveAttribute(
    'inputmode',
    'decimal'
  )
  const comment = page.getByRole('textbox', { name: 'Комментарий шаблона', exact: true })
  expect(await comment.evaluate((element) => element.tagName)).toBe('TEXTAREA')
  await comment.fill('Первая строка\nВторая строка')
  await expect(comment).toHaveValue('Первая строка\nВторая строка')
})

test('nested dirty-form confirmation stays above its parent and restores the draft on cancellation', async ({
  page
}) => {
  await open(page, 'notes')
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.getByRole('button', { name: 'Новая заметка', exact: true }).click()
  const title = page.getByRole('textbox', { name: 'Название', exact: true })
  await title.fill('Keep this draft')
  await page.keyboard.press('Escape')
  const confirmation = page.getByRole('dialog', { name: 'Отменить изменения?', exact: true })
  await expect(confirmation).toBeVisible()
  await confirmation.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(confirmation).toHaveCount(0)
  await expect(title).toHaveValue('Keep this draft')
  await page.keyboard.press('Escape')
  await confirmation.getByRole('button', { name: 'Не сохранять', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect
    .poll(() => page.locator('.pwa').evaluate((element) => (element as HTMLElement).inert))
    .toBe(false)
})

test('touch pull-to-refresh reads records added to the same local library', async ({
  page,
  context,
  browserName,
  isMobile
}) => {
  test.skip(
    browserName !== 'chromium' || !isMobile,
    'Trusted touch injection requires mobile Chromium CDP'
  )
  await open(page, 'notes')
  await page.evaluate(async () => {
    await window.api.notes.createNote({ groupId: null, title: 'Pull refresh fixture' })
  })
  await expect(page.getByRole('button', { name: 'Pull refresh fixture', exact: true })).toHaveCount(
    0
  )
  const cdp = await context.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 180, y: 270 }]
  })
  for (const y of [290, 315, 345, 375, 410])
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 180, y }] })
  await expect(page.getByText('Отпустите для обновления', { exact: true })).toBeVisible()
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(
    page.getByRole('button', { name: 'Pull refresh fixture', exact: true })
  ).toBeVisible()
  await cdp.detach()
})
