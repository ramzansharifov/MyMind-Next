import type { Database, SqlValue } from 'sql.js'
import { ensureSyncInfrastructure } from '@mymind/persistence/sync'
import type { SqlDatabasePort } from '@mymind/contracts/storage'
import { STUDY_SAFE_ID_PATTERN } from '@mymind/contracts/study'
import { isSafeStudyAssetFileName } from '@mymind/core/study-assets'
import { studyAssetMimeType, studyAssetExtension } from '@mymind/core/study-asset-file'
import { migrateDatabase } from './migrations'
import type { PwaDatabase } from './database'
import type { StoredAsset } from './indexed-db'
import { MOBILE_BACKUP_MAX_DATABASE_BYTES } from '../../../mobile/src/shared/backup/archive'
import { appearancePreferencesSchema } from '@mymind/core/validation/preferences'
import { noteDocumentSchema } from '@mymind/core/validation/notes'
import { studyDocumentSchema } from '@mymind/core/validation/study'

interface LibraryFile {
  path: string
  file: Blob
}
const quote = (name: string): string => `"${name.replace(/"/g, '""')}"`
function rows(db: Database, sql: string, values: SqlValue[] = []): Record<string, SqlValue>[] {
  const statement = db.prepare(sql)
  try {
    statement.bind(values)
    const result: Record<string, SqlValue>[] = []
    while (statement.step()) result.push(statement.getAsObject())
    return result
  } finally {
    statement.free()
  }
}
function rawPort(db: Database): SqlDatabasePort {
  return {
    prepare: (sql) => ({
      all: (...values) => rows(db, sql, values as SqlValue[]),
      get: (...values) => rows(db, sql, values as SqlValue[])[0],
      run: (...values) => {
        db.run(sql, values as SqlValue[])
        return { changes: db.getRowsModified() }
      }
    }),
    transaction:
      (operation) =>
      (...args) => {
        db.run('SAVEPOINT import_sync')
        try {
          const result = operation(...args)
          db.run('RELEASE SAVEPOINT import_sync')
          return result
        } catch (error) {
          db.run('ROLLBACK TO SAVEPOINT import_sync')
          db.run('RELEASE SAVEPOINT import_sync')
          throw error
        }
      }
  }
}

