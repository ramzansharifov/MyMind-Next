import { test, expect, open, createNote, navigate, storedAssets } from './helpers'

test('a real service-worker replacement waits for windows to close and preserves SQLite and attachments', async ({
  page,
  context,
  browserName
}) => {
  await open(page, 'notes')
  await createNote(page, 'Worker update fixture')
  await page.locator('.notes-editor').fill('Saved before service worker activation')
  await page.getByRole('button', { name: 'Вставить изображение', exact: true }).click()
  const choosing = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Выбрать', exact: true }).last().click()
  await (
    await choosing
  ).setFiles({
    name: 'before-update.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aShoAAAAASUVORK5CYII=',
      'base64'
    )
  })
  await expect(page.locator('.mobile-note-attachment img')).toBeVisible()
  await page.getByRole('button', { name: 'Закрыть', exact: true }).last().click()
  await navigate(page, 'home')
  await expect(page.locator('.save-status')).toHaveText('Сохранено на устройстве')
  const before = await page.evaluate(async () => {
    const list = await window.api.notes.listOverview()
    return window.api.notes.getNote(
      list.notes.find((note) => note.title === 'Worker update fixture')!.id
    )
  })
  const assets = await storedAssets(page)
  expect(assets).toHaveLength(1)
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    const registration = await navigator.serviceWorker.register('/sw.js?parity-upgrade=1', {
      scope: '/',
      updateViaCache: 'none'
    })
    if (registration.waiting) return
    await new Promise<void>((resolve, reject) => {
      const watch = (): void => {
        const worker = registration.installing
        if (!worker) return
        const changed = (): void => {
          if (worker.state === 'installed') resolve()
          if (worker.state === 'redundant')
            reject(new Error('Replacement worker failed to install'))
        }
        worker.addEventListener('statechange', changed)
        changed()
      }
      registration.addEventListener('updatefound', watch)
      watch()
    })
  })
  expect(await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).not.toContain(
    'parity-upgrade'
  )
  const replacement = context
    .serviceWorkers()
    .find((worker) => worker.url().includes('parity-upgrade=1'))
  if (browserName === 'chromium') expect(replacement).toBeDefined()
  await page.close()
  // Creating a new client before activation can keep the waiting worker blocked.
  // Observe the worker without an open window, matching an actual closed-app update.
  // Playwright exposes worker execution contexts only for Chromium. WebKit verifies
  // the activated controller in the reopened window below, together with the data.
  if (replacement) {
    await expect
      .poll(() =>
        replacement.evaluate(() => {
          const scope = self as unknown as { registration: ServiceWorkerRegistration }
          return {
            state: scope.registration.active?.state,
            url: scope.registration.active?.scriptURL
          }
        })
      )
      .toEqual({ state: 'activated', url: replacement.url() })
  }
  const reopened = await context.newPage()
  const errors: string[] = []
  reopened.on('pageerror', (error) => errors.push(error.message))
  reopened.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await reopened.goto('/#notes')
  await expect(reopened.locator('.module')).toBeVisible()
  await expect
    .poll(() => reopened.evaluate(() => navigator.serviceWorker.controller?.scriptURL))
    .toContain('parity-upgrade=1')
  expect(await reopened.evaluate((id) => window.api.notes.getNote(id), before.id)).toEqual(before)
  expect(await storedAssets(reopened)).toEqual(assets)
  await reopened.getByRole('button', { name: 'Worker update fixture', exact: true }).click()
  await expect(reopened.locator('.notes-editor')).toContainText(
    'Saved before service worker activation'
  )
  await expect
    .poll(() =>
      reopened
        .locator('.mobile-note-attachment img')
        .evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)
    )
    .toBe(true)
  expect(errors).toEqual([])
  await reopened.close()
})
