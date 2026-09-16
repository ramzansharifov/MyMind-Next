import * as Network from 'expo-network'
import { randomUUID } from 'expo-crypto'
import type { SqlDatabasePort } from '@mymind/contracts/storage'
import {
  LAN_SYNC_DEFAULT_PORT,
  LAN_SYNC_PORT_SPAN,
  LAN_SYNC_PROTOCOL_VERSION,
  SYNC_MODULES,
  type LanSyncDevice,
  type SyncChallengeResponse,
  type SyncModule,
  type SyncModuleSummary,
  type SyncProofResponse,
  type SyncResult
} from '@mymind/contracts/profile-sync'
import {
  createProfileSyncProof,
  timingSafeHexEqual
} from '@mymind/core/profile-sync'
import { parseSyncDataSnapshot } from '@mymind/core/sync-protocol'
import type { LocalProfileRepository } from '@mymind/persistence/local-profile'
import { applySyncSnapshot, captureSyncSnapshot } from '@mymind/persistence/sync'

const DISCOVERY_TIMEOUT_MS = 450
const REQUEST_TIMEOUT_MS = 15_000
const DISCOVERY_CONCURRENCY = 40
const MAX_DISCOVERY_HOSTS = 254
const SUPPORTED_MODULES = new Set<string>(SYNC_MODULES)

export interface MobileLanSyncClient {
  discover(manualHost?: string): Promise<LanSyncDevice[]>
  sync(device: LanSyncDevice, modules: readonly SyncModule[]): Promise<SyncResult>
}

function withTimeout(timeoutMs: number): { signal: AbortSignal; clear(): void } {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return { signal: controller.signal, clear: () => clearTimeout(timer) }
}

async function requestJson(
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number
): Promise<unknown> {
  const timeout = withTimeout(timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: timeout.signal })
    const text = await response.text()
    let value: unknown = null
    try {
      value = text ? JSON.parse(text) : null
    } catch {
      throw new Error('Устройство вернуло повреждённый ответ')
    }
    if (!response.ok) {
      const message =
        typeof value === 'object' &&
        value !== null &&
        'error' in value &&
        typeof value.error === 'string'
          ? value.error
          : `HTTP ${response.status}`
      throw new Error(message)
    }
    return value
  } finally {
    timeout.clear()
  }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Некорректный ответ LAN sync')
  }
  return value as Record<string, unknown>
}

function parseHello(value: unknown, host: string, port: number): LanSyncDevice {
  const input = record(value)
  if (
    typeof input.deviceId !== 'string' ||
    typeof input.deviceName !== 'string' ||
    input.protocolVersion !== LAN_SYNC_PROTOCOL_VERSION ||
    typeof input.profileReady !== 'boolean' ||
    !Array.isArray(input.modules)
  ) {
    throw new Error('Это не совместимое устройство MyMind')
  }
  const modules = input.modules.filter(
    (module): module is SyncModule => typeof module === 'string' && SUPPORTED_MODULES.has(module)
  )
  return {
    deviceId: input.deviceId,
    deviceName: input.deviceName,
    host,
    port,
    protocolVersion: LAN_SYNC_PROTOCOL_VERSION,
    profileReady: input.profileReady,
    modules: [...new Set(modules)]
  }
}

function parseChallenge(value: unknown): SyncChallengeResponse {
  const input = record(value)
  if (
    typeof input.challengeId !== 'string' ||
    typeof input.serverNonce !== 'string' ||
    typeof input.expiresAt !== 'number'
  ) {
    throw new Error('Некорректный challenge от компьютера')
  }
  return {
    challengeId: input.challengeId,
    serverNonce: input.serverNonce,
    expiresAt: input.expiresAt
  }
}

function parseProof(value: unknown): SyncProofResponse {
  const input = record(value)
  if (
    typeof input.sessionToken !== 'string' ||
    typeof input.expiresAt !== 'number' ||
    typeof input.serverProof !== 'string'
  ) {
    throw new Error('Некорректный ответ авторизации')
  }
  return {
    sessionToken: input.sessionToken,
    expiresAt: input.expiresAt,
    serverProof: input.serverProof
  }
}

function parseSummaries(value: unknown, modules: readonly SyncModule[]): SyncModuleSummary[] {
  if (!Array.isArray(value)) throw new Error('Некорректный итог синхронизации')
  const allowed = new Set(modules)
  return value.map((item) => {
    const input = record(item)
    if (
      typeof input.module !== 'string' ||
      !allowed.has(input.module as SyncModule) ||
      typeof input.received !== 'number' ||
      typeof input.sent !== 'number' ||
      typeof input.deleted !== 'number' ||
      typeof input.conflicts !== 'number'
    ) {
      throw new Error('Некорректный итог синхронизации')
    }
    return {
      module: input.module as SyncModule,
      received: input.received,
      sent: input.sent,
      deleted: input.deleted,
      conflicts: input.conflicts
    }
  })
}

function normalizeManualHost(value: string): string {
  const host = value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '')
  const withoutPort = host.replace(/:\d+$/, '')
  if (!withoutPort) throw new Error('Введите IP-адрес компьютера')
  if (!/^[0-9a-fA-F:.]+$/.test(withoutPort)) {
    throw new Error('Для ручного подключения укажите локальный IP-адрес компьютера')
  }
  return withoutPort
}

