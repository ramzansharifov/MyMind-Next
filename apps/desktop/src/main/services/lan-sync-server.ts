import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { networkInterfaces, hostname } from 'node:os'
import { randomBytes, randomUUID } from 'node:crypto'
import type { SqlDatabasePort } from '@mymind/contracts/storage'
import {
  LAN_SYNC_DEFAULT_PORT,
  LAN_SYNC_PORT_SPAN,
  LAN_SYNC_PROTOCOL_VERSION,
  SYNC_MODULES,
  type LanSyncDevice,
  type SyncAssetDownloadChunk,
  type SyncAssetManifestEntry,
  type SyncAssetUploadProgress,
  type SyncChallengeRequest,
  type SyncChallengeResponse,
  type SyncCommitResponse,
  type SyncDataSnapshot,
  type SyncModuleSummary,
  type SyncPlanResponse,
  type SyncProofRequest,
  type SyncProofResponse
} from '@mymind/contracts/profile-sync'
import { createProfileSyncProof, normalizeProfileLogin, timingSafeHexEqual } from '@mymind/core/profile-sync'
import { listSyncAssetReferences, parseSyncAssetPath } from '@mymind/core/sync-assets'
import { parseSyncDataSnapshot } from '@mymind/core/sync-protocol'
import {
  applySyncSnapshot,
  captureSyncSnapshot,
  mergeSyncSnapshots,
  summarizeSyncMerge
} from '@mymind/persistence/sync'
import type { LanSyncHostStatus } from '../../shared/contracts/profile-sync'
import { getSqlite } from '../database/client'
import { desktopRepositoryRuntime } from '../database/repository-runtime'
import {
  cleanupDesktopSyncAssetStage,
  collectDesktopSyncAssetManifest,
  commitDesktopSyncAssets,
  normalizeDesktopWorkoutPhotoUrls,
  readDesktopSyncAssetChunk,
  stageDesktopSyncAssetChunk
} from './lan-sync-assets'
import { getLocalProfile, getLocalProfileSyncKey } from './local-profile'
import { mainOperationTracker } from './main-operation-tracker'

const CHALLENGE_TTL_MS = 60_000
const SESSION_TTL_MS = 30 * 60_000
const PLAN_TTL_MS = 30 * 60_000
const MAX_JSON_BYTES = 128 * 1024 * 1024
const MAX_ASSETS = 25_000
const MAX_ASSET_BYTES = 2 * 1024 * 1024 * 1024
const MAX_TOTAL_ASSET_BYTES = 4 * 1024 * 1024 * 1024
const ASSET_CHUNK_BYTES = 1024 * 1024
const DEVICE_META_KEY = 'lan-sync-device-id-v1'
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

interface Challenge {
  id: string
  login: string
  clientNonce: string
  serverNonce: string
  expiresAt: number
}

interface Session {
  token: string
  expiresAt: number
}

interface SyncPlan {
  id: string
  sessionToken: string
  expiresAt: number
  snapshot: SyncDataSnapshot
  summaries: SyncModuleSummary[]
  uploads: SyncAssetManifestEntry[]
  downloads: SyncAssetManifestEntry[]
  uploadProgress: Map<string, number>
}

function privateRemoteAddress(value: string | undefined): boolean {
  if (!value) return false
  if (value === '::1' || value === '127.0.0.1') return true
  const normalized = value.startsWith('::ffff:') ? value.slice(7) : value
  if (normalized.includes(':')) {
    const lower = normalized.toLocaleLowerCase('en-US')
    return (
      lower.startsWith('fc') ||
      lower.startsWith('fd') ||
      lower.startsWith('fe8') ||
      lower.startsWith('fe9') ||
      lower.startsWith('fea') ||
      lower.startsWith('feb')
    )
  }
  const parts = normalized.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false
  }
  const [a, b] = parts
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b !== undefined && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  )
}

function lanAddresses(): string[] {
  const result = new Set<string>()
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal && privateRemoteAddress(entry.address)) {
        result.add(entry.address)
      }
    }
  }
  return [...result].sort()
}

function cleanupMap<T extends { expiresAt: number }>(map: Map<string, T>, now = Date.now()): void {
  for (const [key, value] of map) if (value.expiresAt <= now) map.delete(key)
}

function jsonResponse(response: ServerResponse, status: number, value: unknown): void {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.end(JSON.stringify(value))
}

