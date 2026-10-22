import { test, expect, open, createNote } from './helpers'

test('notes: compact mode actions and grouped editing shortcuts remain usable on narrow screens', async ({
  page
}) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await open(page, 'notes')
  await createNote(page, 'Compact note toolbar')

  for (const label of [
    'Чтение',
    'Редактирование',
    'Добавить вложение или разделитель',
    'Форматирование текста',
    'Вставить изображение',
    'Вставить разделитель',
    'Добавить ссылку',
    'Добавить голосовую запись'
  ]) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeInViewport()
  }
  await expect(page.getByText('Чтение', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Редактирование', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Вставить разделитель', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Добавить разделитель', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Добавить разделитель', exact: true }).click()

  await page.getByRole('button', { name: 'Дополнительные действия', exact: true }).click()
  await page.getByRole('button', { name: 'Вид заметки', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Вид заметки: Полотно', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Закрыть', exact: true }).last().click()

  await page.getByRole('button', { name: 'Чтение', exact: true }).click()
  await expect(page.locator('.notes-editor')).toHaveAttribute('contenteditable', 'false')
  await page.getByRole('button', { name: 'Редактирование', exact: true }).click()
  await expect(page.locator('.notes-editor')).toHaveAttribute('contenteditable', 'true')
  await expect(page.getByRole('button', { name: 'Добавить ссылку', exact: true })).toBeVisible()
})
