import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { networkInterfaces, hostname } from 'node:os'
import { randomBytes, randomUUID } from 'node:crypto'
import type { SqlDatabasePort } from '@mymind/contracts/storage'
import {
  LAN_SYNC_DEFAULT_PORT,
  LAN_SYNC_PORT_SPAN,
  LAN_SYNC_PROTOCOL_VERSION,
  MOBILE_SYNC_MODULES,
  type LanSyncDevice,
  type SyncAssetDownloadChunk,
  type SyncAssetManifestEntry,
  type SyncAssetUploadProgress,
  type SyncChallengeRequest,
  type SyncChallengeResponse,
  type SyncCommitResponse,
  type SyncDataSnapshot,
  type SyncInventoryResponse,
  type SyncModule,
  type SyncModuleSummary,
  type SyncPlanResponse,
  type SyncProofRequest,
  type SyncProofResponse
} from '@mymind/contracts/profile-sync'
import {
  decryptLanSyncJson,
  deriveLanSyncSessionKey,
  encryptLanSyncJson,
  parseLanSyncEncryptedEnvelope
} from '@mymind/core/lan-sync-crypto'
import { createProfileSyncProof, timingSafeHexEqual } from '@mymind/core/profile-sync'
import {
  listRemovedSyncAssetReferences,
  listSyncAssetReferences,
  parseSyncAssetPath
} from '@mymind/core/sync-assets'
import { parseSyncDataSnapshot } from '@mymind/core/sync-protocol'
import {
  applySyncSnapshot,
  captureSyncSnapshot,
  ensureSyncInfrastructure,
  mergeSyncSnapshots,
  reconcileSyncSnapshotForeignKeys,
  summarizeSyncInventory,
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
  removeDesktopSyncAssets,
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
const AUTH_FAILURE_WINDOW_MS = 60_000
const AUTH_FAILURE_LIMIT = 5
const AUTH_BLOCK_MS = 5 * 60_000
const ACTIVE_CHALLENGE_LIMIT_PER_CLIENT = 8
const MAX_SESSION_REQUEST_IDS = 20_000
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const MOBILE_SYNC_MODULE_SET = new Set<SyncModule>(MOBILE_SYNC_MODULES)
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

interface Challenge {
  id: string
  clientKey: string
  login: string
  clientNonce: string
  serverNonce: string
  expiresAt: number
}

interface Session {
  token: string
  key: Uint8Array
  expiresAt: number
  seenRequestIds: Set<string>
}

interface AuthFailureState {
  windowStartedAt: number
  failures: number
  blockedUntil: number
}

interface SyncPlan {
  id: string
  sessionToken: string
  expiresAt: number
  localBaseline: SyncDataSnapshot
  snapshot: SyncDataSnapshot
  summaries: SyncModuleSummary[]
  uploads: SyncAssetManifestEntry[]
  downloads: SyncAssetManifestEntry[]
  serverBaselineAssets: SyncAssetManifestEntry[]
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

function remoteClientKey(request: IncomingMessage): string {
  const value = request.socket.remoteAddress ?? 'unknown'
  return value.startsWith('::ffff:') ? value.slice(7) : value
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
  response.end(JSON.stringify(value))
}

function errorResponse(response: ServerResponse, status: number, message: string): void {
  jsonResponse(response, status, { error: message })
}


const secureRequestIds = new WeakMap<IncomingMessage, string>()

function secureJsonResponse(
  response: ServerResponse,
  status: number,
  session: Session,
  method: string,
  path: string,
  requestId: string,
  value: unknown
): void {
  const nonce = new Uint8Array(randomBytes(12))
  const envelope = encryptLanSyncJson(
    value,
    session.key,
    nonce,
    'response',
    method,
    path,
    session.token,
    requestId
  )
  nonce.fill(0)
  jsonResponse(response, status, envelope)
}

function secureJsonResponseForRequest(
  request: IncomingMessage,
  response: ServerResponse,
  status: number,
  session: Session,
  method: string,
  path: string,
  value: unknown
): void {
  const requestId = secureRequestIds.get(request)
  if (!requestId) throw new Error('Secure LAN request correlation is unavailable')
  secureJsonResponse(response, status, session, method, path, requestId, value)
}

async function readSecureJson(
  request: IncomingMessage,
  session: Session,
  method: string,
  path: string,
  limit = MAX_JSON_BYTES
): Promise<unknown> {
  const envelope = parseLanSyncEncryptedEnvelope(await readJson(request, limit))
  if (session.seenRequestIds.has(envelope.requestId)) {
    throw new Error('Повтор защищённого LAN запроса отклонён')
  }
  if (session.seenRequestIds.size >= MAX_SESSION_REQUEST_IDS) {
    throw new Error('Сессия синхронизации исчерпала лимит запросов. Запустите синхронизацию снова.')
  }

  const value = decryptLanSyncJson(
    envelope,
    session.key,
    'request',
    method,
    path,
    session.token,
    envelope.requestId
  )
  session.seenRequestIds.add(envelope.requestId)
  secureRequestIds.set(request, envelope.requestId)
  return value
}

function cleanupSessions(sessions: Map<string, Session>, now = Date.now()): void {
  for (const [token, session] of sessions) {
    if (session.expiresAt > now) continue
    session.key.fill(0)
    sessions.delete(token)
  }
}


function isProtectedPath(path: string): boolean {
  return (
    path === '/mymind-sync/v1/inventory' ||
    path === '/mymind-sync/v1/plan' ||
    path === '/mymind-sync/v1/assets/upload' ||
    path === '/mymind-sync/v1/assets/download' ||
    path === '/mymind-sync/v1/commit'
  )
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

function requireMobileModules(value: unknown): SyncModule[] {
  const input = record(value)
  if (!Array.isArray(input.modules)) throw new Error('Некорректный список модулей синхронизации')
  const modules = [...new Set(input.modules)]
  if (
    modules.length === 0 ||
    modules.some(
      (module) => typeof module !== 'string' || !MOBILE_SYNC_MODULE_SET.has(module as SyncModule)
    )
  ) {
    throw new Error('Можно синхронизировать только модули, доступные на телефоне')
  }
  return modules as SyncModule[]
}

function assertMobileModules(modules: readonly SyncModule[]): void {
  if (modules.length === 0 || modules.some((module) => !MOBILE_SYNC_MODULE_SET.has(module))) {
    throw new Error('Можно синхронизировать только модули, доступные на телефоне')
  }
}

function parseChallengeRequest(value: unknown): SyncChallengeRequest {
  const input = record(value)
  if (
    typeof input.clientNonce !== 'string' ||
    input.clientNonce.length < 16 ||
    input.clientNonce.length > 256
  ) {
    throw new Error('Invalid sync challenge')
  }
  return { clientNonce: input.clientNonce }
}

function parseProofRequest(value: unknown): SyncProofRequest {
  const input = record(value)
  if (
    typeof input.challengeId !== 'string' ||
    typeof input.clientNonce !== 'string' ||
    typeof input.proof !== 'string'
  ) {
    throw new Error('Invalid sync proof')
  }
  return {
    challengeId: input.challengeId,
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
  private readonly authFailures = new Map<string, AuthFailureState>()
  private readonly plans = new Map<string, SyncPlan>()
  private deviceId = ''
  private lastSyncAt: number | null = null

  constructor(
    private readonly onDataChanged: (modules: string[]) => void = () => undefined,
    private readonly prepareRenderer: (modules: readonly string[]) => Promise<void> = async () =>
      undefined
  ) {}

  async start(): Promise<void> {
    if (this.server) return
    ensureSyncInfrastructure(desktopRepositoryRuntime.database() as SqlDatabasePort)
    this.deviceId = getOrCreateDeviceId()
    const server = createServer((request, response) => {
      void this.handle(request, response).catch((reason: unknown) => {
        const message = reason instanceof Error ? reason.message : 'Sync request failed'
        console.warn('LAN sync request failed', reason)
        if (response.headersSent) {
          response.end()
          return
        }

        try {
          const path = new URL(request.url ?? '/', `http://127.0.0.1:${this.port}`).pathname
          const session = this.sessionFor(request)
          const requestId = secureRequestIds.get(request)
          if (session && requestId && request.method === 'POST' && isProtectedPath(path)) {
            secureJsonResponse(response, 400, session, 'POST', path, requestId, {
              error: message
            })
            return
          }
        } catch (encryptionReason) {
          console.warn('Failed to encrypt LAN sync error response', encryptionReason)
        }

        errorResponse(response, 400, 'Sync request failed')
      })
    })
    this.port = await listen(server)
    this.server = server
  }

  async invalidateAuthorization(): Promise<void> {
    this.challenges.clear()
    for (const session of this.sessions.values()) session.key.fill(0)
    this.sessions.clear()
    this.authFailures.clear()
    const plans = [...this.plans.values()]
    this.plans.clear()
    await Promise.all(
      plans.map((plan) => cleanupDesktopSyncAssetStage(plan.id, plan.uploads))
    ).catch(() => undefined)
  }

  async stop(): Promise<void> {
    const server = this.server
    this.server = null
    if (server) {
      // Stop accepting new requests first and wait for in-flight transfers before deleting
      // staged files or closing/moving the underlying storage.
      await new Promise<void>((resolvePromise) => server.close(() => resolvePromise()))
    }
    await this.invalidateAuthorization()
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
      modules: [...MOBILE_SYNC_MODULES]
    }
  }

  private authBlocked(request: IncomingMessage, now = Date.now()): boolean {
    const key = remoteClientKey(request)
    const state = this.authFailures.get(key)
    if (!state) return false
    if (state.blockedUntil > now) return true
    if (now - state.windowStartedAt > AUTH_FAILURE_WINDOW_MS) {
      this.authFailures.delete(key)
      return false
    }
    return false
  }

  private recordAuthFailure(request: IncomingMessage, now = Date.now()): void {
    const key = remoteClientKey(request)
    const current = this.authFailures.get(key)
    const state =
      !current || now - current.windowStartedAt > AUTH_FAILURE_WINDOW_MS
        ? { windowStartedAt: now, failures: 0, blockedUntil: 0 }
        : current
    state.failures += 1
    if (state.failures >= AUTH_FAILURE_LIMIT) state.blockedUntil = now + AUTH_BLOCK_MS
    this.authFailures.set(key, state)
  }

  private clearAuthFailures(request: IncomingMessage): void {
    this.authFailures.delete(remoteClientKey(request))
  }

  private sessionFor(request: IncomingMessage): Session | null {
    cleanupSessions(this.sessions)
    const token = bearer(request)
    if (!token) return null
    const session = this.sessions.get(token)
    return session && session.expiresAt > Date.now() ? session : null
  }

  private async cleanupExpiredPlans(): Promise<void> {
    const now = Date.now()
    const expired = [...this.plans.values()].filter((plan) => plan.expiresAt <= now)
    for (const plan of expired) {
      this.plans.delete(plan.id)
      await cleanupDesktopSyncAssetStage(plan.id, plan.uploads)
    }
  }

  private planFor(session: Session, planId: unknown): SyncPlan | null {
    if (typeof planId !== 'string') return null
    const plan = this.plans.get(planId)
    if (!plan || plan.sessionToken !== session.token || plan.expiresAt <= Date.now()) return null
    return plan
  }

  private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
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
      if (this.authBlocked(request)) {
        errorResponse(response, 429, 'Слишком много попыток входа. Повторите позже.')
        return
      }
      const profile = getLocalProfile()
      if (!profile) {
        errorResponse(response, 409, 'На компьютере не создан профиль')
        return
      }
      const input = parseChallengeRequest(await readJson(request, 16 * 1024))
      const clientKey = remoteClientKey(request)
      const activeChallenges = [...this.challenges.values()].filter(
        (challenge) => challenge.clientKey === clientKey
      ).length
      if (activeChallenges >= ACTIVE_CHALLENGE_LIMIT_PER_CLIENT) {
        errorResponse(response, 429, 'Слишком много незавершённых попыток входа. Повторите позже.')
        return
      }
      const challenge: Challenge = {
        id: randomUUID(),
        clientKey,
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
      if (this.authBlocked(request)) {
        errorResponse(response, 429, 'Слишком много попыток входа. Повторите позже.')
        return
      }
      const input = parseProofRequest(await readJson(request, 16 * 1024))
      const challenge = this.challenges.get(input.challengeId)
      if (
        !challenge ||
        challenge.expiresAt <= Date.now() ||
        challenge.clientKey !== remoteClientKey(request) ||
        challenge.clientNonce !== input.clientNonce
      ) {
        this.recordAuthFailure(request)
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
          this.recordAuthFailure(request)
          errorResponse(response, 401, 'Неверный логин или пароль')
          return
        }
        this.clearAuthFailures(request)
        const sessionToken = randomBytes(32).toString('hex')
        const expiresAt = Date.now() + SESSION_TTL_MS
        const sessionKey = deriveLanSyncSessionKey(
          key,
          challenge.id,
          challenge.clientNonce,
          challenge.serverNonce
        )
        this.sessions.set(sessionToken, {
          token: sessionToken,
          key: sessionKey,
          expiresAt,
          seenRequestIds: new Set()
        })
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

    if (request.method === 'POST' && url.pathname === '/mymind-sync/v1/inventory') {
      const session = this.sessionFor(request)
      if (!session) {
        errorResponse(response, 401, 'Sync session is not authorized')
        return
      }
      const modules = requireMobileModules(
        await readSecureJson(request, session, 'POST', '/mymind-sync/v1/inventory', 32 * 1024)
      )
      const result = await mainOperationTracker.run(() => {
        const database = desktopRepositoryRuntime.database() as SqlDatabasePort
        const snapshot = captureSyncSnapshot(database, modules)
        const inventory: SyncInventoryResponse = {
          generatedAt: snapshot.generatedAt,
          modules: summarizeSyncInventory(snapshot)
        }
        return inventory
      })
      secureJsonResponseForRequest(
        request,
        response,
        200,
        session,
        'POST',
        '/mymind-sync/v1/inventory',
        result
      )
      return
    }

    if (request.method === 'POST' && url.pathname === '/mymind-sync/v1/plan') {
      const session = this.sessionFor(request)
      if (!session) {
        errorResponse(response, 401, 'Sync session is not authorized')
        return
      }
      const raw = record(
        await readSecureJson(request, session, 'POST', '/mymind-sync/v1/plan')
      )
      const remoteSnapshot = parseSyncDataSnapshot(raw.snapshot)
      const clientAssets = parseAssetManifest(raw.assets)
      const modules = remoteSnapshot.modules.map((module) => module.module)
      assertMobileModules(modules)

      await this.prepareRenderer(modules)
      const prepared = await mainOperationTracker.run(async () => {
        const database = desktopRepositoryRuntime.database() as SqlDatabasePort
        const localSnapshot = captureSyncSnapshot(database, modules)
        const merged = mergeSyncSnapshots(localSnapshot, remoteSnapshot)
        const reconciledSnapshot = reconcileSyncSnapshotForeignKeys(database, merged.snapshot)
        const serverAssets = await collectDesktopSyncAssetManifest(reconciledSnapshot)
        const transfers = planAssets(reconciledSnapshot, clientAssets, serverAssets)
        return {
          localBaseline: localSnapshot,
          snapshot: reconciledSnapshot,
          summaries: summarizeSyncMerge(
            localSnapshot,
            remoteSnapshot,
            reconciledSnapshot,
            merged.conflicts
          ),
          serverBaselineAssets: serverAssets,
          ...transfers
        }
      })

      const planId = randomUUID()
      const expiresAt = Date.now() + PLAN_TTL_MS
      const plan: SyncPlan = {
        id: planId,
        sessionToken: session.token,
        expiresAt,
        localBaseline: prepared.localBaseline,
        snapshot: prepared.snapshot,
        summaries: prepared.summaries,
        uploads: prepared.uploads,
        downloads: prepared.downloads,
        serverBaselineAssets: prepared.serverBaselineAssets,
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
      secureJsonResponseForRequest(
        request,
        response,
        200,
        session,
        'POST',
        '/mymind-sync/v1/plan',
        result
      )
      return
    }

    if (request.method === 'POST' && url.pathname === '/mymind-sync/v1/assets/upload') {
      const session = this.sessionFor(request)
      if (!session) {
        errorResponse(response, 401, 'Sync session is not authorized')
        return
      }
      const raw = record(
        await readSecureJson(
          request,
          session,
          'POST',
          '/mymind-sync/v1/assets/upload',
          2 * 1024 * 1024
        )
      )
      const plan = this.planFor(session, raw.planId)
      if (!plan) {
        secureJsonResponseForRequest(
          request,
          response,
          401,
          session,
          'POST',
          '/mymind-sync/v1/assets/upload',
          { error: 'Sync plan is not authorized or expired' }
        )
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
      secureJsonResponseForRequest(
        request,
        response,
        200,
        session,
        'POST',
        '/mymind-sync/v1/assets/upload',
        result
      )
      return
    }

    if (request.method === 'POST' && url.pathname === '/mymind-sync/v1/assets/download') {
      const session = this.sessionFor(request)
      if (!session) {
        errorResponse(response, 401, 'Sync session is not authorized')
        return
      }
      const raw = record(
        await readSecureJson(
          request,
          session,
          'POST',
          '/mymind-sync/v1/assets/download',
          64 * 1024
        )
      )
      const plan = this.planFor(session, raw.planId)
      if (!plan) {
        secureJsonResponseForRequest(
          request,
          response,
          401,
          session,
          'POST',
          '/mymind-sync/v1/assets/download',
          { error: 'Sync plan is not authorized or expired' }
        )
        return
      }
      const path = raw.path
      const offset = raw.offset
      const length = raw.length
      if (
        typeof path !== 'string' ||
        typeof offset !== 'number' ||
        !Number.isSafeInteger(offset) ||
        typeof length !== 'number' ||
        !Number.isSafeInteger(length)
      ) {
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
      secureJsonResponseForRequest(
        request,
        response,
        200,
        session,
        'POST',
        '/mymind-sync/v1/assets/download',
        result
      )
      return
    }

    if (request.method === 'POST' && url.pathname === '/mymind-sync/v1/commit') {
      const session = this.sessionFor(request)
      if (!session) {
        errorResponse(response, 401, 'Sync session is not authorized')
        return
      }
      const raw = record(
        await readSecureJson(request, session, 'POST', '/mymind-sync/v1/commit', 16 * 1024)
      )
      const plan = this.planFor(session, raw.planId)
      if (!plan) {
        secureJsonResponseForRequest(
          request,
          response,
          401,
          session,
          'POST',
          '/mymind-sync/v1/commit',
          { error: 'Sync plan is not authorized or expired' }
        )
        return
      }
      for (const asset of plan.uploads) {
        if ((plan.uploadProgress.get(asset.path) ?? 0) !== asset.size) {
          throw new Error(`Файл «${asset.fileName}» загружен не полностью`)
        }
      }

      const modules = plan.snapshot.modules.map((module) => module.module)
      await this.prepareRenderer(modules)

      const currentServerAssets = new Map(
        (await collectDesktopSyncAssetManifest(plan.snapshot)).map((asset) => [asset.path, asset])
      )
      for (const baseline of plan.serverBaselineAssets) {
        const current = currentServerAssets.get(baseline.path)
        if (
          !current ||
          current.size !== baseline.size ||
          current.sha256 !== baseline.sha256
        ) {
          throw new Error(
            `Файл «${baseline.fileName}» изменился на компьютере во время синхронизации. Повторите синхронизацию.`
          )
        }
      }

      await commitDesktopSyncAssets(plan.id, plan.uploads)
      const removedAssets = listRemovedSyncAssetReferences(plan.localBaseline, plan.snapshot)
      await mainOperationTracker.run(() => {
        const database = desktopRepositoryRuntime.database() as SqlDatabasePort
        const current = captureSyncSnapshot(database, modules)
        if (JSON.stringify(current.modules) !== JSON.stringify(plan.localBaseline.modules)) {
          throw new Error(
            'Данные на компьютере изменились во время синхронизации. Запустите синхронизацию ещё раз.'
          )
        }
        applySyncSnapshot(database, plan.snapshot)
        normalizeDesktopWorkoutPhotoUrls(database, plan.snapshot)
      })
      await removeDesktopSyncAssets(removedAssets)

      this.plans.delete(plan.id)
      await cleanupDesktopSyncAssetStage(plan.id, plan.uploads)
      this.lastSyncAt = Date.now()
      this.onDataChanged(modules)
      const result: SyncCommitResponse = { committedAt: this.lastSyncAt }
      secureJsonResponseForRequest(
        request,
        response,
        200,
        session,
        'POST',
        '/mymind-sync/v1/commit',
        result
      )
      return
    }

    errorResponse(response, 404, 'Sync endpoint not found')
  }
}
