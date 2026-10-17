import 'fake-indexeddb/auto'
import initSqlJs from 'sql.js'
import { describe, expect, it, vi } from 'vitest'
import { PwaDatabase } from '../storage/database'
import { openPwaDisk } from '../storage/indexed-db'
import { migrateDatabase } from '../storage/migrations'
import { createTasksRepository } from '@mymind/persistence/tasks'
import { createPwaProfileRepository, createPwaProfileSecret } from './profile'
import { createPwaProtocolClient } from './protocol-client'
import { createPwaSyncAssets } from './asset-port'
import { relayLanRequest, allowedRelayTarget } from '../server/lan-relay'
import type { LocalProfile } from '@mymind/contracts/profile-sync'

const desktop = vi.hoisted(() => ({
  db: undefined as unknown as PwaDatabase,
  profile: null as LocalProfile | null,
  key: new Uint8Array(32)
}))
vi.mock('../../../desktop/src/main/database/client', () => ({ getSqlite: () => desktop.db }))
vi.mock('../../../desktop/src/main/database/repository-runtime', () => ({
  desktopRepositoryRuntime: { database: () => desktop.db }
}))
vi.mock('../../../desktop/src/main/services/local-profile', () => ({
  getLocalProfile: () => desktop.profile,
  getLocalProfileSyncKey: async () => new Uint8Array(desktop.key)
}))
vi.mock('../../../desktop/src/main/services/main-operation-tracker', () => ({
  mainOperationTracker: { run: <T>(operation: () => T): T => operation() }
}))
vi.mock('../../../desktop/src/main/services/lan-sync-assets', () => ({
  collectDesktopSyncAssetManifest: async () => [],
  cleanupDesktopSyncAssetStage: async () => undefined,
  commitDesktopSyncAssets: async () => undefined,
  removeDesktopSyncAssets: async () => undefined,
  normalizeDesktopWorkoutPhotoUrls: () => undefined,
  readDesktopSyncAssetChunk: vi.fn(),
  stageDesktopSyncAssetChunk: vi.fn()
}))

async function fixture(): Promise<PwaDatabase> {
  const engine = await initSqlJs()
  const sqlite = new engine.Database()
  migrateDatabase(sqlite)
  const db = new PwaDatabase(sqlite, await openPwaDisk(crypto.randomUUID()), engine)
  db.prepare(
    'CREATE TABLE app_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)'
  ).run()
  return db
}
const taskApi = (db: PwaDatabase): ReturnType<typeof createTasksRepository> =>
  createTasksRepository({ database: () => db, createId: () => crypto.randomUUID(), now: Date.now })

