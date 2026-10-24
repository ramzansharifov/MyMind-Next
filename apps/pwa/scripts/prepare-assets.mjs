import { mkdir, copyFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
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
const icon = path.resolve(root, 'assets/icon.png')

// Match the proven Game Hub WebAPK artwork layout:
//   regular icons: symbol occupies 91% of the image
//   maskable icon: symbol occupies 72% of the image
// All icons have a solid, full-bleed background matching manifest.background_color.
// Android may use either the ordinary or maskable PNG on its native splash, so
// mixing transparent and opaque icons can produce a visible black square.
// Freeze WebAPK install resources across routine site releases. Android caches
// launcher/splash artwork inside its APK, independently of the service worker.
// Changing pixels without consciously versioning URLs can leave an installed
// WebAPK with stale artwork even though the site's code has updated.
const lockedPixelHashes = {
  'icon-192': 'c6837d25c764c3aa8d77eca9dc7de5dc0167787ee82e0b8d6f71a538fddfaacc',
  'icon-512': 'd26dbd11c53d10437ada21ca35ba39bdc5125efc347b6aac09291d633174806f',
  'maskable-512': '29cef167462687575c4fb6d13984d00c314f673517405c6a12c6b9bbc8481cf0',
  'apple-touch-icon': '91944f44f97a7ff75df949f810bd8c5ae1a490dc897e0289029216efe81c7f45'
}
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

  const pixelHash = createHash('sha256')
    .update(await sharp(image).raw().toBuffer())
    .digest('hex')
  if (pixelHash !== lockedPixelHashes[name]) {
    throw new Error(
      `Install icon ${name} changed unexpectedly. Do not silently overwrite WebAPK icons. ` +
        'Review the new image, bump icon URLs in the manifest and metadata, and deliberately update the locked pixel hashes.'
    )
  }

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
