import { test, expect, open, storedAssets, navigate, createNote, localData } from './helpers'

test('notes: local image and Chromium voice recording persist, restore and clean up', async ({
  page,
  browserName
}) => {
  await open(page, 'notes')
  await createNote(page, 'PWA attachments')
  await page.getByRole('button', { name: 'Добавить вложение или разделитель', exact: true }).click()
  await page.getByRole('button', { name: 'Добавить: Изображение', exact: true }).click()
  const choosing = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Выбрать', exact: true }).last().click()
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
  const image = page.locator('.mobile-note-attachment img').first()
  await expect(image).toBeVisible()
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)
    )
    .toBe(true)
  await page.getByRole('button', { name: 'Закрыть', exact: true }).last().click()
  if (browserName === 'chromium') {
    // Only Chromium supplies a test microphone to the real MediaRecorder pipeline.
    // WebKit still runs the image, persistence and backup/restore checks below.
    await page
      .getByRole('button', { name: 'Добавить вложение или разделитель', exact: true })
      .click()
    await page.getByRole('button', { name: 'Добавить: Голосовое', exact: true }).click()
    await page.getByRole('button', { name: 'Записать голос', exact: true }).click()
    await expect(page.getByText(/Запись · 00:0[1-9]/)).toBeVisible({ timeout: 10_000 })
    await page.getByRole('button', { name: 'Остановить и добавить', exact: true }).click()
    await expect(page.locator('.mobile-note-attachment audio')).toHaveAttribute('src', /^blob:/)
  }
  await navigate(page, 'home')
  await expect.poll(() => storedAssets(page)).toHaveLength(browserName === 'chromium' ? 2 : 1)
  const initial = await storedAssets(page)
  expect(initial.every((asset) => asset.size > 0)).toBe(true)
  await open(page, 'notes')
  await page.getByText('PWA attachments', { exact: true }).first().click()
  await expect(page.locator('.mobile-note-attachment img')).toHaveAttribute('src', /^blob:/)
  if (browserName === 'chromium') {
    await expect(page.locator('.mobile-note-attachment audio')).toHaveAttribute('src', /^blob:/)
    expect(
      await page
        .locator('.mobile-note-attachment audio')
        .evaluate(async (element: HTMLAudioElement) => {
          await element.play()
          element.pause()
          return element.readyState >= 2
        })
    ).toBe(true)
  }
  await localData(page)
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Создать backup', exact: true }).click()
  const backup = await downloading,
    path = await backup.path()
  await page.getByRole('button', { name: 'Восстановить из файла', exact: true }).click()
  const restore = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Выбрать файл', exact: true }).click()
  await (await restore).setFiles(path!)
  await expect(page.locator('.workspace')).toHaveAttribute('aria-busy', 'false')
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  expect(await storedAssets(page)).toEqual(initial)
  await navigate(page, 'notes')
  await page.getByText('PWA attachments', { exact: true }).first().click()
  await expect
    .poll(() =>
      page
        .locator('.mobile-note-attachment img')
        .evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)
    )
    .toBe(true)
  await page.getByRole('button', { name: 'Дополнительные действия', exact: true }).click()
  await page.getByRole('button', { name: 'Удалить заметку', exact: true }).click()
  await page.getByRole('button', { name: 'Удалить', exact: true }).last().click()
  await expect.poll(() => storedAssets(page)).toHaveLength(0)
})
