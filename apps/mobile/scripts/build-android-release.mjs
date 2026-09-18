import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { prepareAndroidNative } from './prepare-android-native.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const mobileRoot = path.resolve(scriptDirectory, '..')
const requireFromHere = createRequire(import.meta.url)
const expoPackageJsonPath = requireFromHere.resolve('expo/package.json')
const expoCliPath = path.join(path.dirname(expoPackageJsonPath), 'bin', 'cli')

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? mobileRoot,
    env: process.env,
    stdio: 'inherit',
    shell: false
  })

  if (result.error) throw result.error
  if (result.signal) process.kill(process.pid, result.signal)
  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status ?? 1}`)
  }
}

await prepareAndroidNative({ mobileRoot })

run(process.execPath, [expoCliPath, 'prebuild', '--platform', 'android', '--no-install'])
run(process.execPath, [path.join(scriptDirectory, 'configure-android-release-signing.mjs')])

const androidRoot = path.join(mobileRoot, 'android')
const gradleCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
run(gradleCommand, ['assembleRelease'], { cwd: androidRoot })
