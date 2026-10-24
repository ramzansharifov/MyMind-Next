import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const version = process.argv[2]?.trim()
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version ?? '')) {
  throw new Error('Usage: node scripts/set-release-version.mjs <major.minor.patch>')
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workspaces = ['apps/desktop', 'apps/pwa']
const lockPath = path.join(repoRoot, 'package-lock.json')
const lock = JSON.parse(await readFile(lockPath, 'utf8'))
// Validate all inputs before writing any version, so an incomplete lock cannot cause a partial bump.
const updates = await Promise.all(
  workspaces.map(async (workspace) => {
    if (!lock.packages?.[workspace]) {
      throw new Error(`package-lock.json is missing ${workspace}`)
    }
    const filename = path.join(repoRoot, workspace, 'package.json')
    const pkg = JSON.parse(await readFile(filename, 'utf8'))
    pkg.version = version
    lock.packages[workspace].version = version
    return { filename, pkg }
  })
)
for (const { filename, pkg } of updates) {
  await writeFile(filename, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
}
await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8')
console.log(`[MyMind] Desktop and PWA release version set to ${version}.`)
