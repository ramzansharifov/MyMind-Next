import { test, expect, open, save, confirmRemoval } from './helpers'

test('tasks: create a group, complete, rename, restart and delete a task', async ({ page }) => {
  await open(page, 'tasks')
  await page.getByRole('button', { name: 'Группы. Сейчас: Все задачи', exact: true }).click()
  await page.getByRole('button', { name: 'Создать группу', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('PWA tasks group')
  await save(page)
  await page.getByRole('button', { name: 'Группы. Сейчас: Все задачи', exact: true }).click()
  await page.getByRole('button', { name: 'PWA tasks group', exact: true }).click()
  await page.getByRole('textbox', { name: 'Быстро добавить задачу', exact: true }).fill('PWA task')
  await page.getByRole('button', { name: 'Добавить задачу', exact: true }).click()
  await page.getByRole('button', { name: 'Выполнить задачу PWA task', exact: true }).click()
  await expect(page.locator('.save-status')).toHaveText('Сохранено на устройстве')
  await page.getByRole('button', { name: 'Действия задачи PWA task', exact: true }).click()
  await page.getByRole('button', { name: 'Изменить', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('PWA edited task')
  await save(page)
  await open(page, 'tasks')
  await expect(
    page.getByRole('button', { name: 'Вернуть задачу PWA edited task', exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Действия задачи PWA edited task', exact: true }).click()
  await confirmRemoval(page)
  await open(page, 'tasks')
  await expect(page.getByText('PWA edited task', { exact: true })).toHaveCount(0)
})

test('habits: create, record progress, rename, restart and delete with history', async ({
  page
}) => {
  await open(page, 'habits')
  await page.getByRole('button', { name: 'Создать привычку', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('PWA habit')
  await save(page)
  await page.getByRole('button', { name: 'Выполнить', exact: true }).click()
  await page.getByText('PWA habit', { exact: true }).click({ delay: 550 })
  await page.getByRole('button', { name: 'Изменить', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('PWA edited habit')
  await expect(page.getByRole('textbox', { name: 'Название', exact: true })).toHaveValue(
    'PWA edited habit'
  )
  await save(page)
  await expect(
    page.getByRole('button', { name: 'Изменить привычку PWA edited habit', exact: true })
  ).toBeVisible()
  await open(page, 'habits')
  await expect(page.getByText('1 / 1', { exact: true })).toBeVisible()
  await page
    .getByRole('button', { name: 'Изменить привычку PWA edited habit', exact: true })
    .click({ delay: 800 })
  await confirmRemoval(page, 'Удалить привычку')
  await open(page, 'habits')
  await expect(page.getByText('PWA edited habit', { exact: true })).toHaveCount(0)
})

test('calendar: event with note and reminder can be edited, reopened and deleted', async ({
  page
}) => {
  await open(page, 'calendar')
  await page.getByRole('button', { name: 'Новое событие', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('PWA event')
  await page
    .getByRole('textbox', { name: 'Заметка к этому повторению', exact: true })
    .fill('Local event note')
  await page.getByRole('button', { name: 'Добавить', exact: true }).click()
  await save(page)
  await page.getByText('PWA event', { exact: true }).first().click()
  await page.getByRole('button', { name: 'Редактировать', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('PWA edited event')
  await save(page)
  await open(page, 'calendar')
  await page.getByText('PWA edited event', { exact: true }).first().click()
  await expect(page.getByText('Local event note', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click()
  await page.getByRole('button', { name: 'Дополнительные действия', exact: true }).click()
  await confirmRemoval(page, 'Удалить событие')
  await open(page, 'calendar')
  await expect(page.getByText('PWA edited event', { exact: true })).toHaveCount(0)
})

test('diary: create diary, edit an entry, restart and remove it', async ({ page }) => {
  await open(page, 'diary')
  await page.getByRole('button', { name: 'Новый дневник', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('PWA diary')
  await save(page)
  await page.getByRole('button', { name: 'Открыть дневник PWA diary', exact: true }).click()
  await page.getByRole('button', { name: 'Новая запись', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'О чём вы думаете?', exact: true })
    .fill('Diary entry locally')
  await save(page)
  await page.getByRole('button', { name: 'Изменить', exact: true }).click()
  await page
    .getByRole('textbox', { name: 'О чём вы думаете?', exact: true })
    .fill('Diary entry edited')
  await save(page)
  await open(page, 'diary')
  await page.getByRole('button', { name: 'Открыть дневник PWA diary', exact: true }).click()
  await expect(page.getByText('Diary entry edited', { exact: true })).toBeVisible()
  await confirmRemoval(page)
  await expect(page.getByText('Diary entry edited', { exact: true })).toHaveCount(0)
  await page.getByRole('tab', { name: 'Настройки', exact: true }).click()
  await confirmRemoval(page, 'Удалить дневник')
  await open(page, 'diary')
  await expect(
    page.getByRole('button', { name: 'Открыть дневник PWA diary', exact: true })
  ).toHaveCount(0)
})
