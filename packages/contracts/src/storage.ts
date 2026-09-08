/** Synchronous database boundary. SQL drivers are implemented only by the apps. */
export interface SqlStatementPort {
  get(...parameters: unknown[]): unknown
  all(...parameters: unknown[]): unknown[]
  run(...parameters: unknown[]): { changes: number }
}

export interface SqlDatabasePort {
  prepare(sql: string): SqlStatementPort
  transaction<Args extends unknown[], Result>(
    operation: (...args: Args) => Result
  ): (...args: Args) => Result
}

export interface RepositoryRuntime {
  database(): SqlDatabasePort
  createId(): string
  now(): number
}
