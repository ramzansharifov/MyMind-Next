import { readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
async function files(directory, prefix) {
  const result = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = `${prefix}/${entry.name}`
    if (entry.isDirectory()) result.push(...(await files(path.join(directory, entry.name), url)))
    else if (!entry.name.endsWith('.map')) result.push(url)
  }
  return result
}
const assets = [
  '/',
  '/manifest.webmanifest',
  ...(await files(path.join(root, '.next/static'), '/_next/static')),
  ...(await files(path.join(root, 'public/icons'), '/icons')),
  ...(await files(path.join(root, 'public/tldraw'), '/tldraw')),
  '/sqlite/sql-wasm.wasm'
]
const buildId = (await readFile(path.join(root, '.next/BUILD_ID'), 'utf8')).trim()
const version = createHash('sha256')
  .update(buildId)
  .update(JSON.stringify(assets))
  .digest('hex')
  .slice(0, 16)
const template = await readFile(path.join(root, 'scripts/service-worker.template.js'), 'utf8')
await writeFile(
  path.join(root, 'public/sw.js'),
  template.replaceAll('__VERSION__', version).replaceAll('__PRECACHE__', JSON.stringify(assets))
)
console.log(`PWA offline cache: ${assets.length} resources (${version})`)
