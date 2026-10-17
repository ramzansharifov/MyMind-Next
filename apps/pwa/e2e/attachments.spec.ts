import { test, expect, open, storedAssets, navigate } from './helpers'

test('notes: local image and Chromium voice recording persist, restore and clean up', async ({
  page,
  browserName
}) => {
  await open(page, 'notes')
  await page.getByRole('button', { name: 'Новая заметка', exact: true }).first().click()
  await page.getByLabel('Название заметки', { exact: true }).fill('PWA attachments')
  await page.getByRole('button', { name: 'Создать', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить изображение', exact: true }).click()
  const choosing = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Выбрать файл', exact: true }).last().click()
  await (
    await choosing
  ).setFiles({
    name: 'pixel.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aShoAAAAASUVORK5CYII=',
      'base64'
    )
  })
  const image = page.locator('.note-canvas-attachment img[data-study-image-preview]').first()
  await expect(image).toBeVisible()
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)
    )
    .toBe(true)
  await page.getByRole('button', { name: 'Закрыть настройки вложения', exact: true }).click()
  if (browserName === 'chromium') {
    // Only Chromium supplies a test microphone to the real MediaRecorder pipeline.
    // WebKit still runs the image, persistence and backup/restore checks below.
    await page.getByRole('button', { name: 'Добавить голосовую запись', exact: true }).click()
    await page.getByRole('button', { name: 'Начать запись', exact: true }).click()
    await expect(page.getByText(/Идёт запись · 0:0[1-9]/)).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Завершить запись', exact: true }).click()
    await expect(page.locator('.note-canvas-attachment audio')).toHaveAttribute('src', /^blob:/)
  }
  await navigate(page, 'home')
  await expect.poll(() => storedAssets(page)).toHaveLength(browserName === 'chromium' ? 2 : 1)
  const initial = await storedAssets(page)
  expect(initial.every((asset) => asset.size > 0)).toBe(true)
  await open(page, 'notes')
  await page.getByText('PWA attachments', { exact: true }).first().click()
  await expect(
    page.locator('.note-canvas-attachment img[data-study-image-preview]')
  ).toHaveAttribute('src', /^blob:/)
  if (browserName === 'chromium') {
    await expect(page.locator('.note-canvas-attachment audio')).toHaveAttribute('src', /^blob:/)
    expect(
      await page
        .locator('.note-canvas-attachment audio')
        .evaluate(async (element: HTMLAudioElement) => {
          await element.play()
          element.pause()
          return element.readyState >= 2
        })
    ).toBe(true)
  }
  await navigate(page, 'settings')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Скачать резервную копию', exact: true }).click()
  const backup = await downloading,
    path = await backup.path()
  await page.getByRole('button', { name: 'Восстановить из файла', exact: true }).click()
  const restore = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Выбрать файл и восстановить', exact: true }).click()
  await (await restore).setFiles(path!)
  await expect(page.locator('.workspace')).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  expect(await storedAssets(page)).toEqual(initial)
  await navigate(page, 'notes')
  await page.getByText('PWA attachments', { exact: true }).first().click()
  await expect
    .poll(() =>
      page
        .locator('.note-canvas-attachment img[data-study-image-preview]')
        .evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)
    )
    .toBe(true)
  await page.getByRole('button', { name: 'Вернуться к списку заметок', exact: true }).click()
  await page
    .getByRole('button', { name: 'Действия заметки «PWA attachments»', exact: true })
    .first()
    .click()
  await page.getByRole('menuitem', { name: 'Удалить', exact: true }).click()
  await page.getByRole('button', { name: 'Удалить', exact: true }).last().click()
  await expect.poll(() => storedAssets(page)).toHaveLength(0)
})