describe('PWA profile and actual desktop LAN protocol', () => {
  it('persists a non-extractable encrypted profile key across repository recreation', async () => {
    const db = await fixture()
    const secret = createPwaProfileSecret(db)
    await secret.set('private-sync-material')
    const stored = await db.disk.readState<{ key: CryptoKey; ciphertext: ArrayBuffer }>(
      'profile-secret'
    )
    expect(stored?.key.extractable).toBe(false)
    expect(new TextDecoder().decode(stored?.ciphertext)).not.toContain('private-sync-material')
    expect(await createPwaProfileSecret(db).get()).toBe('private-sync-material')
    await secret.remove()
    expect(await secret.get()).toBeNull()
    await db.flush()
    db.sqlite.close()
  })
  it('authenticates, previews and merges changes bidirectionally with the real desktop server', async () => {
    const browser = await fixture()
    const host = await fixture()
    const profile = createPwaProfileRepository(browser)
    desktop.profile = await profile.createProfile({
      login: 'pwa-protocol-test',
      password: 'test-only-password-12345',
      name: 'Test'
    })
    desktop.key = (await profile.getSyncKey())!
    desktop.db = host
    const { LanSyncServer } = await import('../../../desktop/src/main/services/lan-sync-server')
    const server = new LanSyncServer()
    try {
      await server.start()
      const status = server.getStatus()
      const device = {
        deviceId: status.deviceId,
        deviceName: status.deviceName,
        host: '127.0.0.1',
        port: status.port,
        protocolVersion: 1 as const,
        profileReady: true,
        modules: ['tasks'] as const
      }
      const local = taskApi(browser).createTask({
        title: 'From PWA',
        description: '',
        groupId: null,
        status: 'active',
        priority: 'normal',
        dueDate: null,
        dueTime: null
      })
      const remote = taskApi(host).createTask({
        title: 'From desktop',
        description: '',
        groupId: null,
        status: 'active',
        priority: 'normal',
        dueDate: null,
        dueTime: null
      })
      const viaRelay: typeof fetch = (input, init) => {
        const url = new URL(String(input))
        const target = [
          url.hostname,
          url.port,
          ...url.pathname.replace('/mymind-sync/v1/', '').split('/')
        ]
        const headers = new Headers(init?.headers)
        headers.set('X-MyMind-Lan', '1')
        headers.set('Origin', 'http://localhost:3000')
        return relayLanRequest(
          new Request(`http://localhost:3000/api/lan-sync/${target.join('/')}`, {
            ...init,
            headers
          }),
          target,
          true
        )
      }
      const client = createPwaProtocolClient(browser, profile, {
        fetch: viaRelay,
        getIpAddress: async () => '127.0.0.1',
        assets: createPwaSyncAssets(browser)
      })
      const preview = await client.preview({ ...device, modules: [...device.modules] })
      expect(preview.modules[0].phone.records).toBe(1)
      const result = await client.sync({ ...device, modules: [...device.modules] }, ['tasks'])
      expect(result.modules.map((item) => item.module)).toEqual(['tasks'])
      expect(
        taskApi(browser)
          .listTasksOverview()
          .tasks.map((task) => task.id)
          .sort()
      ).toEqual([local.id, remote.id].sort())
      expect(
        taskApi(host)
          .listTasksOverview()
          .tasks.map((task) => task.id)
          .sort()
      ).toEqual([local.id, remote.id].sort())
      const wrong = createPwaProtocolClient(
        browser,
        { ...profile, getSyncKey: async () => crypto.getRandomValues(new Uint8Array(32)) },
        {
          fetch: viaRelay,
          getIpAddress: async () => '127.0.0.1',
          assets: createPwaSyncAssets(browser)
        }
      )
      await expect(wrong.preview({ ...device, modules: [...device.modules] })).rejects.toThrow()
    } finally {
      await server.stop()
      await browser.flush()
      await host.flush()
      browser.sqlite.close()
      host.sqlite.close()
    }
  }, 30_000)
})

describe('LAN relay boundaries', () => {
  it('rejects public, metadata, unrelated subnet, alternate ports and hostnames', () => {
    for (const host of [
      '8.8.8.8',
      '169.254.169.254',
      '192.168.2.4',
      'localhost',
      '127.0.0.1.evil.test'
    ])
      expect(allowedRelayTarget(host, 49632, ['192.168.1.2'])).toBe(false)
    expect(allowedRelayTarget('192.168.1.4', 49632, ['192.168.1.2'])).toBe(true)
    expect(allowedRelayTarget('127.0.0.1', 80)).toBe(false)
  })
  it('requires explicit local-service enablement and same-origin requests', async () => {
    const request = new Request('http://localhost:3000/api/lan-sync/network', {
      headers: { 'X-MyMind-Lan': '1' }
    })
    expect((await relayLanRequest(request, ['network'], false)).status).toBe(503)
    const cross = new Request(request, {
      headers: { 'X-MyMind-Lan': '1', Origin: 'https://untrusted.example' }
    })
    expect((await relayLanRequest(cross, ['network'], true)).status).toBe(403)
    const phone = new Request('https://0.0.0.0:3000/api/lan-sync/network', {
      headers: { 'X-MyMind-Lan': '1', Host: '192.168.1.2:3000', Origin: 'https://192.168.1.2:3000' }
    })
    expect((await relayLanRequest(phone, ['network'], true)).status).toBe(200)
    const spoof = new Request(phone, {
      headers: {
        'X-MyMind-Lan': '1',
        Host: '192.168.1.2:3000',
        Origin: 'https://untrusted.example'
      }
    })
    expect((await relayLanRequest(spoof, ['network'], true)).status).toBe(403)
  })
})
