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
// The source icon already has transparency outside its rounded-square mark.
// Android's own splash screen paints the background from manifest.background_color;
// compositing the splash PNG onto a solid dark square makes that square visible.
// Keep normal AND maskable Android icons transparent (with inset artwork) while
// retaining the platform-appropriate opaque icon for iOS home-screen shortcuts.
const darkBackground = '#0a0b0d'
const icons = [
  { name: 'icon-192', size: 192, scale: 0.9, transparent: true },
  { name: 'icon-512', size: 512, scale: 0.56, transparent: true },
  // Keep the artwork inside the maskable icon safe zone: Android may crop edges.
  { name: 'maskable-512', size: 512, scale: 0.56, transparent: true },
  { name: 'apple-touch-icon', size: 180, scale: 0.9, transparent: false }
]
for (const { name, size, scale, transparent } of icons) {
  const artwork = await sharp(icon)
    .resize(Math.round(size * scale), Math.round(size * scale), { fit: 'contain' })
    .png()
    .toBuffer()
  const image = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : darkBackground
    }
  })
    .composite([{ input: artwork, gravity: 'centre' }])
    .png()
    .toBuffer()

  // Preserve URLs referenced by older installed/cached manifests. New versioned
  // URLs force Chrome/WebAPK to re-download the changed transparent artwork.
  const names = transparent ? [name, `${name}-v2`, `${name}-v3`] : [name, `${name}-v2`]
  for (const filename of names) {
    await writeFile(path.join(root, 'public/icons', `${filename}.png`), image)
  }
}
