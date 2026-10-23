import { test, expect, open } from './helpers'

const sample = [
  { key: 'audius:alpha', provider: 'audius', id: 'alpha', title: 'Night Sky',
    artist: 'Orion', durationSeconds: 205, artworkUrl: null,
    streamUrl: 'https://api.audius.co/v1/tracks/alpha/stream', permalink: null },
  { key: 'audius:beta', provider: 'audius', id: 'beta', title: 'Quiet Sea',
    artist: 'Nova', durationSeconds: 190, artworkUrl: null,
    streamUrl: 'https://api.audius.co/v1/tracks/beta/stream', permalink: null }
]

test('music: discovery search and saving a result into existing music library', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 })
  await page.route('**/api/music/discover', async (route) => {
    const payload = route.request().postDataJSON() as { query?: string }
    await route.fulfill({ json: {
      tracks: payload.query ? sample.filter((item) => item.title.toLowerCase().includes(payload.query!.toLowerCase())) : sample
    } })
  })
  await open(page, 'music')
  await expect(page.getByRole('tab', { name: 'Слушать' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('button', { name: 'Воспроизвести Night Sky' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Поиск музыки' }).fill('Night')
  await expect(page.getByRole('button', { name: 'Воспроизвести Night Sky' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Воспроизвести Quiet Sea' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Сохранить Night Sky в библиотеку' }).click()
  await page.getByRole('tab', { name: 'Моя библиотека' }).click()
  await expect(page.getByRole('button', { name: 'Night Sky', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Слушать' }).click()
  await expect(page.getByRole('textbox', { name: 'Поиск музыки' })).toHaveValue('Night')
})

test('music: queue, transport, and Jamendo settings render without paid credentials', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.route('**/api/music/discover', async (route) => {
    const payload = route.request().postDataJSON() as { provider: string }
    const tracks = payload.provider === 'audius' ? sample : [{
      key: 'jamendo:7', provider: 'jamendo', id: '7', title: 'Free Wave', artist: 'Studio',
      durationSeconds: 160, artworkUrl: null, streamUrl: 'https://example.com/music.mp3', permalink: null
    }]
    await route.fulfill({ json: { tracks } })
  })
  await page.route('https://api.audius.co/v1/tracks/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'audio/mpeg', body: Buffer.from([]) })
  })
  await open(page, 'music')
  await page.getByRole('button', { name: 'Воспроизвести Night Sky' }).click()
  await expect(page.getByRole('region', { name: 'Музыкальный проигрыватель' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Следующий трек' })).toBeVisible()
  await page.getByRole('button', { name: 'Очередь' }).click()
  await expect(page.getByRole('button', { name: '2. Quiet Sea / Nova' })).toBeVisible()
  await page.getByRole('button', { name: 'Случайный порядок' }).click()
  await expect(page.getByRole('button', { name: 'Случайный порядок' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Jamendo', exact: true }).click()
  await expect(page.getByText('Для Jamendo нужен бесплатный client_id')).toBeVisible()
  await page.getByRole('button', { name: 'Источники' }).click()
  await page.getByRole('textbox', { name: 'Jamendo client_id' }).fill('demo123')
  await expect(page.getByRole('button', { name: 'Воспроизвести Free Wave' })).toBeVisible()
})
