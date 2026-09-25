import * as Network from 'expo-network'
import { getRandomValues, randomUUID } from 'expo-crypto'
import type { SqlDatabasePort } from '@mymind/contracts/storage'
import {
  LAN_SYNC_DEFAULT_PORT,
  LAN_SYNC_PORT_SPAN,
  LAN_SYNC_PROTOCOL_VERSION,
  MOBILE_SYNC_MODULES,
  type LanSyncDevice,
  type MobileSyncModule,
  type SyncAssetDownloadChunk,
  type SyncAssetManifestEntry,
  type SyncAssetUploadProgress,
  type SyncChallengeResponse,
  type SyncCommitResponse,
  type SyncInventoryResponse,
  type SyncModule,
  type SyncModuleInventory,
  type SyncModuleSummary,
  type SyncPlanResponse,
  type SyncProofResponse,
  type SyncResult
} from '@mymind/contracts/profile-sync'
import {
  decryptLanSyncJson,
  deriveLanSyncSessionKey,
  encryptLanSyncJson,
  parseLanSyncEncryptedEnvelope
} from '@mymind/core/lan-sync-crypto'
import { createProfileSyncProof, timingSafeHexEqual } from '@mymind/core/profile-sync'
import { listRemovedSyncAssetReferences } from '@mymind/core/sync-assets'
import { parseSyncDataSnapshot } from '@mymind/core/sync-protocol'
import type { LocalProfileRepository } from '@mymind/persistence/local-profile'
import {
  applySyncSnapshot,
  captureSyncSnapshot,
  mergeSyncSnapshots,
  reconcileSyncSnapshotForeignKeys,
  summarizeSyncInventory
} from '@mymind/persistence/sync'
import {
  cleanupMobileSyncAssetStage,
  collectMobileSyncAssetManifest,
  commitMobileSyncAssets,
  decodeSyncBase64,
  encodeSyncBase64,
  readMobileSyncAssetChunks,
  removeMobileSyncAssets,
  stageMobileSyncAssetChunk,
  verifyStagedMobileSyncAsset
} from './mobileSyncAssets'

const DISCOVERY_TIMEOUT_MS = 450
const REQUEST_TIMEOUT_MS = 15_000
const TRANSFER_TIMEOUT_MS = 45_000
const DISCOVERY_CONCURRENCY = 20
const MAX_DISCOVERY_HOSTS = 254
const ASSET_CHUNK_BYTES = 1024 * 1024
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const SUPPORTED_MODULES = new Set<SyncModule>(MOBILE_SYNC_MODULES)

export interface MobileSyncModulePreview {
  module: MobileSyncModule
  phone: SyncModuleInventory
  computer: SyncModuleInventory
}

export interface MobileSyncPreview {
  device: LanSyncDevice
  modules: MobileSyncModulePreview[]
}

export interface MobileLanSyncClient {
  discover(manualHost?: string): Promise<LanSyncDevice[]>
  preview(device: LanSyncDevice): Promise<MobileSyncPreview>
  sync(device: LanSyncDevice, modules: readonly SyncModule[]): Promise<SyncResult>
}

interface MobileLanSession {
  token: string
  key: Uint8Array
  expiresAt: number
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

function secureNonce(): Uint8Array {
  const nonce = new Uint8Array(12)
  getRandomValues(nonce)
  return nonce
}

async function requestSecureJson(
  baseUrl: string,
  path: string,
  session: MobileLanSession,
  value: unknown,
  timeoutMs: number
): Promise<unknown> {
  if (session.expiresAt <= Date.now()) throw new Error('Сессия синхронизации истекла')
  const requestId = randomUUID()
  const nonce = secureNonce()
  const envelope = encryptLanSyncJson(
    value,
    session.key,
    nonce,
    'request',
    'POST',
    path,
    session.token,
    requestId
  )
  nonce.fill(0)

  const timeout = withTimeout(timeoutMs)
  try {
    const response = await fetch(`${baseUrl}${path.replace('/mymind-sync/v1', '')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`
      },
      body: JSON.stringify(envelope),
      signal: timeout.signal
    })
    const text = await response.text()
    let raw: unknown
    try {
      raw = text ? JSON.parse(text) : null
    } catch {
      throw new Error('Компьютер вернул повреждённый защищённый ответ')
    }

