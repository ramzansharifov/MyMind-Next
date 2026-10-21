import sharp from 'sharp'
import { test, expect, open } from './helpers'

const shellColor = [10, 11, 13] as const

test('WebAPK keeps its identity and uses one consistent version of all icons', async ({ page }) => {
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
      expect.objectContaining({ src: '/icons/icon-192-v5.png', purpose: 'any' }),
      expect.objectContaining({ src: '/icons/icon-512-v5.png', purpose: 'any' }),
      expect.objectContaining({ src: '/icons/maskable-512-v5.png', purpose: 'maskable' })
    ])
  )
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0a0b0d')
})

test('all Android launch and launcher icons have opaque Game Hub-style full-bleed backgrounds', async ({
  request
}) => {
  for (const [name, size] of [
    ['icon-192-v5', 192],
    ['icon-512-v5', 512],
    ['maskable-512-v5', 512]
  ] as const) {
    const response = await request.get(`/icons/${name}.png`)
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toContain('image/png')
    const raw = await response.body()
    const metadata = await sharp(raw).metadata()
    expect(metadata.width).toBe(size)
    expect(metadata.height).toBe(size)
    expect(metadata.channels).toBe(3)
    expect(metadata.hasAlpha).toBe(false)

    const { data, info } = await sharp(raw).raw().toBuffer({ resolveWithObject: true })
    const pixel = (x: number, y: number): number[] => {
      const offset = (y * info.width + x) * info.channels
      return Array.from(data.subarray(offset, offset + info.channels))
    }
    // Android must never choose a different fill for transparent corners.
    expect(pixel(0, 0)).toEqual([...shellColor])
    expect(pixel(size - 1, 0)).toEqual([...shellColor])
    expect(pixel(0, size - 1)).toEqual([...shellColor])
    expect(pixel(size - 1, size - 1)).toEqual([...shellColor])
    expect(pixel(Math.floor(size * 0.08), Math.floor(size * 0.5))).toEqual([...shellColor])
    expect(pixel(Math.floor(size * 0.5), Math.floor(size * 0.5))).not.toEqual([...shellColor])
  }
})

test('regular and maskable artwork use the same proportions as Game Hub', async ({ request }) => {
  const extents = []
  for (const name of ['icon-512-v5', 'maskable-512-v5']) {
    const response = await request.get(`/icons/${name}.png`)
    expect(response.ok()).toBe(true)
    const { data, info } = await sharp(await response.body())
      .raw()
      .toBuffer({ resolveWithObject: true })

    let first = info.width
    let last = 0
    for (let x = 0; x < info.width; x++) {
      let nonBackground = false
      for (let y = 0; y < info.height; y++) {
        const offset = (y * info.width + x) * info.channels
        if (
          data[offset] !== shellColor[0] ||
          data[offset + 1] !== shellColor[1] ||
          data[offset + 2] !== shellColor[2]
        ) {
          nonBackground = true
          break
        }
      }
      if (nonBackground) {
        first = Math.min(first, x)
        last = Math.max(last, x)
      }
    }
    extents.push((last - first + 1) / info.width)
  }
  // The artwork inside the original 1024x1024 PNG is itself inset, so actual
  // bounds are smaller than the 91% and 72% image placement used by Game Hub.
  expect(extents[0]).toBeGreaterThan(0.7)
  expect(extents[0]).toBeLessThan(0.9)
  expect(extents[1]).toBeGreaterThan(0.52)
  expect(extents[1]).toBeLessThan(0.72)
  expect(extents[0]).toBeGreaterThan(extents[1])
})

test('Apple touch icon also uses opaque background', async ({ request }) => {
  const response = await request.get('/icons/apple-touch-icon-v5.png')
  expect(response.ok()).toBe(true)
  const { data, info } = await sharp(await response.body())
    .raw()
    .toBuffer({ resolveWithObject: true })
  expect(info.width).toBe(180)
  expect(info.height).toBe(180)
  expect(info.channels).toBe(3)
  expect(Array.from(data.subarray(0, 3))).toEqual([...shellColor])
})
