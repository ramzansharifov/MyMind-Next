import type { ClientServices } from '../client/app/services'
import { addDays, localDateKey } from '@mymind/core/habits'

function text(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}
function date(value: number): string {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}
function fold(value: string): string {
  let line = ''
  let bytes = 0
  const lines: string[] = []
  const encoder = new TextEncoder()
  for (const character of value) {
    const size = encoder.encode(character).length
    if (bytes + size > 73) {
      lines.push(line)
      line = ' '
      bytes = 1
    }
    line += character
    bytes += size
  }
  lines.push(line)
  return lines.join('\r\n')
}
/** Calendar import lets the phone's calendar deliver offline alarms without a remote service. */
export function reminderCalendar(
  services: Pick<ClientServices, 'calendar' | 'habits'>,
  now = Date.now()
): Blob {
  const range = { from: localDateKey(new Date(now)), to: addDays(localDateKey(new Date(now)), 30) }
  const planned = [
    ...services.calendar.listCalendarReminderTriggers(range).map((item) => ({
      id: `calendar-${item.reminderId}-${item.occurrenceDate}`,
      title: item.title,
      at: item.triggerAt
    })),
    ...services.habits.listHabitReminderTriggers(range).map((item) => ({
      id: `habit-${item.habitId}-${item.occurrenceDate}-${item.unit}`,
      title: item.title,
      at: item.triggerAt
    }))
  ]
    .filter((item) => item.at > now)
    .sort((a, b) => a.at - b.at)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MyMind//Local Reminders//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ]
  for (const item of planned)
    lines.push(
      'BEGIN:VEVENT',
      `UID:${text(item.id)}@mymind.local`,
      `DTSTAMP:${date(now)}`,
      `DTSTART:${date(item.at)}`,
      `DTEND:${date(item.at + 60_000)}`,
      `SUMMARY:${text(item.title)}`,
      'BEGIN:VALARM',
      'TRIGGER:PT0S',
      'ACTION:DISPLAY',
      `DESCRIPTION:${text(item.title)}`,
      'END:VALARM',
      'END:VEVENT'
    )
  lines.push('END:VCALENDAR')
  return new Blob([lines.map(fold).join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' })
}
