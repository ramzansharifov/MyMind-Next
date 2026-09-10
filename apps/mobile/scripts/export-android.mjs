import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const appDirectory = path.resolve(scriptDirectory, '..')
const requireFromHere = createRequire(import.meta.url)
const expoPackageJsonPath = requireFromHere.resolve('expo/package.json')
const expoCliPath = path.join(path.dirname(expoPackageJsonPath), 'bin', 'cli')

const result = spawnSync(process.execPath, [expoCliPath, 'export', '--platform', 'android'], {
  cwd: appDirectory,
  env: {
    ...process.env,
    EXPO_NO_BUNDLE_SPLITTING: '1'
  },
  stdio: 'inherit'
})

if (result.error) throw result.error
if (result.signal) process.kill(process.pid, result.signal)
process.exit(result.status ?? 1)
