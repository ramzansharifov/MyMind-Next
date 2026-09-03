import { Repeat2, Sparkles, Target } from 'lucide-react'
import { useEffect, useState } from 'react'

import type {
  CreateHabitInput,
  HabitGroupRecord,
  HabitRecord,
  HabitTrackingType,
  HabitWeekday,
  UpdateHabitInput
} from '../../../../../shared/contracts/habits'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { AppSelect } from '../../../shared/ui/AppSelect'
import { HABIT_TRACKING_OPTIONS } from '../habit-options'
import { HABIT_WEEKDAY_OPTIONS } from '../habit-schedule-options'
import { HabitPreferredTimesEditor } from './HabitPreferredTimesEditor'

const NO_GROUP_VALUE = '__none__'
const HABIT_FORM_ID = 'habit-editor-form'
const recurrencePresets = [1, 2, 3, 7, 10, 14, 30]
type RecurrenceMode = 'interval' | 'weekdays'

interface HabitDialogProps {
  open: boolean
  habit: HabitRecord | null
  groups: HabitGroupRecord[]
  initialGroupId: string | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: CreateHabitInput | UpdateHabitInput) => Promise<void>
}

function preferredTimesToRecord(habit: HabitRecord | null): Record<number, string> {
  if (!habit) return {}
  return Object.fromEntries(habit.preferredTimes.map((item) => [item.unit, item.time]))
}

