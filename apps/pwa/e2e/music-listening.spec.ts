import { test, expect, open } from './helpers'

const sample = [
  { key: 'audius:alpha', provider: 'audius', id: 'alpha', title: 'Night Sky',
    artist: 'Orion', durationSeconds: 205, artworkUrl: null,
    streamUrl: 'https://api.audius.co/v1/tracks/alpha/stream', permalink: null },
  { key: 'audius:beta', provider: 'audius', id: 'beta', title: 'Quiet Sea',
    artist: 'Nova', durationSeconds: 190, artworkUrl: null,
    streamUrl: 'https://api.audius.co/v1/tracks/beta/stream', permalink: null }
]

test('music: universal search, saving, favorites and persistence without legacy library', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 })
  await page.route('**/api/music/discover', async (route) => {
    const payload = route.request().postDataJSON() as { query?: string }
    await route.fulfill({ json: {
      tracks: payload.query ? sample.filter(item => item.title.toLowerCase().includes(payload.query!.toLowerCase())) : sample
    } })
  })
  await open(page, 'music')
  await expect(page.getByRole('button', { name: 'Добавить музыку', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Из JSON', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Поиск', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Audius', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'SoundCloud', exact: true })).toHaveCount(0)
  await page.getByRole('textbox', { name: 'Поиск музыки' }).fill('Night')
  await expect(page.getByRole('button', { name: 'Воспроизвести Night Sky' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Воспроизвести Quiet Sea' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Сохранить Night Sky в библиотеку' }).click()
  await page.getByRole('button', { name: 'Избранное: Night Sky' }).click()
  await page.getByRole('button', { name: 'Избранное (1)' }).click()
  await expect(page.getByRole('button', { name: 'Воспроизвести Night Sky' })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Избранное (1)' }).click()
  await expect(page.getByRole('button', { name: 'Воспроизвести Night Sky' })).toBeVisible()
  await page.getByRole('button', { name: 'Удалить Night Sky из сохранённых' }).click()
  await expect(page.getByRole('button', { name: 'Воспроизвести Night Sky' })).toHaveCount(0)
})

test('music: universal search retains playback controls and optional Jamendo configuration', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.route('**/api/music/discover', async (route) => {
    const payload = route.request().postDataJSON() as { provider?: string; jamendoClientId?: string }
    expect(payload.provider).toBe('all')
    const extras = payload.jamendoClientId ? [{
      key: 'jamendo:7', provider: 'jamendo', id: '7', title: 'Free Wave', artist: 'Studio',
      durationSeconds: 160, artworkUrl: null, streamUrl: 'https://example.com/music.mp3', permalink: null
    }] : []
    await route.fulfill({ json: { tracks: [...sample, ...extras] } })
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
  await page.getByRole('button', { name: 'Настройки поиска' }).click()
  await page.getByRole('textbox', { name: 'Jamendo client_id' }).fill('demo123')
  await expect(page.getByRole('button', { name: 'Воспроизвести Free Wave' })).toBeVisible()
})

test('music: one search finds YouTube and SoundCloud together, streams and starts My Wave', async ({ page }) => {
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
    expect(data.provider).toBe('all')
    await route.fulfill({ json: { tracks: [...youtube, {
      ...youtube[0], title: 'SoundCloud Song', key: 'soundcloud:artist/song', provider: 'soundcloud',
      id: 'artist/song', streamUrl: 'https://soundcloud.com/artist/song',
      permalink: 'https://soundcloud.com/artist/song'
    }] } })
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
  await expect(page.getByRole('button', { name: 'Поиск', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'YouTube', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'SoundCloud', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Воспроизвести YouTube Song' })).toBeVisible()
  await page.getByRole('button', { name: 'Воспроизвести YouTube Song' }).click()
  await expect(page.getByRole('region', { name: 'Музыкальный проигрыватель' })).toBeVisible()
  await page.getByRole('button', { name: 'Моя волна по треку YouTube Song' }).click()
  await expect(page.getByRole('button', { name: '2. YouTube Similar / Other', exact: true })).toBeVisible()
  await expect(page.getByText('ОБЩИЙ ПОИСК')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Воспроизвести YouTube Song' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Воспроизвести SoundCloud Song' })).toBeVisible()
})

test('music: a failed discovery shows an actionable error and retry loads tracks', async ({ page }) => {
  let attempts = 0
  await page.route('**/api/music/discover', async (route) => {
    attempts += 1
    if (attempts === 1) {
      await route.fulfill({ status: 200, json: { error: 'YouTube временно недоступен' } })
    } else {
      await route.fulfill({ json: {
        tracks: [{
          key: 'youtube:abcdefghijk', provider: 'youtube', id: 'abcdefghijk',
          title: 'Recovered Song', artist: 'Band', durationSeconds: 180,
          artworkUrl: null, streamUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
          permalink: 'https://www.youtube.com/watch?v=abcdefghijk'
        }]
      } })
    }
  })
  await open(page, 'music')
  await expect(page.locator('.mymusic-message[role="alert"]')).toContainText('YouTube временно недоступен')
  await expect(page.getByText('Загружаем музыку…')).toHaveCount(0)
  await page.getByRole('button', { name: 'Повторить поиск' }).click()
  await expect(page.getByRole('button', { name: 'Воспроизвести Recovered Song' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Повторить поиск' })).toHaveCount(0)
  expect(attempts).toBe(2)
})


test('music: partial source outage keeps the successful results visible', async ({ page }) => {
  await page.route('**/api/music/discover', async route => {
    await route.fulfill({ json: { tracks: sample, partial: true } })
  })
  await open(page, 'music')
  await expect(page.getByRole('button', { name: 'Воспроизвести Night Sky' })).toBeVisible()
  await expect(page.getByText('Часть музыкальных источников временно недоступна. Показаны найденные треки.')).toBeVisible()
})

test('music: immersive discovery home, interactive moods and persistent bottom player', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 740 })
  const queries: string[] = []
  await page.route('**/api/music/discover', async route => {
    const payload = route.request().postDataJSON() as { provider?: string; query?: string }
    expect(payload.provider).toBe('all')
    queries.push(payload.query ?? '')
    await route.fulfill({ json: { tracks: sample } })
  })
  await open(page, 'music')
  await expect(page.getByRole('heading', { name: 'Продолжить' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Моя волна' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Открывай новое' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Слушать Night Sky', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Слушать волну' })).toBeDisabled()
  const player = page.getByRole('region', { name: 'Музыкальный проигрыватель' })
  await expect(player).toBeVisible()
  await expect(player).toHaveCSS('position', 'fixed')
  await expect(player.getByText('Ничего не играет')).toBeVisible()
  await page.getByRole('button', { name: 'Relax', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Поиск музыки' })).toHaveValue('relax music')
  await expect(page.getByRole('heading', { name: 'Результаты поиска' })).toBeVisible()
  await expect.poll(() => queries.includes('relax music')).toBe(true)
  await page.getByRole('button', { name: 'Всё', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Открывай новое' })).toBeVisible()
  await page.getByRole('button', { name: 'Слушать Night Sky', exact: true }).click()
  await expect(player.getByText('Night Sky')).toBeVisible()
})
