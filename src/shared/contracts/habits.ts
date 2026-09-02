export const HABIT_TRACKING_TYPES = ['check', 'count'] as const
export const HABIT_GROUP_ICONS = [
  'folder',
  'sparkles',
  'dumbbell',
  'book-open',
  'heart-pulse',
  'brain',
  'droplet',
  'moon',
  'sun',
  'leaf',
  'music',
  'briefcase',
  'home',
  'wallet',
  'code',
  'user'
] as const
export const HABIT_GROUP_COLORS = [
  'violet',
  'blue',
  'cyan',
  'emerald',
  'amber',
  'orange',
  'rose',
  'pink'
] as const

export type HabitTrackingType = (typeof HABIT_TRACKING_TYPES)[number]
export type HabitGroupIcon = (typeof HABIT_GROUP_ICONS)[number]
export type HabitGroupColor = (typeof HABIT_GROUP_COLORS)[number]

export interface HabitPreferredTime {
  unit: number
  time: string
}

export interface HabitGroupRecord {
  id: string
  name: string
  icon: HabitGroupIcon
  color: HabitGroupColor
  position: number
  createdAt: number
  updatedAt: number
}

export interface HabitRecord {
  id: string
  title: string
  groupId: string | null
  trackingType: HabitTrackingType
  targetValue: number
  unit: string
  repeatEveryDays: number
  preferredTimes: HabitPreferredTime[]
  remindersEnabled: boolean
  createdAt: number
  updatedAt: number
}

export interface HabitEntryRecord {
  id: string
  habitId: string
  date: string
  value: number
  skipped: boolean
  createdAt: number
  updatedAt: number
}

export interface HabitsOverviewInput {
  date: string
}

export interface HabitsOverview {
  groups: HabitGroupRecord[]
  habits: HabitRecord[]
  entries: HabitEntryRecord[]
}

export interface CreateHabitGroupInput {
  name: string
  icon: HabitGroupIcon
  color: HabitGroupColor
}

export interface UpdateHabitGroupInput extends CreateHabitGroupInput {
  id: string
}

export interface DeleteHabitGroupInput {
  id: string
}

export interface CreateHabitInput {
  title: string
  groupId: string | null
  trackingType: HabitTrackingType
  targetValue: number
  unit: string
  repeatEveryDays: number
  preferredTimes: HabitPreferredTime[]
  /** @deprecated Напоминания включаются автоматически при наличии preferredTimes. */
  remindersEnabled?: boolean
}

export interface UpdateHabitInput extends CreateHabitInput {
  id: string
}

export interface DeleteHabitInput {
  id: string
}

export interface UpsertHabitEntryInput {
  habitId: string
  date: string
  value: number
  skipped: boolean
}

export interface DeleteHabitEntryInput {
  habitId: string
  date: string
}

export interface HabitReportInput {
  dateFrom: string
  dateTo: string
  groupId: string | null
  ungroupedOnly: boolean
}

export interface HabitReportSummary {
  scheduled: number
  completed: number
  missed: number
  skipped: number
  pending: number
  completionRate: number
}

export interface HabitReportDay extends HabitReportSummary {
  date: string
}

export interface HabitReportHabit extends HabitReportSummary {
  habitId: string
  title: string
  groupId: string | null
  trackingType: HabitTrackingType
  targetValue: number
  unit: string
  repeatEveryDays: number
  currentStreak: number
  bestStreak: number
  totalValue: number
}

export interface HabitReport {
  dateFrom: string
  dateTo: string
  summary: HabitReportSummary
  days: HabitReportDay[]
  habits: HabitReportHabit[]
}

export const HABITS_IPC_CHANNELS = {
  listOverview: 'habits:list-overview',
  createGroup: 'habits:create-group',
  updateGroup: 'habits:update-group',
  deleteGroup: 'habits:delete-group',
  createHabit: 'habits:create-habit',
  updateHabit: 'habits:update-habit',
  deleteHabit: 'habits:delete-habit',
  upsertEntry: 'habits:upsert-entry',
  deleteEntry: 'habits:delete-entry',
  getReport: 'habits:get-report'
} as const

export interface HabitsApi {
  listOverview(input: HabitsOverviewInput): Promise<HabitsOverview>
  createGroup(input: CreateHabitGroupInput): Promise<HabitGroupRecord>
  updateGroup(input: UpdateHabitGroupInput): Promise<HabitGroupRecord>
  deleteGroup(input: DeleteHabitGroupInput): Promise<boolean>
  createHabit(input: CreateHabitInput): Promise<HabitRecord>
  updateHabit(input: UpdateHabitInput): Promise<HabitRecord>
  deleteHabit(input: DeleteHabitInput): Promise<boolean>
  upsertEntry(input: UpsertHabitEntryInput): Promise<HabitEntryRecord>
  deleteEntry(input: DeleteHabitEntryInput): Promise<boolean>
  getReport(input: HabitReportInput): Promise<HabitReport>
}
