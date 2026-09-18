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

await prepareAndroidNative({ mobileRoot })

const prebuild = spawnSync(
  process.execPath,
  [expoCliPath, 'prebuild', '--platform', 'android', '--no-install'],
  {
    cwd: mobileRoot,
    env: process.env,
    stdio: 'inherit'
  }
)
if (prebuild.error) throw prebuild.error
if (prebuild.signal) process.kill(process.pid, prebuild.signal)
if (prebuild.status !== 0) {
  throw new Error(`Expo prebuild exited with code ${prebuild.status ?? 1}`)
}

const configureSigning = spawnSync(
  process.execPath,
  [path.join(scriptDirectory, 'configure-android-release-signing.mjs')],
  {
    cwd: mobileRoot,
    env: process.env,
    stdio: 'inherit'
  }
)
if (configureSigning.error) throw configureSigning.error
if (configureSigning.signal) process.kill(process.pid, configureSigning.signal)
if (configureSigning.status !== 0) {
  throw new Error(`Release signing configuration exited with code ${configureSigning.status ?? 1}`)
}

const androidRoot = path.join(mobileRoot, 'android')
const gradleCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
const gradle = spawnSync(gradleCommand, ['assembleRelease'], {
  cwd: androidRoot,
  env: process.env,
  stdio: 'inherit'
})
if (gradle.error) throw gradle.error
if (gradle.signal) process.kill(process.pid, gradle.signal)
if (gradle.status !== 0) {
  throw new Error(`Android release build exited with code ${gradle.status ?? 1}`)
}
