import type {
  SyncDataSnapshot,
  SyncModule,
  SyncModuleInventory,
  SyncModuleSnapshot,
  SyncModuleSummary,
  SyncScalar,
  SyncSnapshotRow,
  SyncSnapshotTombstone,
  SyncTableSnapshot
} from '@mymind/contracts/profile-sync'
import type { SqlDatabasePort } from '@mymind/contracts/storage'
import { MOBILE_NOTE_APPEND_BLOCK_PREFIX, type NoteDocument } from '@mymind/contracts/notes'
import { documentToPlainText } from '@mymind/core/study-document'
import { noteDocumentSchema } from '@mymind/core/validation/notes'

interface SyncTableDefinition {
  table: string
  keyColumns: readonly string[]
}

interface SyncModuleDefinition {
  module: SyncModule
  tables: readonly SyncTableDefinition[]
}

export const SYNC_MODULE_REGISTRY: readonly SyncModuleDefinition[] = [
  {
    module: 'notes',
    tables: [
      { table: 'note_groups', keyColumns: ['id'] },
      { table: 'notes', keyColumns: ['id'] }
    ]
  },
  {
    module: 'tasks',
    tables: [
      { table: 'task_groups', keyColumns: ['id'] },
      { table: 'tasks', keyColumns: ['id'] }
    ]
  },
  {
    module: 'habits',
    tables: [
      { table: 'habit_groups', keyColumns: ['id'] },
      { table: 'habits', keyColumns: ['id'] },
      { table: 'habit_entries', keyColumns: ['id'] }
    ]
  },
  {
    module: 'movies',
    tables: [{ table: 'movies', keyColumns: ['id'] }]
  },
  {
    module: 'music',
    tables: [
      { table: 'music_items', keyColumns: ['id'] },
      { table: 'music_playlists', keyColumns: ['id'] },
      { table: 'music_playlist_items', keyColumns: ['playlist_id', 'music_item_id'] }
    ]
  },
  {
    module: 'calendar',
    tables: [
      { table: 'calendar_events', keyColumns: ['id'] },
      { table: 'calendar_event_reminders', keyColumns: ['id'] },
      { table: 'calendar_event_occurrences', keyColumns: ['id'] }
    ]
  },
  {
    module: 'diary',
    tables: [
      { table: 'diaries', keyColumns: ['id'] },
      { table: 'diary_days', keyColumns: ['id'] },
      { table: 'diary_entries', keyColumns: ['id'] }
    ]
  },
  {
    module: 'workouts',
    tables: [
      { table: 'workout_exercises', keyColumns: ['id'] },
      { table: 'workout_programs', keyColumns: ['id'] },
      { table: 'workout_program_exercises', keyColumns: ['id'] },
      { table: 'workout_sessions', keyColumns: ['id'] },
      { table: 'workout_session_exercises', keyColumns: ['id'] },
      { table: 'workout_sets', keyColumns: ['id'] },
      { table: 'workout_progress_entries', keyColumns: ['id'] },
      { table: 'workout_progress_metrics', keyColumns: ['id'] },
      { table: 'workout_progress_photos', keyColumns: ['id'] }
    ]
  },
  {
    module: 'nutrition',
    tables: [
      { table: 'nutrition_foods', keyColumns: ['id'] },
      { table: 'nutrition_recipes', keyColumns: ['id'] },
      { table: 'nutrition_recipe_ingredients', keyColumns: ['id'] },
      { table: 'nutrition_log_entries', keyColumns: ['id'] },
      { table: 'nutrition_water_days', keyColumns: ['date'] },
      { table: 'nutrition_targets', keyColumns: ['id'] }
    ]
  },
  {
    module: 'finance',
    tables: [
      { table: 'finance_settings', keyColumns: ['id'] },
      { table: 'finance_exchange_rates', keyColumns: ['currency_code'] },
      { table: 'finance_accounts', keyColumns: ['id'] },
      { table: 'finance_tags', keyColumns: ['id'] },
      { table: 'finance_transaction_templates', keyColumns: ['id'] },
      { table: 'finance_transactions', keyColumns: ['id'] },
      { table: 'finance_transaction_entries', keyColumns: ['id'] },
      { table: 'finance_limits', keyColumns: ['id'] },
      { table: 'finance_limit_accounts', keyColumns: ['limit_id', 'account_id'] }
    ]
  },
  {
    module: 'passwords',
    tables: [
      { table: 'password_vault', keyColumns: ['id'] },
      { table: 'password_vault_sync_identity', keyColumns: ['id'] },
      { table: 'password_groups', keyColumns: ['id'] },
      { table: 'password_items', keyColumns: ['id'] }
    ]
  }
] as const

const ALL_TABLES = SYNC_MODULE_REGISTRY.flatMap((definition) => definition.tables)
const TABLE_BY_NAME = new Map(ALL_TABLES.map((definition) => [definition.table, definition]))
const MODULE_BY_NAME = new Map(
  SYNC_MODULE_REGISTRY.map((definition) => [definition.module, definition])
)

