import type { Database } from 'sql.js'
import { noteDocumentSchema } from '@mymind/core/validation/notes'
import { studyDocumentSchema } from '@mymind/core/validation/study'
import type { StoredAsset } from './indexed-db'
import { assetPath } from './assets'

/** Validate database references before adopting a replacement library. Orphan files are harmless. */
export function validateLibraryAssets(database: Database, assets: readonly StoredAsset[]): void {
  const files = new Map(assets.map((asset) => [asset.path, asset.blob.size]))
  if (files.size !== assets.length) throw new Error('В копии повторяются пути вложений')
  const requireFile = (path: string, size: number): void => {
    if (!files.has(path)) throw new Error(`В копии отсутствует вложение: ${path}`)
    if (files.get(path) !== size) throw new Error(`Размер вложения не совпадает с базой: ${path}`)
  }
  for (const table of ['notes', 'study_materials']) {
    const statement = database.prepare(`SELECT document FROM ${table}`)
    try {
      while (statement.step()) {
        const raw: unknown = JSON.parse(String(statement.getAsObject().document))
        const document =
          table === 'notes' ? noteDocumentSchema.parse(raw) : studyDocumentSchema.parse(raw)
        for (const block of document.blocks)
          if (
            'source' in block &&
            typeof block.source === 'object' &&
            block.source?.type === 'local' &&
            block.source.asset
          ) {
            requireFile(assetPath(block.source.asset), block.source.asset.size)
          }
      }
    } finally {
      statement.free()
    }
  }
  const photos = database.prepare(
    'SELECT entry_id,asset_id,file_name,size,mime_type,url FROM workout_progress_photos'
  )
  try {
    while (photos.step()) {
      const photo = photos.getAsObject()
      const asset = {
        id: String(photo.asset_id),
        materialId: `workout-progress-${photo.entry_id}`,
        name: String(photo.file_name),
        size: Number(photo.size),
        mimeType: String(photo.mime_type),
        url: String(photo.url)
      }
      assetPath(asset)
      requireFile(
        `workout-progress/${photo.entry_id}/${photo.asset_id}/${photo.file_name}`,
        asset.size
      )
    }
  } finally {
    photos.free()
  }
}
