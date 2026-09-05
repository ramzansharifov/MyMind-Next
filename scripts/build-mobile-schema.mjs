// Explicit maintenance command: run only when creating a NEW mobile migration.
// Do not regenerate the schema of an already released migration.
import fs from 'node:fs'
import Database from 'better-sqlite3'
const db = new Database(':memory:')
const root = 'apps/desktop/drizzle'
const journal = JSON.parse(fs.readFileSync(`${root}/meta/_journal.json`, 'utf8'))
for (const entry of journal.entries) {
  db.exec(fs.readFileSync(`${root}/${entry.tag}.sql`, 'utf8'))
}
const tables = new Set([
  'task_groups',
  'tasks',
  'habit_groups',
  'habits',
  'habit_entries',
  'habit_reminder_deliveries',
  'movies',
  'music_items',
  'music_playlists',
  'music_playlist_items',
  'calendar_events',
  'calendar_event_occurrences',
  'calendar_event_reminders',
  'calendar_reminder_deliveries',
  'diaries',
  'diary_days',
  'diary_entries'
])
const sql = db
  .prepare(
    "SELECT tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name"
  )
  .all()
  .filter((row) => tables.has(row.tbl_name))
  .map((row) => row.sql)
fs.writeFileSync(
  'packages/persistence/src/mobile-schema.ts',
  `// Initial mobile schema from desktop migrations through ${journal.entries.at(-1).tag}.\n// Generated with scripts/build-mobile-schema.mjs; preserve V1 after release.\nexport const mobileSchemaV1: readonly string[] = ${JSON.stringify(sql, null, 2)}\n`
)
db.close()
