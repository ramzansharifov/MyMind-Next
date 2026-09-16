import { describe, expect, it } from 'vitest'
import type { SyncDataSnapshot } from '@mymind/contracts/profile-sync'
import { createSyncAssetPath, listSyncAssetReferences, parseSyncAssetPath } from './sync-assets'

function snapshot(): SyncDataSnapshot {
  return {
    version: 1,
    generatedAt: 1,
    modules: [
      {
        module: 'notes',
        tables: [
          {
            table: 'note_groups',
            rows: [],
            tombstones: []
          },
          {
            table: 'notes',
            rows: [
              {
                key: '["note-1"]',
                version: 10,
                data: {
                  id: 'note-1',
                  group_id: null,
                  title: 'Заметка',
                  document: JSON.stringify({
                    version: 1,
                    blocks: [
                      {
                        id: 'image-block',
                        type: 'image',
                        source: {
                          type: 'local',
                          asset: {
                            id: 'asset-1',
                            materialId: 'note-1',
                            name: 'photo.jpg',
                            mimeType: 'image/jpeg',
                            size: 10,
                            url: 'mymind-asset://local/note-1/asset-1/photo.jpg'
                          }
                        }
                      }
                    ]
                  }),
                  plain_text: '',
                  created_at: 1,
                  updated_at: 10
                }
              }
            ],
            tombstones: []
          }
        ]
      },
      {
        module: 'workouts',
        tables: [
          {
            table: 'workout_progress_photos',
            rows: [
              {
                key: '["photo-1"]',
                version: 20,
                data: {
                  id: 'photo-1',
                  entry_id: 'entry-1',
                  asset_id: 'asset-2',
                  file_name: 'progress-photo.jpg',
                  mime_type: 'image/jpeg',
                  size: 20,
                  url: 'file:///local.jpg',
                  view: 'front',
                  created_at: 20
                }
              }
            ],
            tombstones: []
          }
        ]
      }
    ]
  }
}

describe('sync asset references', () => {
  it('extracts note attachments and workout photos with canonical logical paths', () => {
    expect(listSyncAssetReferences(snapshot())).toEqual([
      {
        path: 'notes/note-1/asset-1/photo.jpg',
        kind: 'note-asset',
        ownerId: 'note-1',
        assetId: 'asset-1',
        fileName: 'photo.jpg'
      },
      {
        path: 'workouts/entry-1/asset-2/progress-photo.jpg',
        kind: 'workout-photo',
        ownerId: 'entry-1',
        assetId: 'asset-2',
        fileName: 'progress-photo.jpg'
      }
    ])
  })

  it('round-trips canonical paths and rejects traversal', () => {
    const path = createSyncAssetPath('note-asset', 'note-1', 'asset-1', 'photo.jpg')
    expect(parseSyncAssetPath(path)).toMatchObject({
      kind: 'note-asset',
      ownerId: 'note-1',
      assetId: 'asset-1',
      fileName: 'photo.jpg'
    })
    expect(() => parseSyncAssetPath('notes/../asset/file.jpg')).toThrow()
    expect(() => parseSyncAssetPath('notes/note/asset/a/b.jpg')).toThrow()
  })
})
