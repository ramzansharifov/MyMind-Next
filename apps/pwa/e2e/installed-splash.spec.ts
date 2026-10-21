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
      expect.objectContaining({ src: '/icons/icon-192-v4.png', purpose: 'any' }),
      expect.objectContaining({ src: '/icons/icon-512-v4.png', purpose: 'any' }),
      expect.objectContaining({ src: '/icons/maskable-512-v4.png', purpose: 'maskable' })
    ])
  )
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0a0b0d')
})

test('ordinary Android icons keep transparent margins without a painted square', async ({
  request
}) => {
  for (const [name, size] of [
    ['icon-192-v4', 192],
    ['icon-512-v4', 512]
  ] as const) {
    const response = await request.get(`/icons/${name}.png`)
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toContain('image/png')
    const file = await response.body()
    const metadata = await sharp(file).metadata()
    expect(metadata.hasAlpha).toBe(true)

    const { data, info } = await sharp(file)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    expect(info.width).toBe(size)
    expect(info.height).toBe(size)
    expect(data[3]).toBe(0)
    expect(data[(size - 1) * 4 + 3]).toBe(0)
    const center = (Math.floor(size / 2) * size + Math.floor(size / 2)) * 4
    expect(data[center + 3]).toBe(255)
  }
})

test('maskable WebAPK splash icon has opaque 24-bit RGB matching background_color', async ({
  request
}) => {
  const response = await request.get('/icons/maskable-512-v4.png')
  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toContain('image/png')
  const file = await response.body()
  const metadata = await sharp(file).metadata()
  expect(metadata.width).toBe(512)
  expect(metadata.height).toBe(512)
  expect(metadata.channels).toBe(3)
  expect(metadata.hasAlpha).toBe(false)

  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true })
  const pixel = (x: number, y: number): number[] => {
    const offset = (y * info.width + x) * info.channels
    return Array.from(data.subarray(offset, offset + info.channels))
  }
  // No transparent pixels for Android to composite onto an arbitrary (black)
  // system fill; all outer pixels are exactly the splash background color.
  expect(pixel(0, 0)).toEqual([10, 11, 13])
  expect(pixel(511, 511)).toEqual([10, 11, 13])
  expect(pixel(Math.floor(512 * 0.14), 256)).toEqual([10, 11, 13])
  expect(pixel(256, 256)).not.toEqual([10, 11, 13])
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
