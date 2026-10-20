import { test, expect, open, save } from './helpers'

test('mobile actions remain usable when the browser never offers idle time', async ({ page }) => {
  await page.addInitScript(() => {
    window.requestIdleCallback = () => 0
  })
  await open(page, 'calendar')
  await page.getByRole('button', { name: 'Новое событие', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('Busy browser calendar')
  await save(page)
  await page.getByText('Busy browser calendar', { exact: true }).first().click()
  await page.getByRole('button', { name: 'Редактировать', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Название', exact: true })).toHaveValue(
    'Busy browser calendar'
  )
  await page.getByRole('button', { name: 'Отмена', exact: true }).click()
  await open(page, 'diary')
  await page.getByRole('button', { name: 'Новый дневник', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('Busy browser diary')
  await save(page)
  await open(page, 'tasks')
  await page
    .getByRole('textbox', { name: 'Быстро добавить задачу', exact: true })
    .fill('Busy browser task')
  await page.getByRole('button', { name: 'Добавить задачу', exact: true }).click()
  await page.getByRole('button', { name: 'Действия задачи Busy browser task', exact: true }).click()
  await page.getByRole('button', { name: 'Изменить', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Название', exact: true })).toHaveValue(
    'Busy browser task'
  )
})
