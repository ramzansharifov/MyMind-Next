import { mkdir, copyFile } from 'node:fs/promises'
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
for (const [name, size] of [
  ['icon-192', 192],
  ['icon-512', 512],
  ['maskable-512', 512],
  ['apple-touch-icon', 180]
]) {
  await sharp(icon)
    .resize(size, size, { fit: 'contain', background: '#13111c' })
    .png()
    .toFile(path.join(root, 'public/icons', `${name}.png`))
}