function subnetHosts(ip: string): string[] {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip)
  if (!match) return []
  const octets = match.slice(1).map(Number)
  if (octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return []
  const prefix = octets.slice(0, 3).join('.')
  const current = octets[3]
  const suffixes = [1, 2, 254, ...Array.from({ length: 254 }, (_, index) => index + 1)]
  const seen = new Set<number>()
  const result: string[] = []
  for (const suffix of suffixes) {
    if (suffix === current || seen.has(suffix)) continue
    seen.add(suffix)
    result.push(`${prefix}.${suffix}`)
    if (result.length >= MAX_DISCOVERY_HOSTS) break
  }
  return result
}

async function discoverHost(host: string): Promise<LanSyncDevice | null> {
  const ports = Array.from({ length: LAN_SYNC_PORT_SPAN }, (_, index) => LAN_SYNC_DEFAULT_PORT + index)
  const results = await Promise.all(
    ports.map(async (port) => {
      try {
        const value = await requestJson(
          `http://${host}:${port}/mymind-sync/v1/hello`,
          { method: 'GET' },
          DISCOVERY_TIMEOUT_MS
        )
        return parseHello(value, host, port)
      } catch {
        return null
      }
    })
  )
  return results.find((device): device is LanSyncDevice => device !== null) ?? null
}

async function mapConcurrent<T, R>(
  items: readonly T[],
  concurrency: number,
  operation: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (true) {
        const index = cursor
        cursor += 1
        if (index >= items.length) return
        results[index] = await operation(items[index]!)
      }
    }
  )
  await Promise.all(workers)
  return results
}

async function authenticate(
  device: LanSyncDevice,
  profileRepository: LocalProfileRepository
): Promise<string> {
  const profile = profileRepository.getProfile()
  if (!profile) throw new Error('Сначала создайте профиль на телефоне')
  const key = await profileRepository.getSyncKey()
  if (!key) throw new Error('Ключ профиля на телефоне недоступен. Повторно задайте пароль.')

  const baseUrl = `http://${device.host}:${device.port}/mymind-sync/v1`
  const clientNonce = `${randomUUID()}${randomUUID()}`
  try {
    const challenge = parseChallenge(
      await requestJson(
        `${baseUrl}/challenge`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ login: profile.normalizedLogin, clientNonce })
        },
        REQUEST_TIMEOUT_MS
      )
    )
    if (challenge.expiresAt <= Date.now()) throw new Error('Challenge синхронизации уже истёк')
    const proof = createProfileSyncProof(
      'client',
      key,
      profile.normalizedLogin,
      challenge.challengeId,
      clientNonce,
      challenge.serverNonce
    )
    const authenticated = parseProof(
      await requestJson(
        `${baseUrl}/prove`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            challengeId: challenge.challengeId,
            login: profile.normalizedLogin,
            clientNonce,
            proof
          })
        },
        REQUEST_TIMEOUT_MS
      )
    )
    const expectedServerProof = createProfileSyncProof(
      'server',
      key,
      profile.normalizedLogin,
      challenge.challengeId,
      clientNonce,
      challenge.serverNonce
    )
    if (!timingSafeHexEqual(expectedServerProof, authenticated.serverProof)) {
      throw new Error('Не удалось подтвердить подлинность компьютера')
    }
    if (authenticated.expiresAt <= Date.now()) throw new Error('Сессия синхронизации истекла')
    return authenticated.sessionToken
  } finally {
    key.fill(0)
  }
}

export function createMobileLanSyncClient(
  database: SqlDatabasePort,
  profileRepository: LocalProfileRepository
): MobileLanSyncClient {
  return {
    async discover(manualHost) {
      const hosts: string[] = []
      if (manualHost?.trim()) hosts.push(normalizeManualHost(manualHost))

      try {
        const ip = await Network.getIpAddressAsync()
        hosts.push(...subnetHosts(ip))
        if (ip.startsWith('10.0.2.')) hosts.unshift('10.0.2.2')
      } catch {
        // Manual IP remains available even when the platform cannot expose the Wi-Fi address.
      }

      const uniqueHosts = [...new Set(hosts)]
      if (uniqueHosts.length === 0) {
        throw new Error('Не удалось определить локальную сеть. Укажите IP компьютера вручную.')
      }

      const discovered = await mapConcurrent(uniqueHosts, DISCOVERY_CONCURRENCY, discoverHost)
      const byId = new Map<string, LanSyncDevice>()
      for (const device of discovered) {
        if (device?.profileReady) byId.set(device.deviceId, device)
      }
      return [...byId.values()].sort((left, right) =>
        left.deviceName.localeCompare(right.deviceName, 'ru-RU')
      )
    },

    async sync(device, requestedModules) {
      const startedAt = Date.now()
      const available = new Set(device.modules)
      const modules = [...new Set(requestedModules)].filter((module) => available.has(module))
      if (modules.length === 0) throw new Error('Не выбрано ни одного общего модуля для синхронизации')

      const sessionToken = await authenticate(device, profileRepository)
      const localSnapshot = captureSyncSnapshot(database, modules)
      const baseUrl = `http://${device.host}:${device.port}/mymind-sync/v1`
      const response = record(
        await requestJson(
          `${baseUrl}/exchange`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sessionToken}`
            },
            body: JSON.stringify({ snapshot: localSnapshot })
          },
          REQUEST_TIMEOUT_MS
        )
      )
      const merged = parseSyncDataSnapshot(response.snapshot)
      const receivedModules = merged.modules.map((module) => module.module)
      if (
        receivedModules.length !== modules.length ||
        modules.some((module) => !receivedModules.includes(module))
      ) {
        throw new Error('Компьютер вернул неполный набор модулей синхронизации')
      }

      applySyncSnapshot(database, merged)
      return {
        startedAt,
        completedAt: Date.now(),
        device,
        modules: parseSummaries(response.summaries, modules)
      }
    }
  }
}
