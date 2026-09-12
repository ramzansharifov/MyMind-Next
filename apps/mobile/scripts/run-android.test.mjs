import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  parseAndroidSdkDir,
  resolveAndroidSdkPath,
  restoreAndroidLocalProperties
} from './run-android.mjs'

assert.equal(
  parseAndroidSdkDir('sdk.dir=C\\:\\\\Users\\\\ramza\\\\AppData\\\\Local\\\\Android\\\\Sdk\n'),
  'C:\\Users\\ramza\\AppData\\Local\\Android\\Sdk'
)
assert.equal(parseAndroidSdkDir('other=value\n'), null)

const root = await mkdtemp(path.join(os.tmpdir(), 'mymind-android-sdk-'))
const mobileRoot = path.join(root, 'apps', 'mobile')
const androidRoot = path.join(mobileRoot, 'android')
const fakeSdk = path.join(root, 'Android', 'Sdk')

try {
  await mkdir(androidRoot, { recursive: true })
  await mkdir(fakeSdk, { recursive: true })

  const originalLocalProperties = `# local machine config\nsdk.dir=${fakeSdk.replaceAll('\\\\', '/')}\ncustom.flag=true\n`
  await writeFile(path.join(androidRoot, 'local.properties'), originalLocalProperties)

  assert.equal(
    await resolveAndroidSdkPath({
      mobileRoot,
      env: {},
      platform: process.platform
    }),
    fakeSdk
  )

  await rm(path.join(androidRoot, 'local.properties'))
  assert.equal(
    await resolveAndroidSdkPath({
      mobileRoot,
      env: { ANDROID_HOME: fakeSdk },
      platform: process.platform
    }),
    fakeSdk
  )

  assert.equal(
    await restoreAndroidLocalProperties({
      mobileRoot,
      snapshot: originalLocalProperties,
      sdkPath: fakeSdk
    }),
    true
  )
  assert.equal(
    await readFile(path.join(androidRoot, 'local.properties'), 'utf8'),
    originalLocalProperties
  )

  await rm(path.join(androidRoot, 'local.properties'))
  assert.equal(
    await restoreAndroidLocalProperties({
      mobileRoot,
      snapshot: null,
      sdkPath: fakeSdk
    }),
    true
  )
  assert.equal(
    await readFile(path.join(androidRoot, 'local.properties'), 'utf8'),
    `sdk.dir=${fakeSdk.replaceAll('\\\\', '/')}\n`
  )

  console.log('Android SDK local.properties regression passed')
} finally {
  await rm(root, { recursive: true, force: true })
}
