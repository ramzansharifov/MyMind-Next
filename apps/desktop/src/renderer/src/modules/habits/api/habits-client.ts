import type {
  CreateHabitGroupInput,
  CreateHabitInput,
  DeleteHabitEntryInput,
  DeleteHabitGroupInput,
  DeleteHabitInput,
  HabitEntryRecord,
  HabitGroupRecord,
  HabitRecord,
  HabitReport,
  HabitReportInput,
  HabitsOverview,
  HabitsOverviewInput,
  UpdateHabitGroupInput,
  UpdateHabitInput,
  UpsertHabitEntryInput
} from '../../../../../shared/contracts/habits'

export const habitsClient = {
  listOverview(input: HabitsOverviewInput): Promise<HabitsOverview> {
    return window.api.habits.listOverview(input)
  },
  createGroup(input: CreateHabitGroupInput): Promise<HabitGroupRecord> {
    return window.api.habits.createGroup(input)
  },
  updateGroup(input: UpdateHabitGroupInput): Promise<HabitGroupRecord> {
    return window.api.habits.updateGroup(input)
  },
  deleteGroup(input: DeleteHabitGroupInput): Promise<boolean> {
    return window.api.habits.deleteGroup(input)
  },
  createHabit(input: CreateHabitInput): Promise<HabitRecord> {
    return window.api.habits.createHabit(input)
  },
  updateHabit(input: UpdateHabitInput): Promise<HabitRecord> {
    return window.api.habits.updateHabit(input)
  },
  deleteHabit(input: DeleteHabitInput): Promise<boolean> {
    return window.api.habits.deleteHabit(input)
  },
  upsertEntry(input: UpsertHabitEntryInput): Promise<HabitEntryRecord> {
    return window.api.habits.upsertEntry(input)
  },
  deleteEntry(input: DeleteHabitEntryInput): Promise<boolean> {
    return window.api.habits.deleteEntry(input)
  },
  getReport(input: HabitReportInput): Promise<HabitReport> {
    return window.api.habits.getReport(input)
  }
}
