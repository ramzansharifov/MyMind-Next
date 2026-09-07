import type { PasswordCryptoPort } from '@mymind/contracts/password-crypto'
import type { RepositoryRuntime } from '@mymind/contracts/storage'
import type {
  ChangeMasterPasswordInput,
  CreatePasswordGroupInput,
  CreatePasswordItemInput,
  DeletePasswordGroupInput,
  DeletePasswordItemInput,
  GeneratePasswordInput,
  PasswordCustomField,
  PasswordGroupColor,
  PasswordGroupIcon,
  PasswordGroupRecord,
  PasswordItemRecord,
  PasswordItemSummary,
  PasswordItemType,
  PasswordSecurityIssue,
  PasswordSecurityReport,
  PasswordStrength,
  PasswordsOverview,
  PasswordVaultStatus,
  SetupPasswordVaultInput,
  UnlockPasswordVaultInput,
  UpdatePasswordGroupInput,
  UpdatePasswordItemInput
} from '@mymind/contracts/passwords'

const VAULT_ID = 'default'
const VAULT_VERSION = 1
const DEK_BYTES = 32
const KDF_KEY_BYTES = 32
const KDF_N = 32_768
const KDF_R = 8
const KDF_P = 1
const KDF_MAXMEM = 64 * 1024 * 1024
const OLD_PASSWORD_AGE_MS = 180 * 24 * 60 * 60 * 1000
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

interface PasswordVaultRow {
  id: string
  version: number
  kdf_salt: string
  kdf_n: number
  kdf_r: number
  kdf_p: number
  wrapped_key_nonce: string
  wrapped_key_ciphertext: string
  wrapped_key_tag: string
  created_at: number
  updated_at: number
}

interface PasswordGroupRow {
  id: string
  encrypted_payload: string
  position: number
  created_at: number
  updated_at: number
}

interface PasswordItemRow {
  id: string
  group_id: string | null
  encrypted_payload: string
  created_at: number
  updated_at: number
}

interface GroupPayload {
  name: string
  icon: PasswordGroupIcon
  color: PasswordGroupColor
}

interface ItemPayload {
  type: PasswordItemType
  title: string
  username: string
  password: string
  website: string
  notes: string
  tags: string[]
  customFields: PasswordCustomField[]
  favorite: boolean
  passwordUpdatedAt: number
}

interface EncryptedEnvelope {
  version: 1
  nonce: string
  ciphertext: string
  tag: string
}

function encodeBase64(bytes: Uint8Array): string {
  let output = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0
    const hasB = index + 1 < bytes.length
    const hasC = index + 2 < bytes.length
    const b = bytes[index + 1] ?? 0
    const c = bytes[index + 2] ?? 0
    output += BASE64[a >> 2]
    output += BASE64[((a & 3) << 4) | (b >> 4)]
    output += hasB ? BASE64[((b & 15) << 2) | (c >> 6)] : '='
    output += hasC ? BASE64[c & 63] : '='
  }
  return output
}

function decodeBase64(value: string): Uint8Array {
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error('Зашифрованные данные повреждены')
  }
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  const output = new Uint8Array((value.length / 4) * 3 - padding)
  let offset = 0
  for (let index = 0; index < value.length; index += 4) {
    const a = BASE64.indexOf(value[index] ?? '')
    const b = BASE64.indexOf(value[index + 1] ?? '')
    const cChar = value[index + 2] ?? '='
    const dChar = value[index + 3] ?? '='
    const c = cChar === '=' ? 0 : BASE64.indexOf(cChar)
    const d = dChar === '=' ? 0 : BASE64.indexOf(dChar)
    if (a < 0 || b < 0 || c < 0 || d < 0) throw new Error('Зашифрованные данные повреждены')
    if (offset < output.length) output[offset++] = (a << 2) | (b >> 4)
    if (offset < output.length) output[offset++] = ((b & 15) << 4) | (c >> 2)
    if (offset < output.length) output[offset++] = ((c & 3) << 6) | d
  }
  return output
}

