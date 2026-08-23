import { readFileSync, writeFileSync } from 'node:fs'

const path = 'src/main/repositories/habits.repository.ts'
let source = readFileSync(path, 'utf8')
const startMarker = 'const DAY_MS = 86_400_000\n'
const endMarker = 'const HABIT_GROUP_SELECT = `SELECT'
const start = source.indexOf(startMarker)
const end = source.indexOf(endMarker, start)
if (start === -1 || end === -1) throw new Error('Не найден блок helper функций привычек')

const canonical = `const DAY_MS = 86_400_000
const HABIT_TIME_PATTERN = /^([01]\\d|2[0-3]):[0-5]\\d$/

function parsePreferredTimes(value: string | null): HabitPreferredTime[] {
  if (!value) return []

  if (value.startsWith('[')) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (!Array.isArray(parsed)) return []
      return parsed
        .filter(
          (item): item is HabitPreferredTime =>
            typeof item === 'object' &&
            item !== null &&
            Number.isInteger((item as HabitPreferredTime).unit) &&
            (item as HabitPreferredTime).unit >= 1 &&
            typeof (item as HabitPreferredTime).time === 'string' &&
            HABIT_TIME_PATTERN.test((item as HabitPreferredTime).time)
        )
        .sort((left, right) => left.unit - right.unit)
    } catch {
      return []
    }
  }

  return HABIT_TIME_PATTERN.test(value) ? [{ unit: 1, time: value }] : []
}

function serializePreferredTimes(values: HabitPreferredTime[]): string | null {
  if (values.length === 0) return null
  return JSON.stringify([...values].sort((left, right) => left.unit - right.unit))
}

`

source = source.slice(0, start) + canonical + source.slice(end)
writeFileSync(path, source)
