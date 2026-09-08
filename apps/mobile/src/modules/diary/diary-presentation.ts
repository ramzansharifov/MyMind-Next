import type {
  DiaryCoverTone,
  DiaryDaySummary,
  DiaryMood,
  DiaryPaperPattern,
  DiaryPaperTone,
  DiaryReportPoint
} from '@mymind/contracts/diary'

export interface DiaryCalendarCell {
  dayKey: string
  day: number
  inMonth: boolean
  isToday: boolean
  summary: DiaryDaySummary | null
}

export interface DiaryAppearancePalette {
  paperBackground: string
  paperLine: string
  paperText: string
  paperMuted: string
  coverBackground: string
  coverText: string
}

export type DiaryReportPeriod = 'week' | 'month' | 'three-months' | 'year' | 'all' | 'custom'

const MOOD_META: Record<DiaryMood, { label: string; emoji: string }> = {
  excellent: { label: 'Отлично', emoji: '😄' },
  good: { label: 'Хорошо', emoji: '🙂' },
  neutral: { label: 'Нейтрально', emoji: '😐' },
  difficult: { label: 'Трудно', emoji: '😕' },
  bad: { label: 'Плохо', emoji: '😞' }
}

const PAPER_BACKGROUNDS: Record<DiaryPaperTone, string> = {
  natural: '#f3eddf',
  cream: '#fff4d9',
  beige: '#eadcc6',
  ivory: '#fffdf0',
  white: '#ffffff'
}

const COVER_BACKGROUNDS: Record<DiaryCoverTone, string> = {
  walnut: '#5b3b2e',
  cognac: '#9a5f32',
  burgundy: '#6e293a',
  graphite: '#34363b',
  forest: '#31533f'
}

export const diaryPaperPatternLabels: Record<DiaryPaperPattern, string> = {
  ruled: 'Линия',
  grid: 'Клетка',
  dots: 'Точки',
  plain: 'Чистый лист'
}

export const diaryPaperToneLabels: Record<DiaryPaperTone, string> = {
  natural: 'Натуральная',
  cream: 'Кремовая',
  beige: 'Бежевая',
  ivory: 'Слоновая кость',
  white: 'Белая'
}

export const diaryCoverToneLabels: Record<DiaryCoverTone, string> = {
  walnut: 'Орех',
  cognac: 'Коньячная',
  burgundy: 'Бордовая',
  graphite: 'Графит',
  forest: 'Лесная'
}

export const diaryReportPeriodLabels: Record<DiaryReportPeriod, string> = {
  week: '7 дней',
  month: '30 дней',
  'three-months': '3 месяца',
  year: 'Год',
  all: 'Всё время',
  custom: 'Свой период'
}

function dateKey(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseDayKey(dayKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey)
  if (!match) throw new Error('Дата должна быть в формате YYYY-MM-DD')
  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, monthIndex, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    throw new Error('Некорректная календарная дата')
  }
  return date
}

function parseMonthKey(monthKey: string): { year: number; monthIndex: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey)
  if (!match) throw new Error('Некорректный месяц')
  const year = Number(match[1])
  const month = Number(match[2])
  if (year < 1900 || year > 2200 || month < 1 || month > 12) throw new Error('Некорректный месяц')
  return { year, monthIndex: month - 1 }
}

function shiftDayKey(dayKey: string, days: number): string {
  const date = parseDayKey(dayKey)
  date.setUTCDate(date.getUTCDate() + days)
  return dateKey(date)
}

function subtractMonthsClamped(date: Date, months: number): Date {
  const day = date.getUTCDate()
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, 1))
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}

function subtractYearsClamped(date: Date, years: number): Date {
  const year = date.getUTCFullYear() - years
  const monthIndex = date.getUTCMonth()
  const day = date.getUTCDate()
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, monthIndex, Math.min(day, lastDay)))
}

export function diaryMonthKey(dayKey: string): string {
  parseDayKey(dayKey)
  return dayKey.slice(0, 7)
}

export function shiftDiaryMonth(monthKey: string, delta: number): string {
  const { year, monthIndex } = parseMonthKey(monthKey)
  const shifted = new Date(Date.UTC(year, monthIndex + delta, 1))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`
}

export function diaryMonthLabel(monthKey: string): string {
  const { year, monthIndex } = parseMonthKey(monthKey)
  const label = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, monthIndex, 1)))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function diaryReportRange(
  period: DiaryReportPeriod,
  customFrom: string,
  customTo: string,
  todayKey: string
): { fromDay?: string; toDay?: string } {
  if (period === 'all') return {}

  const today = parseDayKey(todayKey)
  if (period === 'custom') {
    parseDayKey(customFrom)
    parseDayKey(customTo)
    if (customFrom > customTo) throw new Error('Конечная дата должна быть не раньше начальной')
    return { fromDay: customFrom, toDay: customTo }
  }

  let start = new Date(today)
  if (period === 'week') start.setUTCDate(start.getUTCDate() - 6)
  if (period === 'month') start.setUTCDate(start.getUTCDate() - 29)
  if (period === 'three-months') start = subtractMonthsClamped(start, 3)
  if (period === 'year') start = subtractYearsClamped(start, 1)

  return { fromDay: dateKey(start), toDay: todayKey }
}

export function expandDiaryReportTimeline(
  points: DiaryReportPoint[],
  fromDay: string | null,
  toDay: string | null
): DiaryReportPoint[] {
  const firstDay = fromDay ?? points[0]?.dayKey ?? null
  const lastDay = toDay ?? points.at(-1)?.dayKey ?? null
  if (!firstDay || !lastDay) return []

  parseDayKey(firstDay)
  parseDayKey(lastDay)
  if (firstDay > lastDay) return []

  const byDay = new Map(points.map((point) => [point.dayKey, point]))
  const result: DiaryReportPoint[] = []
  let current = firstDay
  while (current <= lastDay) {
    result.push(
      byDay.get(current) ?? {
        dayKey: current,
        mood: null,
        moodScore: null,
        entryCount: 0
      }
    )
    current = shiftDayKey(current, 1)
  }
  return result
}

export function buildDiaryCalendarMonth(
  monthKey: string,
  days: DiaryDaySummary[],
  todayKey: string
): DiaryCalendarCell[] {
  const { year, monthIndex } = parseMonthKey(monthKey)
  const first = new Date(Date.UTC(year, monthIndex, 1))
  const mondayOffset = (first.getUTCDay() + 6) % 7
  const start = new Date(Date.UTC(year, monthIndex, 1 - mondayOffset))
  const summaries = new Map(days.map((day) => [day.dayKey, day]))

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(start)
    current.setUTCDate(start.getUTCDate() + index)
    const key = dateKey(current)
    return {
      dayKey: key,
      day: current.getUTCDate(),
      inMonth: current.getUTCMonth() === monthIndex,
      isToday: key === todayKey,
      summary: summaries.get(key) ?? null
    }
  })
}

export function diaryMoodMeta(mood: DiaryMood | null): { label: string; emoji: string } | null {
  return mood ? MOOD_META[mood] : null
}

export function diaryAppearancePalette(
  paperTone: DiaryPaperTone,
  coverTone: DiaryCoverTone
): DiaryAppearancePalette {
  return {
    paperBackground: PAPER_BACKGROUNDS[paperTone],
    paperLine: '#8c7f6c29',
    paperText: '#2d2923',
    paperMuted: '#756d62',
    coverBackground: COVER_BACKGROUNDS[coverTone],
    coverText: '#fffaf0'
  }
}