function encodeUtf8(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

function decodeUtf8(value: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(value)
}

export interface PasswordsRepository {
  getPasswordVaultStatus(): PasswordVaultStatus
  setupPasswordVault(input: SetupPasswordVaultInput): Promise<PasswordVaultStatus>
  unlockPasswordVault(input: UnlockPasswordVaultInput): Promise<PasswordVaultStatus>
  lockPasswordVault(): PasswordVaultStatus
  changeMasterPassword(input: ChangeMasterPasswordInput): Promise<PasswordVaultStatus>
  listPasswordsOverview(): PasswordsOverview
  getPasswordItem(id: string): PasswordItemRecord
  createPasswordGroup(input: CreatePasswordGroupInput): PasswordGroupRecord
  updatePasswordGroup(input: UpdatePasswordGroupInput): PasswordGroupRecord
  deletePasswordGroup(input: DeletePasswordGroupInput): boolean
  createPasswordItem(input: CreatePasswordItemInput): PasswordItemRecord
  updatePasswordItem(input: UpdatePasswordItemInput): PasswordItemRecord
  deletePasswordItem(input: DeletePasswordItemInput): boolean
  generatePassword(input: GeneratePasswordInput): string
}

export function createPasswordsRepository(
  runtime: RepositoryRuntime,
  crypto: PasswordCryptoPort
): PasswordsRepository {
  const getSqlite = runtime.database
  let vaultKey: Uint8Array | null = null

  function vaultAad(): Uint8Array {
    return encodeUtf8(`mymind:password-vault:${VAULT_VERSION}`)
  }

  function groupAad(id: string): Uint8Array {
    return encodeUtf8(`mymind:password-group:${id}:v1`)
  }

  function itemAad(id: string): Uint8Array {
    return encodeUtf8(`mymind:password-item:${id}:v1`)
  }

  async function deriveKey(
    password: string,
    salt: Uint8Array,
    parameters: { n: number; r: number; p: number }
  ): Promise<Uint8Array> {
    return crypto.deriveScryptKey(password.normalize('NFKC'), salt, {
      n: parameters.n,
      r: parameters.r,
      p: parameters.p,
      keyLength: KDF_KEY_BYTES,
      maxMemoryBytes: KDF_MAXMEM
    })
  }

  function encryptBuffer(
    plaintext: Uint8Array,
    key: Uint8Array,
    aad: Uint8Array
  ): EncryptedEnvelope {
    const encrypted = crypto.encryptAes256Gcm(plaintext, key, aad)
    try {
      return {
        version: 1,
        nonce: encodeBase64(encrypted.nonce),
        ciphertext: encodeBase64(encrypted.ciphertext),
        tag: encodeBase64(encrypted.tag)
      }
    } finally {
      encrypted.nonce.fill(0)
      encrypted.ciphertext.fill(0)
      encrypted.tag.fill(0)
    }
  }

  function decryptBuffer(
    envelope: EncryptedEnvelope,
    key: Uint8Array,
    aad: Uint8Array
  ): Uint8Array {
    if (envelope.version !== 1) throw new Error('Неподдерживаемая версия зашифрованных данных')
    const nonce = decodeBase64(envelope.nonce)
    const ciphertext = decodeBase64(envelope.ciphertext)
    const tag = decodeBase64(envelope.tag)
    try {
      return crypto.decryptAes256Gcm({ nonce, ciphertext, tag }, key, aad)
    } finally {
      nonce.fill(0)
      ciphertext.fill(0)
      tag.fill(0)
    }
  }

  function encryptJson(value: unknown, key: Uint8Array, aad: Uint8Array): string {
    const plaintext = encodeUtf8(JSON.stringify(value))
    try {
      return JSON.stringify(encryptBuffer(plaintext, key, aad))
    } finally {
      plaintext.fill(0)
    }
  }

  function decryptJson<T>(serialized: string, key: Uint8Array, aad: Uint8Array): T {
    let envelope: EncryptedEnvelope
    try {
      envelope = JSON.parse(serialized) as EncryptedEnvelope
    } catch {
      throw new Error('Зашифрованные данные повреждены')
    }

    let plaintext: Uint8Array
    try {
      plaintext = decryptBuffer(envelope, key, aad)
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Неподдерживаемая версия зашифрованных данных'
      ) {
        throw error
      }
      throw new Error('Зашифрованные данные повреждены')
    }
    try {
      return JSON.parse(decodeUtf8(plaintext)) as T
    } catch {
      throw new Error('Зашифрованные данные повреждены')
    } finally {
      plaintext.fill(0)
    }
  }

  function getVaultRow(): PasswordVaultRow | null {
    return (
      (getSqlite()
        .prepare(
          `SELECT id, version, kdf_salt, kdf_n, kdf_r, kdf_p,
                  wrapped_key_nonce, wrapped_key_ciphertext, wrapped_key_tag,
                  created_at, updated_at
           FROM password_vault WHERE id = ?`
        )
        .get(VAULT_ID) as PasswordVaultRow | undefined) ?? null
    )
  }

  function setVaultKey(key: Uint8Array | null): void {
    vaultKey?.fill(0)
    vaultKey = key ? new Uint8Array(key) : null
  }

  function requireVaultKey(): Uint8Array {
    if (!vaultKey) throw new Error('Хранилище паролей заблокировано')
    return vaultKey
  }

  function unwrapVaultKey(row: PasswordVaultRow, derivedKey: Uint8Array): Uint8Array {
    try {
      return decryptBuffer(
        {
          version: 1,
          nonce: row.wrapped_key_nonce,
          ciphertext: row.wrapped_key_ciphertext,
          tag: row.wrapped_key_tag
        },
        derivedKey,
        vaultAad()
      )
    } catch {
      throw new Error('Неверный мастер-пароль')
    }
  }

  function nextGroupPosition(): number {
    const row = getSqlite()
      .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS position FROM password_groups')
      .get() as { position: number }
    return row.position
  }

  function findGroupRow(id: string): PasswordGroupRow | null {
    return (
      (getSqlite()
        .prepare(
          `SELECT id, encrypted_payload, position, created_at, updated_at
           FROM password_groups WHERE id = ?`
        )
        .get(id) as PasswordGroupRow | undefined) ?? null
    )
  }

  function mapGroup(row: PasswordGroupRow, key = requireVaultKey()): PasswordGroupRecord {
    const payload = decryptJson<GroupPayload>(row.encrypted_payload, key, groupAad(row.id))
    return {
      id: row.id,
      name: payload.name,
      icon: payload.icon,
      color: payload.color,
      position: row.position,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  function requireGroup(id: string): PasswordGroupRecord {
    const row = findGroupRow(id)
    if (!row) throw new Error('Группа паролей не найдена')
    return mapGroup(row)
  }

  function ensureGroupExists(groupId: string | null): void {
    if (groupId !== null) requireGroup(groupId)
  }

  function listGroups(key = requireVaultKey()): PasswordGroupRecord[] {
    const rows = getSqlite()
      .prepare(
        `SELECT id, encrypted_payload, position, created_at, updated_at
         FROM password_groups ORDER BY position ASC, created_at ASC`
      )
      .all() as PasswordGroupRow[]
    return rows.map((row) => mapGroup(row, key))
  }

  function ensureUniqueGroupName(name: string, ignoredId: string | null = null): void {
    const normalized = name.trim().toLocaleLowerCase('ru-RU')
    const duplicate = listGroups().some(
      (group) =>
        group.id !== ignoredId && group.name.trim().toLocaleLowerCase('ru-RU') === normalized
    )
    if (duplicate) throw new Error('Группа с таким названием уже существует')
  }

  function findItemRow(id: string): PasswordItemRow | null {
    return (
      (getSqlite()
        .prepare(
          `SELECT id, group_id, encrypted_payload, created_at, updated_at
           FROM password_items WHERE id = ?`
        )
        .get(id) as PasswordItemRow | undefined) ?? null
    )
  }

  function passwordStrength(password: string): PasswordStrength {
    const classes = [
      /[a-zа-яё]/u.test(password),
      /[A-ZА-ЯЁ]/u.test(password),
      /\d/u.test(password),
      /[^\p{L}\p{N}]/u.test(password)
    ].filter(Boolean).length

    if (password.length >= 16 && classes >= 3) return 'strong'
    if (password.length >= 12 && classes >= 2) return 'fair'
    return 'weak'
  }

  function mapItem(row: PasswordItemRow, key = requireVaultKey()): PasswordItemRecord {
    const payload = decryptJson<ItemPayload>(row.encrypted_payload, key, itemAad(row.id))
    return {
      id: row.id,
      groupId: row.group_id,
      type: payload.type,
      title: payload.title,
      username: payload.username,
      password: payload.password,
      website: payload.website,
      notes: payload.notes,
      tags: payload.tags,
      customFields: payload.customFields,
      favorite: payload.favorite,
      strength: passwordStrength(payload.password),
      securityIssues: [],
      passwordUpdatedAt: payload.passwordUpdatedAt,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  function requireItem(id: string): PasswordItemRecord {
    const row = findItemRow(id)
    if (!row) throw new Error('Запись пароля не найдена')
    return mapItem(row)
  }

  function listItems(key = requireVaultKey()): PasswordItemRecord[] {
    const rows = getSqlite()
      .prepare(
        `SELECT id, group_id, encrypted_payload, created_at, updated_at
         FROM password_items ORDER BY updated_at DESC, created_at DESC`
      )
      .all() as PasswordItemRow[]
    return rows.map((row) => mapItem(row, key))
  }

  function applySecurityIssues(items: PasswordItemRecord[]): PasswordItemRecord[] {
    const passwordCounts = new Map<string, number>()
    for (const item of items) {
      passwordCounts.set(item.password, (passwordCounts.get(item.password) ?? 0) + 1)
    }
    const oldThreshold = runtime.now() - OLD_PASSWORD_AGE_MS

    return items.map((item) => {
      const issues: PasswordSecurityIssue[] = []
      if (item.strength === 'weak') issues.push('weak')
      if ((passwordCounts.get(item.password) ?? 0) > 1) issues.push('reused')
      if (item.passwordUpdatedAt < oldThreshold) issues.push('old')
      return { ...item, securityIssues: issues }
    })
  }

  function toSummary(item: PasswordItemRecord): PasswordItemSummary {
    const { password: _password, notes: _notes, customFields: _customFields, ...summary } = item
    return summary
  }

  function buildSecurityReport(items: PasswordItemRecord[]): PasswordSecurityReport {
    return {
      total: items.length,
      weak: items.filter((item) => item.securityIssues.includes('weak')).length,
      reused: items.filter((item) => item.securityIssues.includes('reused')).length,
      old: items.filter((item) => item.securityIssues.includes('old')).length,
      issues: items
        .filter((item) => item.securityIssues.length > 0)
        .map((item) => ({
          itemId: item.id,
          title: item.title,
          username: item.username,
          issues: item.securityIssues
        }))
    }
  }

  function normalizeWebsite(value: string): string {
    const website = value.trim()
    if (!website) return ''
    if (/^https?:\/\//i.test(website)) return website
    return `https://${website}`
  }

  function normalizeItemPayload(
    input: CreatePasswordItemInput | UpdatePasswordItemInput,
    passwordUpdatedAt: number
  ): ItemPayload {
    return {
      type: input.type,
      title: input.title.trim(),
      username: input.username.trim(),
      password: input.password,
      website: normalizeWebsite(input.website),
      notes: input.notes,
      tags: input.tags.map((tag) => tag.trim()),
      customFields: input.customFields.map((field) => ({
        label: field.label.trim(),
        value: field.value
      })),
      favorite: input.favorite,
      passwordUpdatedAt
    }
  }

  function randomCharacter(characters: string): string {
    return characters[crypto.randomInt(characters.length)] ?? ''
  }

  function getPasswordVaultStatus(): PasswordVaultStatus {
    return {
      initialized: getVaultRow() !== null,
      unlocked: vaultKey !== null
    }
  }

  async function setupPasswordVault(input: SetupPasswordVaultInput): Promise<PasswordVaultStatus> {
    if (getVaultRow()) throw new Error('Хранилище паролей уже настроено')

    const salt = crypto.randomBytes(16)
    const dek = crypto.randomBytes(DEK_BYTES)
    const derivedKey = await deriveKey(input.masterPassword, salt, {
      n: KDF_N,
      r: KDF_R,
      p: KDF_P
    })

    try {
      const wrapped = encryptBuffer(dek, derivedKey, vaultAad())
      const now = runtime.now()
      getSqlite()
        .prepare(
          `INSERT INTO password_vault (
            id, version, kdf_salt, kdf_n, kdf_r, kdf_p,
            wrapped_key_nonce, wrapped_key_ciphertext, wrapped_key_tag,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          VAULT_ID,
          VAULT_VERSION,
          encodeBase64(salt),
          KDF_N,
          KDF_R,
          KDF_P,
          wrapped.nonce,
          wrapped.ciphertext,
          wrapped.tag,
          now,
          now
        )
      setVaultKey(dek)
      return getPasswordVaultStatus()
    } finally {
      salt.fill(0)
      dek.fill(0)
      derivedKey.fill(0)
    }
  }

  async function unlockPasswordVault(
    input: UnlockPasswordVaultInput
  ): Promise<PasswordVaultStatus> {
    const row = getVaultRow()
    if (!row) throw new Error('Сначала настройте хранилище паролей')

    const salt = decodeBase64(row.kdf_salt)
    const derivedKey = await deriveKey(input.masterPassword, salt, {
      n: row.kdf_n,
      r: row.kdf_r,
      p: row.kdf_p
    })

    try {
      const dek = unwrapVaultKey(row, derivedKey)
      try {
        setVaultKey(dek)
      } finally {
        dek.fill(0)
      }
      return getPasswordVaultStatus()
    } finally {
      salt.fill(0)
      derivedKey.fill(0)
    }
  }

  function lockPasswordVault(): PasswordVaultStatus {
    setVaultKey(null)
    return getPasswordVaultStatus()
  }

  async function changeMasterPassword(
    input: ChangeMasterPasswordInput
  ): Promise<PasswordVaultStatus> {
    const currentKey = requireVaultKey()
    const row = getVaultRow()
    if (!row) throw new Error('Хранилище паролей не настроено')

    const currentSalt = decodeBase64(row.kdf_salt)
    const currentDerived = await deriveKey(input.currentMasterPassword, currentSalt, {
      n: row.kdf_n,
      r: row.kdf_r,
      p: row.kdf_p
    })

    try {
      const verifiedKey = unwrapVaultKey(row, currentDerived)
      try {
        if (!crypto.timingSafeEqual(verifiedKey, currentKey)) {
          throw new Error('Неверный мастер-пароль')
        }
      } finally {
        verifiedKey.fill(0)
      }
    } finally {
      currentSalt.fill(0)
      currentDerived.fill(0)
    }

    const nextSalt = crypto.randomBytes(16)
    const nextDerived = await deriveKey(input.newMasterPassword, nextSalt, {
      n: KDF_N,
      r: KDF_R,
      p: KDF_P
    })

    try {
      const wrapped = encryptBuffer(currentKey, nextDerived, vaultAad())
      getSqlite()
        .prepare(
          `UPDATE password_vault
           SET version = ?, kdf_salt = ?, kdf_n = ?, kdf_r = ?, kdf_p = ?,
               wrapped_key_nonce = ?, wrapped_key_ciphertext = ?, wrapped_key_tag = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(
          VAULT_VERSION,
          encodeBase64(nextSalt),
          KDF_N,
          KDF_R,
          KDF_P,
          wrapped.nonce,
          wrapped.ciphertext,
          wrapped.tag,
          runtime.now(),
          VAULT_ID
        )
      return getPasswordVaultStatus()
    } finally {
      nextSalt.fill(0)
      nextDerived.fill(0)
    }
  }

  function listPasswordsOverview(): PasswordsOverview {
    const key = requireVaultKey()
    const groups = listGroups(key)
    const items = applySecurityIssues(listItems(key))
    return {
      groups,
      items: items.map(toSummary),
      security: buildSecurityReport(items)
    }
  }

  function getPasswordItem(id: string): PasswordItemRecord {
    const items = applySecurityIssues(listItems())
    const item = items.find((candidate) => candidate.id === id)
    if (!item) throw new Error('Запись пароля не найдена')
    return item
  }

  function createPasswordGroup(input: CreatePasswordGroupInput): PasswordGroupRecord {
    const key = requireVaultKey()
    ensureUniqueGroupName(input.name)
    const id = runtime.createId()
    const now = runtime.now()
    const payload: GroupPayload = {
      name: input.name.trim(),
      icon: input.icon,
      color: input.color
    }

    getSqlite()
      .prepare(
        `INSERT INTO password_groups (id, encrypted_payload, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, encryptJson(payload, key, groupAad(id)), nextGroupPosition(), now, now)

    return requireGroup(id)
  }

  function updatePasswordGroup(input: UpdatePasswordGroupInput): PasswordGroupRecord {
    const key = requireVaultKey()
    requireGroup(input.id)
    ensureUniqueGroupName(input.name, input.id)
    const payload: GroupPayload = {
      name: input.name.trim(),
      icon: input.icon,
      color: input.color
    }

    getSqlite()
      .prepare('UPDATE password_groups SET encrypted_payload = ?, updated_at = ? WHERE id = ?')
      .run(encryptJson(payload, key, groupAad(input.id)), runtime.now(), input.id)
    return requireGroup(input.id)
  }

  function deletePasswordGroup(input: DeletePasswordGroupInput): boolean {
    requireGroup(input.id)
    const result = getSqlite().prepare('DELETE FROM password_groups WHERE id = ?').run(input.id)
    return result.changes > 0
  }

  function createPasswordItem(input: CreatePasswordItemInput): PasswordItemRecord {
    const key = requireVaultKey()
    ensureGroupExists(input.groupId)
    const id = runtime.createId()
    const now = runtime.now()
    const payload = normalizeItemPayload(input, now)

    getSqlite()
      .prepare(
        `INSERT INTO password_items (id, group_id, encrypted_payload, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, input.groupId, encryptJson(payload, key, itemAad(id)), now, now)

    return getPasswordItem(id)
  }

  function updatePasswordItem(input: UpdatePasswordItemInput): PasswordItemRecord {
    const key = requireVaultKey()
    ensureGroupExists(input.groupId)
    const previous = requireItem(input.id)
    const now = runtime.now()
    const passwordUpdatedAt =
      previous.password === input.password ? previous.passwordUpdatedAt : now
    const payload = normalizeItemPayload(input, passwordUpdatedAt)

    getSqlite()
      .prepare(
        `UPDATE password_items
         SET group_id = ?, encrypted_payload = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(input.groupId, encryptJson(payload, key, itemAad(input.id)), now, input.id)

    return getPasswordItem(input.id)
  }

  function deletePasswordItem(input: DeletePasswordItemInput): boolean {
    requireItem(input.id)
    const result = getSqlite().prepare('DELETE FROM password_items WHERE id = ?').run(input.id)
    return result.changes > 0
  }

  function generatePassword(input: GeneratePasswordInput): string {
    const ambiguous = new Set('Il1O0o')
    const sets = [
      input.lowercase ? 'abcdefghijklmnopqrstuvwxyz' : '',
      input.uppercase ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '',
      input.digits ? '0123456789' : '',
      input.symbols ? '!@#$%^&*()-_=+[]{};:,.?' : ''
    ]
      .filter(Boolean)
      .map((characters) =>
        input.excludeAmbiguous
          ? [...characters].filter((character) => !ambiguous.has(character)).join('')
          : characters
      )
      .filter(Boolean)

    if (sets.length === 0) throw new Error('Выберите хотя бы один набор символов')
    if (input.length < sets.length) throw new Error('Длина пароля слишком мала')

    const result = sets.map(randomCharacter)
    const combined = sets.join('')
    while (result.length < input.length) result.push(randomCharacter(combined))

    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = crypto.randomInt(index + 1)
      const current = result[index] ?? ''
      result[index] = result[target] ?? ''
      result[target] = current
    }

    return result.join('')
  }

  return {
    getPasswordVaultStatus,
    setupPasswordVault,
    unlockPasswordVault,
    lockPasswordVault,
    changeMasterPassword,
    listPasswordsOverview,
    getPasswordItem,
    createPasswordGroup,
    updatePasswordGroup,
    deletePasswordGroup,
    createPasswordItem,
    updatePasswordItem,
    deletePasswordItem,
    generatePassword
  }
}
