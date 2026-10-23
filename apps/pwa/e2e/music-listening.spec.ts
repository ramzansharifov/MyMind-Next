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
  await expect(page.getByRole('button', { name: 'YouTube', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Audius', exact: true }).click()
  await expect(page.getByRole('tab', { name: 'Слушать' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('button', { name: 'Воспроизвести Night Sky' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Поиск музыки' }).fill('Night')
  await expect(page.getByRole('button', { name: 'Воспроизвести Night Sky' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Воспроизвести Quiet Sea' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Сохранить Night Sky в библиотеку' }).click()
  await page.getByRole('button', { name: 'Мои треки' }).click()
  await expect(page.getByRole('button', { name: 'Воспроизвести Night Sky' })).toBeVisible()
  await page.getByRole('tab', { name: 'Моя библиотека' }).click()
  await expect(page.getByRole('button', { name: 'Night Sky', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Слушать' }).click()
  await expect(page.getByRole('button', { name: 'Воспроизвести Night Sky' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Мои треки' })).toBeVisible()
  await page.getByRole('button', { name: 'Мои треки' }).click()
  await expect(page.getByRole('button', { name: 'Воспроизвести Night Sky' })).toBeVisible()
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
  await page.getByRole('button', { name: 'Audius', exact: true }).click()
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

test('music: YouTube default, stream bridge, SoundCloud search, and My Wave radio', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 })
  const youtube = [
    { key: 'youtube:abcdefghijk', provider: 'youtube', id: 'abcdefghijk',
      title: 'YouTube Song', artist: 'Channel', durationSeconds: 198,
      artworkUrl: null, streamUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
      permalink: 'https://www.youtube.com/watch?v=abcdefghijk' },
    { key: 'youtube:lmnopqrstuv', provider: 'youtube', id: 'lmnopqrstuv',
      title: 'YouTube Similar', artist: 'Other', durationSeconds: 210,
      artworkUrl: null, streamUrl: 'https://www.youtube.com/watch?v=lmnopqrstuv',
      permalink: 'https://www.youtube.com/watch?v=lmnopqrstuv' }
  ]
  await page.route('**/api/music/discover', async route => {
    const data = route.request().postDataJSON() as { provider?: string }
    await route.fulfill({ json: { tracks: data.provider === 'soundcloud'
      ? [{ ...youtube[0], key: 'soundcloud:artist/song', provider: 'soundcloud',
          id: 'artist/song', streamUrl: 'https://soundcloud.com/artist/song',
          permalink: 'https://soundcloud.com/artist/song' }]
      : youtube } })
  })
  await page.route('**/api/music/resolve', async route => {
    await route.fulfill({ json: { streamUrl: 'https://example.com/stream.mp3' } })
  })
  await page.route('**/api/music/radio', async route => {
    await route.fulfill({ json: { tracks: youtube } })
  })
  await page.route('https://example.com/stream.mp3', async route =>
    route.fulfill({ status: 200, contentType: 'audio/mpeg', body: Buffer.from([]) })
  )
  await open(page, 'music')
  await expect(page.getByRole('button', { name: 'YouTube', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Воспроизвести YouTube Song' })).toBeVisible()
  await page.getByRole('button', { name: 'Воспроизвести YouTube Song' }).click()
  await expect(page.getByRole('region', { name: 'Музыкальный проигрыватель' })).toBeVisible()
  await page.getByRole('button', { name: 'Моя волна по треку YouTube Song' }).click()
  await expect(page.getByRole('button', { name: /YouTube Similar/ })).toBeVisible()
  await page.getByRole('button', { name: 'SoundCloud', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Воспроизвести YouTube Song' })).toBeVisible()
})
