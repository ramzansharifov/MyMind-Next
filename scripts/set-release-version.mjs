import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const version = process.argv[2]?.trim()
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version ?? '')
if (!match) {
  throw new Error('Usage: node scripts/set-release-version.mjs <major.minor.patch>')
}

const major = Number(match[1])
const minor = Number(match[2])
const patch = Number(match[3])
if (minor > 99 || patch > 99) {
  throw new Error('Minor and patch versions must stay below 100 for Android versionCode mapping')
}

const versionCode = major * 10000 + minor * 100 + patch
if (!Number.isSafeInteger(versionCode) || versionCode <= 0 || versionCode > 2_100_000_000) {
  throw new Error(`Android versionCode ${versionCode} is outside the supported range`)
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, '..')
const desktopPackagePath = path.join(repoRoot, 'apps', 'desktop', 'package.json')
const mobilePackagePath = path.join(repoRoot, 'apps', 'mobile', 'package.json')
const mobileAppPath = path.join(repoRoot, 'apps', 'mobile', 'app.json')
const lockPath = path.join(repoRoot, 'package-lock.json')

const desktopPackage = JSON.parse(await readFile(desktopPackagePath, 'utf8'))
const mobilePackage = JSON.parse(await readFile(mobilePackagePath, 'utf8'))
const mobileApp = JSON.parse(await readFile(mobileAppPath, 'utf8'))
const lock = JSON.parse(await readFile(lockPath, 'utf8'))

desktopPackage.version = version
mobilePackage.version = version
mobileApp.expo.version = version
mobileApp.expo.android.versionCode = versionCode

if (!lock.packages?.['apps/desktop'] || !lock.packages?.['apps/mobile']) {
  throw new Error('package-lock.json is missing desktop or mobile workspace entries')
}
lock.packages['apps/desktop'].version = version
lock.packages['apps/mobile'].version = version

await writeFile(desktopPackagePath, `${JSON.stringify(desktopPackage, null, 2)}\n`, 'utf8')
await writeFile(mobilePackagePath, `${JSON.stringify(mobilePackage, null, 2)}\n`, 'utf8')
await writeFile(mobileAppPath, `${JSON.stringify(mobileApp, null, 2)}\n`, 'utf8')
await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8')

console.log(`[MyMind] Release version set to ${version}.`)
console.log(`[MyMind] Android versionCode set to ${versionCode}.`)
