import { createHash } from 'node:crypto'
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const CACHE_SCHEMA = 1
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))
const defaultMobileRoot = path.resolve(moduleDirectory, '..')
const defaultRepoRoot = path.resolve(defaultMobileRoot, '..', '..')

const FINGERPRINT_INPUTS = [
  ['repo-package', 'package.json'],
  ['repo-lock', 'package-lock.json'],
  ['mobile-package', path.join('apps', 'mobile', 'package.json')],
  ['mobile-app-config', path.join('apps', 'mobile', 'app.json')]
]

async function exists(target) {
  try {
    await access(target)
    return true
  } catch {
    return false
  }
}

export async function computeAndroidNativeFingerprint({
  repoRoot = defaultRepoRoot
} = {}) {
  const hash = createHash('sha256')
  hash.update(`mymind-android-native-cache-v${CACHE_SCHEMA}\0`)

  for (const [label, relativePath] of FINGERPRINT_INPUTS) {
    const absolutePath = path.join(repoRoot, relativePath)
    const contents = await readFile(absolutePath)
    hash.update(label)
    hash.update('\0')
    hash.update(contents)
    hash.update('\0')
  }

  return hash.digest('hex')
}

async function readFingerprintStamp(stampPath) {
  try {
    const parsed = JSON.parse(await readFile(stampPath, 'utf8'))
    return parsed?.schema === CACHE_SCHEMA && typeof parsed?.fingerprint === 'string'
      ? parsed.fingerprint
      : null
  } catch {
    return null
  }
}

export async function prepareAndroidNative({
  mobileRoot = defaultMobileRoot,
  repoRoot = defaultRepoRoot,
  force = false,
  log = console.log
} = {}) {
  const androidRoot = path.join(mobileRoot, 'android')
  const stampDirectory = path.join(mobileRoot, '.expo')
  const stampPath = path.join(stampDirectory, 'android-native-fingerprint.json')
  const fingerprint = await computeAndroidNativeFingerprint({ repoRoot })
  const previousFingerprint = await readFingerprintStamp(stampPath)
  const androidExists = await exists(androidRoot)
  const shouldReset = androidExists && (force || previousFingerprint !== fingerprint)

  if (shouldReset) {
    await rm(androidRoot, { recursive: true, force: true })
    log(
      force
        ? '[MyMind] Removed generated Android project for a forced native rebuild.'
        : '[MyMind] Native dependency topology changed; regenerated Android/CMake state is required.'
    )
  }

  await mkdir(stampDirectory, { recursive: true })
  await writeFile(
    stampPath,
    `${JSON.stringify({ schema: CACHE_SCHEMA, fingerprint }, null, 2)}\n`,
    'utf8'
  )

  if (!shouldReset && androidExists) {
    log('[MyMind] Android native dependency fingerprint is unchanged; keeping build cache.')
  }

  return {
    androidRoot,
    fingerprint,
    previousFingerprint,
    reset: shouldReset,
    stampPath
  }
}

const invokedAsScript =
  process.argv[1] != null && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (invokedAsScript) {
  await prepareAndroidNative({ force: process.argv.includes('--force') })
}