    let decrypted: unknown
    try {
      const responseEnvelope = parseLanSyncEncryptedEnvelope(raw)
      if (responseEnvelope.requestId !== requestId) {
        throw new Error('Ответ компьютера относится к другому запросу')
      }
      decrypted = decryptLanSyncJson(
        responseEnvelope,
        session.key,
        'response',
        'POST',
        path,
        session.token,
        requestId
      )
    } catch {
      if (!response.ok) {
        const plain =
          typeof raw === 'object' && raw !== null && !Array.isArray(raw)
            ? (raw as Record<string, unknown>).error
            : null
        throw new Error(
          typeof plain === 'string'
            ? plain
            : `LAN sync завершился с ошибкой HTTP ${response.status}`
        )
      }
      throw new Error('Не удалось проверить защищённый ответ компьютера')
    }

    if (!response.ok) {
      const error = record(decrypted).error
      throw new Error(typeof error === 'string' ? error : `HTTP ${response.status}`)
    }
    return decrypted
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
    (module): module is SyncModule =>
      typeof module === 'string' && (MOBILE_SYNC_MODULES as readonly string[]).includes(module)
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

function parseAssetManifest(value: unknown): SyncAssetManifestEntry[] {
  if (!Array.isArray(value)) throw new Error('Некорректный список файлов синхронизации')
  const seen = new Set<string>()
  return value.map((raw) => {
    const input = record(raw)
    if (
      typeof input.path !== 'string' ||
      input.kind !== 'note-asset' ||
      typeof input.ownerId !== 'string' ||
      typeof input.assetId !== 'string' ||
      typeof input.fileName !== 'string' ||
      typeof input.size !== 'number' ||
      !Number.isSafeInteger(input.size) ||
      input.size < 0 ||
      typeof input.sha256 !== 'string' ||
      !SHA256_PATTERN.test(input.sha256)
    ) {
      throw new Error('Некорректное описание файла синхронизации')
    }
    if (seen.has(input.path)) throw new Error('Повторяющийся файл синхронизации')
    seen.add(input.path)
    return {
      path: input.path,
      kind: input.kind,
      ownerId: input.ownerId,
      assetId: input.assetId,
      fileName: input.fileName,
      size: input.size,
      sha256: input.sha256
    }
  })
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

function parseInventory(
  value: unknown,
  modules: readonly SyncModule[]
): SyncInventoryResponse {
  const input = record(value)
  if (
    typeof input.generatedAt !== 'number' ||
    !Number.isSafeInteger(input.generatedAt) ||
    !Array.isArray(input.modules)
  ) {
    throw new Error('Некорректная сводка данных синхронизации')
  }
  const allowed = new Set(modules)
  const seen = new Set<SyncModule>()
  const inventory = input.modules.map((raw) => {
    const item = record(raw)
    if (
      typeof item.module !== 'string' ||
      !allowed.has(item.module as SyncModule) ||
      seen.has(item.module as SyncModule) ||
      typeof item.records !== 'number' ||
      !Number.isSafeInteger(item.records) ||
      item.records < 0 ||
      typeof item.deleted !== 'number' ||
      !Number.isSafeInteger(item.deleted) ||
      item.deleted < 0
    ) {
      throw new Error('Некорректная сводка данных синхронизации')
    }
    const module = item.module as SyncModule
    seen.add(module)
    return {
      module,
      records: item.records,
      deleted: item.deleted
    }
  })
  if (inventory.length !== modules.length || modules.some((module) => !seen.has(module))) {
    throw new Error('Компьютер вернул неполную сводку модулей')
  }
  return {
    generatedAt: input.generatedAt,
    modules: inventory
  }
}

function parsePlan(value: unknown, modules: readonly SyncModule[]): SyncPlanResponse {
  const input = record(value)
  if (
    typeof input.planId !== 'string' ||
    typeof input.expiresAt !== 'number' ||
    !Number.isSafeInteger(input.expiresAt)
  ) {
    throw new Error('Некорректный план синхронизации')
  }
  const snapshot = parseSyncDataSnapshot(input.snapshot)
  const snapshotModules = snapshot.modules.map((module) => module.module)
  if (
    snapshotModules.length !== modules.length ||
    modules.some((module) => !snapshotModules.includes(module))
  ) {
    throw new Error('Компьютер вернул неполный набор модулей синхронизации')
  }
  return {
    planId: input.planId,
    expiresAt: input.expiresAt,
    snapshot,
    summaries: parseSummaries(input.summaries, modules),
    uploads: parseAssetManifest(input.uploads),
    downloads: parseAssetManifest(input.downloads)
  }
}

function parseUploadProgress(
  value: unknown,
  expected: SyncAssetManifestEntry
): SyncAssetUploadProgress {
  const input = record(value)
  if (
    input.path !== expected.path ||
    typeof input.received !== 'number' ||
    !Number.isSafeInteger(input.received) ||
    input.received < 0 ||
    input.received > expected.size ||
    typeof input.complete !== 'boolean'
  ) {
    throw new Error('Некорректный ответ загрузки файла')
  }
  return {
    path: expected.path,
    received: input.received,
    complete: input.complete
  }
}

function parseDownloadChunk(
  value: unknown,
  expected: SyncAssetManifestEntry,
  offset: number
): SyncAssetDownloadChunk {
  const input = record(value)
  if (
    input.path !== expected.path ||
    input.offset !== offset ||
    input.totalSize !== expected.size ||
    input.sha256 !== expected.sha256 ||
    typeof input.data !== 'string' ||
    typeof input.complete !== 'boolean'
  ) {
    throw new Error('Некорректный ответ скачивания файла')
  }
  return {
    path: expected.path,
    offset,
    totalSize: expected.size,
    sha256: expected.sha256,
    data: input.data,
    complete: input.complete
  }
}

function parseCommit(value: unknown): SyncCommitResponse {
  const input = record(value)
  if (typeof input.committedAt !== 'number' || !Number.isSafeInteger(input.committedAt)) {
    throw new Error('Некорректный ответ завершения синхронизации')
  }
  return { committedAt: input.committedAt }
}

function isPrivateIpv4(value: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value)
  if (!match) return false
  const octets = match.slice(1).map(Number)
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false
  const [a, b] = octets
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b !== undefined && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  )
}

