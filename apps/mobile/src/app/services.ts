import { randomUUID } from 'expo-crypto'
import type { SQLiteDatabase } from 'expo-sqlite'
import type { StudyDocument } from '@mymind/contracts/study'
import { createTasksRepository } from '@mymind/persistence/tasks'
import { createHabitsRepository } from '@mymind/persistence/habits'
import { createMoviesRepository } from '@mymind/persistence/movies'
import { createMusicRepository } from '@mymind/persistence/music'
import { createCalendarRepository } from '@mymind/persistence/calendar'
import { createDiaryRepository } from '@mymind/persistence/diary'
import { createNotesRepository } from '@mymind/persistence/notes'
import { createStudyRepository } from '@mymind/persistence/study'
import { createBoardsRepository } from '@mymind/persistence/boards'
import { createWorkoutsRepository } from '@mymind/persistence/workouts'
import { createNutritionRepository } from '@mymind/persistence/nutrition'
import { createFinanceRepository } from '@mymind/persistence/finance'
import { createPasswordsRepository } from '@mymind/persistence/passwords'
import {
  createWorkoutProgressAssetHooks,
  reconcileWorkoutProgressAssets
} from '../modules/workouts/workoutProgressAssets'
import { mobilePasswordCrypto } from '../modules/passwords/passwordCrypto'
import { createMobileDocumentAssetStore } from '../shared/platform/documentAssets'
import { adaptSqlite } from '../shared/storage/sqlite'

export interface MobileServices {
  tasks: ReturnType<typeof createTasksRepository>
  habits: ReturnType<typeof createHabitsRepository>
  movies: ReturnType<typeof createMoviesRepository>
  music: ReturnType<typeof createMusicRepository>
  calendar: ReturnType<typeof createCalendarRepository>
  diary: ReturnType<typeof createDiaryRepository>
  notes: ReturnType<typeof createNotesRepository>
  study: ReturnType<typeof createStudyRepository>
  boards: ReturnType<typeof createBoardsRepository>
  workouts: ReturnType<typeof createWorkoutsRepository>
  nutrition: ReturnType<typeof createNutritionRepository>
  finance: ReturnType<typeof createFinanceRepository>
  passwords: ReturnType<typeof createPasswordsRepository>
  documentAssets: ReturnType<typeof createMobileDocumentAssetStore>
  settings: { get(key: string): string | null; set(key: string, value: string): void }
}

export function createMobileServices(db: SQLiteDatabase): MobileServices {
  const database = adaptSqlite(db)
  const runtime = { database: () => database, createId: randomUUID, now: Date.now }
  const documentAssets = createMobileDocumentAssetStore()
  let boards: ReturnType<typeof createBoardsRepository> | null = null
  const boardSourceDeletion = new Set<string>()
  const notes = createNotesRepository(runtime, {
    validateDocumentAssets: documentAssets.validateDocumentAssets,
    afterDocumentSaved: async (noteId, document) => {
      if (!boardSourceDeletion.has(`note:${noteId}`)) boards?.cleanupNoteDocument(noteId, document)
      await documentAssets.cleanupDocumentAssets(noteId, document).catch((reason: unknown) => {
        console.error('Failed to clean up unreferenced note assets', reason)
      })
    },
    afterNoteDeleted: async (noteId) => {
      await documentAssets.removeAssetsForOwners([noteId]).catch((reason: unknown) => {
        console.error('Failed to remove note assets after deletion', reason)
      })
    }
  })
  const study = createStudyRepository(runtime, {
    validateDocumentAssets: documentAssets.validateDocumentAssets,
    duplicateDocumentAssets: documentAssets.duplicateDocumentAssets,
    afterDocumentSaved: async (materialId, document) => {
      if (!boardSourceDeletion.has(`study:${materialId}`))
        boards?.cleanupStudyDocument(materialId, document)
      await documentAssets.cleanupDocumentAssets(materialId, document).catch((reason: unknown) => {
        console.error('Failed to clean up unreferenced study assets', reason)
      })
    },
    afterMaterialsDeleted: (materialIds) => documentAssets.removeAssetsForOwners(materialIds),
    onCleanupError: (reason) => console.error('Failed to remove deleted study assets', reason)
  })
  boards = createBoardsRepository(runtime, {
    removeStudyBoardBlock: async (materialId, blockId) => {
      const key = `study:${materialId}`
      boardSourceDeletion.add(key)
      try {
        const material = study.getMaterial(materialId)
        await study.saveMaterial({
          nodeId: materialId,
          document: {
            ...material.document,
            blocks: material.document.blocks.filter((block) => block.id !== blockId)
          }
        })
      } finally {
        boardSourceDeletion.delete(key)
      }
    },
    removeNoteBoardBlock: async (noteId, blockId) => {
      const key = `note:${noteId}`
      boardSourceDeletion.add(key)
      try {
        const note = notes.getNote(noteId)
        await notes.saveNote({
          id: noteId,
          document: {
            ...note.document,
            blocks: note.document.blocks.filter((block) => block.id !== blockId)
          }
        })
      } finally {
        boardSourceDeletion.delete(key)
      }
    }
  })
  const workouts = createWorkoutsRepository(runtime, createWorkoutProgressAssetHooks())
  try {
    const photos = workouts.listOverview().progressEntries.flatMap((entry) => entry.photos)
    for (const id of reconcileWorkoutProgressAssets(photos)) {
      void workouts.deleteProgressPhoto({ id }).catch(() => undefined)
    }
  } catch (reason) {
    console.error('Failed to reconcile workout progress photos', reason)
  }

  try {
    const documents = new Map<string, StudyDocument>()
    for (const node of study.listNodes()) {
      if (node.type === 'material') documents.set(node.id, study.getMaterial(node.id).document)
    }
    for (const note of notes.listNotesOverview().notes) documents.set(note.id, notes.getNote(note.id).document)
    void documentAssets.reconcileDocuments(documents).catch((reason: unknown) => {
      console.error('Failed to reconcile mobile document assets', reason)
    })
  } catch (reason) {
    console.error('Failed to prepare mobile document asset reconciliation', reason)
  }

  return {
    tasks: createTasksRepository(runtime),
    habits: createHabitsRepository(runtime),
    movies: createMoviesRepository(runtime),
    music: createMusicRepository(runtime),
    calendar: createCalendarRepository(runtime),
    diary: createDiaryRepository(runtime),
    notes,
    study,
    boards,
    workouts,
    nutrition: createNutritionRepository(runtime),
    finance: createFinanceRepository(runtime),
    passwords: createPasswordsRepository(runtime, mobilePasswordCrypto),
    documentAssets,
    settings: {
      get: (key: string) =>
        db.getFirstSync<{ value: string }>(
          'SELECT value FROM mobile_preferences WHERE key = ?',
          key
        )?.value ?? null,
      set: (key: string, value: string) => {
        db.runSync(
          'INSERT INTO mobile_preferences(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
          key,
          value
        )
      }
    }
  }
}
