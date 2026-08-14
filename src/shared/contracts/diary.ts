export const DIARY_ICON_NAMES = [
  'book-heart',
  'book-open',
  'notebook-pen',
  'feather',
  'heart',
  'briefcase',
  'lightbulb',
  'sparkles',
  'leaf',
  'coffee'
] as const

export const DIARY_MOODS = ['excellent', 'good', 'neutral', 'difficult', 'bad'] as const
export const DIARY_PAPER_PATTERNS = ['ruled', 'grid', 'dots', 'plain'] as const
export const DIARY_PAPER_TONES = ['natural', 'cream', 'beige', 'ivory', 'white'] as const

export type DiaryIconName = (typeof DIARY_ICON_NAMES)[number]
export type DiaryMood = (typeof DIARY_MOODS)[number]
export type DiaryPaperPattern = (typeof DIARY_PAPER_PATTERNS)[number]
export type DiaryPaperTone = (typeof DIARY_PAPER_TONES)[number]

export const DIARY_MOOD_SCORES: Record<DiaryMood, number> = {
  excellent: 5,
  good: 4,
  neutral: 3,
  difficult: 2,
  bad: 1
}

export interface DiarySummary {
  id: string
  title: string
  icon: DiaryIconName
  paperPattern: DiaryPaperPattern
  paperTone: DiaryPaperTone
  pageCount: number
  entryCount: number
  lastActivityAt: number
  createdAt: number
  updatedAt: number
}

export interface DiaryEntry {
  id: string
  diaryDayId: string
  text: string
  occurredAt: number
  createdAt: number
  updatedAt: number
}

export interface DiaryDaySummary {
  id: string
  diaryId: string
  dayKey: string
  mood: DiaryMood | null
  entryCount: number
  createdAt: number
  updatedAt: number
}

export interface DiaryDay extends DiaryDaySummary {
  entries: DiaryEntry[]
}

export interface DiaryOverview {
  diaries: DiarySummary[]
}

export interface DiaryMoodBreakdownItem {
  mood: DiaryMood
  count: number
  sharePercent: number
}

export interface DiaryReportPoint {
  dayKey: string
  mood: DiaryMood | null
  moodScore: number | null
  entryCount: number
}

export interface DiaryReport {
  diaryId: string
  fromDay: string | null
  toDay: string | null
  pageCount: number
  activeDays: number
  entryCount: number
  moodDays: number
  averageEntriesPerActiveDay: number
  averageMoodScore: number | null
  moodBreakdown: DiaryMoodBreakdownItem[]
  timeline: DiaryReportPoint[]
}

export interface CreateDiaryInput {
  title: string
  icon: DiaryIconName
}

export interface UpdateDiaryInput extends CreateDiaryInput {
  id: string
}

export interface UpdateDiaryAppearanceInput {
  id: string
  paperPattern: DiaryPaperPattern
  paperTone: DiaryPaperTone
}

export interface DeleteDiaryInput {
  id: string
}

export interface GetDiaryDayInput {
  diaryId: string
  dayKey: string
}

export interface ListDiaryDaysInput {
  diaryId: string
  fromDay?: string
  toDay?: string
}

export interface SetDiaryMoodInput extends GetDiaryDayInput {
  mood: DiaryMood | null
}

export interface CreateDiaryEntryInput extends GetDiaryDayInput {
  text: string
}

export interface UpdateDiaryEntryInput {
  id: string
  text: string
}

export interface DeleteDiaryEntryInput {
  id: string
}

export type GetDiaryReportInput = ListDiaryDaysInput

export const DIARY_IPC_CHANNELS = {
  listOverview: 'diary:list-overview',
  createDiary: 'diary:create-diary',
  updateDiary: 'diary:update-diary',
  updateAppearance: 'diary:update-appearance',
  deleteDiary: 'diary:delete-diary',
  getDay: 'diary:get-day',
  listDays: 'diary:list-days',
  setMood: 'diary:set-mood',
  createEntry: 'diary:create-entry',
  updateEntry: 'diary:update-entry',
  deleteEntry: 'diary:delete-entry',
  getReport: 'diary:get-report'
} as const

export interface DiaryApi {
  listOverview(): Promise<DiaryOverview>
  createDiary(input: CreateDiaryInput): Promise<DiarySummary>
  updateDiary(input: UpdateDiaryInput): Promise<DiarySummary>
  updateAppearance(input: UpdateDiaryAppearanceInput): Promise<DiarySummary>
  deleteDiary(input: DeleteDiaryInput): Promise<boolean>
  getDay(input: GetDiaryDayInput): Promise<DiaryDay | null>
  listDays(input: ListDiaryDaysInput): Promise<DiaryDaySummary[]>
  setMood(input: SetDiaryMoodInput): Promise<DiaryDay | null>
  createEntry(input: CreateDiaryEntryInput): Promise<DiaryEntry>
  updateEntry(input: UpdateDiaryEntryInput): Promise<DiaryEntry>
  deleteEntry(input: DeleteDiaryEntryInput): Promise<boolean>
  getReport(input: GetDiaryReportInput): Promise<DiaryReport>
}