function quoteIdentifier(value: string): string {
  if (!/^[a-z0-9_]+$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`)
  return `"${value}"`
}

function keyExpression(prefix: 'NEW' | 'OLD', columns: readonly string[]): string {
  return `json_array(${columns.map((column) => `${prefix}.${quoteIdentifier(column)}`).join(', ')})`
}

function createTriggerSql(definition: SyncTableDefinition): string[] {
  const table = quoteIdentifier(definition.table)
  const insertKey = keyExpression('NEW', definition.keyColumns)
  const deleteKey = keyExpression('OLD', definition.keyColumns)
  const enabled = `COALESCE((SELECT value FROM sync_runtime WHERE key = 'applying_remote'), '0') <> '1'`
  const insertRevision = `MAX(
    COALESCE((
      SELECT changed_at
      FROM sync_row_versions
      WHERE table_name = '${definition.table}' AND row_key = ${insertKey}
    ), 1),
    COALESCE((
      SELECT deleted_at
      FROM sync_tombstones
      WHERE table_name = '${definition.table}' AND row_key = ${insertKey}
    ), 1)
  ) + 1`
  const deleteRevision = `COALESCE((
    SELECT changed_at
    FROM sync_row_versions
    WHERE table_name = '${definition.table}' AND row_key = ${deleteKey}
  ), 1) + 1`
  const triggerPrefix = `sync_${definition.table}`

  return [
    `CREATE TRIGGER IF NOT EXISTS "${triggerPrefix}_insert"
      AFTER INSERT ON ${table}
      WHEN ${enabled}
      BEGIN
        INSERT INTO sync_row_versions(table_name, row_key, changed_at)
        VALUES ('${definition.table}', ${insertKey}, ${insertRevision})
        ON CONFLICT(table_name, row_key)
        DO UPDATE SET changed_at = excluded.changed_at;
        DELETE FROM sync_tombstones
        WHERE table_name = '${definition.table}' AND row_key = ${insertKey};
      END;`,
    `CREATE TRIGGER IF NOT EXISTS "${triggerPrefix}_update"
      AFTER UPDATE ON ${table}
      WHEN ${enabled}
      BEGIN
        INSERT INTO sync_row_versions(table_name, row_key, changed_at)
        VALUES ('${definition.table}', ${insertKey}, ${insertRevision})
        ON CONFLICT(table_name, row_key)
        DO UPDATE SET changed_at = excluded.changed_at;
        DELETE FROM sync_tombstones
        WHERE table_name = '${definition.table}' AND row_key = ${insertKey};
      END;`,
    `CREATE TRIGGER IF NOT EXISTS "${triggerPrefix}_delete"
      AFTER DELETE ON ${table}
      WHEN ${enabled}
      BEGIN
        INSERT INTO sync_tombstones(table_name, row_key, deleted_at)
        VALUES ('${definition.table}', ${deleteKey}, ${deleteRevision})
        ON CONFLICT(table_name, row_key)
        DO UPDATE SET deleted_at = MAX(deleted_at, excluded.deleted_at);
        DELETE FROM sync_row_versions
        WHERE table_name = '${definition.table}' AND row_key = ${deleteKey};
      END;`
  ]
}

export function ensureSyncInfrastructure(database: SqlDatabasePort): void {
  database
    .prepare(
      `CREATE TABLE IF NOT EXISTS local_profile (
        id TEXT PRIMARY KEY NOT NULL,
        login TEXT NOT NULL,
        normalized_login TEXT NOT NULL UNIQUE,
        name TEXT,
        gender TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`
    )
    .run()
  database
    .prepare(
      `CREATE TABLE IF NOT EXISTS password_vault_sync_identity (
        id TEXT PRIMARY KEY NOT NULL,
        identity TEXT NOT NULL
      )`
    )
    .run()
  database
    .prepare(
      `INSERT INTO password_vault_sync_identity(id, identity)
       SELECT
         id,
         kdf_salt || ':' || wrapped_key_nonce || ':' || wrapped_key_ciphertext || ':' || wrapped_key_tag
       FROM password_vault
       WHERE NOT EXISTS (
         SELECT 1 FROM password_vault_sync_identity WHERE id = password_vault.id
       )`
    )
    .run()
  database
    .prepare(
      `CREATE TRIGGER IF NOT EXISTS sync_password_vault_seed_identity
       AFTER INSERT ON password_vault
       BEGIN
         INSERT INTO password_vault_sync_identity(id, identity)
         VALUES (
           NEW.id,
           NEW.kdf_salt || ':' || NEW.wrapped_key_nonce || ':' || NEW.wrapped_key_ciphertext || ':' || NEW.wrapped_key_tag
         )
         ON CONFLICT(id) DO NOTHING;
       END;`
    )
    .run()
  database
    .prepare(
      `CREATE TABLE IF NOT EXISTS sync_runtime (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      )`
    )
    .run()
  database
    .prepare(
      `INSERT INTO sync_runtime(key, value)
       VALUES ('applying_remote', '0')
       ON CONFLICT(key) DO NOTHING`
    )
    .run()
  database
    .prepare(
      `CREATE TABLE IF NOT EXISTS sync_row_versions (
        table_name TEXT NOT NULL,
        row_key TEXT NOT NULL,
        changed_at INTEGER NOT NULL,
        PRIMARY KEY(table_name, row_key)
      )`
    )
    .run()
  database
    .prepare(
      `CREATE TABLE IF NOT EXISTS sync_tombstones (
        table_name TEXT NOT NULL,
        row_key TEXT NOT NULL,
        deleted_at INTEGER NOT NULL,
        PRIMARY KEY(table_name, row_key)
      )`
    )
    .run()

  const triggerVersion = database
    .prepare("SELECT value FROM sync_runtime WHERE key = 'trigger_version'")
    .get() as { value: string } | undefined

  if (triggerVersion?.value !== '2') {
    for (const definition of ALL_TABLES) {
      const triggerPrefix = `sync_${definition.table}`
      for (const suffix of ['insert', 'update', 'delete']) {
        database.prepare(`DROP TRIGGER IF EXISTS "${triggerPrefix}_${suffix}"`).run()
      }
      for (const sql of createTriggerSql(definition)) database.prepare(sql).run()
    }
    database
      .prepare(
        `INSERT INTO sync_runtime(key, value)
         VALUES ('trigger_version', '2')
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      )
      .run()
  }
}

