import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const requireFromHere = createRequire(import.meta.url)

const BUGGY_LENGTH_WRITE = 'resultArray.set(new Uint32Array([length]), 0);'
const FIXED_LENGTH_WRITE = 'new DataView(resultBuffer).setUint32(0, length, true);'
const BUGGY_LENGTH_READ = 'const length = new Uint32Array(resultArray.buffer, 0, 1)[0];'
const FIXED_LENGTH_READ = 'const length = new DataView(resultBuffer).getUint32(0, true);'
const BUGGY_PAUSE_TIMEOUT = "if (i > 1_000_000) {\n        throw new Error('Sync operation timeout');\n      }"
const FIXED_PAUSE_TIMEOUT =
  "if ((i & 0xfff) === 0 && Date.now() > deadline) {\n        throw new Error('Sync operation timeout');\n      }"

export function patchExpoSqliteWorkerChannelSource(source) {
  let next = source
  let changed = false

  if (next.includes(BUGGY_LENGTH_WRITE)) {
    next = next.replace(BUGGY_LENGTH_WRITE, FIXED_LENGTH_WRITE)
    changed = true
  } else if (!next.includes(FIXED_LENGTH_WRITE)) {
    throw new Error('Unsupported expo-sqlite WorkerChannel length-write implementation')
  }

  if (next.includes(BUGGY_LENGTH_READ)) {
    next = next.replace(BUGGY_LENGTH_READ, FIXED_LENGTH_READ)
    changed = true
  } else if (!next.includes(FIXED_LENGTH_READ)) {
    throw new Error('Unsupported expo-sqlite WorkerChannel length-read implementation')
  }

  if (next.includes(BUGGY_PAUSE_TIMEOUT)) {
    if (!next.includes('  let i = 0;')) {
      throw new Error('Unsupported expo-sqlite WorkerChannel sync-loop implementation')
    }
    next = next.replace('  let i = 0;', '  const deadline = Date.now() + 15_000;\n  let i = 0;')
    next = next.replace(BUGGY_PAUSE_TIMEOUT, FIXED_PAUSE_TIMEOUT)
    changed = true
  } else if (!next.includes(FIXED_PAUSE_TIMEOUT)) {
    throw new Error('Unsupported expo-sqlite WorkerChannel pause-timeout implementation')
  }

  return { source: next, changed }
}

export async function patchInstalledExpoSqliteWeb() {
  const packageJsonPath = requireFromHere.resolve('expo-sqlite/package.json')
  const workerChannelPath = path.join(path.dirname(packageJsonPath), 'web', 'WorkerChannel.ts')
  const source = await readFile(workerChannelPath, 'utf8')
  const patched = patchExpoSqliteWorkerChannelSource(source)

  if (patched.changed) {
    await writeFile(workerChannelPath, patched.source, 'utf8')
    console.log('[MyMind] Applied expo-sqlite Web sync transport compatibility patch.')
  }

  return workerChannelPath
}

const invokedAsScript =
  process.argv[1] != null && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (invokedAsScript) await patchInstalledExpoSqliteWeb()
