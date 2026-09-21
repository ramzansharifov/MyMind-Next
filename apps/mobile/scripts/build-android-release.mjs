import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { prepareAndroidNative } from './prepare-android-native.mjs'
import {
  readAndroidLocalProperties,
  resolveAndroidSdkPath,
  resolveExpoCliPath,
  restoreAndroidLocalProperties
} from './run-android.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const mobileRoot = path.resolve(scriptDirectory, '..')
const repoRoot = path.resolve(mobileRoot, '..', '..')
const localPropertiesSnapshot = await readAndroidLocalProperties(mobileRoot)
const sdkPath = await resolveAndroidSdkPath({ mobileRoot })
const expoCliPath = await resolveExpoCliPath({ mobileRoot, repoRoot })
const childEnv = {
  ...process.env,
  ...(sdkPath
    ? {
        ANDROID_HOME: sdkPath,
        ANDROID_SDK_ROOT: sdkPath
      }
    : {})
}

await prepareAndroidNative({ mobileRoot, repoRoot })

const prebuild = spawnSync(
  process.execPath,
  [expoCliPath, 'prebuild', '--platform', 'android', '--no-install'],
  {
    cwd: mobileRoot,
    env: childEnv,
    stdio: 'inherit'
  }
)
if (prebuild.error) throw prebuild.error
if (prebuild.signal) process.kill(process.pid, prebuild.signal)
if (prebuild.status !== 0) {
  throw new Error(`Expo prebuild exited with code ${prebuild.status ?? 1}`)
}

await restoreAndroidLocalProperties({
  mobileRoot,
  snapshot: localPropertiesSnapshot,
  sdkPath
})

const configureSigning = spawnSync(
  process.execPath,
  [path.join(scriptDirectory, 'configure-android-release-signing.mjs')],
  {
    cwd: mobileRoot,
    env: childEnv,
    stdio: 'inherit'
  }
)
if (configureSigning.error) throw configureSigning.error
if (configureSigning.signal) process.kill(process.pid, configureSigning.signal)
if (configureSigning.status !== 0) {
  throw new Error(`Release signing configuration exited with code ${configureSigning.status ?? 1}`)
}

const androidRoot = path.join(mobileRoot, 'android')
const gradle =
  process.platform === 'win32'
    ? spawnSync(
        process.env.ComSpec ?? 'cmd.exe',
        ['/d', '/s', '/c', 'gradlew.bat', 'assembleRelease'],
        {
          cwd: androidRoot,
          env: childEnv,
          stdio: 'inherit'
        }
      )
    : spawnSync('./gradlew', ['assembleRelease'], {
        cwd: androidRoot,
        env: childEnv,
        stdio: 'inherit'
      })

await restoreAndroidLocalProperties({
  mobileRoot,
  snapshot: localPropertiesSnapshot,
  sdkPath
})

if (gradle.error) throw gradle.error
if (gradle.signal) process.kill(process.pid, gradle.signal)
if (gradle.status !== 0) {
  throw new Error(`Android release build exited with code ${gradle.status ?? 1}`)
}
