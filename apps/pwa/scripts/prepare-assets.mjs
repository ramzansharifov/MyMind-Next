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
// Keep ordinary PWA icons transparent, but NEVER ship transparency for a
// maskable icon. The Web App Manifest specification requires user agents to
// composite transparent maskable pixels onto an arbitrary solid fill; Android
// can choose black, producing a visible rectangular matte on the splash.
// Maskable PNGs must instead be fully opaque RGB, using exactly the same
// background as manifest.background_color. The source artwork is already
// transparent outside its rounded-square logo.

const darkBackground = '#0a0b0d'
const icons = [
  { name: 'icon-192', size: 192, scale: 0.9, transparent: true },
  { name: 'icon-512', size: 512, scale: 0.56, transparent: true },
  // Android can crop to arbitrary masks; important pixels stay in the safe zone.
  { name: 'maskable-512', size: 512, scale: 0.56, transparent: false },
  { name: 'apple-touch-icon', size: 180, scale: 0.9, transparent: false }
]
for (const { name, size, scale, transparent } of icons) {
  const artwork = await sharp(icon)
    .resize(Math.round(size * scale), Math.round(size * scale), { fit: 'contain' })
    .png()
    .toBuffer()
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: transparent ? { r: 0, g: 0, b: 0, alpha: 0 } : darkBackground
    }
  }).composite([{ input: artwork, gravity: 'centre' }])
  // Also strip the alpha *channel* from opaque PNGs: Android adaptive splash
  // resources should be RGB/24-bit, not only RGBA/32-bit with alpha = 255.
  const image = await (transparent ? canvas : canvas.removeAlpha()).png().toBuffer()

  // Retain previous URLs for older manifests and notification icons. A new
  // versioned URL ensures Android WebAPK notices the revised maskable image.
  const names =
    name === 'apple-touch-icon'
      ? [name, `${name}-v2`]
      : [name, `${name}-v2`, `${name}-v3`, `${name}-v4`]
  for (const filename of names) {
    await writeFile(path.join(root, 'public/icons', `${filename}.png`), image)
  }
}
