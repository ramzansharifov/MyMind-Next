import { mkdir, copyFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
await mkdir(path.join(root, 'public/sqlite'), { recursive: true })
await mkdir(path.join(root, 'public/icons'), { recursive: true })
await copyFile(
  require.resolve('sql.js/dist/sql-wasm-browser.wasm'),
  path.join(root, 'public/sqlite/sql-wasm.wasm')
)
const icon = path.resolve(root, '../mobile/assets/icon.png')
// Keep the native splash and the background around installed PWA artwork in
// sync with MyMind's actual dark shell. The original icon contains transparent
// margins: resizing it directly preserves those margins but leaves the older
// violet-black background around a disproportionately large icon.
const background = '#0a0b0d'
const icons = [
  { name: 'icon-192', size: 192, scale: 0.9 },
  { name: 'icon-512', size: 512, scale: 0.56 },
  // A maskable square needs full-bleed background and artwork within the
  // inscribed-circle safe zone (56% of its width).
  { name: 'maskable-512', size: 512, scale: 0.56 },
  { name: 'apple-touch-icon', size: 180, scale: 0.9 }
]
for (const { name, size, scale } of icons) {
  const artwork = await sharp(icon)
    .resize(Math.round(size * scale), Math.round(size * scale), { fit: 'contain' })
    .png()
    .toBuffer()
  const image = await sharp({
    create: { width: size, height: size, channels: 4, background }
  })
    .composite([{ input: artwork, gravity: 'centre' }])
    .png()
    .toBuffer()

  // Old paths remain available for previously cached manifests/notifications.
  // New URLs tell Chrome that installed icon metadata changed (Chrome 144+
  // no longer re-downloads unchanged icon URLs during manifest updates).
  for (const filename of [name, `${name}-v2`]) {
    await writeFile(path.join(root, 'public/icons', `${filename}.png`), image)
  }
}
