import type {
  CreateDiaryEntryInput,
  CreateDiaryInput,
  DeleteDiaryEntryInput,
  DeleteDiaryInput,
  DiaryApi,
  DiaryDay,
  DiaryDaySummary,
  DiaryEntry,
  DiaryOverview,
  DiaryReport,
  DiarySummary,
  GetDiaryDayInput,
  GetDiaryReportInput,
  ListDiaryDaysInput,
  SetDiaryMoodInput,
  UpdateDiaryEntryInput,
  UpdateDiaryInput
} from '../../../../../shared/contracts/diary'

function getDiaryApi(): DiaryApi {
  if (!window.api?.diary) throw new Error('Diary API is not available')
  return window.api.diary
}

export const diaryClient = {
  listOverview(): Promise<DiaryOverview> {
    return getDiaryApi().listOverview()
  },
  createDiary(input: CreateDiaryInput): Promise<DiarySummary> {
    return getDiaryApi().createDiary(input)
  },
  updateDiary(input: UpdateDiaryInput): Promise<DiarySummary> {
    return getDiaryApi().updateDiary(input)
  },
  deleteDiary(input: DeleteDiaryInput): Promise<boolean> {
    return getDiaryApi().deleteDiary(input)
  },
  getDay(input: GetDiaryDayInput): Promise<DiaryDay | null> {
    return getDiaryApi().getDay(input)
  },
  listDays(input: ListDiaryDaysInput): Promise<DiaryDaySummary[]> {
    return getDiaryApi().listDays(input)
  },
  setMood(input: SetDiaryMoodInput): Promise<DiaryDay | null> {
    return getDiaryApi().setMood(input)
  },
  createEntry(input: CreateDiaryEntryInput): Promise<DiaryEntry> {
    return getDiaryApi().createEntry(input)
  },
  updateEntry(input: UpdateDiaryEntryInput): Promise<DiaryEntry> {
    return getDiaryApi().updateEntry(input)
  },
  deleteEntry(input: DeleteDiaryEntryInput): Promise<boolean> {
    return getDiaryApi().deleteEntry(input)
  },
  getReport(input: GetDiaryReportInput): Promise<DiaryReport> {
    return getDiaryApi().getReport(input)
  }
}
