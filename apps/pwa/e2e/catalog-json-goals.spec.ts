import { test, expect, open, save, navigate } from './helpers'
import { MOBILE_CREATE_ACTION_STEP } from '../../mobile/src/shared/ui/mobile-create-action-gesture'

for (const [route, add, input, output, jsonButton] of [
  ['movies', 'Добавить фильм', 'JSON фильмов', 'JSON данных фильмов', 'JSON библиотеки'],
  ['music', 'Добавить музыку', 'JSON музыки', 'JSON данных музыки', 'JSON музыкальной библиотеки']
] as const) {
  test(`${route}: JSON validation, import, export, search and restart use the Android dialogs`, async ({
    page
  }) => {
    if (route === 'music')
      await page.route('**/api/music/discover', (request) => request.fulfill({ json: { tracks: [] } }))
    await open(page, route)
    if (route === 'music') await page.getByRole('tab', { name: 'Моя библиотека' }).click()
    await page.getByRole('button', { name: add, exact: true }).click()
    await page.getByRole('button', { name: 'Из JSON', exact: true }).click()
    const editor = page.getByRole('textbox', { name: input, exact: true })
    await editor.fill('{broken')
    await expect(page.getByRole('button', { name: 'Применить JSON', exact: true })).toBeDisabled()
    const item = {
      title: 'Parity JSON fixture',
      artist: 'Local artist',
      year: 2026,
      genres: ['Драма']
    }
    await editor.fill(
      JSON.stringify([
        item,
        {
          title: 'Parity excluded filter fixture',
          artist: 'Other artist',
          year: 2025,
          type: 'series'
        }
      ])
    )
    await page.getByRole('button', { name: 'Применить JSON', exact: true }).click()
    await expect(editor).toHaveCount(0)
    if (route === 'music')
      await page.route('**/api/music/discover', (request) => request.fulfill({ json: { tracks: [] } }))
    await open(page, route)
    if (route === 'music') await page.getByRole('tab', { name: 'Моя библиотека' }).click()
    await expect(page.getByText(item.title, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: jsonButton, exact: true }).click()
    const exported = page.getByLabel(output, { exact: true })
    await expect(exported).toBeVisible()
    const text = (await exported.textContent())!
    await page.screenshot({
      path: `.data/pwa-json-${test.info().project.name}-${route}.png`,
      animations: 'disabled'
    })
    expect(text).toContain(item.title)
    expect(() => JSON.parse(text)).not.toThrow()
    await page.getByRole('button', { name: 'Закрыть', exact: true }).last().click()
    await page.getByRole('button', { name: 'Поиск', exact: true }).click()
    const search = page.getByRole('textbox').first()
    await search.fill('not-in-this-local-library')
    await expect(page.getByText(item.title, { exact: true })).toHaveCount(0)
    await search.fill('Parity JSON')
    await expect(page.getByText(item.title, { exact: true })).toBeVisible()
    await search.fill('')
    await page.getByRole('button', { name: 'Закрыть поиск', exact: true }).click()
    const filters = page.getByRole('button', {
      name: route === 'movies' ? 'Фильтры и сортировка' : 'Фильтры музыки',
      exact: true
    })
    await filters.click()
    if (route === 'movies') await page.getByRole('button', { name: 'Фильм', exact: true }).click()
    else {
      await page.getByRole('button', { name: 'Исполнитель', exact: true }).click()
      await page.getByRole('button', { name: 'Local artist', exact: true }).click()
    }
    await save(page)
    await expect(page.getByText(item.title, { exact: true })).toBeVisible()
    await expect(page.getByText('Parity excluded filter fixture', { exact: true })).toHaveCount(0)
    await filters.click()
    await page.getByRole('button', { name: 'Сбросить', exact: true }).click()
    await save(page)
    await expect(page.getByText('Parity excluded filter fixture', { exact: true })).toBeVisible()
  })
}

