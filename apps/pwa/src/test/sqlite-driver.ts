// Runs the existing repository test suite against browser SQLite, without rebuilding native ABI.
import initSqlJs, { type SqlValue } from 'sql.js'

const engine = await initSqlJs()
const snapshots = new Map<string, Uint8Array>()
export default class BrowserSqliteTestDriver {
  private readonly sqlite: InstanceType<typeof engine.Database>
  private savepoint = 0
  constructor(private readonly path: string) {
    // Original reopen tests use a fresh temporary filename. Snapshots stay in memory in this adapter.
    this.sqlite = new engine.Database(path === ':memory:' ? undefined : snapshots.get(path))
  }
  exec(sql: string): this {
    this.sqlite.run(sql)
    return this
  }
  pragma(sql: string, options?: { simple?: boolean }): unknown {
    const results = this.sqlite.exec(`PRAGMA ${sql}`)
    const first = results[0]
    if (options?.simple) return first?.values[0]?.[0]
    return (
      first?.values.map((row) =>
        Object.fromEntries(first.columns.map((column, index) => [column, row[index]]))
      ) ?? []
    )
  }
  prepare(sql: string): {
    get(...parameters: unknown[]): unknown
    all(...parameters: unknown[]): unknown[]
    run(...parameters: unknown[]): { changes: number; lastInsertRowid: number }
  } {
    const bind = (parameters: unknown[]): SqlValue[] =>
      parameters.map((value) => (typeof value === 'boolean' ? Number(value) : (value as SqlValue)))
    const rows = (parameters: unknown[]): unknown[] => {
      const statement = this.sqlite.prepare(sql)
      try {
        statement.bind(bind(parameters))
        const result: unknown[] = []
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
        this.sqlite.run(sql, bind(parameters))
        return {
          changes: this.sqlite.getRowsModified(),
          lastInsertRowid: Number(this.sqlite.exec('SELECT last_insert_rowid()')[0].values[0][0])
        }
      }
    }
  }
  transaction<Args extends unknown[], Result>(
    operation: (...args: Args) => Result
  ): (...args: Args) => Result {
    return (...args) => {
      const name = `test_${++this.savepoint}`
      this.sqlite.run(`SAVEPOINT ${name}`)
      try {
        const result = operation(...args)
        this.sqlite.run(`RELEASE SAVEPOINT ${name}`)
        return result
      } catch (error) {
        this.sqlite.run(`ROLLBACK TO SAVEPOINT ${name}`)
        this.sqlite.run(`RELEASE SAVEPOINT ${name}`)
        throw error
      }
    }
  }
  close(): void {
    if (this.path !== ':memory:') snapshots.set(this.path, this.sqlite.export())
    this.sqlite.close()
  }
}
