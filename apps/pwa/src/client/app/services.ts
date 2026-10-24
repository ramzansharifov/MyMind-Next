import type { createTasksRepository } from '@mymind/persistence/tasks'
import type { createHabitsRepository } from '@mymind/persistence/habits'
import type { createMoviesRepository } from '@mymind/persistence/movies'
import type { createMusicRepository } from '@mymind/persistence/music'
import type { createCalendarRepository } from '@mymind/persistence/calendar'
import type { createDiaryRepository } from '@mymind/persistence/diary'
import type { createNotesRepository } from '@mymind/persistence/notes'
import type { createNutritionRepository } from '@mymind/persistence/nutrition'
import type { createFinanceRepository } from '@mymind/persistence/finance'
import type { createPasswordsRepository } from '@mymind/persistence/passwords'
import type { createLocalProfileRepository } from '@mymind/persistence/local-profile'
import type { DocumentAssetStore } from '../shared/platform/documentAssets'
import type { LanSyncClient } from '../../sync/types'

export interface ClientServices {
  tasks: ReturnType<typeof createTasksRepository>
  habits: ReturnType<typeof createHabitsRepository>
  movies: ReturnType<typeof createMoviesRepository>
  music: ReturnType<typeof createMusicRepository>
  calendar: ReturnType<typeof createCalendarRepository>
  diary: ReturnType<typeof createDiaryRepository>
  notes: ReturnType<typeof createNotesRepository>
  nutrition: ReturnType<typeof createNutritionRepository>
  finance: ReturnType<typeof createFinanceRepository>
  passwords: ReturnType<typeof createPasswordsRepository>
  profile: ReturnType<typeof createLocalProfileRepository>
  lanSync: LanSyncClient
  documentAssets: DocumentAssetStore
  settings: { get(key: string): string | null; set(key: string, value: string): void }
}
