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

// Match the proven Game Hub WebAPK artwork layout:
//   regular icons: symbol occupies 91% of the image
//   maskable icon: symbol occupies 72% of the image
// All icons have a solid, full-bleed background matching manifest.background_color.
// Android may use either the ordinary or maskable PNG on its native splash, so
// mixing transparent and opaque icons can produce a visible black square.
const backgroundColor = '#0a0b0d'
const icons = [
  { name: 'icon-192', size: 192, scale: 0.91 },
  { name: 'icon-512', size: 512, scale: 0.91 },
  { name: 'maskable-512', size: 512, scale: 0.72 },
  { name: 'apple-touch-icon', size: 180, scale: 0.91 }
]
for (const { name, size, scale } of icons) {
  const artwork = await sharp(icon)
    .resize(Math.round(size * scale), Math.round(size * scale), { fit: 'contain' })
    .png()
    .toBuffer()
  const image = await sharp({
    create: { width: size, height: size, channels: 3, background: backgroundColor }
  })
    .composite([{ input: artwork, gravity: 'centre' }])
    .removeAlpha()
    .png()
    .toBuffer()

  // Leave legacy URLs available for cached manifests and old notifications.
  // A fresh icon URL makes Chrome/WebAPK download the complete new icon family.
  const names =
    name === 'apple-touch-icon'
      ? [name, `${name}-v2`, `${name}-v5`]
      : [name, `${name}-v2`, `${name}-v3`, `${name}-v4`, `${name}-v5`]
  for (const filename of names) {
    await writeFile(path.join(root, 'public/icons', `${filename}.png`), image)
  }
}
