import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export { boardDocuments, boardNodes } from './boards'
export {
  calendarEventOccurrences,
  calendarEventReminders,
  calendarEvents,
  calendarReminderDeliveries
} from './calendar'
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
export { habitEntries, habitGroups, habits } from './habits'
export { movies } from './movies'
export { musicItems, musicPlaylistItems, musicPlaylists } from './music'
export { noteGroups, notes } from './notes'
export {
  nutritionFoods,
  nutritionLogEntries,
  nutritionRecipeIngredients,
  nutritionRecipes,
  nutritionTargets,
  nutritionWaterDays
} from './nutrition'
export { passwordGroups, passwordItems, passwordVault } from './passwords'
export {
  studyCodeBlockNames,
  studyCodeNodeNames,
  studyLinkTargets,
  studyMaterials,
  studyNodes
} from './study'
export { taskGroups, tasks } from './tasks'
export {
  workoutExercises,
  workoutProgramExercises,
  workoutPrograms,
  workoutProgressEntries,
  workoutProgressMetrics,
  workoutProgressPhotos,
  workoutSessionExercises,
  workoutSessions,
  workoutSets
} from './workouts'

export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', {
    mode: 'timestamp_ms'
  }).notNull()
})
