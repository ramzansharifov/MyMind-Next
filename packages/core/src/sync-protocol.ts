import {
  SYNC_MODULES,
  type SyncDataSnapshot,
  type SyncModule,
  type SyncScalar
} from '@mymind/contracts/profile-sync'

const MODULES = new Set<string>(SYNC_MODULES)
const MAX_TABLES = 80
const MAX_ROWS = 500_000
const MAX_COLUMNS = 128
const MAX_KEY_LENGTH = 2048

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSafeTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isScalar(value: unknown): value is SyncScalar {
  return value === null || typeof value === 'string' || typeof value === 'number'
}

function assertModule(value: unknown): asserts value is SyncModule {
  if (typeof value !== 'string' || !MODULES.has(value)) throw new Error('Некорректный модуль sync')
}

export function assertSyncDataSnapshot(value: unknown): asserts value is SyncDataSnapshot {
  if (!isRecord(value) || value.version !== 1 || !isSafeTimestamp(value.generatedAt)) {
    throw new Error('Некорректный sync snapshot')
  }
  if (!Array.isArray(value.modules) || value.modules.length > SYNC_MODULES.length) {
    throw new Error('Некорректный список модулей sync')
  }

  const seenModules = new Set<string>()
  let tableCount = 0
  let rowCount = 0

  for (const module of value.modules) {
    if (!isRecord(module)) throw new Error('Некорректный модуль sync')
    assertModule(module.module)
    if (seenModules.has(module.module)) throw new Error('Повторяющийся модуль sync')
    seenModules.add(module.module)
    if (!Array.isArray(module.tables)) throw new Error('Некорректные таблицы sync')
    tableCount += module.tables.length
    if (tableCount > MAX_TABLES) throw new Error('Слишком много таблиц sync')

    const seenTables = new Set<string>()
    for (const table of module.tables) {
      if (!isRecord(table) || typeof table.table !== 'string' || !/^[a-z0-9_]+$/.test(table.table)) {
        throw new Error('Некорректная таблица sync')
      }
      if (seenTables.has(table.table)) throw new Error('Повторяющаяся таблица sync')
      seenTables.add(table.table)
      if (!Array.isArray(table.rows) || !Array.isArray(table.tombstones)) {
        throw new Error('Некорректное содержимое таблицы sync')
      }

      const seenKeys = new Set<string>()
      for (const row of table.rows) {
        rowCount += 1
        if (rowCount > MAX_ROWS) throw new Error('Слишком много записей sync')
        if (
          !isRecord(row) ||
          typeof row.key !== 'string' ||
          row.key.length === 0 ||
          row.key.length > MAX_KEY_LENGTH ||
          !isSafeTimestamp(row.version) ||
          !isRecord(row.data)
        ) {
          throw new Error('Некорректная запись sync')
        }
        if (seenKeys.has(row.key)) throw new Error('Повторяющийся ключ sync')
        seenKeys.add(row.key)
        const entries = Object.entries(row.data)
        if (entries.length === 0 || entries.length > MAX_COLUMNS) {
          throw new Error('Некорректные колонки sync')
        }
        for (const [column, scalar] of entries) {
          if (!/^[a-z0-9_]+$/.test(column) || !isScalar(scalar)) {
            throw new Error('Некорректное значение sync')
          }
        }
      }

      for (const tombstone of table.tombstones) {
        rowCount += 1
        if (rowCount > MAX_ROWS) throw new Error('Слишком много записей sync')
        if (
          !isRecord(tombstone) ||
          typeof tombstone.key !== 'string' ||
          tombstone.key.length === 0 ||
          tombstone.key.length > MAX_KEY_LENGTH ||
          !isSafeTimestamp(tombstone.deletedAt)
        ) {
          throw new Error('Некорректное удаление sync')
        }
        if (seenKeys.has(tombstone.key)) throw new Error('Ключ sync одновременно живой и удалённый')
        seenKeys.add(tombstone.key)
      }
    }
  }
}

export function parseSyncDataSnapshot(value: unknown): SyncDataSnapshot {
  assertSyncDataSnapshot(value)
  return value
}
