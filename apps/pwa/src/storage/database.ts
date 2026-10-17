import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from 'sql.js'
import type { SqlDatabasePort } from '@mymind/contracts/storage'
import { migrateDatabase } from './migrations'
import { openPwaDisk, type PwaDisk } from './indexed-db'

export type SaveState = 'saved' | 'saving' | 'error'

function bindings(values: unknown[]): SqlValue[] {
  return values.map((value) => {
    if (typeof value === 'boolean') return Number(value)
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      value instanceof Uint8Array
    )
      return value
    throw new Error('Неподдерживаемый параметр базы данных')
  })
}

export class PwaDatabase implements SqlDatabasePort {
  private revision = 0
  private savedRevision = 0
  private depth = 0
  private savepoint = 0
  private pending?: Promise<void>
  private failure: unknown
  private listeners = new Set<() => void>()
  state: SaveState = 'saved'

  constructor(
    public sqlite: Database,
    public readonly disk: PwaDisk,
    public readonly engine: SqlJsStatic
  ) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private announce(state: SaveState): void {
    this.state = state
    for (const listener of this.listeners) listener()
  }
  private changed(): void {
    this.revision++
    this.announce('saving')
    if (!this.depth)
      queueMicrotask(() => {
        void this.flush().catch(() => undefined)
      })
  }
  private assertWritable(): void {
    if (this.failure)
      throw new Error(
        'Не удалось сохранить данные на устройстве. Повторите сохранение перед редактированием.'
      )
  }
  externalMutation<T>(operation: () => T): T {
    this.assertWritable()
    const result = operation()
    this.changed()
    return result
  }
  prepare(sql: string): ReturnType<SqlDatabasePort['prepare']> {
    const rows = (parameters: unknown[]): Record<string, SqlValue>[] => {
      const statement = this.sqlite.prepare(sql)
      try {
        statement.bind(bindings(parameters))
        const result: Record<string, SqlValue>[] = []
        while (statement.step()) result.push(statement.getAsObject())
        return result
      } finally {
        statement.free()
      }
    }
    return {
      get: (...parameters) => rows(parameters)[0],
      all: (...parameters) => rows(parameters),
      run: (...parameters) => {
        this.assertWritable()
        this.sqlite.run(sql, bindings(parameters))
        const changes = this.sqlite.getRowsModified()
        this.changed()
        return { changes }
      }
    }
  }
  transaction<Args extends unknown[], Result>(
    operation: (...args: Args) => Result
  ): (...args: Args) => Result {
    return (...args) => {
      this.assertWritable()
      const name = `pwa_${++this.savepoint}`
      const before = this.revision
      this.sqlite.run(`SAVEPOINT ${name}`)
      this.depth++
      try {
        const result = operation(...args)
        if (result instanceof Promise) throw new Error('Асинхронная операция внутри SQL-транзакции')
        this.sqlite.run(`RELEASE SAVEPOINT ${name}`)
        return result
      } catch (error) {
        this.sqlite.run(`ROLLBACK TO SAVEPOINT ${name}`)
        this.sqlite.run(`RELEASE SAVEPOINT ${name}`)
        this.revision = before
        throw error
      } finally {
        this.depth--
        if (!this.depth) {
          if (this.revision === this.savedRevision) this.announce('saved')
          else
            queueMicrotask(() => {
              void this.flush().catch(() => undefined)
            })
        }
      }
    }
  }
  flush = async (): Promise<void> => {
    if (this.pending) return this.pending
    if (this.savedRevision === this.revision) return
    this.failure = undefined
    this.pending = (async () => {
      try {
        while (this.savedRevision !== this.revision) {
          const revision = this.revision
          const bytes = this.sqlite.export()
          // sql.js export closes/reopens the handle and resets PRAGMA foreign_keys.
          this.sqlite.run('PRAGMA foreign_keys = ON')
          await this.disk.saveDatabase(bytes)
          this.savedRevision = revision
        }
        this.announce('saved')
      } catch (error) {
        this.failure = error
        this.announce('error')
        throw error
      } finally {
        this.pending = undefined
      }
    })()
    return this.pending
  }
  async replace(candidate: Database, assets: Parameters<PwaDisk['replace']>[1]): Promise<void> {
    await this.flush()
    const bytes = candidate.export()
    await this.disk.replace(bytes, assets)
    const previous = this.sqlite
    this.sqlite = candidate
    candidate.run('PRAGMA foreign_keys = ON')
    previous.close()
    this.revision = this.savedRevision = 0
    this.announce('saved')
  }
}

let opening: Promise<PwaDatabase> | undefined

async function acquireWriterLock(): Promise<void> {
  if (!navigator.locks)
    throw new Error('Для локальной базы нужен современный браузер с поддержкой Web Locks.')
  await new Promise<void>((resolve, reject) => {
    void navigator.locks
      .request('mymind-pwa-writer', { ifAvailable: true }, async (lock) => {
        if (!lock) {
          reject(new Error('MyMind уже открыт в другой вкладке. Закройте её и повторите запуск.'))
          return
        }
        resolve()
        // The browser releases this lifetime lock when the document is destroyed.
        await new Promise<void>(() => undefined)
      })
      .catch(reject)
  })
}

export function openPwaDatabase(): Promise<PwaDatabase> {
  opening ??= (async () => {
    await acquireWriterLock()
    const [engine, disk] = await Promise.all([
      initSqlJs({ locateFile: () => '/sqlite/sql-wasm.wasm' }),
      openPwaDisk()
    ])
    await disk.clearStates('sync-stage:')
    const bytes = await disk.readDatabase()
    const sqlite = new engine.Database(bytes)
    migrateDatabase(sqlite)
    await disk.saveDatabase(sqlite.export())
    sqlite.run('PRAGMA foreign_keys = ON')
    return new PwaDatabase(sqlite, disk, engine)
  })()
  return opening
}
