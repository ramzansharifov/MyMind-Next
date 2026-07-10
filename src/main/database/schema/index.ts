import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export { studyMaterials, studyNodes } from './study'

export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', {
    mode: 'timestamp_ms'
  }).notNull()
})