function scalar(value: unknown): SyncScalar {
  if (value === null || typeof value === 'string' || typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  throw new Error('Sync encountered an unsupported SQLite value')
}

function canonicalKey(definition: SyncTableDefinition, row: Record<string, unknown>): string {
  return JSON.stringify(definition.keyColumns.map((column) => scalar(row[column])))
}

function intrinsicRowVersion(_row: Record<string, SyncScalar>): number {
  // Revisions are logical, not wall-clock timestamps. Every pre-sync row starts at revision 1;
  // triggers increment from the last synchronized revision. This avoids clock skew between devices.
  return 1
}

function captureTable(
  database: SqlDatabasePort,
  definition: SyncTableDefinition
): SyncTableSnapshot {
  const versionRows = database
    .prepare('SELECT row_key, changed_at FROM sync_row_versions WHERE table_name = ?')
    .all(definition.table) as Array<{ row_key: string; changed_at: number }>
  const tombstoneRows = database
    .prepare('SELECT row_key, deleted_at FROM sync_tombstones WHERE table_name = ?')
    .all(definition.table) as Array<{ row_key: string; deleted_at: number }>
  const versions = new Map(versionRows.map((row) => [row.row_key, row.changed_at]))
  const rows = database
    .prepare(`SELECT * FROM ${quoteIdentifier(definition.table)}`)
    .all() as Array<Record<string, unknown>>

  return {
    table: definition.table,
    rows: rows.map((raw) => {
      const data = Object.fromEntries(
        Object.entries(raw).map(([key, value]) => [key, scalar(value)])
      ) as Record<string, SyncScalar>
      if (definition.table === 'workout_progress_photos') {
        const entryId = data.entry_id
        const assetId = data.asset_id
        const fileName = data.file_name
        if (
          typeof entryId !== 'string' ||
          typeof assetId !== 'string' ||
          typeof fileName !== 'string'
        ) {
          throw new Error('Некорректная фотография прогресса в sync snapshot')
        }
        data.url = `mymind-sync://workouts/${entryId}/${assetId}/${encodeURIComponent(fileName)}`
      }
      const key = canonicalKey(definition, raw)
      return {
        key,
        version: Math.max(intrinsicRowVersion(data), versions.get(key) ?? 0),
        data
      }
    }),
    tombstones: tombstoneRows.map((row) => ({ key: row.row_key, deletedAt: row.deleted_at }))
  }
}

export function captureSyncSnapshot(
  database: SqlDatabasePort,
  modules: readonly SyncModule[],
  generatedAt = Date.now()
): SyncDataSnapshot {
  ensureSyncInfrastructure(database)
  const uniqueModules = [...new Set(modules)]

  return {
    version: 1,
    generatedAt,
    modules: uniqueModules.map((module) => {
      const definition = MODULE_BY_NAME.get(module)
      if (!definition) throw new Error(`Unsupported sync module: ${module}`)
      return {
        module,
        tables: definition.tables.map((table) => captureTable(database, table))
      }
    })
  }
}

function canonicalRow(row: SyncSnapshotRow): string {
  const sorted = Object.fromEntries(
    Object.entries(row.data).sort(([left], [right]) => left.localeCompare(right))
  )
  return JSON.stringify(sorted)
}

function noteDocumentFromRow(row: SyncSnapshotRow): NoteDocument | null {
  const serialized = row.data.document
  if (typeof serialized !== 'string') return null
  try {
    return noteDocumentSchema.parse(JSON.parse(serialized))
  } catch {
    return null
  }
}

function withoutMobileAppendBlocks(document: NoteDocument): NoteDocument {
  return {
    ...document,
    blocks: document.blocks.filter(
      (block) => !(block.type === 'text' && block.id.startsWith(MOBILE_NOTE_APPEND_BLOCK_PREFIX))
    )
  }
}

function mobileAppendBlocks(
  document: NoteDocument
): Array<Extract<NoteDocument['blocks'][number], { type: 'text' }>> {
  return document.blocks.filter(
    (block): block is Extract<NoteDocument['blocks'][number], { type: 'text' }> =>
      block.type === 'text' && block.id.startsWith(MOBILE_NOTE_APPEND_BLOCK_PREFIX)
  )
}

function mergeConcurrentNoteRows(
  left: SyncSnapshotRow,
  right: SyncSnapshotRow
): SyncSnapshotRow | null {
  const leftDocument = noteDocumentFromRow(left)
  const rightDocument = noteDocumentFromRow(right)
  if (!leftDocument || !rightDocument) return null

  const leftAppend = mobileAppendBlocks(leftDocument)
  const rightAppend = mobileAppendBlocks(rightDocument)
  if (leftAppend.length === 0 && rightAppend.length === 0) return null

  const leftBase = withoutMobileAppendBlocks(leftDocument)
  const rightBase = withoutMobileAppendBlocks(rightDocument)
  const leftBaseCanonical = JSON.stringify(leftBase)
  const rightBaseCanonical = JSON.stringify(rightBase)

  let baseRow = left
  let baseDocument = leftBase
  if (rightAppend.length < leftAppend.length) {
    baseRow = right
    baseDocument = rightBase
  } else if (rightAppend.length === leftAppend.length) {
    if (right.version > left.version) {
      baseRow = right
      baseDocument = rightBase
    } else if (right.version === left.version && rightBaseCanonical > leftBaseCanonical) {
      baseRow = right
      baseDocument = rightBase
    }
  }

  const appendById = new Map<string, Extract<NoteDocument['blocks'][number], { type: 'text' }>>()
  for (const block of [...leftAppend, ...rightAppend]) {
    const existing = appendById.get(block.id)
    if (!existing || JSON.stringify(block) > JSON.stringify(existing)) {
      appendById.set(block.id, block)
    }
  }

  const mergedDocument = noteDocumentSchema.parse({
    version: 1,
    blocks: [
      ...baseDocument.blocks,
      ...[...appendById.values()].sort((leftBlock, rightBlock) =>
        leftBlock.id.localeCompare(rightBlock.id, 'en')
      )
    ]
  })
  const updatedAt = Math.max(
    typeof left.data.updated_at === 'number' ? left.data.updated_at : 0,
    typeof right.data.updated_at === 'number' ? right.data.updated_at : 0
  )

  const mergedCanonical = JSON.stringify(mergedDocument)
  const matchesLeft =
    mergedCanonical === JSON.stringify(leftDocument) && canonicalRow(baseRow) === canonicalRow(left)
  const matchesRight =
    mergedCanonical === JSON.stringify(rightDocument) &&
    canonicalRow(baseRow) === canonicalRow(right)
  const version =
    matchesLeft && left.version >= right.version
      ? left.version
      : matchesRight && right.version >= left.version
        ? right.version
        : Math.max(left.version, right.version) + 1

  return {
    key: baseRow.key,
    version,
    data: {
      ...baseRow.data,
      document: JSON.stringify(mergedDocument),
      plain_text: documentToPlainText(mergedDocument),
      updated_at: updatedAt
    }
  }
}

function mergeTable(
  definition: SyncTableDefinition,
  left: SyncTableSnapshot,
  right: SyncTableSnapshot
): { snapshot: SyncTableSnapshot; conflicts: number } {
  if (left.table !== definition.table || right.table !== definition.table) {
    throw new Error(`Sync table mismatch for ${definition.table}`)
  }

  for (const table of [left, right]) {
    for (const row of table.rows) {
      if (canonicalKey(definition, row.data) !== row.key) {
        throw new Error(`Неканонический ключ записи sync: ${definition.table}`)
      }
    }
    for (const tombstone of table.tombstones) parseKey(definition, tombstone.key)
  }

  const leftRows = new Map(left.rows.map((row) => [row.key, row]))
  const rightRows = new Map(right.rows.map((row) => [row.key, row]))
  const leftDeleted = new Map(left.tombstones.map((row) => [row.key, row.deletedAt]))
  const rightDeleted = new Map(right.tombstones.map((row) => [row.key, row.deletedAt]))
  const keys = new Set([
    ...leftRows.keys(),
    ...rightRows.keys(),
    ...leftDeleted.keys(),
    ...rightDeleted.keys()
  ])
  const rows: SyncSnapshotRow[] = []
  const tombstones: SyncSnapshotTombstone[] = []
  let conflicts = 0

  for (const key of [...keys].sort()) {
    const leftRow = leftRows.get(key)
    const rightRow = rightRows.get(key)
    const leftDelete = leftDeleted.get(key) ?? -1
    const rightDelete = rightDeleted.get(key) ?? -1
    const bestDelete = Math.max(leftDelete, rightDelete)
    const leftVersion = leftRow?.version ?? -1
    const rightVersion = rightRow?.version ?? -1
    const bestRowVersion = Math.max(leftVersion, rightVersion)

    if (bestDelete >= bestRowVersion && bestDelete >= 0) {
      tombstones.push({ key, deletedAt: bestDelete })
      if (leftRow || rightRow) conflicts += 1
      continue
    }

    let winner: SyncSnapshotRow | undefined
    if (leftRow && rightRow && definition.table === 'notes') {
      const leftCanonical = canonicalRow(leftRow)
      const rightCanonical = canonicalRow(rightRow)
      const mergedNote = mergeConcurrentNoteRows(leftRow, rightRow)
      if (mergedNote) {
        if (leftCanonical !== rightCanonical) conflicts += 1
        winner = mergedNote
      } else if (leftVersion > rightVersion) winner = leftRow
      else if (rightVersion > leftVersion) winner = rightRow
      else {
        if (leftCanonical !== rightCanonical) conflicts += 1
        winner = leftCanonical >= rightCanonical ? leftRow : rightRow
      }
    } else if (leftVersion > rightVersion) winner = leftRow
    else if (rightVersion > leftVersion) winner = rightRow
    else if (leftRow && rightRow) {
      const leftCanonical = canonicalRow(leftRow)
      const rightCanonical = canonicalRow(rightRow)
      if (leftCanonical !== rightCanonical) conflicts += 1
      winner = leftCanonical >= rightCanonical ? leftRow : rightRow
    } else winner = leftRow ?? rightRow

    if (winner) rows.push(winner)
  }

  return { snapshot: { table: definition.table, rows, tombstones }, conflicts }
}

function passwordVaultPresent(module: SyncModuleSnapshot): boolean {
  return (module.tables.find((table) => table.table === 'password_vault')?.rows.length ?? 0) > 0
}

function passwordVaultIdentity(module: SyncModuleSnapshot): string | null {
  const table = module.tables.find(
    (candidate) => candidate.table === 'password_vault_sync_identity'
  )
  const row = table?.rows.find((candidate) => candidate.data.id === 'default') ?? table?.rows[0]
  return typeof row?.data.identity === 'string' ? row.data.identity : null
}

function assertCompatiblePasswordVaults(left: SyncModuleSnapshot, right: SyncModuleSnapshot): void {
  if (!passwordVaultPresent(left) || !passwordVaultPresent(right)) return
  const leftIdentity = passwordVaultIdentity(left)
  const rightIdentity = passwordVaultIdentity(right)
  if (!leftIdentity || !rightIdentity || leftIdentity !== rightIdentity) {
    throw new Error(
      'Хранилища паролей созданы независимо и используют разные ключи. Синхронизация паролей остановлена, чтобы не повредить зашифрованные данные.'
    )
  }
}

function assertNoConcurrentPasswordVaultCredentialChange(
  left: SyncModuleSnapshot,
  right: SyncModuleSnapshot
): void {
  const leftVault = left.tables
    .find((table) => table.table === 'password_vault')
    ?.rows.find((row) => row.data.id === 'default')
  const rightVault = right.tables
    .find((table) => table.table === 'password_vault')
    ?.rows.find((row) => row.data.id === 'default')

  if (
    !leftVault ||
    !rightVault ||
    leftVault.version !== rightVault.version ||
    canonicalRow(leftVault) === canonicalRow(rightVault)
  ) {
    return
  }

  throw new Error(
    'Мастер-пароль хранилища был изменён на обоих устройствах после последней синхронизации. MyMind не будет выбирать один вариант автоматически: сначала оставьте одинаковый мастер-пароль на обоих устройствах, затем повторите синхронизацию.'
  )
}

export function mergeSyncSnapshots(
  left: SyncDataSnapshot,
  right: SyncDataSnapshot,
  generatedAt = Date.now()
): { snapshot: SyncDataSnapshot; conflicts: Map<SyncModule, number> } {
  if (left.version !== 1 || right.version !== 1)
    throw new Error('Unsupported sync snapshot version')

  const leftModules = new Map(left.modules.map((module) => [module.module, module]))
  const rightModules = new Map(right.modules.map((module) => [module.module, module]))
  const moduleNames = new Set([...leftModules.keys(), ...rightModules.keys()])
  const modules: SyncModuleSnapshot[] = []
  const conflicts = new Map<SyncModule, number>()

  for (const module of moduleNames) {
    const definition = MODULE_BY_NAME.get(module)
    if (!definition) throw new Error(`Unsupported sync module: ${module}`)
    const leftModule = leftModules.get(module)
    const rightModule = rightModules.get(module)
    if (!leftModule || !rightModule) throw new Error(`Both devices must provide module ${module}`)
    if (module === 'passwords') {
      assertCompatiblePasswordVaults(leftModule, rightModule)
      assertNoConcurrentPasswordVaultCredentialChange(leftModule, rightModule)
    }

    const leftTables = new Map(leftModule.tables.map((table) => [table.table, table]))
    const rightTables = new Map(rightModule.tables.map((table) => [table.table, table]))
    let moduleConflicts = 0
    const tables = definition.tables.map((table) => {
      const leftTable = leftTables.get(table.table)
      const rightTable = rightTables.get(table.table)
      if (!leftTable || !rightTable)
        throw new Error(`Missing table ${table.table} in sync snapshot`)
      const merged = mergeTable(table, leftTable, rightTable)
      moduleConflicts += merged.conflicts
      return merged.snapshot
    })
    modules.push({ module, tables })
    conflicts.set(module, moduleConflicts)
  }

  return { snapshot: { version: 1, generatedAt, modules }, conflicts }
}

interface ForeignKeyRow {
  id: number
  seq: number
  table: string
  from: string
  to: string | null
  on_delete: string
}

interface ForeignKeyDefinition {
  parentTable: string
  childColumns: string[]
  parentColumns: string[]
  onDelete: string
}

function foreignKeys(database: SqlDatabasePort, table: string): ForeignKeyDefinition[] {
  const rows = database
    .prepare(`PRAGMA foreign_key_list(${quoteIdentifier(table)})`)
    .all() as ForeignKeyRow[]
  const grouped = new Map<number, ForeignKeyRow[]>()
  for (const row of rows) {
    const group = grouped.get(row.id) ?? []
    group.push(row)
    grouped.set(row.id, group)
  }

  return [...grouped.values()].map((group) => {
    const ordered = [...group].sort((left, right) => left.seq - right.seq)
    const parentColumns = ordered.map((row) => row.to)
    if (parentColumns.some((column) => !column)) {
      throw new Error(`Sync cannot resolve implicit foreign-key columns for ${table}`)
    }
    return {
      parentTable: ordered[0]!.table,
      childColumns: ordered.map((row) => row.from),
      parentColumns: parentColumns as string[],
      onDelete: ordered[0]!.on_delete.toUpperCase()
    }
  })
}

function cloneSyncSnapshot(snapshot: SyncDataSnapshot): SyncDataSnapshot {
  return {
    version: snapshot.version,
    generatedAt: snapshot.generatedAt,
    modules: snapshot.modules.map((module) => ({
      module: module.module,
      tables: module.tables.map((table) => ({
        table: table.table,
        rows: table.rows.map((row) => ({ ...row, data: { ...row.data } })),
        tombstones: table.tombstones.map((tombstone) => ({ ...tombstone }))
      }))
    }))
  }
}

function parentExists(
  table: SyncTableSnapshot,
  parentColumns: readonly string[],
  values: readonly SyncScalar[]
): boolean {
  return table.rows.some((row) =>
    parentColumns.every((column, index) => row.data[column] === values[index])
  )
}

function parentDeleteRevision(
  parentDefinition: SyncTableDefinition,
  parentTable: SyncTableSnapshot,
  parentColumns: readonly string[],
  values: readonly SyncScalar[]
): number {
  if (
    parentDefinition.keyColumns.length !== parentColumns.length ||
    parentDefinition.keyColumns.some((column, index) => column !== parentColumns[index])
  ) {
    return 0
  }
  const key = JSON.stringify(values)
  return parentTable.tombstones.find((row) => row.key === key)?.deletedAt ?? 0
}

function nextDerivedRevision(rowVersion: number, parentRevision: number): number {
  return Math.max(rowVersion, parentRevision, 1) + 1
}

/**
 * Reconciles row-level merge results with SQLite foreign-key semantics before either device
 * applies the snapshot. This prevents a concurrent parent deletion and child edit from producing
 * an invalid database. CASCADE deletes the orphaned child, SET NULL detaches it, while
 * RESTRICT/NO ACTION conflicts are surfaced instead of silently discarding data.
 */
export function reconcileSyncSnapshotForeignKeys(
  database: SqlDatabasePort,
  snapshot: SyncDataSnapshot
): SyncDataSnapshot {
  const result = cloneSyncSnapshot(snapshot)

  for (const module of result.modules) {
    const tables = new Map(module.tables.map((table) => [table.table, table]))
    let changed = true
    let passes = 0

    while (changed) {
      changed = false
      passes += 1
      if (passes > module.tables.length + 2) {
        throw new Error(`Не удалось стабилизировать связи модуля ${module.module}`)
      }

      for (const table of module.tables) {
        const childDefinition = TABLE_BY_NAME.get(table.table)
        if (!childDefinition) continue

        for (const foreignKey of foreignKeys(database, table.table)) {
          const parentTable = tables.get(foreignKey.parentTable)
          const parentDefinition = TABLE_BY_NAME.get(foreignKey.parentTable)
          if (!parentTable || !parentDefinition) continue

          for (const row of [...table.rows]) {
            const values = foreignKey.childColumns.map((column) => row.data[column] ?? null)
            // SQLite considers a composite FK satisfied when any child key component is NULL.
            if (values.some((value) => value === null)) continue
            if (parentExists(parentTable, foreignKey.parentColumns, values)) continue

            const parentRevision = parentDeleteRevision(
              parentDefinition,
              parentTable,
              foreignKey.parentColumns,
              values
            )
            const revision = nextDerivedRevision(row.version, parentRevision)

            if (foreignKey.onDelete === 'CASCADE') {
              table.rows = table.rows.filter((candidate) => candidate.key !== row.key)
              const existing = table.tombstones.find((candidate) => candidate.key === row.key)
              if (existing) existing.deletedAt = Math.max(existing.deletedAt, revision)
              else table.tombstones.push({ key: row.key, deletedAt: revision })
              changed = true
              continue
            }

            if (foreignKey.onDelete === 'SET NULL') {
              for (const column of foreignKey.childColumns) row.data[column] = null
              row.version = revision
              changed = true
              continue
            }

            if (foreignKey.onDelete === 'SET DEFAULT') {
              throw new Error(
                `Конфликт синхронизации: ${table.table} требует значение по умолчанию после удаления ${foreignKey.parentTable}.`
              )
            }

            throw new Error(
              `Конфликт синхронизации: запись ${table.table} всё ещё ссылается на удалённую запись ${foreignKey.parentTable}. Изменения не применены.`
            )
          }
        }
      }
    }

    for (const table of module.tables) {
      table.rows.sort((left, right) => left.key.localeCompare(right.key, 'en'))
      table.tombstones.sort((left, right) => left.key.localeCompare(right.key, 'en'))
    }
  }

  return result
}

function tableColumns(database: SqlDatabasePort, table: string): string[] {
  const rows = database.prepare(`PRAGMA table_info(${quoteIdentifier(table)})`).all() as Array<{
    name: string
  }>
  if (rows.length === 0) throw new Error(`Sync table is missing: ${table}`)
  return rows.map((row) => row.name)
}

function parseKey(definition: SyncTableDefinition, key: string): SyncScalar[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(key)
  } catch {
    throw new Error(`Invalid sync key for ${definition.table}`)
  }
  if (!Array.isArray(parsed) || parsed.length !== definition.keyColumns.length) {
    throw new Error(`Invalid sync key for ${definition.table}`)
  }
  return parsed.map(scalar)
}

