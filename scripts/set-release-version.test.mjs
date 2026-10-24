import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import { test } from 'node:test'

const source = fileURLToPath(new URL('./set-release-version.mjs', import.meta.url))
async function fixture(run) {
  const root = await mkdtemp(path.join(tmpdir(), 'mymind-release-'))
  try {
    await mkdir(path.join(root, 'scripts'))
    await copyFile(source, path.join(root, 'scripts/set-release-version.mjs'))
    for (const app of ['desktop', 'pwa']) {
      await mkdir(path.join(root, 'apps', app), { recursive: true })
      await writeFile(
        path.join(root, 'apps', app, 'package.json'),
        JSON.stringify({ name: app, version: '1.0.0' })
      )
    }
    await writeFile(
      path.join(root, 'package-lock.json'),
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          'apps/desktop': { version: '1.0.0' },
          'apps/pwa': { version: '1.0.0' },
          'node_modules/control': { version: '2.0.0' }
        }
      })
    )
    await run(root, (version) =>
      spawnSync(process.execPath, ['scripts/set-release-version.mjs', version], {
        cwd: root,
        encoding: 'utf8',
        windowsHide: true
      })
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

test('versions Desktop and PWA together without Android versionCode limits', async () => {
  await fixture(async (root, run) => {
    const result = run('2.100.200')
    assert.equal(result.status, 0, result.stderr)
    for (const app of ['desktop', 'pwa']) {
      const pkg = JSON.parse(await readFile(path.join(root, 'apps', app, 'package.json'), 'utf8'))
      assert.equal(pkg.version, '2.100.200')
    }
    const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'))
    assert.equal(lock.packages['apps/desktop'].version, '2.100.200')
    assert.equal(lock.packages['apps/pwa'].version, '2.100.200')
    assert.equal(lock.packages['node_modules/control'].version, '2.0.0')
  })
})

test('invalid versions or a missing workspace leave every existing file unchanged', async () => {
  await fixture(async (root, run) => {
    const paths = ['apps/desktop/package.json', 'apps/pwa/package.json', 'package-lock.json']
    const read = () => Promise.all(paths.map((file) => readFile(path.join(root, file), 'utf8')))
    const before = await read()
    for (const value of ['1.2', '01.2.3', 'v1.2.3', '1.2.3-beta']) {
      assert.notEqual(run(value).status, 0)
      assert.deepEqual(await read(), before)
    }
    const lock = JSON.parse(before[2])
    delete lock.packages['apps/pwa']
    await writeFile(path.join(root, 'package-lock.json'), JSON.stringify(lock))
    const incomplete = await read()
    assert.notEqual(run('1.2.3').status, 0)
    assert.deepEqual(await read(), incomplete)
  })
})
