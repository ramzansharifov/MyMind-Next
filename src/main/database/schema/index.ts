import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export { boardDocuments, boardNodes } from './boards'
export { diaries, diaryDays, diaryEntries } from './diary'
export {
  financeAccounts,
  financeExchangeRates,
  financeLimits,
  financeSettings,
  financeTags,
  financeTransactionEntries,
  financeTransactions,
  financeTransactionTemplates
} from './finance'
export { noteGroups, notes } from './notes'
export { studyLinkTargets, studyMaterials, studyNodes } from './study'

export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', {
    mode: 'timestamp_ms'
  }).notNull()
})