function deleteByKey(
  database: SqlDatabasePort,
  definition: SyncTableDefinition,
  key: string
): void {
  const values = parseKey(definition, key)
  const where = definition.keyColumns
    .map((column) => `${quoteIdentifier(column)} IS ?`)
    .join(' AND ')
  database.prepare(`DELETE FROM ${quoteIdentifier(definition.table)} WHERE ${where}`).run(...values)
}

function upsertRow(
  database: SqlDatabasePort,
  definition: SyncTableDefinition,
  row: SyncSnapshotRow,
  columns: readonly string[]
): void {
  const dataColumns = Object.keys(row.data)
  for (const column of dataColumns) {
    if (!columns.includes(column)) throw new Error(`Unknown column ${definition.table}.${column}`)
  }
  for (const keyColumn of definition.keyColumns) {
    if (!dataColumns.includes(keyColumn))
      throw new Error(`Missing key column ${definition.table}.${keyColumn}`)
  }

  const placeholders = dataColumns.map(() => '?').join(', ')
  const values = dataColumns.map((column) => row.data[column] ?? null)
  const nonKeys = dataColumns.filter((column) => !definition.keyColumns.includes(column))
  const conflictColumns = definition.keyColumns.map(quoteIdentifier).join(', ')
  const conflictAction =
    nonKeys.length === 0
      ? 'DO NOTHING'
      : `DO UPDATE SET ${nonKeys
          .map((column) => `${quoteIdentifier(column)} = excluded.${quoteIdentifier(column)}`)
          .join(', ')}`

  database
    .prepare(
      `INSERT INTO ${quoteIdentifier(definition.table)}
       (${dataColumns.map(quoteIdentifier).join(', ')})
       VALUES (${placeholders})
       ON CONFLICT(${conflictColumns}) ${conflictAction}`
    )
    .run(...values)
}

