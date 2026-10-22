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
  // Must receive keyboard input immediately after the toolbar click, without
  // tapping the blank task row first (the reported regression).
  await page.keyboard.type('Тестовый пункт')
  await expect(taskList).toContainText('Тестовый пункт')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Второй пункт')
  const items = taskList.locator('li[data-type="taskItem"]')
  await expect(items).toHaveCount(2)
  await expect(items.nth(1)).toContainText('Второй пункт')

  // Nested paragraphs in list items must not inherit the browser's 1em margins.
  const spacing = await items.evaluateAll((elements) =>
    elements.map((element) => {
      const item = element.getBoundingClientRect()
      return { top: item.top, bottom: item.bottom, height: item.height }
    })
  )
  expect(spacing[0].height).toBeLessThan(56)
  expect(spacing[1].top - spacing[0].bottom).toBeLessThan(18)

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

  // Like Desktop, checkboxes remain actionable in read-only mode.
  await page.getByRole('button', { name: 'Чтение', exact: true }).click()
  await expect(page.locator('.notes-editor')).toHaveAttribute('contenteditable', 'false')
  await restored.locator('input[type="checkbox"]').first().click()
  await expect(restored.locator('input[type="checkbox"]').first()).not.toBeChecked()
  await page.getByRole('button', { name: 'Редактирование', exact: true }).click()
  await expect(restored.locator('input[type="checkbox"]').first()).not.toBeChecked()
})

test('notes: bullet and numbered lists accept typing, Enter and retain compact spacing', async ({
  page
}) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await open(page, 'notes')
  await createNote(page, 'List formatting parity')
  const editor = page.locator('.notes-editor')
  const formatButton = page.getByRole('button', { name: 'Форматирование текста', exact: true })

  for (const kind of ['Маркированный список', 'Нумерованный список']) {
    await formatButton.click()
    await page.getByRole('button', { name: kind, exact: true }).click()
    await page.getByRole('button', { name: 'Закрыть', exact: true }).last().click()

    await editor.click()
    await page.keyboard.type('Первый пункт')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Следующий пункт')

    const list = kind === 'Маркированный список' ? editor.locator('ul:not([data-type="taskList"])').first() : editor.locator('ol').first()
    await expect(list.locator('li')).toHaveCount(2)
    await expect(list).toContainText('Следующий пункт')
    const measurements = await list.locator('li').evaluateAll((elements) =>
      elements.map((element) => {
        const r = element.getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, height: r.height }
      })
    )
    expect(measurements[0].height).toBeLessThan(56)
    expect(measurements[1].top - measurements[0].bottom).toBeLessThan(18)

    // Start a new paragraph before testing the next list type.
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
  }
})
