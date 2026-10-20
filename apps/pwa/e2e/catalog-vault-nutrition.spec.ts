import { test, expect, open, save, confirmRemoval } from './helpers'

test('movies: create, update, reopen and delete a locally stored movie', async ({ page }) => {
  await open(page, 'movies')
  await page.getByRole('button', { name: 'Добавить фильм', exact: true }).click()
  await page.getByRole('button', { name: 'Заполнить форму', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('PWA movie')
  await page.getByRole('textbox', { name: 'Жанры', exact: true }).fill('Драма, Фантастика')
  await save(page)
  await page.getByText('PWA movie', { exact: true }).click()
  await page.getByRole('button', { name: 'Изменить', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('PWA edited movie')
  await page.getByRole('textbox', { name: 'Мои заметки', exact: true }).fill('Local review')
  await save(page)
  await open(page, 'movies')
  await page.getByText('PWA edited movie', { exact: true }).click()
  await expect(page.getByText('Local review', { exact: true })).toBeVisible()
  await confirmRemoval(page)
  await open(page, 'movies')
  await expect(page.getByText('PWA edited movie', { exact: true })).toHaveCount(0)
})

test('music: create playlist and track, edit, restart and delete', async ({ page }) => {
  await open(page, 'music')
  await page.getByRole('button', { name: 'Добавить музыку', exact: true }).click()
  await page.getByRole('button', { name: 'Создать плейлист', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('PWA playlist')
  await save(page)
  await page.getByRole('button', { name: 'Добавить музыку', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить трек', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('PWA track')
  await page.getByRole('textbox', { name: 'Исполнитель', exact: true }).fill('Local artist')
  await page.getByRole('textbox', { name: 'Длительность', exact: true }).fill('3:45')
  await page.getByRole('checkbox', { name: 'Плейлист · PWA playlist', exact: true }).click()
  await expect(
    page.getByRole('checkbox', { name: 'Плейлист · PWA playlist', exact: true })
  ).toBeChecked()
  await save(page)
  await page.getByRole('button', { name: 'Действия трека «PWA track»', exact: true }).click()
  await page.getByRole('button', { name: 'Редактировать', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('PWA edited track')
  await save(page)
  await open(page, 'music')
  await page.getByRole('tab', { name: 'Плейлисты', exact: true }).click()
  await page.getByRole('button', { name: 'Открыть плейлист «PWA playlist»', exact: true }).click()
  await page.getByRole('button', { name: 'Действия трека «PWA edited track»', exact: true }).click()
  await confirmRemoval(page)
  await expect(page.getByRole('button', { name: 'PWA edited track', exact: true })).toHaveCount(0)
  await confirmRemoval(page, 'Удалить плейлист «PWA playlist»')
  await open(page, 'music')
  await page.getByRole('tab', { name: 'Плейлисты', exact: true }).click()
  await expect(page.getByText('PWA playlist', { exact: true })).toHaveCount(0)
})

test('nutrition: water and food entries persist, edit and delete through the browser', async ({
  page
}) => {
  await open(page, 'nutrition')
  await page.getByRole('button', { name: '+250 мл', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить в «Завтрак»', exact: true }).click()
  await page.getByRole('textbox', { name: 'Количество', exact: true }).fill('100')
  await save(page)
  await open(page, 'nutrition')
  await expect(
    page.getByRole('button', { name: 'Указать точное количество воды', exact: true })
  ).toContainText('250 мл')
  await page.getByRole('button', { name: 'Изменить «Абрикос»', exact: true }).click()
  await page.getByRole('textbox', { name: 'Количество', exact: true }).fill('150')
  await save(page)
  await open(page, 'nutrition')
  await page.getByRole('button', { name: 'Изменить «Абрикос»', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Количество', exact: true })).toHaveValue('150')
  await page.getByRole('button', { name: 'Отмена', exact: true }).click()
  await page.getByRole('button', { name: 'Дополнительные действия', exact: true }).click()
  await confirmRemoval(page)
  await open(page, 'nutrition')
  await expect(page.getByRole('button', { name: 'Изменить «Абрикос»', exact: true })).toHaveCount(0)
})

test('password vault: wrong password, encrypted persistence, unlock, edit and delete', async ({
  page,
  context,
  browserName
}) => {
  if (browserName === 'chromium')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await open(page, 'passwords')
  const master = 'Pwa-test-master-passphrase-46!'
  await page.getByRole('textbox', { name: 'Мастер-пароль', exact: true }).fill(master)
  await page.getByRole('textbox', { name: 'Повторите мастер-пароль', exact: true }).fill(master)
  await page.getByRole('button', { name: 'Создать хранилище', exact: true }).click()
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.getByRole('button', { name: 'Новая запись', exact: true }).click()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('PWA login')
  await page.getByRole('textbox', { name: 'Логин / email', exact: true }).fill('local@example.test')
  await page
    .getByRole('textbox', { name: 'Пароль', exact: true })
    .fill('Secret-never-plaintext-482!')
  await save(page)
  await open(page, 'passwords')
  await page
    .getByRole('textbox', { name: 'Мастер-пароль', exact: true })
    .fill('wrong-master-password')
  await page.getByRole('button', { name: 'Разблокировать', exact: true }).click()
  await expect(page.getByText('PWA login', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'Мастер-пароль', exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: 'Мастер-пароль', exact: true }).fill(master)
  await page.getByRole('button', { name: 'Разблокировать', exact: true }).click()
  await page.getByText('PWA login', { exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Пароль', exact: true })).toHaveValue(
    'Secret-never-plaintext-482!'
  )
  await expect(page.getByRole('textbox', { name: 'Пароль', exact: true })).toHaveAttribute(
    'type',
    'password'
  )
  await page.getByRole('button', { name: 'Показать', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Пароль', exact: true })).toHaveAttribute(
    'type',
    'text'
  )
  await page.getByRole('button', { name: 'Скрыть', exact: true }).click()
  if (browserName === 'chromium') {
    await page.getByRole('button', { name: 'Копировать пароль', exact: true }).click()
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe('Secret-never-plaintext-482!')
  }
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new DOMException('Clipboard permission denied', 'NotAllowedError')
    }
  })
  await page.getByRole('button', { name: 'Копировать пароль', exact: true }).click()
  await expect(page.getByText('Clipboard permission denied', { exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: 'Название', exact: true }).fill('PWA edited login')
  await save(page)
  await page.getByRole('button', { name: 'Дополнительные действия', exact: true }).click()
  await confirmRemoval(page)
  await expect(page.getByText('PWA edited login', { exact: true })).toHaveCount(0)
})
