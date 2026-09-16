import type {
  SyncAssetKind,
  SyncAssetReference,
  SyncDataSnapshot,
  SyncModuleSnapshot,
  SyncSnapshotRow
} from '@mymind/contracts/profile-sync'

const SAFE_SEGMENT = /^[a-zA-Z0-9_-]{1,120}$/

function safeSegment(value: unknown, label: string): string {
  if (typeof value !== 'string' || !SAFE_SEGMENT.test(value)) {
    throw new Error(`Некорректный ${label} в sync asset`)
  }
  return value
}

function safeFileName(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 255 ||
    /[\\/\0]/.test(value) ||
    value === '.' ||
    value === '..'
  ) {
    throw new Error('Некорректное имя файла в sync asset')
  }
  return value
}

export function createSyncAssetPath(
  kind: SyncAssetKind,
  ownerId: string,
  assetId: string,
  fileName: string
): string {
  const root = kind === 'note-asset' ? 'notes' : 'workouts'
  return [root, safeSegment(ownerId, 'owner id'), safeSegment(assetId, 'asset id'), safeFileName(fileName)].join('/')
}

export function parseSyncAssetPath(path: string): SyncAssetReference {
  if (path.length === 0 || path.length > 1024 || path.includes('\\') || path.startsWith('/')) {
    throw new Error('Некорректный путь sync asset')
  }
  const parts = path.split('/')
  if (parts.length !== 4) throw new Error('Некорректный путь sync asset')
  const [root, ownerId, assetId, fileName] = parts
  const kind: SyncAssetKind =
    root === 'notes' ? 'note-asset' : root === 'workouts' ? 'workout-photo' : (() => {
      throw new Error('Неподдерживаемый тип sync asset')
    })()
  const reference = {
    path,
    kind,
    ownerId: safeSegment(ownerId, 'owner id'),
    assetId: safeSegment(assetId, 'asset id'),
    fileName: safeFileName(fileName)
  } satisfies SyncAssetReference
  if (createSyncAssetPath(kind, reference.ownerId, reference.assetId, reference.fileName) !== path) {
    throw new Error('Неканонический путь sync asset')
  }
  return reference
}

function tableRows(module: SyncModuleSnapshot, table: string): SyncSnapshotRow[] {
  return module.tables.find((candidate) => candidate.table === table)?.rows ?? []
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function parseJsonRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string') return record(value)
  try {
    return record(JSON.parse(value))
  } catch {
    throw new Error('Повреждён документ заметки в sync snapshot')
  }
}

function noteReferences(module: SyncModuleSnapshot): SyncAssetReference[] {
  const references: SyncAssetReference[] = []
  for (const row of tableRows(module, 'notes')) {
    const ownerId = safeSegment(row.data.id, 'note id')
    const document = parseJsonRecord(row.data.document)
    const blocks = document?.blocks
    if (!Array.isArray(blocks)) continue

    for (const blockValue of blocks) {
      const block = record(blockValue)
      const source = record(block?.source)
      if (source?.type !== 'local') continue
      const asset = record(source.asset)
      if (!asset) continue
      const materialId = safeSegment(asset.materialId, 'asset material id')
      if (materialId !== ownerId) {
        throw new Error('Вложение заметки принадлежит другому документу')
      }
      const assetId = safeSegment(asset.id, 'asset id')
      const fileName = safeFileName(asset.name)
      references.push({
        path: createSyncAssetPath('note-asset', ownerId, assetId, fileName),
        kind: 'note-asset',
        ownerId,
        assetId,
        fileName
      })
    }
  }
  return references
}

function workoutReferences(module: SyncModuleSnapshot): SyncAssetReference[] {
  return tableRows(module, 'workout_progress_photos').map((row) => {
    const ownerId = safeSegment(row.data.entry_id, 'progress entry id')
    const assetId = safeSegment(row.data.asset_id, 'progress asset id')
    const fileName = safeFileName(row.data.file_name)
    return {
      path: createSyncAssetPath('workout-photo', ownerId, assetId, fileName),
      kind: 'workout-photo' as const,
      ownerId,
      assetId,
      fileName
    }
  })
}

export function listSyncAssetReferences(snapshot: SyncDataSnapshot): SyncAssetReference[] {
  const references: SyncAssetReference[] = []
  for (const module of snapshot.modules) {
    if (module.module === 'notes') references.push(...noteReferences(module))
    if (module.module === 'workouts') references.push(...workoutReferences(module))
  }

  const byPath = new Map<string, SyncAssetReference>()
  for (const reference of references) {
    const existing = byPath.get(reference.path)
    if (
      existing &&
      (existing.kind !== reference.kind ||
        existing.ownerId !== reference.ownerId ||
        existing.assetId !== reference.assetId ||
        existing.fileName !== reference.fileName)
    ) {
      throw new Error('Конфликт путей sync asset')
    }
    byPath.set(reference.path, reference)
  }
  return [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path, 'en'))
}


export function listRemovedSyncAssetReferences(
  before: SyncDataSnapshot,
  after: SyncDataSnapshot
): SyncAssetReference[] {
  const next = new Set(listSyncAssetReferences(after).map((reference) => reference.path))
  return listSyncAssetReferences(before).filter((reference) => !next.has(reference.path))
}