export function applySyncSnapshot(database: SqlDatabasePort, snapshot: SyncDataSnapshot): void {
  if (snapshot.version !== 1) throw new Error('Unsupported sync snapshot version')
  ensureSyncInfrastructure(database)

  const transaction = database.transaction(() => {
    database.prepare("UPDATE sync_runtime SET value = '1' WHERE key = 'applying_remote'").run()
    try {
      const moduleDefinitions = snapshot.modules.map((module) => {
        const definition = MODULE_BY_NAME.get(module.module)
        if (!definition) throw new Error(`Unsupported sync module: ${module.module}`)
        return { snapshot: module, definition }
      })

      for (const { snapshot: moduleSnapshot, definition } of [...moduleDefinitions].reverse()) {
        const tables = new Map(moduleSnapshot.tables.map((table) => [table.table, table]))
        for (const tableDefinition of [...definition.tables].reverse()) {
          const table = tables.get(tableDefinition.table)
          if (!table) throw new Error(`Missing table ${tableDefinition.table} in sync snapshot`)
          for (const tombstone of table.tombstones) {
            deleteByKey(database, tableDefinition, tombstone.key)
            database
              .prepare(
                `INSERT INTO sync_tombstones(table_name, row_key, deleted_at)
                 VALUES (?, ?, ?)
                 ON CONFLICT(table_name, row_key)
                 DO UPDATE SET deleted_at = MAX(deleted_at, excluded.deleted_at)`
              )
              .run(tableDefinition.table, tombstone.key, tombstone.deletedAt)
            database
              .prepare('DELETE FROM sync_row_versions WHERE table_name = ? AND row_key = ?')
              .run(tableDefinition.table, tombstone.key)
          }
        }
      }

      for (const { snapshot: moduleSnapshot, definition } of moduleDefinitions) {
        const tables = new Map(moduleSnapshot.tables.map((table) => [table.table, table]))
        for (const tableDefinition of definition.tables) {
          const table = tables.get(tableDefinition.table)
          if (!table) throw new Error(`Missing table ${tableDefinition.table} in sync snapshot`)
          const columns = tableColumns(database, tableDefinition.table)
          for (const row of table.rows) {
            upsertRow(database, tableDefinition, row, columns)
            database
              .prepare(
                `INSERT INTO sync_row_versions(table_name, row_key, changed_at)
                 VALUES (?, ?, ?)
                 ON CONFLICT(table_name, row_key)
                 DO UPDATE SET changed_at = excluded.changed_at`
              )
              .run(tableDefinition.table, row.key, row.version)
            database
              .prepare('DELETE FROM sync_tombstones WHERE table_name = ? AND row_key = ?')
              .run(tableDefinition.table, row.key)
          }
        }
      }
    } finally {
      database.prepare("UPDATE sync_runtime SET value = '0' WHERE key = 'applying_remote'").run()
    }
  })

  transaction()
}