function normalizeManualHost(value: string): string {
  const host = value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
  const withoutPort = host.replace(/:\d+$/, '')
  if (!withoutPort) throw new Error('Введите IP-адрес компьютера')
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(withoutPort)) {
    throw new Error('Для ручного подключения укажите локальный IPv4-адрес компьютера')
  }
  if (!isPrivateIpv4(withoutPort)) {
    throw new Error('Укажите локальный IPv4-адрес компьютера из вашей Wi-Fi / LAN сети')
  }
  return withoutPort
}

function subnetHosts(ip: string): string[] {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip)
  if (!match) return []
  const octets = match.slice(1).map(Number)
  if (
    octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255) ||
    !isPrivateIpv4(ip)
  ) {
    return []
  }
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
  const ports = Array.from(
    { length: LAN_SYNC_PORT_SPAN },
    (_, index) => LAN_SYNC_DEFAULT_PORT + index
  )
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
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = cursor
      cursor += 1
      if (index >= items.length) return
      results[index] = await operation(items[index]!)
    }
  })
  await Promise.all(workers)
  return results
}

async function authenticate(
  device: LanSyncDevice,
  profileRepository: LocalProfileRepository
): Promise<MobileLanSession> {
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
          body: JSON.stringify({ clientNonce })
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
    const sessionKey = deriveLanSyncSessionKey(
      key,
      challenge.challengeId,
      clientNonce,
      challenge.serverNonce
    )
    return {
      token: authenticated.sessionToken,
      key: sessionKey,
      expiresAt: authenticated.expiresAt
    }
  } finally {
    key.fill(0)
  }
}

async function uploadAssets(
  baseUrl: string,
  session: MobileLanSession,
  plan: SyncPlanResponse
): Promise<void> {
  for (const entry of plan.uploads) {
    let finalReceived = -1
    let finalComplete = false
    await readMobileSyncAssetChunks(entry, async (offset, bytes) => {
      const progress = parseUploadProgress(
        await requestSecureJson(
          baseUrl,
          '/mymind-sync/v1/assets/upload',
          session,
          {
            planId: plan.planId,
            path: entry.path,
            offset,
            data: encodeSyncBase64(bytes)
          },
          TRANSFER_TIMEOUT_MS
        ),
        entry
      )
      finalReceived = progress.received
      finalComplete = progress.complete
    })
    if (finalReceived !== entry.size || !finalComplete) {
      throw new Error(`Файл «${entry.fileName}» не был полностью отправлен`)
    }
  }
}