test('nutrition: goals, JSON meals, day navigation and reports survive restart', async ({
  page
}) => {
  await open(page, 'nutrition')
  await page.getByRole('tab', { name: 'Цель', exact: true }).click()
  await page.getByRole('textbox', { name: 'Калории', exact: true }).fill('2200')
  await page.getByRole('textbox', { name: 'Вода', exact: true }).fill('2000')
  await page.getByRole('button', { name: 'Сохранить цель', exact: true }).click()
  await expect(page.locator('.save-status')).toHaveText('Сохранено на устройстве')
  await open(page, 'nutrition')
  await page.getByRole('tab', { name: 'Цель', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Калории', exact: true })).toHaveValue('2200')
  await expect(page.getByRole('textbox', { name: 'Вода', exact: true })).toHaveValue('2000')
  await page.getByRole('tab', { name: 'Сегодня', exact: true }).click()
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить из JSON', exact: true }).click()
  const data = page.getByRole('textbox', { name: 'Данные', exact: true })
  const json = JSON.parse(await data.inputValue())
  json.meals[0].items[0].name = 'Parity imported meal'
  json.meals[0].items[0].nutrients.calories = 350
  await data.fill(JSON.stringify(json))
  await save(page)
  await open(page, 'nutrition')
  await expect(
    page.getByRole('button', { name: 'Изменить «Parity imported meal»', exact: true })
  ).toBeVisible()
  await page.getByRole('tab', { name: 'Дневник', exact: true }).click()
  await page.getByRole('button', { name: 'Предыдущий день', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Изменить «Parity imported meal»', exact: true })
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Следующий день', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Изменить «Parity imported meal»', exact: true })
  ).toBeVisible()
  await page.getByRole('tab', { name: 'Прогресс', exact: true }).click()
  await expect(page.getByText('Раздел не удалось открыть')).toHaveCount(0)
})

test('real Chromium touch swipes, hold selection and finance carousel save an operation', async ({
  page,
  context,
  browserName,
  isMobile
}) => {
  test.skip(
    browserName !== 'chromium' || !isMobile,
    'Trusted touch injection requires mobile Chromium CDP'
  )
  await open(page, 'nutrition')
  // Saving the SQLite shell does not mean the asynchronously populated tab is ready.
  await expect(page.getByRole('tab', { name: 'Дневник', exact: true })).toBeVisible()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 340, y: 600 }]
  })
  for (const x of [315, 290, 250, 200, 150, 100, 50])
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 600 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.getByRole('tab', { name: 'Дневник', exact: true })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  await navigate(page, 'finance')
  for (const title of ['Touch account A', 'Touch account B']) {
    await page.getByRole('button', { name: 'Создать', exact: true }).click()
    await page.getByRole('button', { name: 'Новый счёт', exact: true }).click()
    await page.getByRole('textbox', { name: 'Название', exact: true }).fill(title)
    await save(page)
  }
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.getByRole('button', { name: 'Новый тег', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название тега', exact: true }).fill('Touch category')
  await page.getByRole('radio', { name: 'Оба', exact: true }).click()
  await page.getByRole('button', { name: 'Создать тег', exact: true }).click()
  const trigger = await page.getByRole('button', { name: 'Создать', exact: true }).boundingBox()
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: trigger!.x + trigger!.width / 2, y: trigger!.y + trigger!.height / 2 }]
  })
  await expect(
    page.getByText('Проведите вверх или вниз · выберите действие', { exact: true })
  ).toBeVisible()
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.getByRole('button', { name: 'Дальше', exact: true }).click()
  await expect(page.getByText('Выберите счёт', { exact: true })).toBeVisible()
  const carousel = page.getByLabel(/^Выбрано: Touch account/)
  const initialAccount = await carousel.getAttribute('aria-label')
  const bounds = await carousel.boundingBox()
  const x = bounds!.x + bounds!.width / 2
  const y = bounds!.y + bounds!.height / 2
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (const delta of [15, 35, 55, 75])
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - delta }]
    })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(carousel).not.toHaveAttribute('aria-label', initialAccount!)
  await expect(page.getByRole('button', { name: 'Дальше', exact: true })).toBeEnabled()
  // A fast reverse-and-release must retain the last touch position even if no paint occurred.
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y }]
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x, y: y + MOBILE_CREATE_ACTION_STEP }]
  })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(carousel).toHaveAttribute('aria-label', initialAccount!)
  await page.getByRole('button', { name: 'Дальше', exact: true }).click()
  await expect(page.getByText('Выберите тег', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Дальше', exact: true }).click()
  await page.getByRole('textbox', { name: 'Сумма операции', exact: true }).fill('12')
  await page.getByRole('button', { name: 'Создать операцию', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Сумма операции', exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Общий баланс', { exact: true })).toContainText('12,00')
  await cdp.detach()
})
