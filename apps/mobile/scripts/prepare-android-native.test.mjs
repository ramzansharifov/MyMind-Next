import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { prepareAndroidNative } from './prepare-android-native.mjs'

const root = await mkdtemp(path.join(os.tmpdir(), 'mymind-android-native-'))
const mobileRoot = path.join(root, 'apps', 'mobile')
const androidRoot = path.join(mobileRoot, 'android')

try {
  await mkdir(androidRoot, { recursive: true })
  await writeFile(path.join(root, 'package.json'), '{"name":"test"}\n')
  await writeFile(path.join(root, 'package-lock.json'), '{"lockfileVersion":3}\n')
  await writeFile(path.join(mobileRoot, 'package.json'), '{"name":"mobile"}\n')
  await writeFile(path.join(mobileRoot, 'app.json'), '{"expo":{"name":"MyMind"}}\n')
  await writeFile(path.join(androidRoot, 'stale.txt'), 'stale')

  const first = await prepareAndroidNative({
    mobileRoot,
    repoRoot: root,
    log() {}
  })
  assert.equal(first.reset, true)
  await assert.rejects(readFile(path.join(androidRoot, 'stale.txt'), 'utf8'))

  await mkdir(androidRoot, { recursive: true })
  await writeFile(path.join(androidRoot, 'fresh.txt'), 'fresh')

  const second = await prepareAndroidNative({
    mobileRoot,
    repoRoot: root,
    log() {}
  })
  assert.equal(second.reset, false)
  assert.equal(await readFile(path.join(androidRoot, 'fresh.txt'), 'utf8'), 'fresh')

  await writeFile(path.join(root, 'package-lock.json'), '{"lockfileVersion":3,"changed":true}\n')
  const changed = await prepareAndroidNative({
    mobileRoot,
    repoRoot: root,
    log() {}
  })
  assert.equal(changed.reset, true)
  await assert.rejects(readFile(path.join(androidRoot, 'fresh.txt'), 'utf8'))

  await mkdir(androidRoot, { recursive: true })
  await writeFile(path.join(androidRoot, 'force.txt'), 'force')
  const forced = await prepareAndroidNative({
    mobileRoot,
    repoRoot: root,
    force: true,
    log() {}
  })
  assert.equal(forced.reset, true)
  await assert.rejects(readFile(path.join(androidRoot, 'force.txt'), 'utf8'))

  console.log('Android native cache invalidation regression passed')
} finally {
  await rm(root, { recursive: true, force: true })
}
