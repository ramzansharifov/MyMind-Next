import { createTasksRepository } from '@mymind/persistence/tasks'
import { createHabitsRepository } from '@mymind/persistence/habits'
import { createMoviesRepository } from '@mymind/persistence/movies'
import { createMusicRepository } from '@mymind/persistence/music'
import { createCalendarRepository } from '@mymind/persistence/calendar'
import { createDiaryRepository } from '@mymind/persistence/diary'
import { createNotesRepository } from '@mymind/persistence/notes'
import { createNutritionRepository } from '@mymind/persistence/nutrition'
import { createFinanceRepository } from '@mymind/persistence/finance'
import { createPasswordsRepository } from '@mymind/persistence/passwords'
import { createPwaProfileRepository } from '../sync/profile'
import { createPwaLanSyncClient } from '../sync/client'
import type { ClientServices } from '../client/app/services'
import { passwordCrypto } from '../client/modules/passwords/passwordCrypto'
import { createPwaAssetStore } from './assets'
import type { PwaDatabase } from './database'
import { createDesktopRepositories } from '../desktop/repositories'
import { bindDesktopRuntime } from '../desktop/runtime'
import { createDesktopBridge } from '../desktop/bridge'

export interface PwaServices extends ClientServices {
  dispose(): void
}
export async function createPwaServices(db: PwaDatabase): Promise<PwaServices> {
  const runtime = { database: () => db, createId: () => crypto.randomUUID(), now: Date.now }
  const documentAssets = await createPwaAssetStore(db.disk)
  const settings = {
    get: (key: string): string | null =>
      (
        db.prepare('SELECT value FROM mobile_preferences WHERE key = ?').get(key) as
          { value: string } | undefined
      )?.value ?? null,
    set: (key: string, value: string): void => {
      db.prepare(
        'INSERT INTO mobile_preferences(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
      ).run(key, value)
    }
  }
  const profile = createPwaProfileRepository(db)
  const lanSync = createPwaLanSyncClient(db, profile)
  const notes = createNotesRepository(runtime, {
    validateDocumentAssets: documentAssets.validateDocumentAssets,
    afterDocumentSaved: async (id, document) => {
      desktop.boards.cleanupNoteDocument(id, document)
      await db.flush()
      await documentAssets.cleanupDocumentAssets(id, document)
    },
    afterNoteDeleted: async (id) => {
      await db.flush()
      await documentAssets.removeAssetsForOwners([id])
    }
  })
  const desktop = await createDesktopRepositories(db, documentAssets, notes)
  bindDesktopRuntime(db, desktop)
  if (typeof window !== 'undefined') window.api = createDesktopBridge()
  return {
    dispose() {
      documentAssets.dispose()
      desktop.dispose()
    },
    tasks: createTasksRepository(runtime),
    habits: createHabitsRepository(runtime),
    movies: createMoviesRepository(runtime),
    music: createMusicRepository(runtime),
    calendar: createCalendarRepository(runtime),
    diary: createDiaryRepository(runtime),
    nutrition: createNutritionRepository(runtime),
    finance: createFinanceRepository(runtime),
    passwords: createPasswordsRepository(runtime, passwordCrypto),
    notes,
    documentAssets,
    profile,
    settings,
    lanSync: {
      ...lanSync,
      async sync(device, modules) {
        const result = await lanSync.sync(device, modules)
        await documentAssets.reload()
        await desktop.reloadAssets()
        return result
      }
    }
  }
}
