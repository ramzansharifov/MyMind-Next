import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  parseAndroidSdkDir,
  resolveAndroidSdkPath,
  resolveExpoCliPath,
  restoreAndroidLocalProperties,
  runAndroid
} from './run-android.mjs'

assert.equal(
  parseAndroidSdkDir('sdk.dir=C\\:\\\\Users\\\\ramza\\\\AppData\\\\Local\\\\Android\\\\Sdk\n'),
  'C:\\Users\\ramza\\AppData\\Local\\Android\\Sdk'
)
assert.equal(parseAndroidSdkDir('other=value\n'), null)

const realExpoCliPath = await resolveExpoCliPath()
const expoVersion = spawnSync(process.execPath, [realExpoCliPath, '--version'], {
  encoding: 'utf8'
})
assert.equal(expoVersion.error, undefined)
assert.equal(expoVersion.status, 0)
assert.match(`${expoVersion.stdout}${expoVersion.stderr}`, /\d+\.\d+/)

const root = await mkdtemp(path.join(os.tmpdir(), 'mymind-android-sdk-'))
const mobileRoot = path.join(root, 'apps', 'mobile')
const androidRoot = path.join(mobileRoot, 'android')
const fakeSdk = path.join(root, 'Android', 'Sdk')

try {
  await mkdir(androidRoot, { recursive: true })
  await mkdir(fakeSdk, { recursive: true })
  await writeFile(path.join(root, 'package.json'), '{"name":"test"}\n')
  await writeFile(path.join(root, 'package-lock.json'), '{"lockfileVersion":3}\n')
  await writeFile(path.join(mobileRoot, 'package.json'), '{"name":"mobile"}\n')
  await writeFile(path.join(mobileRoot, 'app.json'), '{"expo":{"name":"MyMind"}}\n')

  const originalLocalProperties = `# local machine config\nsdk.dir=${fakeSdk.replaceAll('\\', '/')}\ncustom.flag=true\n`
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
    `sdk.dir=${fakeSdk.replaceAll('\\', '/')}\n`
  )

  await writeFile(path.join(androidRoot, 'local.properties'), originalLocalProperties)
  await writeFile(path.join(androidRoot, 'stale.txt'), 'stale')

  const calls = []
  const fakeNodeExecutable = path.join(root, 'node.exe')
  const fakeExpoCliPath = path.join(root, 'expo-cli.js')
  const result = await runAndroid({
    mobileRoot,
    repoRoot: root,
    env: { ANDROID_HOME: fakeSdk },
    platform: 'win32',
    nodeExecutable: fakeNodeExecutable,
    expoCliPath: fakeExpoCliPath,
    log() {},
    spawn(command, args, options) {
      calls.push({ command, args, options })

      assert.equal(options.env.ANDROID_HOME, fakeSdk)
      assert.equal(options.env.ANDROID_SDK_ROOT, fakeSdk)

      if (args[1] === 'prebuild') {
        assert.throws(() => readFileSync(path.join(androidRoot, 'stale.txt'), 'utf8'))
        mkdirSync(androidRoot, { recursive: true })
        return { status: 0 }
      }

      assert.equal(
        readFileSync(path.join(androidRoot, 'local.properties'), 'utf8'),
        originalLocalProperties
      )
      return { status: 0 }
    }
  })

  assert.equal(result.status, 0)
  assert.equal(calls.length, 2)
  assert.equal(calls[0].command, fakeNodeExecutable)
  assert.deepEqual(calls[0].args, [
    fakeExpoCliPath,
    'prebuild',
    '--platform',
    'android',
    '--no-install'
  ])
  assert.equal(calls[1].command, fakeNodeExecutable)
  assert.deepEqual(calls[1].args, [fakeExpoCliPath, 'run:android'])
  assert.equal(
    await readFile(path.join(androidRoot, 'local.properties'), 'utf8'),
    originalLocalProperties
  )

  console.log('Android SDK + Expo CLI spawn regression passed')
} finally {
  await rm(root, { recursive: true, force: true })
}
