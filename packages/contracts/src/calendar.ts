export type CalendarEventKind = 'one_time' | 'annual'

export interface CalendarElapsedDuration {
  years: number
  months: number
  days: number
}

export interface CalendarEventRecord {
  id: string
  title: string
  kind: CalendarEventKind
  date: string
  time: string | null
  startDate: string | null
  reminderOffsets: number[]
  createdAt: number
  updatedAt: number
}

export interface CalendarOccurrenceRecord {
  eventId: string
  title: string
  kind: CalendarEventKind
  occurrenceDate: string
  time: string | null
  startDate: string | null
  note: string
  hidden: boolean
  reminderOffsets: number[]
  elapsed: CalendarElapsedDuration | null
}

export interface CalendarReminderRecord {
  reminderId: string
  eventId: string
  title: string
  occurrenceDate: string
  eventTime: string | null
  offsetMinutes: number
  triggerAt: number
}

export interface CalendarUnreadReminderRecord extends CalendarReminderRecord {
  deliveryId: string
  deliveredAt: number
}

export interface CalendarAcknowledgeReminderInput {
  deliveryId: string
}

export interface CalendarRangeInput {
  from: string
  to: string
}

export interface CalendarCreateEventInput {
  title: string
  kind: CalendarEventKind
  date: string
  time?: string | null
  startDate?: string | null
  note?: string
  reminderOffsets?: number[]
}

export interface CalendarUpdateEventInput extends CalendarCreateEventInput {
  id: string
  occurrenceDate: string
}

export interface CalendarOccurrenceInput {
  eventId: string
  occurrenceDate: string
}

export interface CalendarSetOccurrenceNoteInput extends CalendarOccurrenceInput {
  note: string
}

export interface CalendarSetOccurrenceHiddenInput extends CalendarOccurrenceInput {
  hidden: boolean
}

export interface CalendarDeleteEventInput {
  id: string
}

export const CALENDAR_IPC_CHANNELS = {
  listRange: 'calendar:list-range',
  listUpcomingReminders: 'calendar:list-upcoming-reminders',
  listUnreadReminders: 'calendar:list-unread-reminders',
  acknowledgeReminder: 'calendar:acknowledge-reminder',
  remindersChanged: 'calendar:reminders-changed',
  createEvent: 'calendar:create-event',
  updateEvent: 'calendar:update-event',
  deleteEvent: 'calendar:delete-event',
  setOccurrenceNote: 'calendar:set-occurrence-note',
  setOccurrenceHidden: 'calendar:set-occurrence-hidden'
} as const

export interface CalendarApi {
  listRange(input: CalendarRangeInput): Promise<CalendarOccurrenceRecord[]>
  listUpcomingReminders(input: CalendarRangeInput): Promise<CalendarReminderRecord[]>
  listUnreadReminders(): Promise<CalendarUnreadReminderRecord[]>
  acknowledgeReminder(input: CalendarAcknowledgeReminderInput): Promise<boolean>
  onRemindersChanged(listener: () => void): () => void
  createEvent(input: CalendarCreateEventInput): Promise<CalendarEventRecord>
  updateEvent(input: CalendarUpdateEventInput): Promise<CalendarEventRecord>
  deleteEvent(input: CalendarDeleteEventInput): Promise<boolean>
  setOccurrenceNote(input: CalendarSetOccurrenceNoteInput): Promise<CalendarOccurrenceRecord | null>
  setOccurrenceHidden(
    input: CalendarSetOccurrenceHiddenInput
  ): Promise<CalendarOccurrenceRecord | null>
}
