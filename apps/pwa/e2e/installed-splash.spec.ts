import sharp from 'sharp'
import { test, expect, open } from './helpers'

test('installed MyMind manifest refreshes icon metadata without changing app identity', async ({
  page
}) => {
  await open(page, 'home')
  const response = await page.request.get('/manifest.webmanifest')
  expect(response.ok()).toBe(true)
  const manifest = await response.json()
  expect(manifest.id).toBe('/')
  expect(manifest.start_url).toBe('/')
  expect(manifest.scope).toBe('/')
  expect(manifest.display).toBe('standalone')
  expect(manifest.background_color).toBe('#0a0b0d')
  expect(manifest.theme_color).toBe('#0a0b0d')
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ src: '/icons/icon-192-v2.png', purpose: 'any' }),
      expect.objectContaining({ src: '/icons/icon-512-v2.png', purpose: 'any' }),
      expect.objectContaining({ src: '/icons/maskable-512-v2.png', purpose: 'maskable' })
    ])
  )
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0a0b0d')
})

test('launch artwork is smaller, padded and matches the native dark background', async ({
  request
}) => {
  for (const [name, size] of [
    ['icon-192-v2', 192],
    ['icon-512-v2', 512],
    ['maskable-512-v2', 512]
  ] as const) {
    const response = await request.get(`/icons/${name}.png`)
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toContain('image/png')
    const file = await response.body()
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    expect(info.width).toBe(size)
    expect(info.height).toBe(size)
    expect(Array.from(data.subarray(0, 4))).toEqual([10, 11, 13, 255])

    if (size === 512) {
      // Android crops maskable artwork; outside the central safe zone should
      // be only the shell background, with no dark square or visible logo.
      const x = Math.floor(size * 0.14)
      const y = Math.floor(size * 0.5)
      const offset = (y * size + x) * 4
      expect(Array.from(data.subarray(offset, offset + 4))).toEqual([10, 11, 13, 255])
      const center = (Math.floor(size / 2) * size + Math.floor(size / 2)) * 4
      expect(Array.from(data.subarray(center, center + 3))).not.toEqual([10, 11, 13])
    }
  }
})