function countDifferences(
  from: SyncModuleSnapshot,
  to: SyncModuleSnapshot
): {
  changed: number
  deleted: number
} {
  const fromTables = new Map(from.tables.map((table) => [table.table, table]))
  let changed = 0
  let deleted = 0

  for (const table of to.tables) {
    const before = fromTables.get(table.table)
    if (!before) continue
    const beforeRows = new Map(before.rows.map((row) => [row.key, canonicalRow(row)]))
    const beforeDeletes = new Map(before.tombstones.map((row) => [row.key, row.deletedAt]))

    for (const row of table.rows) {
      if (beforeRows.get(row.key) !== canonicalRow(row)) changed += 1
    }
    for (const tombstone of table.tombstones) {
      if ((beforeDeletes.get(tombstone.key) ?? -1) !== tombstone.deletedAt) deleted += 1
    }
  }
  return { changed, deleted }
}

export function summarizeSyncInventory(snapshot: SyncDataSnapshot): SyncModuleInventory[] {
  return snapshot.modules.map((module) => ({
    module: module.module,
    records: module.tables.reduce((sum, table) => sum + table.rows.length, 0),
    deleted: module.tables.reduce((sum, table) => sum + table.tombstones.length, 0)
  }))
}

export function summarizeSyncMerge(
  local: SyncDataSnapshot,
  remote: SyncDataSnapshot,
  merged: SyncDataSnapshot,
  conflicts: ReadonlyMap<SyncModule, number>
): SyncModuleSummary[] {
  const localModules = new Map(local.modules.map((module) => [module.module, module]))
  const remoteModules = new Map(remote.modules.map((module) => [module.module, module]))

  return merged.modules.map((module) => {
    const localModule = localModules.get(module.module)
    const remoteModule = remoteModules.get(module.module)
    if (!localModule || !remoteModule) throw new Error(`Missing module ${module.module}`)
    const localDiff = countDifferences(localModule, module)
    const remoteDiff = countDifferences(remoteModule, module)
    return {
      module: module.module,
      received: localDiff.changed,
      sent: remoteDiff.changed,
      deleted: Math.max(localDiff.deleted, remoteDiff.deleted),
      conflicts: conflicts.get(module.module) ?? 0
    }
  })
}

export function syncTableDefinition(table: string): Readonly<SyncTableDefinition> | null {
  return TABLE_BY_NAME.get(table) ?? null
}