function errorResponse(response: ServerResponse, status: number, message: string): void {
  jsonResponse(response, status, { error: message })
}

async function readJson(request: IncomingMessage, limit = MAX_JSON_BYTES): Promise<unknown> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buffer.length
    if (total > limit) throw new Error('Sync request is too large')
    chunks.push(buffer)
  }
  if (total === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new Error('Invalid sync JSON')
  }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid sync request')
  }
  return value as Record<string, unknown>
}

function parseChallengeRequest(value: unknown): SyncChallengeRequest {
  const input = record(value)
  if (
    typeof input.login !== 'string' ||
    typeof input.clientNonce !== 'string' ||
    input.clientNonce.length < 16 ||
    input.clientNonce.length > 256
  ) {
    throw new Error('Invalid sync challenge')
  }
  return { login: input.login, clientNonce: input.clientNonce }
}

function parseProofRequest(value: unknown): SyncProofRequest {
  const input = record(value)
  if (
    typeof input.challengeId !== 'string' ||
    typeof input.login !== 'string' ||
    typeof input.clientNonce !== 'string' ||
    typeof input.proof !== 'string'
  ) {
    throw new Error('Invalid sync proof')
  }
  return {
    challengeId: input.challengeId,
    login: input.login,
    clientNonce: input.clientNonce,
    proof: input.proof
  }
}

function parseAssetManifest(value: unknown): SyncAssetManifestEntry[] {
  if (!Array.isArray(value) || value.length > MAX_ASSETS) {
    throw new Error('Некорректный список sync assets')
  }
  const seen = new Set<string>()
  let total = 0
  return value.map((raw) => {
    const input = record(raw)
    if (
      typeof input.path !== 'string' ||
      typeof input.kind !== 'string' ||
      typeof input.ownerId !== 'string' ||
      typeof input.assetId !== 'string' ||
      typeof input.fileName !== 'string' ||
      typeof input.size !== 'number' ||
      !Number.isSafeInteger(input.size) ||
      input.size < 0 ||
      input.size > MAX_ASSET_BYTES ||
      typeof input.sha256 !== 'string' ||
      !SHA256_PATTERN.test(input.sha256)
    ) {
      throw new Error('Некорректный sync asset manifest')
    }
    const reference = parseSyncAssetPath(input.path)
    if (
      reference.kind !== input.kind ||
      reference.ownerId !== input.ownerId ||
      reference.assetId !== input.assetId ||
      reference.fileName !== input.fileName
    ) {
      throw new Error('Неканонический sync asset manifest')
    }
    if (seen.has(reference.path)) throw new Error('Повторяющийся sync asset')
    seen.add(reference.path)
    total += input.size
    if (!Number.isSafeInteger(total) || total > MAX_TOTAL_ASSET_BYTES) {
      throw new Error('Sync assets превышают допустимый общий размер')
    }
    return {
      ...reference,
      size: input.size,
      sha256: input.sha256
    }
  })
}

function bearer(request: IncomingMessage): string | null {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  const token = header.slice(7).trim()
  return token || null
}

function decodeBase64(value: unknown): Buffer {
  if (
    typeof value !== 'string' ||
    value.length > Math.ceil((ASSET_CHUNK_BYTES * 4) / 3) + 8 ||
    !BASE64_PATTERN.test(value)
  ) {
    throw new Error('Некорректный sync asset chunk')
  }
  return Buffer.from(value, 'base64')
}

