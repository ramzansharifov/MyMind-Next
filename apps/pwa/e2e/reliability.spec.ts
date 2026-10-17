import { test, expect, open, navigate } from './helpers'

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

test('study: edited DSL applies to the material and persists through a new runtime', async ({
  page
}) => {
  await open(page, 'study')
  await page.getByRole('button', { name: 'Новый материал', exact: true }).click()
  await page.getByRole('tab', { name: 'Код', exact: true }).click()
  const editor = page.locator('[data-study-code-workspace] textarea')
  await expect(editor).toHaveValue(/material /)
  await editor.fill(
    (await editor.inputValue())
      .replace('Новый материал', 'PWA saved material')
      .replace(/text (\w+) """\s*"""/, 'text $1 """\n  Material stored on this device\n  """')
  )
  const save = page.getByRole('button', { name: /^Сохранить/ })
  await expect(save).toBeEnabled()
  await save.click()
  await expect(save).toBeDisabled()
  await navigate(page, 'home')
  await open(page, 'study')
  await page.getByText('PWA saved material', { exact: true }).first().click()
  await page.getByRole('tab', { name: 'Код', exact: true }).click()
  await expect(editor).toHaveValue(/Material stored on this device/)
})
