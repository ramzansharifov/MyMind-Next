import { randomUUID } from 'node:crypto'
import type { RepositoryRuntime } from '@mymind/contracts/storage'
import { getSqlite } from './client'

export const desktopRepositoryRuntime: RepositoryRuntime = {
  database: getSqlite,
  createId: randomUUID,
  now: () => Date.now()
}