export function HabitDialog({
  open,
  habit,
  groups,
  initialGroupId,
  busy,
  onOpenChange,
  onSave
}: HabitDialogProps): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [groupId, setGroupId] = useState(NO_GROUP_VALUE)
  const [trackingType, setTrackingType] = useState<HabitTrackingType>('check')
  const [targetValue, setTargetValue] = useState('1')
  const [unit, setUnit] = useState('')
  const [repeatEveryDays, setRepeatEveryDays] = useState('1')
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>('interval')
  const [weekdays, setWeekdays] = useState<HabitWeekday[]>([])
  const [preferredTimes, setPreferredTimes] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const initialGroupExists =
      initialGroupId !== null && groups.some((group) => group.id === initialGroupId)

    setTitle(habit?.title ?? '')
    setGroupId(habit?.groupId ?? (initialGroupExists ? initialGroupId : NO_GROUP_VALUE))
    setTrackingType(habit?.trackingType ?? 'check')
    setTargetValue(String(habit?.targetValue ?? 1))
    setUnit(habit?.unit ?? '')
    setRepeatEveryDays(String(habit?.repeatEveryDays ?? 1))
    setRecurrenceMode(habit && habit.weekdays.length > 0 ? 'weekdays' : 'interval')
    setWeekdays(habit?.weekdays ?? [])
    setPreferredTimes(preferredTimesToRecord(habit))
    setError(null)
  }, [groups, habit, initialGroupId, open])

  function changeTrackingType(value: string): void {
    const next = value as HabitTrackingType
    setTrackingType(next)
    if (next === 'check') {
      setTargetValue('1')
      setUnit('')
      const first = preferredTimes[1]
      setPreferredTimes(first ? { 1: first } : {})
    }
  }

  function toggleWeekday(weekday: HabitWeekday): void {
    setWeekdays((current) =>
      current.includes(weekday)
        ? current.filter((item) => item !== weekday)
        : [...current, weekday].sort((left, right) => left - right)
    )
  }

  function changePreferredTime(unitNumber: number, value: string): void {
    const next = { ...preferredTimes }
    if (value) next[unitNumber] = value
    else delete next[unitNumber]
    setPreferredTimes(next)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (busy || !title.trim()) return

    const parsedRepeat = Number(repeatEveryDays)
    const parsedTarget = trackingType === 'check' ? 1 : Number(targetValue)
    const validRepeat = Number.isInteger(parsedRepeat) && parsedRepeat >= 1 && parsedRepeat <= 3650
    if (recurrenceMode === 'interval' && !validRepeat) {
      setError('Период повторения должен быть целым числом от 1 до 3650 дней')
      return
    }
    if (recurrenceMode === 'weekdays' && weekdays.length === 0) {
      setError('Выберите хотя бы один день недели')
      return
    }
    if (!Number.isInteger(parsedTarget) || parsedTarget < 1 || parsedTarget > 1_000_000_000) {
      setError('Целевое значение должно быть положительным целым числом')
      return
    }

    const normalizedPreferredTimes = Object.entries(preferredTimes)
      .map(([unitNumber, time]) => ({ unit: Number(unitNumber), time }))
      .filter((item) => item.unit >= 1 && item.unit <= parsedTarget && item.time)
      .sort((left, right) => left.unit - right.unit)

    const input: CreateHabitInput = {
      title: title.trim(),
      groupId: groupId === NO_GROUP_VALUE ? null : groupId,
      trackingType,
      targetValue: parsedTarget,
      unit: trackingType === 'check' ? '' : unit.trim(),
      repeatEveryDays: validRepeat ? parsedRepeat : 1,
      weekdays: recurrenceMode === 'weekdays' ? weekdays : [],
      preferredTimes: normalizedPreferredTimes
    }

    setError(null)
    try {
      await onSave(habit ? { ...input, id: habit.id } : input)
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить привычку')
    }
  }

  const parsedTargetForTimes = Number(targetValue)
  const preferredTimeTarget =
    trackingType === 'check' || !Number.isInteger(parsedTargetForTimes) || parsedTargetForTimes < 1
      ? 1
      : parsedTargetForTimes

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={habit ? 'Изменить привычку' : 'Новая привычка'}
      description="Настройте привычку."
      icon={<Sparkles />}
      size="xl"
      busy={busy}
      footer={
        <>
          <button
            type="button"
            disabled={busy}
            className="h-10 rounded-xl px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-45"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </button>
          <button
            type="submit"
            form={HABIT_FORM_ID}
            disabled={busy || !title.trim()}
            className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? 'Сохраняем…' : habit ? 'Сохранить' : 'Создать привычку'}
          </button>
        </>
      }
    >
      <form id={HABIT_FORM_ID} className="space-y-5" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[var(--app-muted)]">Название</span>
            <input
              autoFocus
              value={title}
              maxLength={240}
              placeholder="Например, Читать 20 минут"
              className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] transition-[border-color,box-shadow] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-[var(--app-muted)]">Группа</span>
            <AppSelect
              ariaLabel="Группа привычки"
              value={groupId}
              options={[
                { value: NO_GROUP_VALUE, label: 'Без группы' },
                ...groups.map((group) => ({ value: group.id, label: group.name }))
              ]}
              onValueChange={setGroupId}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
            <Target className="size-4 text-violet-300" /> Как отслеживать
          </div>

          <div
            role="group"
            aria-label="Тип отслеживания привычки"
            className="inline-flex rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1"
          >
            {HABIT_TRACKING_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={trackingType === option.value}
                className={
                  trackingType === option.value
                    ? 'h-9 rounded-lg bg-violet-500 px-4 text-xs font-semibold text-white'
                    : 'h-9 rounded-lg px-4 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                }
                onClick={() => changeTrackingType(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          {trackingType === 'count' && (
            <div className="mt-3 grid gap-3 md:max-w-xl md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="block text-xs text-[var(--app-muted)]">Цель</span>
                <input
                  type="number"
                  min={1}
                  max={1_000_000_000}
                  step={1}
                  value={targetValue}
                  className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
                  onChange={(event) => setTargetValue(event.target.value)}
                />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs text-[var(--app-muted)]">Единица</span>
                <input
                  value={unit}
                  maxLength={32}
                  placeholder="страниц, мл, км…"
                  className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
                  onChange={(event) => setUnit(event.target.value)}
                />
              </label>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
            <Repeat2 className="size-4 text-violet-300" /> Повторение
          </div>

          <div className="mb-3 inline-flex rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1">
            {(
              [
                ['interval', 'По интервалу'],
                ['weekdays', 'По дням недели']
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={recurrenceMode === mode}
                className={
                  recurrenceMode === mode
                    ? 'h-8 rounded-lg bg-violet-500 px-3 text-xs font-semibold text-white'
                    : 'h-8 rounded-lg px-3 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                }
                onClick={() => setRecurrenceMode(mode)}
              >
                {label}
              </button>
            ))}
          </div>

          {recurrenceMode === 'interval' ? (
            <>
              <div className="flex flex-wrap gap-2">
                {recurrencePresets.map((days) => (
                  <button
                    key={days}
                    type="button"
                    aria-pressed={repeatEveryDays === String(days)}
                    className={
                      repeatEveryDays === String(days)
                        ? 'h-9 rounded-xl bg-violet-500 px-3 text-xs font-semibold text-white'
                        : 'h-9 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                    }
                    onClick={() => setRepeatEveryDays(String(days))}
                  >
                    {days === 1 ? 'Каждый день' : `Раз в ${days} дн.`}
                  </button>
                ))}
              </div>
              <label className="mt-3 block max-w-xs space-y-1.5">
                <span className="text-xs text-[var(--app-muted)]">Свой период, дней</span>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  step={1}
                  value={repeatEveryDays}
                  className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
                  onChange={(event) => setRepeatEveryDays(event.target.value)}
                />
              </label>
            </>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {HABIT_WEEKDAY_OPTIONS.map((weekday) => {
                const selected = weekdays.includes(weekday.value)
                return (
                  <button
                    key={weekday.value}
                    type="button"
                    aria-label={weekday.label}
                    aria-pressed={selected}
                    className={
                      selected
                        ? 'h-10 rounded-xl bg-violet-500 text-xs font-semibold text-white'
                        : 'h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                    }
                    onClick={() => toggleWeekday(weekday.value)}
                  >
                    {weekday.short}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <HabitPreferredTimesEditor
          trackingType={trackingType}
          targetValue={preferredTimeTarget}
          values={preferredTimes}
          onChange={changePreferredTime}
        />

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            {error}
          </div>
        )}
      </form>
    </AppDialog>
  )
}
