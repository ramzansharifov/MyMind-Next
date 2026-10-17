import { test, expect, open, save, storedAssets } from './helpers'

test('workouts: progress photo persists, measurement edits, deletion removes local files', async ({
  page
}) => {
  await open(page, 'workouts')
  await page.getByRole('button', { name: 'Прогресс', exact: true }).click()
  await page.getByRole('button', { name: 'Зафиксировать прогресс', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Вес тела, кг', exact: true }).fill('75')
  await page.getByRole('textbox', { name: 'Самочувствие', exact: true }).fill('PWA progress note')
  await page.getByRole('button', { name: 'Добавить запись', exact: true }).click()
  const upload = page.getByRole('button', { name: /Добавить фото спереди за/ })
  if (!(await upload.isVisible()))
    await page.getByRole('button', { name: /Развернуть или свернуть запись прогресса за/ }).click()
  const choosing = page.waitForEvent('filechooser')
  await upload.click()
  await (
    await choosing
  ).setFiles({
    name: 'progress.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aShoAAAAASUVORK5CYII=',
      'base64'
    )
  })
  await expect.poll(() => storedAssets(page)).toHaveLength(1)
  await open(page, 'workouts')
  await page.getByRole('button', { name: 'Прогресс', exact: true }).click()
  const image = page.locator('img[src^="blob:"]').first()
  await expect(image).toBeVisible()
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)
    )
    .toBe(true)
  await page.getByRole('button', { name: /Изменить прогресс за/ }).click()
  await expect(page.getByRole('spinbutton', { name: 'Вес тела, кг', exact: true })).toHaveValue(
    '75'
  )
  await page.getByRole('spinbutton', { name: 'Вес тела, кг', exact: true }).fill('74.5')
  await save(page)
  await open(page, 'workouts')
  await page.getByRole('button', { name: 'Прогресс', exact: true }).click()
  await page.getByRole('button', { name: /Изменить прогресс за/ }).click()
  await expect(page.getByRole('spinbutton', { name: 'Вес тела, кг', exact: true })).toHaveValue(
    '74.5'
  )
  await page.getByRole('button', { name: 'Отмена', exact: true }).click()
  await page.getByRole('button', { name: /Удалить прогресс за/ }).click()
  await page.getByRole('button', { name: 'Удалить', exact: true }).last().click()
  await expect.poll(() => storedAssets(page)).toHaveLength(0)
  await open(page, 'workouts')
  await page.getByRole('button', { name: 'Прогресс', exact: true }).click()
  await expect(page.getByText('PWA progress note', { exact: true })).toHaveCount(0)
})
