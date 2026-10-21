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
      expect.objectContaining({ src: '/icons/icon-192-v3.png', purpose: 'any' }),
      expect.objectContaining({ src: '/icons/icon-512-v3.png', purpose: 'any' }),
      expect.objectContaining({ src: '/icons/maskable-512-v3.png', purpose: 'maskable' })
    ])
  )
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0a0b0d')
})

test('Android splash PNGs have transparent margins, not a painted black square', async ({
  request
}) => {
  for (const [name, size] of [
    ['icon-192-v3', 192],
    ['icon-512-v3', 512],
    ['maskable-512-v3', 512]
  ] as const) {
    const response = await request.get(`/icons/${name}.png`)
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toContain('image/png')
    const file = await response.body()
    const { data, info } = await sharp(file)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    expect(info.width).toBe(size)
    expect(info.height).toBe(size)
    // The system splash paints the backdrop; transparency prevents a visible
    // rectangular matte around the original rounded-square logo.
    expect(data[3]).toBe(0)
    expect(data[(size - 1) * 4 + 3]).toBe(0)
    const center = (Math.floor(size / 2) * size + Math.floor(size / 2)) * 4
    expect(data[center + 3]).toBe(255)

    if (size === 512) {
      // Keep both the ordinary and maskable icon's outer safe zone empty.
      const x = Math.floor(size * 0.14)
      const y = Math.floor(size * 0.5)
      const offset = (y * size + x) * 4
      expect(data[offset + 3]).toBe(0)
    }
  }
})

test('Apple touch icon keeps a solid background and does not regress', async ({ request }) => {
  const response = await request.get('/icons/apple-touch-icon-v2.png')
  expect(response.ok()).toBe(true)
  const { data, info } = await sharp(await response.body())
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  expect(info.width).toBe(180)
  expect(info.height).toBe(180)
  expect(Array.from(data.subarray(0, 4))).toEqual([10, 11, 13, 255])
})
