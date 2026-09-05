import { createDiaryRepository } from '@mymind/persistence/diary'
import { desktopRepositoryRuntime } from '../database/repository-runtime'

export const {
  listDiaryOverview,
  createDiary,
  updateDiary,
  updateDiaryAppearance,
  deleteDiary,
  getDiaryDay,
  listDiaryDays,
  setDiaryMood,
  createDiaryEntry,
  updateDiaryEntry,
  deleteDiaryEntry,
  getDiaryReport
} = createDiaryRepository(desktopRepositoryRuntime)
