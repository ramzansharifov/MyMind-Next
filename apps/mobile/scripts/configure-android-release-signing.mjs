import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const mobileRoot = path.resolve(scriptDirectory, '..')
const appGradlePath = path.join(mobileRoot, 'android', 'app', 'build.gradle')

const RELEASE_SIGNING_MARKER = '// MyMind release signing'
const RELEASE_CONFIG = `        release {
            ${RELEASE_SIGNING_MARKER}
            def mymindKeystorePath = System.getenv("MYMIND_ANDROID_KEYSTORE_PATH")
            if (mymindKeystorePath) {
                storeFile file(mymindKeystorePath)
                storePassword System.getenv("MYMIND_ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("MYMIND_ANDROID_KEY_ALIAS")
                keyPassword System.getenv("MYMIND_ANDROID_KEY_PASSWORD")
            }
        }
`

const RELEASE_BUILD_SIGNING = `            if (System.getenv("MYMIND_ANDROID_KEYSTORE_PATH")) {
                signingConfig signingConfigs.release
            } else {
                // Local release verification can still build with the generated debug key.
                signingConfig signingConfigs.debug
            }`

function insertReleaseSigningConfig(contents) {
  if (contents.includes(RELEASE_SIGNING_MARKER)) return contents

  const marker = /(^\s*signingConfigs\s*\{\s*$)/m
  const match = marker.exec(contents)
  if (!match) {
    throw new Error('Could not find signingConfigs block in generated Android app build.gradle')
  }

  const insertAt = match.index + match[0].length
  return `${contents.slice(0, insertAt)}\n${RELEASE_CONFIG}${contents.slice(insertAt)}`
}

function replaceReleaseBuildSigning(contents) {
  const buildTypesIndex = contents.indexOf('buildTypes {')
  if (buildTypesIndex < 0) {
    throw new Error('Could not find buildTypes block in generated Android app build.gradle')
  }

  const releaseIndex = contents.indexOf('release {', buildTypesIndex)
  if (releaseIndex < 0) {
    throw new Error('Could not find release build type in generated Android app build.gradle')
  }

  const signingIndex = contents.indexOf('signingConfig signingConfigs.debug', releaseIndex)
  if (signingIndex < 0) {
    if (contents.indexOf('signingConfig signingConfigs.release', releaseIndex) >= 0) return contents
    throw new Error('Could not find generated release signingConfig in Android app build.gradle')
  }

  const lineStart = contents.lastIndexOf('\n', signingIndex) + 1
  const lineEnd = contents.indexOf('\n', signingIndex)
  return `${contents.slice(0, lineStart)}${RELEASE_BUILD_SIGNING}${contents.slice(
    lineEnd < 0 ? contents.length : lineEnd
  )}`
}

const original = await readFile(appGradlePath, 'utf8')
const configured = replaceReleaseBuildSigning(insertReleaseSigningConfig(original))
await writeFile(appGradlePath, configured, 'utf8')

console.log('[MyMind] Android release signing configuration prepared.')
