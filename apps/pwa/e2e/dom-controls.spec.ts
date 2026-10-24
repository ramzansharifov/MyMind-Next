import { test, expect, open, navigate, save, createNote } from './helpers'

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

test('small actions retain their touch area and empty or populated note grids use full cells', async ({
  page
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'home')
  const menu = page.getByRole('button', { name: 'Открыть меню навигации', exact: true })
  const bounds = await menu.boundingBox()
  await page.mouse.click(bounds!.x + bounds!.width + 3, bounds!.y + bounds!.height / 2)
  await expect(page.getByRole('button', { name: 'Закрыть меню', exact: true })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Заметки', exact: true }).click()
  await page.getByRole('button', { name: 'Список', exact: true }).click()
  const grid = page.locator('.module .ui-list')
  const empty = grid.getByText('Заметок пока нет.', { exact: true })
  await expect(empty).toBeVisible()
  const emptyWidth = await grid
    .locator(':scope > .ui-stack')
    .evaluate((element) => element.getBoundingClientRect().width)
  expect(emptyWidth).toBeGreaterThan((await grid.boundingBox())!.width - 2)
  for (const title of ['Grid one', 'Grid two']) {
    await createNote(page, title)
    await page.getByRole('button', { name: 'Назад', exact: true }).click()
  }
  const first = page.getByRole('button', { name: 'Grid one', exact: true })
  const width = (await first.boundingBox())!.width
  expect(width).toBeGreaterThan((await grid.boundingBox())!.width * 0.4)
  expect(width).toBeLessThan((await grid.boundingBox())!.width * 0.55)
})

test('long finance balances shrink within their lower bound and grow on a wider viewport', async ({
  page
}) => {
  await page.setViewportSize({ width: 320, height: 844 })
  await open(page, 'finance')
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.getByRole('button', { name: 'Новый счёт', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('Long balance')
  await page.getByRole('textbox', { name: 'Начальный баланс', exact: true }).fill('1234567890.12')
  await save(page)
  const balance = page.getByLabel('Общий баланс', { exact: true })
  const size = (): Promise<number> =>
    balance.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
  await expect.poll(size).toBeLessThan(26)
  expect(await size()).toBeGreaterThanOrEqual(26 * 0.7 - 0.01)
  await page.setViewportSize({ width: 844, height: 390 })
  await expect.poll(size).toBeGreaterThanOrEqual(25.99)
  await page.setViewportSize({ width: 320, height: 844 })
  await expect.poll(size).toBeLessThan(26)
})

test('diary report charts retain independent horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'diary')
  await page.getByRole('button', { name: 'Новый дневник', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('Chart diary')
  await save(page)
  await page.getByRole('button', { name: 'Открыть дневник Chart diary', exact: true }).click()
  await page.getByRole('button', { name: 'Настроение', exact: true }).click()
  await page.getByRole('button', { name: 'Как прошёл день?', exact: true }).click()
  await page.getByRole('button', { name: /Хорошо/ }).click()
  await save(page)
  await page.getByRole('button', { name: 'Новая запись', exact: true }).click()
  await page.getByRole('textbox', { name: 'О чём вы думаете?', exact: true }).fill('Chart fixture')
  await save(page)
  await page.getByRole('tab', { name: 'Отчёты', exact: true }).click()
  await page.getByRole('button', { name: 'Год', exact: true }).click()
  const charts = page
    .locator('.ui-scroll[data-horizontal="true"]')
    .filter({ has: page.locator('.ui-list') })
  await expect(charts).toHaveCount(2)
  await expect.poll(() => charts.first().locator('.ui-list-item').count()).toBeGreaterThan(300)
  for (const chart of await charts.all()) {
    expect(await chart.evaluate((element) => getComputedStyle(element).overflowX)).toBe('auto')
    expect(await chart.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
    await chart.evaluate((element) => element.scrollTo({ left: 100 }))
    await expect.poll(() => chart.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0)
  }
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
