import { drizzle, type SQLJsDatabase } from 'drizzle-orm/sql-js'
import type { Database, Statement } from 'sql.js'
import * as schema from './schema'
import type { PwaDatabase } from '../storage/database'
import type { PwaDesktopRepositories } from './repositories'

let active: { db: PwaDatabase; repositories: PwaDesktopRepositories } | undefined
let cached: { sqlite: Database; orm: SQLJsDatabase<typeof schema> } | undefined

export function bindDesktopRuntime(db: PwaDatabase, repositories: PwaDesktopRepositories): void {
  active = { db, repositories }
  cached = undefined
}
export function desktopRuntime(): NonNullable<typeof active> {
  if (!active) throw new Error('Локальное хранилище ещё не открыто')
  return active
}
export function getDatabase(): SQLJsDatabase<typeof schema> {
  const { db } = desktopRuntime()
  if (cached?.sqlite === db.sqlite) return cached.orm
  const client = new Proxy(db.sqlite, {
    get(target, property) {
      if (property === 'prepare')
        return (sql: string): Statement => {
          const statement = target.prepare(sql)
          const writes =
            /^\s*(insert|update|delete|replace|create|drop|alter|begin|commit|rollback|savepoint|release)\b/i.test(
              sql
            )
          return new Proxy(statement, {
            get(stmt, name) {
              const value = Reflect.get(stmt, name)
              if (typeof value !== 'function') return value
              return (...args: unknown[]) =>
                writes && ['run', 'step', 'get', 'getAsObject'].includes(String(name))
                  ? db.externalMutation(() => value.apply(stmt, args))
                  : value.apply(stmt, args)
            }
          })
        }
      const value = Reflect.get(target, property)
      return typeof value === 'function' ? value.bind(target) : value
    }
  })
  const orm = drizzle(client, { schema })
  cached = { sqlite: db.sqlite, orm }
  return orm
}
