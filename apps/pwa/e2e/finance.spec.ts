import { test, expect, open, save, confirmRemoval } from './helpers'

test('finance: account, category, income, expense, balance, edit, restart and deletion', async ({
  page
}) => {
  await open(page, 'finance')
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.getByRole('button', { name: 'Новый счёт', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('PWA cash')
  await save(page)
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.getByRole('button', { name: 'Новый тег', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название тега', exact: true }).fill('PWA category')
  await page.getByRole('radio', { name: 'Оба', exact: true }).click()
  await page.getByRole('button', { name: 'Создать тег', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Создать тег', exact: true })).toHaveCount(0)
  for (const [type, amount] of [
    ['Доход', '100'],
    ['Расход', '25']
  ]) {
    await page.getByRole('button', { name: 'Создать', exact: true }).click()
    await page.getByRole('button', { name: type, exact: true }).click()
    await page.getByRole('radio', { name: 'PWA category', exact: true }).click()
    await page.getByRole('textbox', { name: 'Сумма', exact: true }).fill(amount)
    await page.getByRole('textbox', { name: 'Комментарий', exact: true }).fill(`PWA ${type}`)
    await page.getByRole('dialog').getByRole('button', { name: 'Создать', exact: true }).click()
    await expect(page.getByRole('textbox', { name: 'Сумма', exact: true })).toHaveCount(0)
  }
  await open(page, 'finance')
  await expect(page.getByLabel('Общий баланс', { exact: true })).toContainText('75,00')
  await page.getByRole('tab', { name: 'Транзакции', exact: true }).click()
  await page.getByRole('button', { name: /−25,00/ }).click()
  await page.getByRole('button', { name: 'Изменить операцию', exact: true }).click()
  await page.getByRole('textbox', { name: 'Сумма', exact: true }).fill('30')
  await save(page)
  await open(page, 'finance')
  await expect(page.getByLabel('Общий баланс', { exact: true })).toContainText('70,00')
  await page.getByRole('tab', { name: 'Транзакции', exact: true }).click()
  await page.getByRole('button', { name: /−30,00/ }).click()
  await confirmRemoval(page, 'Удалить операцию')
  await page.getByRole('button', { name: /\+100,00/ }).click()
  await confirmRemoval(page, 'Удалить операцию')
  await page.getByRole('tab', { name: 'Счета', exact: true }).click()
  await page.getByRole('button', { name: /PWA cash, / }).click()
  await page.getByRole('button', { name: 'Изменить счёт', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('PWA renamed cash')
  await save(page)
  await open(page, 'finance')
  await page.getByRole('button', { name: /PWA renamed cash, / }).click()
  await confirmRemoval(page, 'Удалить счёт')
  await open(page, 'finance')
  await expect(page.getByText('PWA renamed cash', { exact: true })).toHaveCount(0)
})
