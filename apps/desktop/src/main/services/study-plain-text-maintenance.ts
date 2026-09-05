import { STUDY_DOCUMENT_LIMITS } from '../../shared/contracts/study'
import { studyDocumentSchema } from '../../shared/validation/study'
import { getSqlite } from '../database/client'
import { documentToPlainText } from '../domain/study-document-index'

export const STUDY_PLAIN_TEXT_MAINTENANCE_KEY = 'study_plain_text_maintenance_v1'

interface LegacyMaterialRow {
  nodeId: string
  document: string
  plainText: string
}

export interface StudyPlainTextMaintenanceResult {
  applied: boolean
  processed: number
  skippedCorrupt: number
}

export function runStudyPlainTextMaintenance(): StudyPlainTextMaintenanceResult {
  const sqlite = getSqlite()
  const completed = sqlite
    .prepare('SELECT value FROM app_meta WHERE key = ?')
    .get(STUDY_PLAIN_TEXT_MAINTENANCE_KEY) as { value: string } | undefined

  if (completed?.value === '1') {
    return { applied: false, processed: 0, skippedCorrupt: 0 }
  }

  const rows = sqlite
    .prepare(
      'SELECT node_id AS nodeId, document, plain_text AS plainText FROM study_materials WHERE length(plain_text) > ?'
    )
    .all(STUDY_DOCUMENT_LIMITS.maxPlainTextLength) as LegacyMaterialRow[]
  const update = sqlite.prepare('UPDATE study_materials SET plain_text = ? WHERE node_id = ?')
  let processed = 0
  let skippedCorrupt = 0

  for (const row of rows) {
    try {
      const document = studyDocumentSchema.parse(JSON.parse(row.document))
      update.run(documentToPlainText(document), row.nodeId)
      processed += 1
    } catch (reason: unknown) {
      skippedCorrupt += 1
      console.error('Skipped corrupt material during plain-text maintenance', {
        nodeId: row.nodeId,
        error: reason instanceof Error ? reason.name : 'UnknownError'
      })
    }
  }

  sqlite
    .prepare(
      `INSERT INTO app_meta (key, value, updated_at) VALUES (?, '1', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .run(STUDY_PLAIN_TEXT_MAINTENANCE_KEY, Date.now())

  return { applied: true, processed, skippedCorrupt }
}
