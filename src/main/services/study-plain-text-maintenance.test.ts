import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { STUDY_DOCUMENT_LIMITS } from '../../shared/contracts/study'
import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import {
  runStudyPlainTextMaintenance,
  STUDY_PLAIN_TEXT_MAINTENANCE_KEY
} from './study-plain-text-maintenance'

let root = ''

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-maintenance-'))
  initializeDatabaseForTesting(join(root, 'study.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
})

afterEach(async () => {
  closeDatabase()
  await rm(root, { recursive: true, force: true })
})

function insertMaterial(nodeId: string, document: string, plainText: string): void {
  const sqlite = getSqlite()
  const now = Date.now()
  sqlite
    .prepare(
      'INSERT INTO study_nodes (id, type, title, position, is_expanded, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(nodeId, 'material', nodeId, 0, 1, now, now)
  sqlite
    .prepare(
      'INSERT INTO study_materials (node_id, document, plain_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(nodeId, document, plainText, now, now)
}

describe('study plain-text maintenance', () => {
  it('repairs only oversized indexes, preserves documents, skips corruption and is idempotent', () => {
    const document = JSON.stringify({
      version: 1,
      blocks: [{ id: 'text', type: 'text', text: 'Readable text' }]
    })
    const oversized = 'x'.repeat(STUDY_DOCUMENT_LIMITS.maxPlainTextLength + 1)
    insertMaterial('legacy', document, oversized)
    insertMaterial('corrupt', '{not-json', oversized)
    insertMaterial('short', document, 'already short')
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const first = runStudyPlainTextMaintenance()
    const rows = getSqlite()
      .prepare('SELECT node_id AS nodeId, document, plain_text AS plainText FROM study_materials')
      .all() as Array<{ nodeId: string; document: string; plainText: string }>

    expect(first).toEqual({ applied: true, processed: 1, skippedCorrupt: 1 })
    expect(rows.find((row) => row.nodeId === 'legacy')).toEqual({
      nodeId: 'legacy',
      document,
      plainText: 'Readable text'
    })
    expect(rows.find((row) => row.nodeId === 'corrupt')?.document).toBe('{not-json')
    expect(rows.find((row) => row.nodeId === 'corrupt')?.plainText).toBe(oversized)
    expect(rows.find((row) => row.nodeId === 'short')?.plainText).toBe('already short')
    expect(error).toHaveBeenCalledWith(
      'Skipped corrupt material during plain-text maintenance',
      expect.objectContaining({ nodeId: 'corrupt' })
    )
    expect(
      getSqlite()
        .prepare('SELECT value FROM app_meta WHERE key = ?')
        .get(STUDY_PLAIN_TEXT_MAINTENANCE_KEY)
    ).toEqual({ value: '1' })
    expect(runStudyPlainTextMaintenance()).toEqual({
      applied: false,
      processed: 0,
      skippedCorrupt: 0
    })

    error.mockRestore()
  })
})
