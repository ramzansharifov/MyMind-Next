import { spawnSync } from 'node:child_process'
import { access, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { prepareAndroidNative } from './prepare-android-native.mjs'

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))
const defaultMobileRoot = path.resolve(moduleDirectory, '..')
const defaultRepoRoot = path.resolve(defaultMobileRoot, '..', '..')

async function exists(target) {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}

export function parseAndroidSdkDir(localProperties) {
  const match = localProperties.match(/^sdk\.dir\s*=\s*(.+)$/m)
  if (!match) return null

  return match[1]
    .trim()
    .replaceAll('\\:', ':')
    .replaceAll('\\\\', '\\')
}

export async function resolveAndroidSdkPath({
  mobileRoot = defaultMobileRoot,
  env = process.env,
  platform = process.platform
} = {}) {
  const localPropertiesPath = path.join(mobileRoot, 'android', 'local.properties')

  try {
    const localProperties = await readFile(localPropertiesPath, 'utf8')
    const sdkDir = parseAndroidSdkDir(localProperties)
    if (sdkDir && (await exists(sdkDir))) return sdkDir
  } catch {
    // The generated Android project may not exist yet.
  }

  const candidates = [
    env.ANDROID_HOME,
    env.ANDROID_SDK_ROOT,
    platform === 'win32' && env.LOCALAPPDATA
      ? path.join(env.LOCALAPPDATA, 'Android', 'Sdk')
      : null,
    platform === 'darwin' && env.HOME ? path.join(env.HOME, 'Library', 'Android', 'sdk') : null,
    platform !== 'win32' && platform !== 'darwin' && env.HOME
      ? path.join(env.HOME, 'Android', 'Sdk')
      : null
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate
  }

  return null
}

export async function readAndroidLocalProperties(mobileRoot = defaultMobileRoot) {
  try {
    return await readFile(path.join(mobileRoot, 'android', 'local.properties'), 'utf8')
  } catch {
    return null
  }
}

export async function restoreAndroidLocalProperties({
  mobileRoot = defaultMobileRoot,
  snapshot,
  sdkPath
}) {
  const androidRoot = path.join(mobileRoot, 'android')
  if (!(await exists(androidRoot))) return false

  const localPropertiesPath = path.join(androidRoot, 'local.properties')
  const content =
    snapshot ??
    (sdkPath ? `sdk.dir=${sdkPath.replaceAll('\\', '/')}\n` : null)

  if (!content) return false

  await writeFile(localPropertiesPath, content, 'utf8')
  return true
}

function assertCommandSucceeded(result, label) {
  if (result?.error) throw result.error
  if (typeof result?.status === 'number' && result.status !== 0) {
    throw new Error(`${label} exited with code ${result.status}`)
  }
}

export async function runAndroid({
  mobileRoot = defaultMobileRoot,
  repoRoot = defaultRepoRoot,
  args = process.argv.slice(2),
  env = process.env,
  platform = process.platform,
  spawn = spawnSync,
  log = console.log
} = {}) {
  const localPropertiesSnapshot = await readAndroidLocalProperties(mobileRoot)
  const sdkPath = await resolveAndroidSdkPath({ mobileRoot, env, platform })

  if (sdkPath) {
    log(`[MyMind] Android SDK: ${sdkPath}`)
  } else {
    log(
      '[MyMind] Android SDK path was not auto-detected; Gradle will rely on the current environment.'
    )
  }

  const prepared = await prepareAndroidNative({
    mobileRoot,
    repoRoot,
    force: args.includes('--force'),
    log
  })

  const command = platform === 'win32' ? 'npx.cmd' : 'npx'
  const childEnv = {
    ...env,
    ...(sdkPath
      ? {
          ANDROID_HOME: sdkPath,
          ANDROID_SDK_ROOT: sdkPath
        }
      : {})
  }
  const spawnOptions = {
    cwd: mobileRoot,
    env: childEnv,
    stdio: 'inherit'
  }

  if (!(await exists(prepared.androidRoot))) {
    log('[MyMind] Regenerating Expo Android project before Gradle build.')
    const prebuild = spawn(
      command,
      ['expo', 'prebuild', '--platform', 'android', '--no-install'],
      spawnOptions
    )
    assertCommandSucceeded(prebuild, 'Expo Android prebuild')
  }

  const restoredBeforeBuild = await restoreAndroidLocalProperties({
    mobileRoot,
    snapshot: localPropertiesSnapshot,
    sdkPath
  })
  if (restoredBeforeBuild) {
    log('[MyMind] Android local.properties preserved/restored before Gradle build.')
  }

  const forwardedArgs = args.filter((argument) => argument !== '--force')
  const result = spawn(command, ['expo', 'run:android', ...forwardedArgs], spawnOptions)

  await restoreAndroidLocalProperties({
    mobileRoot,
    snapshot: localPropertiesSnapshot,
    sdkPath
  })

  if (result?.error) throw result.error
  if (typeof result?.status === 'number' && result.status !== 0) {
    process.exitCode = result.status
  }

  return result
}

const invokedAsScript =
  process.argv[1] != null && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (invokedAsScript) {
  await runAndroid()
}