/** Imports a user-selected, closed desktop library. All source files remain untouched. */
export async function importDesktopLibrary(
  db: PwaDatabase,
  files: readonly LibraryFile[]
): Promise<{ records: number; files: number }> {
  const databases = files.filter(({ path }) => /(?:^|\/)data\/mymind\.sqlite$/.test(path))
  if (databases.length !== 1)
    throw new Error(
      'Выберите корневую папку MyMind с файлом data/mymind.sqlite и папкой Attachments.'
    )
  const sourceFile = databases[0]
  const root = sourceFile.path.slice(0, -'data/mymind.sqlite'.length)
  if (files.some(({ path, file }) => path === `${sourceFile.path}-wal` && file.size > 0))
    throw new Error(
      'Сначала полностью закройте desktop MyMind: в библиотеке ещё есть несохранённый WAL-файл.'
    )
  if (sourceFile.file.size > MOBILE_BACKUP_MAX_DATABASE_BYTES)
    throw new Error('База превышает поддерживаемый размер формата MyMind (512 МБ).')
  const source = new db.engine.Database(new Uint8Array(await sourceFile.file.arrayBuffer()))
  const candidate = new db.engine.Database()
  let adopted = false
  try {
    source.run('PRAGMA journal_mode = DELETE')
    if (source.exec('PRAGMA integrity_check')[0]?.values[0]?.[0] !== 'ok')
      throw new Error('Desktop-база повреждена')
    const originalTables = new Set(
      rows(source, "SELECT name FROM sqlite_master WHERE type='table'").map((row) =>
        String(row.name)
      )
    )
    if (
      !originalTables.has('app_meta') ||
      !originalTables.has('study_materials') ||
      !originalTables.has('notes')
    )
      throw new Error('Это не библиотека desktop MyMind')
    migrateDatabase(candidate)
    ensureSyncInfrastructure(rawPort(candidate))
    const tables = rows(
      candidate,
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).map((row) => String(row.name))
    candidate.run('PRAGMA foreign_keys = OFF; BEGIN')
    let records = 0
    try {
      candidate.run("UPDATE sync_runtime SET value = '1' WHERE key = 'applying_remote'")
      for (const table of tables)
        if (table !== 'sync_runtime') candidate.run(`DELETE FROM ${quote(table)}`)
      for (const table of tables) {
        if (table === 'sync_runtime') continue
        if (!originalTables.has(table)) {
          if (
            table !== 'mobile_preferences' &&
            table !== 'local_profile' &&
            table !== 'password_vault_sync_identity' &&
            !table.startsWith('sync_')
          )
            throw new Error(`Обновите desktop перед переносом: отсутствует таблица ${table}`)
          continue
        }
        const columns = rows(candidate, `PRAGMA table_info(${quote(table)})`).map((row) =>
          String(row.name)
        )
        const sourceColumns = new Set(
          rows(source, `PRAGMA table_info(${quote(table)})`).map((row) => String(row.name))
        )
        if (columns.some((column) => !sourceColumns.has(column)))
          throw new Error(`Обновите desktop перед переносом: структура ${table} устарела`)
        const names = columns.map(quote).join(',')
        const select = source.prepare(`SELECT ${names} FROM ${quote(table)}`)
        const replace = table === 'password_vault_sync_identity' || table.startsWith('sync_')
        const insert = candidate.prepare(
          `INSERT ${replace ? 'OR REPLACE ' : ''}INTO ${quote(table)} (${names}) VALUES (${columns.map(() => '?').join(',')})`
        )
        try {
          while (select.step()) {
            insert.run(select.get())
            records++
            if (records % 1000 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0))
          }
        } finally {
          select.free()
          insert.free()
        }
      }
      candidate.run('COMMIT; PRAGMA foreign_keys = ON')
    } catch (error) {
      candidate.run('ROLLBACK')
      throw error
    }
    ensureSyncInfrastructure(rawPort(candidate))
    candidate.run("UPDATE sync_runtime SET value = '0' WHERE key = 'applying_remote'")
    const appearanceRow = rows(
      source,
      "SELECT value FROM app_meta WHERE key='preferences.appearance'"
    )[0]
    if (appearanceRow) {
      const parsed = appearancePreferencesSchema.safeParse(JSON.parse(String(appearanceRow.value)))
      if (parsed.success)
        candidate.run(
          "INSERT INTO mobile_preferences(key,value) VALUES ('appearance',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
          [JSON.stringify(parsed.data)]
        )
    }
    migrateDatabase(candidate)
    const assets: StoredAsset[] = []
    for (const selected of files) {
      const prefix = `${root}Attachments/`
      if (!selected.path.startsWith(prefix)) continue
      const parts = selected.path.slice(prefix.length).split('/')
      if (parts.length !== 3) continue
      const [owner, asset, name] = parts
      if (
        !STUDY_SAFE_ID_PATTERN.test(owner) ||
        !STUDY_SAFE_ID_PATTERN.test(asset) ||
        !isSafeStudyAssetFileName(name)
      )
        throw new Error('Некорректное имя вложения в desktop-библиотеке')
      const path = owner.startsWith('workout-progress-')
        ? `workout-progress/${owner.slice('workout-progress-'.length)}/${asset}/${name}`
        : `document-assets/${owner}/${asset}/${name}`
      assets.push({
        path,
        blob: selected.file.slice(
          0,
          selected.file.size,
          studyAssetMimeType(studyAssetExtension(name))
        )
      })
    }
    const available = new Map(assets.map((asset) => [asset.path, asset.blob.size]))
    if (available.size !== assets.length) throw new Error('В библиотеке повторяются пути вложений')
    for (const table of ['notes', 'study_materials'])
      for (const row of rows(candidate, `SELECT document FROM ${table}`)) {
        const parsed: unknown = JSON.parse(String(row.document))
        const document =
          table === 'notes' ? noteDocumentSchema.parse(parsed) : studyDocumentSchema.parse(parsed)
        for (const block of document.blocks)
          if (
            'source' in block &&
            typeof block.source === 'object' &&
            block.source?.type === 'local' &&
            block.source.asset
          ) {
            const asset = block.source.asset
            if (!available.has(`document-assets/${asset.materialId}/${asset.id}/${asset.name}`))
              throw new Error(
                `В папке отсутствует вложение «${asset.name}». Выберите полную библиотеку.`
              )
            if (
              available.get(`document-assets/${asset.materialId}/${asset.id}/${asset.name}`) !==
              asset.size
            )
              throw new Error(
                `Размер вложения «${asset.name}» не совпадает с базой. Исходные данные сохранены.`
              )
          }
      }
    for (const photo of rows(
      candidate,
      'SELECT entry_id, asset_id, file_name FROM workout_progress_photos'
    )) {
      if (!available.has(`workout-progress/${photo.entry_id}/${photo.asset_id}/${photo.file_name}`))
        throw new Error('В библиотеке отсутствует фотография прогресса')
    }
    await db.replace(candidate, assets)
    adopted = true
    return { records, files: assets.length }
  } finally {
    source.close()
    if (!adopted) candidate.close()
  }
}
