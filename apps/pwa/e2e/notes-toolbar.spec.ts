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
    'Добавить вложение',
    'Форматирование текста',
    'Создать чек-лист',
    'Вставить изображение',
    'Вставить разделитель',
    'Добавить ссылку',
    'Добавить голосовую запись'
  ]) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeInViewport()
  }
  await expect(page.getByText('Чтение', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Редактирование', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Добавить вложение', exact: true }).click()
  const insertMenu = page.getByRole('dialog').last()
  for (const label of ['Видео', 'Аудио', 'Файл'])
    await expect(insertMenu.getByRole('button', { name: `Добавить: ${label}` })).toBeVisible()
  for (const label of ['Изображение', 'Голосовое'])
    await expect(insertMenu.getByRole('button', { name: `Добавить: ${label}` })).toHaveCount(0)
  await expect(insertMenu.getByText('Разделитель', { exact: true })).toHaveCount(0)
  await insertMenu.getByRole('button', { name: 'Закрыть', exact: true }).click()

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

test('notes: checklist shortcut inserts editable checkboxes and persists checked state', async ({
  page
}) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await open(page, 'notes')
  await createNote(page, 'Checklist note')
  const editor = page.locator('.notes-editor')
  const shortcut = page.getByRole('button', { name: 'Создать чек-лист', exact: true })
  await shortcut.click()
  await expect(shortcut).toHaveAttribute('aria-selected', 'true')

  const taskList = editor.locator('ul[data-type="taskList"]')
  await expect(taskList).toBeVisible()
  // Clicking the bottom action must leave the caret inside the new list item.
  // No extra tap on a blank row is allowed before typing.
  await expect(taskList.locator('li[data-type="taskItem"]')).toHaveCount(1)
  await expect.poll(() => editor.evaluate((el) => el.contains(document.activeElement))).toBe(true)
  await page.keyboard.type('Тестовый пункт')
  await expect(taskList).toContainText('Тестовый пункт')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Второй пункт')
  await expect(taskList.locator('li[data-type="taskItem"]')).toHaveCount(2)
  await expect(taskList).toContainText('Второй пункт')
  const layout = await taskList.locator('li[data-type="taskItem"]').evaluateAll((rows) =>
    rows.map((row) => {
      const rect = row.getBoundingClientRect()
      const content = row.querySelector('div')
      const label = row.querySelector('label')
      const text = content?.getBoundingClientRect()
      const control = label?.getBoundingClientRect()
      return {
        rowHeight: rect.height,
        rowTop: rect.top,
        rowBottom: rect.bottom,
        labelTop: control?.top ?? 0,
        contentTop: text?.top ?? 0
      }
    })
  )
  expect(layout[0].rowHeight).toBeLessThan(60)
  expect(layout[1].rowTop - layout[0].rowBottom).toBeLessThan(16)
  expect(Math.abs(layout[0].labelTop - layout[0].contentTop)).toBeLessThan(22)

  const checkbox = taskList.locator('input[type="checkbox"]').first()
  await expect(checkbox).not.toBeChecked()
  await checkbox.click()
  await expect(checkbox).toBeChecked()

  await page.getByRole('button', { name: 'Назад', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Checklist note', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Checklist note', exact: true }).click()
  const restored = page.locator('.notes-editor ul[data-type="taskList"]')
  await expect(restored).toContainText('Тестовый пункт')
  await expect(restored).toContainText('Второй пункт')
  await expect(restored.locator('input[type="checkbox"]').first()).toBeChecked()
})