async function downloadAssets(
  baseUrl: string,
  session: MobileLanSession,
  plan: SyncPlanResponse
): Promise<void> {
  for (const entry of plan.downloads) {
    let offset = 0
    let complete = false

    do {
      const chunk = parseDownloadChunk(
        await requestSecureJson(
          baseUrl,
          '/mymind-sync/v1/assets/download',
          session,
          {
            planId: plan.planId,
            path: entry.path,
            offset,
            length: ASSET_CHUNK_BYTES
          },
          TRANSFER_TIMEOUT_MS
        ),
        entry,
        offset
      )
      const bytes = decodeSyncBase64(chunk.data)
      if (bytes.length === 0 && entry.size !== 0 && !chunk.complete) {
        throw new Error(`Скачивание «${entry.fileName}» остановилось раньше времени`)
      }
      stageMobileSyncAssetChunk(plan.planId, entry, offset, bytes)
      offset += bytes.length
      complete = chunk.complete
      if (complete !== (offset === entry.size)) {
        throw new Error(`Компьютер вернул неполный файл «${entry.fileName}»`)
      }
    } while (!complete)

    verifyStagedMobileSyncAsset(plan.planId, entry)
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

    async preview(device) {
      const modules = MOBILE_SYNC_MODULES.filter((module) => device.modules.includes(module))
      if (modules.length === 0) {
        throw new Error('У компьютера нет модулей, доступных для синхронизации с телефоном')
      }

      const session = await authenticate(device, profileRepository)
      const baseUrl = `http://${device.host}:${device.port}/mymind-sync/v1`
      try {
        const localSnapshot = captureSyncSnapshot(database, modules)
        const phoneByModule = new Map(
          summarizeSyncInventory(localSnapshot).map((item) => [item.module, item])
        )
        const computerInventory = parseInventory(
          await requestSecureJson(
            baseUrl,
            '/mymind-sync/v1/inventory',
            session,
            { modules },
            REQUEST_TIMEOUT_MS
          ),
          modules
        )
        const computerByModule = new Map(
          computerInventory.modules.map((item) => [item.module, item])
        )
        return {
          device,
          modules: modules.map((module) => ({
            module,
            phone: phoneByModule.get(module) ?? { module, records: 0, deleted: 0 },
            computer: computerByModule.get(module) ?? { module, records: 0, deleted: 0 }
          }))
        }
      } finally {
        session.key.fill(0)
      }
    },

    async sync(device, requestedModules) {
      const startedAt = Date.now()
      const available = new Set(device.modules)
      const modules = [...new Set(requestedModules)].filter(
        (module) => available.has(module) && SUPPORTED_MODULES.has(module)
      )
      if (modules.length === 0)
        throw new Error('Не выбрано ни одного общего модуля для синхронизации')

      const session = await authenticate(device, profileRepository)
      const baseUrl = `http://${device.host}:${device.port}/mymind-sync/v1`
      let plan: SyncPlanResponse | null = null

      try {
        const localSnapshot = captureSyncSnapshot(database, modules)
        const localAssets = collectMobileSyncAssetManifest(localSnapshot)
        plan = parsePlan(
          await requestSecureJson(
            baseUrl,
            '/mymind-sync/v1/plan',
            session,
            { snapshot: localSnapshot, assets: localAssets },
            REQUEST_TIMEOUT_MS
          ),
          modules
        )

        if (plan.expiresAt <= Date.now()) throw new Error('План синхронизации уже истёк')

        await uploadAssets(baseUrl, session, plan)
        await downloadAssets(baseUrl, session, plan)

        // Place received files first. If the remote commit then fails, they are only harmless
        // orphans and no local database row points at them yet.
        commitMobileSyncAssets(plan.planId, plan.downloads)

        parseCommit(
          await requestSecureJson(
            baseUrl,
            '/mymind-sync/v1/commit',
            session,
            { planId: plan.planId },
            TRANSFER_TIMEOUT_MS
          )
        )

        // Preserve any local change that happened while files were in flight. The desktop will
        // receive such a late local change on the next sync instead of it being overwritten here.
        const currentLocal = captureSyncSnapshot(database, modules)
        const mergedAfterTransfer =
          JSON.stringify(currentLocal.modules) === JSON.stringify(localSnapshot.modules)
            ? plan.snapshot
            : mergeSyncSnapshots(currentLocal, plan.snapshot).snapshot
        const finalSnapshot = reconcileSyncSnapshotForeignKeys(database, mergedAfterTransfer)
        const removedAssets = listRemovedSyncAssetReferences(currentLocal, finalSnapshot)
        applySyncSnapshot(database, finalSnapshot)
        removeMobileSyncAssets(removedAssets)

        return {
          startedAt,
          completedAt: Date.now(),
          device,
          modules: plan.summaries
        }
      } finally {
        if (plan) cleanupMobileSyncAssetStage(plan.planId)
        session.key.fill(0)
      }
    }
  }
}
