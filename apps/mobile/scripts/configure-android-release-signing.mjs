import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const mobileRoot = path.resolve(scriptDirectory, '..')
const appGradlePath = path.join(mobileRoot, 'android', 'app', 'build.gradle')

const releaseSigningMarker = '// MyMind release signing'
const releaseConfig = `        release {
            ${releaseSigningMarker}
            def mymindKeystorePath = System.getenv("MYMIND_ANDROID_KEYSTORE_PATH")
            if (mymindKeystorePath) {
                storeFile file(mymindKeystorePath)
                storePassword System.getenv("MYMIND_ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("MYMIND_ANDROID_KEY_ALIAS")
                keyPassword System.getenv("MYMIND_ANDROID_KEY_PASSWORD")
            }
        }
`

const releaseBuildSigning = `            if (System.getenv("MYMIND_ANDROID_KEYSTORE_PATH")) {
                signingConfig signingConfigs.release
            } else {
                // Local release verification can still build with the generated debug key.
                signingConfig signingConfigs.debug
            }`

let contents = await readFile(appGradlePath, 'utf8')

if (!contents.includes(releaseSigningMarker)) {
  const signingConfigsMatch = /(^\s*signingConfigs\s*\{\s*$)/m.exec(contents)
  if (!signingConfigsMatch) {
    throw new Error('Could not find signingConfigs block in generated Android app build.gradle')
  }

  const insertAt = signingConfigsMatch.index + signingConfigsMatch[0].length
  contents = `${contents.slice(0, insertAt)}\n${releaseConfig}${contents.slice(insertAt)}`
}

const buildTypesIndex = contents.indexOf('buildTypes {')
if (buildTypesIndex < 0) {
  throw new Error('Could not find buildTypes block in generated Android app build.gradle')
}

const releaseIndex = contents.indexOf('release {', buildTypesIndex)
if (releaseIndex < 0) {
  throw new Error('Could not find release build type in generated Android app build.gradle')
}

const debugSigningIndex = contents.indexOf('signingConfig signingConfigs.debug', releaseIndex)
if (debugSigningIndex >= 0) {
  const lineStart = contents.lastIndexOf('\n', debugSigningIndex) + 1
  const nextNewline = contents.indexOf('\n', debugSigningIndex)
  const lineEnd = nextNewline < 0 ? contents.length : nextNewline
  contents = `${contents.slice(0, lineStart)}${releaseBuildSigning}${contents.slice(lineEnd)}`
} else if (contents.indexOf('signingConfig signingConfigs.release', releaseIndex) < 0) {
  throw new Error('Could not find generated release signingConfig in Android app build.gradle')
}

await writeFile(appGradlePath, contents, 'utf8')
console.log('[MyMind] Android release signing configuration prepared.')
