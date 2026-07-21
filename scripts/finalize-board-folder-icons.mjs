import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

function replaceOnce(path, before, after) {
  const content = readFileSync(path, 'utf8')
  const index = content.indexOf(before)

  if (index < 0) {
    throw new Error(`Pattern not found in ${path}: ${before.slice(0, 180)}`)
  }

  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Pattern is not unique in ${path}: ${before.slice(0, 180)}`)
  }

  writeFileSync(path, content.slice(0, index) + after + content.slice(index + before.length), 'utf8')
}

const contractsPath = 'src/shared/contracts/boards.ts'
replaceOnce(
  contractsPath,
  `export type { StudyBoardBlock } from './study'`,
  `export type { StudyBoardBlock, StudyFolderIconName } from './study'`
)

const clientPath = 'src/renderer/src/modules/boards/api/boards-client.ts'
replaceOnce(
  clientPath,
  `  MoveBoardNodeInput,\n  type StudyFolderIconName\n} from '../../../../../shared/contracts/boards'`,
  `  MoveBoardNodeInput\n} from '../../../../../shared/contracts/boards'\nimport type { StudyFolderIconName } from '../../../../../shared/contracts/study'`
)

const migrations = readdirSync('drizzle')
  .filter((fileName) => /^\d{4}_.+\.sql$/.test(fileName) && !fileName.startsWith('0007_'))
  .sort()

const latestMigration = migrations.at(-1)

if (!latestMigration) {
  throw new Error('The board folder icon migration was not generated')
}

const migrationPath = join('drizzle', latestMigration)
const migration = readFileSync(migrationPath, 'utf8')
const backfill = [
  '',
  '--> statement-breakpoint',
  `UPDATE board_nodes SET icon = 'folder' WHERE type = 'folder' AND icon IS NULL;`,
  '--> statement-breakpoint',
  `UPDATE board_nodes\nSET icon = COALESCE((SELECT icon FROM study_nodes WHERE study_nodes.id = board_nodes.source_study_node_id), 'folder')\nWHERE type = 'folder' AND source_study_node_id IS NOT NULL;`,
  ''
].join('\n')

if (!migration.includes("UPDATE board_nodes SET icon = 'folder'")) {
  writeFileSync(migrationPath, migration.trimEnd() + backfill, 'utf8')
}

console.log(`Finalized ${latestMigration}`)
