import type { DiaryMood } from '../../../../../shared/contracts/diary'

export const diaryMoodMeta: Record<
  DiaryMood,
  { label: string; emoji: string; tone: string; score: number }
> = {
  excellent: { label: 'Отличное', emoji: '😄', tone: 'text-emerald-300', score: 5 },
  good: { label: 'Хорошее', emoji: '🙂', tone: 'text-lime-300', score: 4 },
  neutral: { label: 'Нормальное', emoji: '😐', tone: 'text-amber-200', score: 3 },
  difficult: { label: 'Тяжёлое', emoji: '😕', tone: 'text-orange-300', score: 2 },
  bad: { label: 'Плохое', emoji: '😞', tone: 'text-red-300', score: 1 }
}

export function localDayKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDayKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDiaryDate(dayKey: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(
    'ru-RU',
    options ?? { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' }
  ).format(parseDayKey(dayKey))
}

export function formatDiaryTime(timestamp: number): string {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(timestamp)
  )
}

export function formatShortDate(timestamp: number): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date(timestamp))
}

export function shiftDayKey(dayKey: string, days: number): string {
  const date = parseDayKey(dayKey)
  date.setDate(date.getDate() + days)
  return localDayKey(date)
}

export function monthRange(date: Date): { fromDay: string; toDay: string } {
  return {
    fromDay: localDayKey(new Date(date.getFullYear(), date.getMonth(), 1)),
    toDay: localDayKey(new Date(date.getFullYear(), date.getMonth() + 1, 0))
  }
}

export function reportRange(
  period: 'week' | 'month' | 'three-months' | 'year' | 'all',
  now = new Date()
): { fromDay?: string; toDay?: string } {
  if (period === 'all') return {}
  const end = localDayKey(now)
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === 'week') start.setDate(start.getDate() - 6)
  if (period === 'month') start.setDate(start.getDate() - 29)
  if (period === 'three-months') start.setMonth(start.getMonth() - 3)
  if (period === 'year') start.setFullYear(start.getFullYear() - 1)
  return { fromDay: localDayKey(start), toDay: end }
}

export function getDiaryErrorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Не удалось выполнить действие'
}
