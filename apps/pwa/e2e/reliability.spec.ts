import { test, expect, open } from './helpers'

test('two windows cannot overwrite each other and closing the writer releases the library', async ({
  page,
  context
}) => {
  await open(page, 'tasks')
  await page
    .getByRole('textbox', { name: 'Быстро добавить задачу', exact: true })
    .fill('Single writer task')
  await page.getByRole('button', { name: 'Добавить задачу', exact: true }).click()
  await expect(page.locator('.save-status')).toHaveText('Сохранено на устройстве')
  const second = await context.newPage()
  await second.goto('/#tasks')
  await expect(second.locator('.startup [role="alert"]')).toContainText(
    'уже открыт в другой вкладке'
  )
  await page.close()
  await second.getByRole('button', { name: 'Повторить запуск', exact: true }).click()
  await expect(second.getByText('Single writer task', { exact: true })).toBeVisible()
  await second.close()
})
