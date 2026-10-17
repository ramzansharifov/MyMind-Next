import type { MobileLanSyncClient } from '../../../mobile/src/shared/sync/lanSyncClient'
import type { LocalProfileRepository } from '@mymind/persistence/local-profile'
import { createPwaProtocolClient } from './protocol-client'
import { createPwaSyncAssets } from './asset-port'
import type { PwaDatabase } from '../storage/database'
import { syncActivity } from './activity'

export function createPwaLanSyncClient(
  db: PwaDatabase,
  profile: LocalProfileRepository
): MobileLanSyncClient {
  const networkIp = async (): Promise<string> => {
    const response = await fetch('/api/lan-sync/network', {
      headers: { 'X-MyMind-Lan': '1' },
      cache: 'no-store'
    })
    const value = (await response.json()) as { ip?: string; error?: string }
    if (!response.ok || !value.ip)
      throw new Error(value.error ?? 'Локальный сервис синхронизации недоступен')
    return value.ip
  }
  const client = createPwaProtocolClient(db, profile, {
    getIpAddress: networkIp,
    fetch: (input, init) => {
      const url = new URL(String(input))
      const endpoint = url.pathname.replace(/^\/mymind-sync\/v1\//, '')
      const headers = new Headers(init?.headers)
      headers.set('X-MyMind-Lan', '1')
      return fetch(`/api/lan-sync/${url.hostname}/${url.port}/${endpoint}`, {
        ...init,
        headers,
        cache: 'no-store'
      })
    },
    assets: createPwaSyncAssets(db)
  })
  return {
    discover: (host) =>
      syncActivity.run(async () => {
        await networkIp()
        return client.discover(host)
      }),
    preview: (device) => syncActivity.run(() => client.preview(device)),
    sync: (device, modules) =>
      syncActivity.run(async () => {
        await db.flush()
        const result = await client.sync(device, modules)
        await db.flush()
        return result
      })
  }
}