function getOrCreateDeviceId(): string {
  const sqlite = getSqlite()
  const row = sqlite.prepare('SELECT value FROM app_meta WHERE key = ?').get(DEVICE_META_KEY) as
    | { value: string }
    | undefined
  if (row?.value) return row.value
  const value = randomUUID()
  sqlite
    .prepare(
      `INSERT INTO app_meta(key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(DEVICE_META_KEY, value, Date.now())
  return value
}

async function listen(server: Server): Promise<number> {
  let lastError: unknown = null
  for (let offset = 0; offset < LAN_SYNC_PORT_SPAN; offset += 1) {
    const port = LAN_SYNC_DEFAULT_PORT + offset
    try {
      await new Promise<void>((resolvePromise, rejectPromise) => {
        const onError = (error: Error): void => {
          server.off('listening', onListening)
          rejectPromise(error)
        }
        const onListening = (): void => {
          server.off('error', onError)
          resolvePromise()
        }
        server.once('error', onError)
        server.once('listening', onListening)
        server.listen(port, '0.0.0.0')
      })
      return port
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('No free LAN sync port')
}

function planAssets(
  merged: SyncDataSnapshot,
  clientAssets: readonly SyncAssetManifestEntry[],
  serverAssets: readonly SyncAssetManifestEntry[]
): { uploads: SyncAssetManifestEntry[]; downloads: SyncAssetManifestEntry[] } {
  const client = new Map(clientAssets.map((asset) => [asset.path, asset]))
  const server = new Map(serverAssets.map((asset) => [asset.path, asset]))
  const uploads: SyncAssetManifestEntry[] = []
  const downloads: SyncAssetManifestEntry[] = []

  for (const reference of listSyncAssetReferences(merged)) {
    const fromClient = client.get(reference.path)
    const fromServer = server.get(reference.path)

    if (fromClient && fromServer) {
      if (fromClient.size !== fromServer.size || fromClient.sha256 !== fromServer.sha256) {
        throw new Error(
          `Файл «${reference.fileName}» отличается на телефоне и компьютере. Синхронизация остановлена, чтобы не перезаписать данные.`
        )
      }
      continue
    }

    if (fromClient) {
      uploads.push(fromClient)
      continue
    }

    if (fromServer) {
      downloads.push(fromServer)
      continue
    }

    throw new Error(
      `Файл «${reference.fileName}» указан в данных, но отсутствует и на телефоне, и на компьютере.`
    )
  }

  return { uploads, downloads }
}

export class LanSyncServer {
  private server: Server | null = null
  private port = LAN_SYNC_DEFAULT_PORT
  private readonly challenges = new Map<string, Challenge>()
  private readonly sessions = new Map<string, Session>()
  private readonly plans = new Map<string, SyncPlan>()
  private deviceId = ''
  private lastSyncAt: number | null = null

  constructor(private readonly onDataChanged: (modules: string[]) => void = () => undefined) {}

  async start(): Promise<void> {
    if (this.server) return
    this.deviceId = getOrCreateDeviceId()
    const server = createServer((request, response) => {
      void this.handle(request, response).catch((reason: unknown) => {
        const message = reason instanceof Error ? reason.message : 'Sync request failed'
        console.warn('LAN sync request failed', reason)
        if (!response.headersSent) errorResponse(response, 400, message)
        else response.end()
      })
    })
    this.port = await listen(server)
    this.server = server
  }

  async stop(): Promise<void> {
    const server = this.server
    this.server = null
    this.challenges.clear()
    this.sessions.clear()
    const plans = [...this.plans.values()]
    this.plans.clear()
    await Promise.all(
      plans.map((plan) => cleanupDesktopSyncAssetStage(plan.id, plan.uploads))
    ).catch(() => undefined)
    if (!server) return
    await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()))
  }

  getStatus(): LanSyncHostStatus {
    return {
      running: this.server !== null,
      port: this.port,
      addresses: lanAddresses(),
      deviceId: this.deviceId,
      deviceName: hostname(),
      profileReady: getLocalProfile() !== null,
      lastSyncAt: this.lastSyncAt
    }
  }

  private hello(): LanSyncDevice {
    return {
      deviceId: this.deviceId,
      deviceName: hostname(),
      host: '',
      port: this.port,
      protocolVersion: LAN_SYNC_PROTOCOL_VERSION,
      profileReady: getLocalProfile() !== null,
      modules: [...SYNC_MODULES]
    }
  }

  private sessionToken(request: IncomingMessage): string | null {
    cleanupMap(this.sessions)
    const token = bearer(request)
    if (!token) return null
    const session = this.sessions.get(token)
    return session && session.expiresAt > Date.now() ? token : null
  }

  private async cleanupExpiredPlans(): Promise<void> {
    const now = Date.now()
    const expired = [...this.plans.values()].filter((plan) => plan.expiresAt <= now)
    for (const plan of expired) {
      this.plans.delete(plan.id)
      await cleanupDesktopSyncAssetStage(plan.id, plan.uploads)
    }
  }

  private planFor(request: IncomingMessage, planId: unknown): SyncPlan | null {
    const token = this.sessionToken(request)
    if (!token || typeof planId !== 'string') return null
    const plan = this.plans.get(planId)
    if (!plan || plan.sessionToken !== token || plan.expiresAt <= Date.now()) return null
    return plan
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

    if (request.method === 'OPTIONS') {
      response.statusCode = 204
      response.end()
      return
    }

    if (!privateRemoteAddress(request.socket.remoteAddress)) {
      errorResponse(response, 403, 'LAN sync accepts private-network clients only')
      return
    }

    await this.cleanupExpiredPlans()
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${this.port}`)

    if (request.method === 'GET' && url.pathname === '/mymind-sync/v1/hello') {
      jsonResponse(response, 200, this.hello())
      return
    }

    if (request.method === 'POST' && url.pathname === '/mymind-sync/v1/challenge') {
      cleanupMap(this.challenges)
      const profile = getLocalProfile()
      if (!profile) {
        errorResponse(response, 409, 'На компьютере не создан профиль')
        return
      }
      const input = parseChallengeRequest(await readJson(request, 16 * 1024))
      if (normalizeProfileLogin(input.login) !== profile.normalizedLogin) {
        errorResponse(response, 401, 'Профиль не совпадает')
        return
      }
      const challenge: Challenge = {
        id: randomUUID(),
        login: profile.normalizedLogin,
        clientNonce: input.clientNonce,
        serverNonce: randomBytes(24).toString('hex'),
        expiresAt: Date.now() + CHALLENGE_TTL_MS
      }
      this.challenges.set(challenge.id, challenge)
      const result: SyncChallengeResponse = {
        challengeId: challenge.id,
        serverNonce: challenge.serverNonce,
        expiresAt: challenge.expiresAt
      }
      jsonResponse(response, 200, result)
      return
    }

    if (request.method === 'POST' && url.pathname === '/mymind-sync/v1/prove') {
      cleanupMap(this.challenges)
      const input = parseProofRequest(await readJson(request, 16 * 1024))
      const challenge = this.challenges.get(input.challengeId)
      if (
        !challenge ||
        challenge.expiresAt <= Date.now() ||
        challenge.clientNonce !== input.clientNonce ||
        challenge.login !== normalizeProfileLogin(input.login)
      ) {
        errorResponse(response, 401, 'Challenge истёк или не совпадает')
        return
      }

      this.challenges.delete(challenge.id)
      const key = await getLocalProfileSyncKey()
      if (!key) {
        errorResponse(response, 409, 'Ключ профиля недоступен. Повторно задайте логин и пароль.')
        return
      }
      try {
        const expected = createProfileSyncProof(
          'client',
          key,
          challenge.login,
          challenge.id,
          challenge.clientNonce,
          challenge.serverNonce
        )
        if (!timingSafeHexEqual(expected, input.proof)) {
          errorResponse(response, 401, 'Неверный логин или пароль')
          return
        }
        const sessionToken = randomBytes(32).toString('hex')
        const expiresAt = Date.now() + SESSION_TTL_MS
        this.sessions.set(sessionToken, { token: sessionToken, expiresAt })
        const result: SyncProofResponse = {
          sessionToken,
          expiresAt,
          serverProof: createProfileSyncProof(
            'server',
            key,
            challenge.login,
            challenge.id,
            challenge.clientNonce,
            challenge.serverNonce
          )
        }
        jsonResponse(response, 200, result)
      } finally {
        key.fill(0)
      }
      return
    }

    if (request.method === 'POST' && url.pathname === '/mymind-sync/v1/plan') {
      const sessionToken = this.sessionToken(request)
      if (!sessionToken) {
        errorResponse(response, 401, 'Sync session is not authorized')
        return
      }
      const raw = record(await readJson(request))
      const remoteSnapshot = parseSyncDataSnapshot(raw.snapshot)
      const clientAssets = parseAssetManifest(raw.assets)
      const modules = remoteSnapshot.modules.map((module) => module.module)

      const prepared = await mainOperationTracker.run(async () => {
        const database = desktopRepositoryRuntime.database() as SqlDatabasePort
        const localSnapshot = captureSyncSnapshot(database, modules)
        const merged = mergeSyncSnapshots(localSnapshot, remoteSnapshot)
        const serverAssets = await collectDesktopSyncAssetManifest(merged.snapshot)
        const transfers = planAssets(merged.snapshot, clientAssets, serverAssets)
        return {
          snapshot: merged.snapshot,
          summaries: summarizeSyncMerge(
            localSnapshot,
            remoteSnapshot,
            merged.snapshot,
            merged.conflicts
          ),
          ...transfers
        }
      })

      const planId = randomUUID()
      const expiresAt = Date.now() + PLAN_TTL_MS
      const plan: SyncPlan = {
        id: planId,
        sessionToken,
        expiresAt,
        snapshot: prepared.snapshot,
        summaries: prepared.summaries,
        uploads: prepared.uploads,
        downloads: prepared.downloads,
        uploadProgress: new Map(prepared.uploads.map((asset) => [asset.path, 0]))
      }
      this.plans.set(plan.id, plan)
      const result: SyncPlanResponse = {
        planId,
        expiresAt,
        snapshot: plan.snapshot,
        summaries: plan.summaries,
        uploads: plan.uploads,
        downloads: plan.downloads
      }
      jsonResponse(response, 200, result)
      return
    }

    if (request.method === 'POST' && url.pathname === '/mymind-sync/v1/assets/upload') {
      const raw = record(await readJson(request, 2 * 1024 * 1024))
      const plan = this.planFor(request, raw.planId)
      if (!plan) {
        errorResponse(response, 401, 'Sync plan is not authorized or expired')
        return
      }
      if (
        typeof raw.path !== 'string' ||
        typeof raw.offset !== 'number' ||
        !Number.isSafeInteger(raw.offset)
      ) {
        throw new Error('Некорректный sync asset chunk')
      }
      const expected = plan.uploads.find((asset) => asset.path === raw.path)
      if (!expected) throw new Error('Этот файл не ожидается текущим sync plan')
      const progress = plan.uploadProgress.get(expected.path) ?? 0
      if (progress !== raw.offset) throw new Error('Нарушен порядок загрузки sync asset')
      const bytes = decodeBase64(raw.data)
      const staged = await stageDesktopSyncAssetChunk(plan.id, expected, raw.offset, bytes)
      plan.uploadProgress.set(expected.path, staged.received)
      const result: SyncAssetUploadProgress = {
        path: expected.path,
        received: staged.received,
        complete: staged.complete
      }
      jsonResponse(response, 200, result)
      return
    }

    if (request.method === 'GET' && url.pathname === '/mymind-sync/v1/assets/download') {
      const plan = this.planFor(request, url.searchParams.get('planId'))
      if (!plan) {
        errorResponse(response, 401, 'Sync plan is not authorized or expired')
        return
      }
      const path = url.searchParams.get('path')
      const offset = Number(url.searchParams.get('offset'))
      const length = Number(url.searchParams.get('length'))
      if (!path || !Number.isSafeInteger(offset) || !Number.isSafeInteger(length)) {
        throw new Error('Некорректный диапазон sync asset')
      }
      const expected = plan.downloads.find((asset) => asset.path === path)
      if (!expected) throw new Error('Этот файл не доступен в текущем sync plan')
      const bytes = await readDesktopSyncAssetChunk(path, offset, length)
      const nextOffset = offset + bytes.byteLength
      if (nextOffset > expected.size) throw new Error('Файл sync asset изменился во время передачи')
      const result: SyncAssetDownloadChunk = {
        path,
        offset,
        totalSize: expected.size,
        sha256: expected.sha256,
        data: bytes.toString('base64'),
        complete: nextOffset === expected.size
      }
      jsonResponse(response, 200, result)
      return
    }

    if (request.method === 'POST' && url.pathname === '/mymind-sync/v1/commit') {
      const raw = record(await readJson(request, 16 * 1024))
      const plan = this.planFor(request, raw.planId)
      if (!plan) {
        errorResponse(response, 401, 'Sync plan is not authorized or expired')
        return
      }
      for (const asset of plan.uploads) {
        if ((plan.uploadProgress.get(asset.path) ?? 0) !== asset.size) {
          throw new Error(`Файл «${asset.fileName}» загружен не полностью`)
        }
      }

      await commitDesktopSyncAssets(plan.id, plan.uploads)
      const modules = plan.snapshot.modules.map((module) => module.module)
      await mainOperationTracker.run(() => {
        const database = desktopRepositoryRuntime.database() as SqlDatabasePort
        applySyncSnapshot(database, plan.snapshot)
        normalizeDesktopWorkoutPhotoUrls(database, plan.snapshot)
      })

      this.plans.delete(plan.id)
      await cleanupDesktopSyncAssetStage(plan.id, plan.uploads)
      this.lastSyncAt = Date.now()
      this.onDataChanged(modules)
      const result: SyncCommitResponse = { committedAt: this.lastSyncAt }
      jsonResponse(response, 200, result)
      return
    }

    errorResponse(response, 404, 'Sync endpoint not found')
  }
}
