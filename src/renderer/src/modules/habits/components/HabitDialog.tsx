import { Clock3, Repeat2, Sparkles, Target } from 'lucide-react'
import { useEffect, useState } from 'react'

import type {
  CreateHabitInput,
  HabitGroupRecord,
  HabitRecord,
  HabitTrackingType,
  UpdateHabitInput
} from '../../../../../shared/contracts/habits'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { AppSelect } from '../../../shared/ui/AppSelect'
import { HABIT_TRACKING_OPTIONS } from '../habit-options'

const NO_GROUP_VALUE = '__none__'
const HABIT_FORM_ID = 'habit-editor-form'
const recurrencePresets = [1, 2, 3, 7, 10, 14, 30]

interface HabitDialogProps {
  open: boolean
  habit: HabitRecord | null
  groups: HabitGroupRecord[]
  initialGroupId: string | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: CreateHabitInput | UpdateHabitInput) => Promise<void>
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
  const [preferredTime, setPreferredTime] = useState('')
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
    setPreferredTime(habit?.preferredTime ?? '')
    setError(null)
  }, [groups, habit, initialGroupId, open])

  function changeTrackingType(value: string): void {
    const next = value as HabitTrackingType
    setTrackingType(next)
    if (next === 'check') {
      setTargetValue('1')
      setUnit('')
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (busy || !title.trim()) return

    const parsedRepeat = Number(repeatEveryDays)
    const parsedTarget = trackingType === 'check' ? 1 : Number(targetValue)
    if (!Number.isInteger(parsedRepeat) || parsedRepeat < 1 || parsedRepeat > 3650) {
      setError('Период повторения должен быть целым числом от 1 до 3650 дней')
      return
    }
    if (!Number.isInteger(parsedTarget) || parsedTarget < 1 || parsedTarget > 1_000_000_000) {
      setError('Целевое значение должно быть положительным целым числом')
      return
    }

    const input: CreateHabitInput = {
      title: title.trim(),
      groupId: groupId === NO_GROUP_VALUE ? null : groupId,
      trackingType,
      targetValue: parsedTarget,
      unit: trackingType === 'check' ? '' : unit.trim(),
      repeatEveryDays: parsedRepeat,
      preferredTime: preferredTime || null
    }

    setError(null)
    try {
      await onSave(habit ? { ...input, id: habit.id } : input)
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить привычку')
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={habit ? 'Изменить привычку' : 'Новая привычка'}
      description="Настройте способ отслеживания и период повторения привычки."
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
              className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <span className="block text-xs text-[var(--app-muted)]">Тип</span>
              <AppSelect
                ariaLabel="Тип отслеживания привычки"
                value={trackingType}
                options={HABIT_TRACKING_OPTIONS}
                onValueChange={changeTrackingType}
              />
            </div>

            {trackingType === 'count' ? (
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
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
            ) : (
              <div className="flex items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 text-sm leading-5 text-[var(--app-muted)]">
                Один клик отмечает привычку выполненной на запланированный день.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
            <Repeat2 className="size-4 text-violet-300" /> Повторение
          </div>
          <p className="mb-3 text-xs leading-5 text-[var(--app-muted)]">
            Период отсчитывается от дня создания привычки. Например, 10 означает один запланированный день каждые 10 дней.
          </p>
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
        </div>

        <label className="block max-w-xs space-y-1.5">
          <span className="flex items-center gap-1 text-xs font-medium text-[var(--app-muted)]">
            <Clock3 className="size-3" /> Предпочтительное время
          </span>
          <input
            type="time"
            value={preferredTime}
            className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
            onChange={(event) => setPreferredTime(event.target.value)}
          />
        </label>

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
