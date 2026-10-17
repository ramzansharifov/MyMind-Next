import { test, expect, open } from './helpers'

test('local profile: encrypted credentials survive restart and disabled LAN reports its actual state', async ({
  page
}) => {
  await open(page, 'settings')
  await page.getByText('Открыть профиль и LAN-синхронизацию', { exact: true }).click()
  await page.getByRole('textbox', { name: 'Логин профиля', exact: true }).fill('pwa-browser-test')
  await page
    .getByRole('textbox', { name: 'Пароль профиля', exact: true })
    .fill('Pwa-local-profile-password-482!')
  await page.getByRole('textbox', { name: 'Имя профиля', exact: true }).fill('PWA Browser Test')
  await page.getByRole('button', { name: 'Создать профиль', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Сохранить имя и пол', exact: true })).toBeVisible()
  await open(page, 'settings')
  await page.getByText('Открыть профиль и LAN-синхронизацию', { exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Логин профиля', exact: true })).toHaveValue(
    'pwa-browser-test'
  )
  await expect(page.getByRole('textbox', { name: 'Имя профиля', exact: true })).toHaveValue(
    'PWA Browser Test'
  )
  await page.getByRole('button', { name: 'Найти компьютеры MyMind', exact: true }).click()
  await expect(page.getByText(/Локальный LAN-сервис выключен/)).toBeVisible()
})
