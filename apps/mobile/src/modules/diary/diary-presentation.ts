import type {
  DiaryCoverTone,
  DiaryDaySummary,
  DiaryMood,
  DiaryPaperPattern,
  DiaryPaperTone
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

function dateKey(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseMonthKey(monthKey: string): { year: number; monthIndex: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey)
  if (!match) throw new Error('Некорректный месяц')
  const year = Number(match[1])
  const month = Number(match[2])
  if (year < 1900 || year > 2200 || month < 1 || month > 12) throw new Error('Некорректный месяц')
  return { year, monthIndex: month - 1 }
}

export function diaryMonthKey(dayKey: string): string {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(dayKey)
  if (!match) throw new Error('Некорректная дата')
  return `${match[1]}-${match[2]}`
}

export function shiftDiaryMonth(monthKey: string, delta: number): string {
  const { year, monthIndex } = parseMonthKey(monthKey)
  const shifted = new Date(Date.UTC(year, monthIndex + delta, 1))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`
}

export function diaryMonthLabel(monthKey: string): string {
  const { year, monthIndex } = parseMonthKey(monthKey)
  const label = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, monthIndex, 1))
  )
  return label.charAt(0).toUpperCase() + label.slice(1)
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
