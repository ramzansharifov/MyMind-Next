import { readFileSync, writeFileSync } from 'node:fs'

function updateFile(path, updater) {
  const source = readFileSync(path, 'utf8')
  const next = updater(source)
  if (next === source) throw new Error(`Файл ${path} не изменился`)
  writeFileSync(path, next)
}

function replaceOnce(source, label, from, to) {
  if (!source.includes(from)) {
    if (source.includes(to)) return source
    throw new Error(`Не найден фрагмент: ${label}`)
  }
  return source.replace(from, to)
}

updateFile('src/main/repositories/habits.repository.ts', (original) => {
  let source = original

  source = replaceOnce(
    source,
    'HabitPreferredTime import',
    '  HabitGroupRecord,\n  HabitRecord,',
    '  HabitGroupRecord,\n  HabitPreferredTime,\n  HabitRecord,'
  )

  source = replaceOnce(
    source,
    'preferred time helpers',
    'const DAY_MS = 86_400_000\n',
    `const DAY_MS = 86_400_000
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
  )

  source = replaceOnce(
    source,
    'map preferred times',
    '    preferredTime: row.preferred_time,',
    '    preferredTimes: parsePreferredTimes(row.preferred_time),'
  )

  const oldValue = '      input.preferredTime,'
  const newValue = '      serializePreferredTimes(input.preferredTimes),'
  const occurrences = source.split(oldValue).length - 1
  if (occurrences === 0 && source.split(newValue).length - 1 >= 2) return source
  if (occurrences !== 2) throw new Error(`Ожидалось 2 preferredTime в repository, найдено ${occurrences}`)
  source = source.split(oldValue).join(newValue)

  return source
})

updateFile('src/renderer/src/modules/habits/HabitsPage.tsx', (original) => {
  let source = original

  source = source.replace('  Check,\n', '').replace('  Clock3,\n', '').replace('  Minus,\n', '')

  source = replaceOnce(
    source,
    'HabitTodayRow import',
    "import { HabitGroupDialog } from './components/HabitGroupDialog'\n",
    "import { HabitGroupDialog } from './components/HabitGroupDialog'\nimport { HabitTodayRow } from './components/HabitTodayRow'\n"
  )

  source = replaceOnce(
    source,
    'bounded count change',
    `  async function changeCount(habit: HabitRecord, delta: number): Promise<void> {
    const entry = entryByHabitId.get(habit.id)
    const current = entry?.skipped ? 0 : (entry?.value ?? 0)
    const next = Math.max(0, current + delta)
    if (next === 0) await clearEntry(habit)
    else await setEntry(habit, next, false)
  }

  async function completeCount(habit: HabitRecord): Promise<void> {
    await setEntry(habit, habit.targetValue, false)
  }
`,
    `  async function changeCount(habit: HabitRecord, delta: number): Promise<void> {
    const entry = entryByHabitId.get(habit.id)
    const current = entry?.skipped ? 0 : (entry?.value ?? 0)
    const next = Math.min(habit.targetValue, Math.max(0, current + delta))
    if (next === 0) await clearEntry(habit)
    else await setEntry(habit, next, false)
  }

  async function advanceHabit(habit: HabitRecord): Promise<void> {
    if (habit.trackingType === 'check') {
      await toggleChecked(habit)
      return
    }

    const entry = entryByHabitId.get(habit.id)
    const current = entry?.skipped ? 0 : (entry?.value ?? 0)
    if (current >= habit.targetValue) return
    await setEntry(habit, current + 1, false)
  }
`
  )

  const listStartMarker = '                  {visibleScheduledHabits.map((habit) => {'
  const listEndMarker = '                  })}\n                </div>'
  const listStart = source.indexOf(listStartMarker)
  if (listStart === -1) {
    if (source.includes('<HabitTodayRow')) return source
    throw new Error('Не найден старый список привычек сегодня')
  }
  const listEnd = source.indexOf(listEndMarker, listStart)
  if (listEnd === -1) throw new Error('Не найден конец старого списка привычек сегодня')

  const replacement = `                  {visibleScheduledHabits.map((habit) => (
                    <HabitTodayRow
                      key={habit.id}
                      habit={habit}
                      group={habit.groupId ? (groupById.get(habit.groupId) ?? null) : null}
                      entry={entryByHabitId.get(habit.id)}
                      busy={isSaving}
                      onAdvance={() => advanceHabit(habit)}
                      onChangeCount={(delta) => changeCount(habit, delta)}
                      onToggleSkipped={() => toggleSkipped(habit)}
                      onEdit={() => {
                        setEditingHabit(habit)
                        setHabitDialogOpen(true)
                      }}
                    />
                  ))}`

  source = source.slice(0, listStart) + replacement + source.slice(listEnd + '                  })}'.length)
  return source
})
