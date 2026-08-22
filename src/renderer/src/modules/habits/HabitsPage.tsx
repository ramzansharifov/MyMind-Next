import {
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FolderPlus,
  Inbox,
  Minus,
  Pencil,
  Plus,
  Repeat2,
  Search,
  SkipForward,
  Sparkles,
  Target,
  Trash2,
  X
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type {
  CreateHabitGroupInput,
  CreateHabitInput,
  HabitEntryRecord,
  HabitGroupRecord,
  HabitRecord,
  HabitTrackingType,
  UpdateHabitGroupInput,
  UpdateHabitInput
} from '../../../../shared/contracts/habits'
import { cn } from '../../shared/lib/cn'
import { AppSelect } from '../../shared/ui/AppSelect'
import { DeleteConfirmationDialog } from '../../shared/ui/DeleteConfirmationDialog'
import { ModuleHeader } from '../../shared/ui/ModuleHeader'
import { StandardModulePage } from '../../shared/ui/StandardModulePage'
import { habitsClient } from './api/habits-client'
import { HabitDialog } from './components/HabitDialog'
import { HabitGroupDialog } from './components/HabitGroupDialog'
import { HabitReports } from './components/HabitReports'
import { HabitGroupIconGlyph, habitGroupColorClasses, habitRepeatLabel } from './habit-options'
import {
  addDays,
  formatHabitDate,
  isHabitScheduledOn,
  localDateKey,
  nextHabitDate
} from './habit-schedule'

type HabitsView = 'today' | 'all' | 'reports'
type HabitGroupFilter = 'all' | 'ungrouped' | string

interface HabitsPageProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Не удалось выполнить действие'
}

export function HabitsPage({ resourceId, onResourceHandled }: HabitsPageProps): React.JSX.Element {
  const [groups, setGroups] = useState<HabitGroupRecord[]>([])
  const [habits, setHabits] = useState<HabitRecord[]>([])
  const [entries, setEntries] = useState<HabitEntryRecord[]>([])
  const [view, setView] = useState<HabitsView>('today')
  const [selectedDate, setSelectedDate] = useState(localDateKey())
  const [groupFilter, setGroupFilter] = useState<HabitGroupFilter>('all')
  const [trackingFilter, setTrackingFilter] = useState<HabitTrackingType | 'all'>('all')
  const [query, setQuery] = useState('')
  const [habitDialogOpen, setHabitDialogOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<HabitRecord | null>(null)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<HabitGroupRecord | null>(null)
  const [deleteHabitTarget, setDeleteHabitTarget] = useState<HabitRecord | null>(null)
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<HabitGroupRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handledResourceIdRef = useRef<string | null>(null)

  const today = localDateKey()

  const loadOverview = useCallback(async (): Promise<void> => {
    setError(null)
    try {
      const overview = await habitsClient.listOverview({ date: selectedDate })
      setGroups(overview.groups)
      setHabits(overview.habits)
      setEntries(overview.entries)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadOverview()
    })
    return () => {
      cancelled = true
    }
  }, [loadOverview])

  useEffect(() => {
    if (!resourceId) {
      handledResourceIdRef.current = null
      return
    }
    if (isLoading || handledResourceIdRef.current === resourceId) return

    handledResourceIdRef.current = resourceId
    const habit = habits.find((item) => item.id === resourceId)
    if (habit) {
      setEditingHabit(habit)
      setHabitDialogOpen(true)
    }
    onResourceHandled?.()
  }, [habits, isLoading, onResourceHandled, resourceId])

  const groupById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups])
  const entryByHabitId = useMemo(
    () => new Map(entries.map((entry) => [entry.habitId, entry])),
    [entries]
  )
  const scheduledHabits = useMemo(
    () => habits.filter((habit) => isHabitScheduledOn(habit, selectedDate)),
    [habits, selectedDate]
  )
  const completedOnSelectedDate = useMemo(
    () =>
      scheduledHabits.filter((habit) => {
        const entry = entryByHabitId.get(habit.id)
        return Boolean(entry && !entry.skipped && entry.value >= habit.targetValue)
      }).length,
    [entryByHabitId, scheduledHabits]
  )

  const groupHabitCounts = useMemo(() => {
    const counts = new Map<string, number>()
    let ungrouped = 0
    for (const habit of habits) {
      if (habit.groupId === null) ungrouped += 1
      else counts.set(habit.groupId, (counts.get(habit.groupId) ?? 0) + 1)
    }
    return { counts, ungrouped }
  }, [habits])

  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')

  function matchesCommonFilters(habit: HabitRecord): boolean {
    if (groupFilter === 'ungrouped' && habit.groupId !== null) return false
    if (groupFilter !== 'all' && groupFilter !== 'ungrouped' && habit.groupId !== groupFilter) {
      return false
    }
    if (!normalizedQuery) return true
    const groupName = habit.groupId ? (groupById.get(habit.groupId)?.name ?? '') : ''
    return [habit.title, groupName, habit.unit]
      .join(' ')
      .toLocaleLowerCase('ru-RU')
      .includes(normalizedQuery)
  }

  const visibleScheduledHabits = scheduledHabits.filter(matchesCommonFilters)
  const visibleAllHabits = habits.filter((habit) => {
    if (trackingFilter !== 'all' && habit.trackingType !== trackingFilter) return false
    return matchesCommonFilters(habit)
  })

  const selectedGroupForNewHabit =
    groupFilter !== 'all' && groupFilter !== 'ungrouped' && groupById.has(groupFilter)
      ? groupFilter
      : null

  function openNewHabit(): void {
    setEditingHabit(null)
    setHabitDialogOpen(true)
  }

  function openNewGroup(): void {
    setEditingGroup(null)
    setGroupDialogOpen(true)
  }

  async function saveHabit(input: CreateHabitInput | UpdateHabitInput): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      const saved =
        'id' in input
          ? await habitsClient.updateHabit(input)
          : await habitsClient.createHabit(input)
      setHabits((current) => [saved, ...current.filter((habit) => habit.id !== saved.id)])
      if (!isHabitScheduledOn(saved, selectedDate)) {
        setEntries((current) => current.filter((entry) => entry.habitId !== saved.id))
      }
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsSaving(false)
    }
  }

  async function saveGroup(input: CreateHabitGroupInput | UpdateHabitGroupInput): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      const saved =
        'id' in input
          ? await habitsClient.updateGroup(input)
          : await habitsClient.createGroup(input)
      setGroups((current) => {
        const exists = current.some((group) => group.id === saved.id)
        return exists
          ? current.map((group) => (group.id === saved.id ? saved : group))
          : [...current, saved]
      })
      if (!('id' in input)) setGroupFilter(saved.id)
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsSaving(false)
    }
  }

  async function setEntry(habit: HabitRecord, value: number, skipped: boolean): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      const saved = await habitsClient.upsertEntry({
        habitId: habit.id,
        date: selectedDate,
        value,
        skipped
      })
      setEntries((current) => [
        saved,
        ...current.filter((entry) => entry.habitId !== habit.id || entry.date !== selectedDate)
      ])
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function clearEntry(habit: HabitRecord): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      await habitsClient.deleteEntry({ habitId: habit.id, date: selectedDate })
      setEntries((current) =>
        current.filter((entry) => entry.habitId !== habit.id || entry.date !== selectedDate)
      )
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleChecked(habit: HabitRecord): Promise<void> {
    const entry = entryByHabitId.get(habit.id)
    const completed = Boolean(entry && !entry.skipped && entry.value >= habit.targetValue)
    if (completed) await clearEntry(habit)
    else await setEntry(habit, 1, false)
  }

  async function changeCount(habit: HabitRecord, delta: number): Promise<void> {
    const entry = entryByHabitId.get(habit.id)
    const current = entry?.skipped ? 0 : (entry?.value ?? 0)
    const next = Math.max(0, current + delta)
    if (next === 0) await clearEntry(habit)
    else await setEntry(habit, next, false)
  }

  async function completeCount(habit: HabitRecord): Promise<void> {
    await setEntry(habit, habit.targetValue, false)
  }

  async function toggleSkipped(habit: HabitRecord): Promise<void> {
    const entry = entryByHabitId.get(habit.id)
    if (entry?.skipped) await clearEntry(habit)
    else await setEntry(habit, 0, true)
  }

  async function confirmDeleteHabit(): Promise<void> {
    if (!deleteHabitTarget) return
    setIsDeleting(true)
    setError(null)
    try {
      await habitsClient.deleteHabit({ id: deleteHabitTarget.id })
      setHabits((current) => current.filter((habit) => habit.id !== deleteHabitTarget.id))
      setEntries((current) => current.filter((entry) => entry.habitId !== deleteHabitTarget.id))
      setDeleteHabitTarget(null)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsDeleting(false)
    }
  }

  async function confirmDeleteGroup(): Promise<void> {
    if (!deleteGroupTarget) return
    setIsDeleting(true)
    setError(null)
    try {
      await habitsClient.deleteGroup({ id: deleteGroupTarget.id })
      setGroups((current) => current.filter((group) => group.id !== deleteGroupTarget.id))
      setHabits((current) =>
        current.map((habit) =>
          habit.groupId === deleteGroupTarget.id ? { ...habit, groupId: null } : habit
        )
      )
      if (groupFilter === deleteGroupTarget.id) setGroupFilter('ungrouped')
      setDeleteGroupTarget(null)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <StandardModulePage>
        <div className="flex min-h-[70vh] items-center justify-center text-sm text-[var(--app-muted)]">
          Загружаем привычки…
        </div>
      </StandardModulePage>
    )
  }

  return (
    <StandardModulePage>
      <ModuleHeader
        icon={Repeat2}
        title="Привычки"
        description="Ритмы, прогресс и долгосрочная статистика по важным действиям."
        actions={
          <>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
              onClick={openNewGroup}
            >
              <FolderPlus className="size-4" /> Новая группа
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400"
              onClick={openNewHabit}
            >
              <Plus className="size-4" /> Новая привычка
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Привычки', value: habits.length, icon: Sparkles },
            {
              label: formatHabitDate(selectedDate, today),
              value: scheduledHabits.length,
              icon: CalendarDays
            },
            { label: 'Выполнено', value: completedOnSelectedDate, icon: CheckCircle2 },
            { label: 'Группы', value: groups.length, icon: FolderPlus }
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="flex items-center justify-between rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 py-3"
              >
                <span>
                  <span className="block text-xs font-medium text-[var(--app-muted)]">
                    {stat.label}
                  </span>
                  <span className="mt-1 block text-2xl font-semibold text-[var(--app-text)]">
                    {stat.value}
                  </span>
                </span>
                <Icon className="size-5 text-violet-300" />
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex gap-1 overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1">
          {[
            { id: 'today' as const, label: 'Сегодня', icon: CalendarDays },
            { id: 'all' as const, label: 'Все привычки', icon: Target },
            { id: 'reports' as const, label: 'Отчёты', icon: BarChart3 }
          ].map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={view === item.id}
                className={
                  view === item.id
                    ? 'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-violet-500 px-3.5 text-sm font-semibold text-white'
                    : 'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                }
                onClick={() => setView(item.id)}
              >
                <Icon className="size-4" /> {item.label}
              </button>
            )
          })}
        </div>
      </ModuleHeader>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <span>{error}</span>
          <button
            type="button"
            aria-label="Закрыть ошибку"
            className="flex size-7 items-center justify-center rounded-lg hover:bg-red-500/10"
            onClick={() => setError(null)}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="self-start rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-[var(--app-shadow-card)] lg:sticky lg:top-5">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-semibold tracking-[0.12em] text-[var(--app-muted)] uppercase">
              Группы
            </span>
            <button
              type="button"
              aria-label="Создать группу"
              className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
              onClick={openNewGroup}
            >
              <Plus className="size-4" />
            </button>
          </div>

          <div className="mt-2 space-y-1">
            <button
              type="button"
              className={cn(
                'flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm transition-colors',
                groupFilter === 'all'
                  ? 'bg-violet-500/12 font-semibold text-violet-200'
                  : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
              )}
              onClick={() => setGroupFilter('all')}
            >
              <Repeat2 className="size-4" />
              <span className="min-w-0 flex-1 truncate text-left">Все привычки</span>
              <span className="text-xs opacity-70">{habits.length}</span>
            </button>

            <button
              type="button"
              className={cn(
                'flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm transition-colors',
                groupFilter === 'ungrouped'
                  ? 'bg-violet-500/12 font-semibold text-violet-200'
                  : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
              )}
              onClick={() => setGroupFilter('ungrouped')}
            >
              <Inbox className="size-4" />
              <span className="min-w-0 flex-1 truncate text-left">Без группы</span>
              <span className="text-xs opacity-70">{groupHabitCounts.ungrouped}</span>
            </button>
          </div>

          {groups.length > 0 && <div className="my-3 border-t border-[var(--app-border)]" />}

          <div className="space-y-1">
            {groups.map((group) => {
              const color = habitGroupColorClasses[group.color]
              const selected = groupFilter === group.id
              return (
                <div
                  key={group.id}
                  className={cn(
                    'group flex items-center rounded-xl',
                    selected && 'bg-[var(--app-control)]'
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      'flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 text-sm transition-colors',
                      selected
                        ? 'font-semibold text-[var(--app-text)]'
                        : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                    )}
                    onClick={() => setGroupFilter(group.id)}
                  >
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-lg border',
                        color.soft,
                        color.text,
                        color.border
                      )}
                    >
                      <HabitGroupIconGlyph icon={group.icon} className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left">{group.name}</span>
                    <span className="text-xs opacity-60">
                      {groupHabitCounts.counts.get(group.id) ?? 0}
                    </span>
                  </button>
                  <div
                    className={cn(
                      'mr-1 flex shrink-0 items-center',
                      selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    )}
                  >
                    <button
                      type="button"
                      aria-label={`Изменить группу «${group.name}»`}
                      className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                      onClick={() => {
                        setEditingGroup(group)
                        setGroupDialogOpen(true)
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Удалить группу «${group.name}»`}
                      className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => setDeleteGroupTarget(group)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          {view !== 'reports' && (
            <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
              <div className="flex flex-wrap gap-2">
                <label className="flex h-11 min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 focus-within:border-violet-500/45 focus-within:ring-2 focus-within:ring-violet-500/10">
                  <Search className="size-4 shrink-0 text-[var(--app-muted)]" />
                  <input
                    value={query}
                    type="search"
                    aria-label="Поиск по привычкам"
                    placeholder="Найти привычку…"
                    className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label="Очистить поиск привычек"
                      className="text-[var(--app-muted)] hover:text-[var(--app-text)]"
                      onClick={() => setQuery('')}
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </label>

                {view === 'all' && (
                  <>
                    <div className="min-w-[180px]">
                      <AppSelect
                        ariaLabel="Фильтр по типу отслеживания"
                        value={trackingFilter}
                        options={[
                          { value: 'all', label: 'Все типы' },
                          { value: 'check', label: 'Простая отметка' },
                          { value: 'count', label: 'Количество / прогресс' }
                        ]}
                        onValueChange={(value) =>
                          setTrackingFilter(value as HabitTrackingType | 'all')
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {view === 'today' && (
            <>
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-[var(--app-shadow-card)]">
                <button
                  type="button"
                  aria-label="Предыдущий день"
                  className="flex size-10 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                  onClick={() => setSelectedDate((current) => addDays(current, -1))}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  max={today}
                  aria-label="Дата привычек"
                  className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
                <button
                  type="button"
                  className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                  onClick={() => setSelectedDate(today)}
                >
                  Сегодня
                </button>
                <button
                  type="button"
                  aria-label="Следующий день"
                  disabled={selectedDate >= today}
                  className="flex size-10 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-[var(--app-workspace)]"
                  onClick={() =>
                    setSelectedDate((current) => {
                      const next = addDays(current, 1)
                      return next > today ? today : next
                    })
                  }
                >
                  <ChevronRight className="size-4" />
                </button>
                <div className="ml-auto text-sm text-[var(--app-muted)]">
                  {completedOnSelectedDate} / {scheduledHabits.length} выполнено
                </div>
              </div>

              {visibleScheduledHabits.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 text-center">
                  <span className="flex size-14 items-center justify-center rounded-2xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
                    <Sparkles className="size-7" />
                  </span>
                  <h2 className="mt-4 text-lg font-semibold text-[var(--app-text)]">
                    {habits.length === 0
                      ? 'Привычек пока нет'
                      : 'На этот день ничего не запланировано'}
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[var(--app-muted)]">
                    {habits.length === 0
                      ? 'Создайте первую привычку и задайте ей период повторения — от ежедневной до любого собственного интервала.'
                      : 'Выберите другую дату, группу или измените период повторения привычки.'}
                  </p>
                  {habits.length === 0 && (
                    <button
                      type="button"
                      className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400"
                      onClick={openNewHabit}
                    >
                      <Plus className="size-4" /> Новая привычка
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleScheduledHabits.map((habit) => {
                    const group = habit.groupId ? (groupById.get(habit.groupId) ?? null) : null
                    const entry = entryByHabitId.get(habit.id)
                    const completed = Boolean(
                      entry && !entry.skipped && entry.value >= habit.targetValue
                    )
                    const skipped = Boolean(entry?.skipped)
                    const color = group ? habitGroupColorClasses[group.color] : null

                    return (
                      <article
                        key={habit.id}
                        className={cn(
                          'rounded-2xl border bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)] transition-colors',
                          completed
                            ? 'border-emerald-400/20'
                            : skipped
                              ? 'border-amber-400/20 opacity-75'
                              : 'border-[var(--app-border)]'
                        )}
                      >
                        <div className="flex flex-wrap items-start gap-4">
                          <button
                            type="button"
                            className={cn(
                              'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors',
                              completed
                                ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-300'
                                : skipped
                                  ? 'border-amber-400/30 bg-amber-500/10 text-amber-300'
                                  : 'border-violet-400/20 bg-violet-500/10 text-violet-300'
                            )}
                            onClick={() => {
                              if (habit.trackingType === 'check') void toggleChecked(habit)
                              else void completeCount(habit)
                            }}
                            aria-label={
                              habit.trackingType === 'check'
                                ? completed
                                  ? `Снять выполнение «${habit.title}»`
                                  : `Выполнить привычку «${habit.title}»`
                                : `Выполнить цель «${habit.title}»`
                            }
                          >
                            {completed ? (
                              <Check className="size-5" />
                            ) : (
                              <Target className="size-5" />
                            )}
                          </button>

                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left outline-none"
                            onClick={() => {
                              setEditingHabit(habit)
                              setHabitDialogOpen(true)
                            }}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <h2
                                className={cn(
                                  'font-semibold text-[var(--app-text)]',
                                  completed && 'text-emerald-100',
                                  skipped && 'line-through decoration-[var(--app-muted)]/60'
                                )}
                              >
                                {habit.title}
                              </h2>
                              {group && color && (
                                <span
                                  className={cn(
                                    'inline-flex h-6 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-medium',
                                    color.soft,
                                    color.text,
                                    color.border
                                  )}
                                >
                                  <HabitGroupIconGlyph icon={group.icon} className="size-3" />
                                  {group.name}
                                </span>
                              )}
                              <span className="inline-flex h-6 items-center gap-1 rounded-lg border border-violet-400/20 bg-violet-500/10 px-2 text-[11px] font-medium text-violet-200">
                                <Repeat2 className="size-3" />
                                {habitRepeatLabel(habit.repeatEveryDays)}
                              </span>
                              {habit.preferredTime && (
                                <span className="inline-flex h-6 items-center gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-control)] px-2 text-[11px] text-[var(--app-muted)]">
                                  <Clock3 className="size-3" /> {habit.preferredTime}
                                </span>
                              )}
                            </div>
                          </button>

                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            {habit.trackingType === 'count' && !skipped && (
                              <div className="flex h-10 items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1">
                                <button
                                  type="button"
                                  aria-label={`Уменьшить прогресс «${habit.title}»`}
                                  disabled={isSaving || (entry?.value ?? 0) <= 0}
                                  className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-30"
                                  onClick={() => void changeCount(habit, -1)}
                                >
                                  <Minus className="size-3.5" />
                                </button>
                                <span className="min-w-24 px-2 text-center text-sm font-semibold text-[var(--app-text)]">
                                  {entry?.value ?? 0} / {habit.targetValue}
                                  {habit.unit ? ` ${habit.unit}` : ''}
                                </span>
                                <button
                                  type="button"
                                  aria-label={`Увеличить прогресс «${habit.title}»`}
                                  disabled={isSaving}
                                  className="flex size-8 items-center justify-center rounded-lg text-violet-300 hover:bg-violet-500/10 disabled:opacity-30"
                                  onClick={() => void changeCount(habit, 1)}
                                >
                                  <Plus className="size-3.5" />
                                </button>
                              </div>
                            )}

                            <button
                              type="button"
                              aria-pressed={skipped}
                              disabled={isSaving}
                              className={cn(
                                'inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors disabled:opacity-40',
                                skipped
                                  ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                                  : 'border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                              )}
                              onClick={() => void toggleSkipped(habit)}
                            >
                              <SkipForward className="size-3.5" />
                              {skipped ? 'Пропущено' : 'Пропустить'}
                            </button>

                            <button
                              type="button"
                              aria-label={`Изменить привычку «${habit.title}»`}
                              className="flex size-10 items-center justify-center rounded-xl text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                              onClick={() => {
                                setEditingHabit(habit)
                                setHabitDialogOpen(true)
                              }}
                            >
                              <Pencil className="size-4" />
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {view === 'all' && (
            <div className="space-y-3">
              {visibleAllHabits.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 text-center">
                  <Target className="size-10 text-violet-300" />
                  <h2 className="mt-4 text-lg font-semibold text-[var(--app-text)]">
                    Ничего не найдено
                  </h2>
                  <p className="mt-2 text-sm text-[var(--app-muted)]">
                    Измените группу, тип отслеживания или поиск.
                  </p>
                </div>
              ) : (
                visibleAllHabits.map((habit) => {
                  const group = habit.groupId ? (groupById.get(habit.groupId) ?? null) : null
                  const color = group ? habitGroupColorClasses[group.color] : null
                  const nextDate = nextHabitDate(habit, today)
                  return (
                    <article
                      key={habit.id}
                      className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]"
                    >
                      <div className="flex flex-wrap items-start gap-4">
                        <span
                          className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-xl border',
                            color
                              ? `${color.soft} ${color.text} ${color.border}`
                              : 'border-violet-400/20 bg-violet-500/10 text-violet-300'
                          )}
                        >
                          {group ? (
                            <HabitGroupIconGlyph icon={group.icon} className="size-4" />
                          ) : (
                            <Sparkles className="size-4" />
                          )}
                        </span>

                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => {
                            setEditingHabit(habit)
                            setHabitDialogOpen(true)
                          }}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-semibold text-[var(--app-text)]">{habit.title}</h2>
                            <span className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-200">
                              {habitRepeatLabel(habit.repeatEveryDays)}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-[var(--app-muted)]">
                            {group && <span>{group.name}</span>}
                            {group && <span>·</span>}
                            <span>
                              {habit.trackingType === 'check'
                                ? 'Отметка выполнения'
                                : `Цель: ${habit.targetValue}${habit.unit ? ` ${habit.unit}` : ''}`}
                            </span>
                            {nextDate && (
                              <>
                                <span>·</span>
                                <span>следующая: {formatHabitDate(nextDate, today)}</span>
                              </>
                            )}
                          </div>
                        </button>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Изменить привычку «${habit.title}»`}
                            className="flex size-9 items-center justify-center rounded-xl text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                            onClick={() => {
                              setEditingHabit(habit)
                              setHabitDialogOpen(true)
                            }}
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Удалить привычку «${habit.title}»`}
                            className="flex size-9 items-center justify-center rounded-xl text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                            onClick={() => setDeleteHabitTarget(habit)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          )}

          {view === 'reports' && (
            <HabitReports
              groups={groups}
              groupId={groupFilter !== 'all' && groupFilter !== 'ungrouped' ? groupFilter : null}
              ungroupedOnly={groupFilter === 'ungrouped'}
            />
          )}
        </section>
      </div>

      <HabitDialog
        open={habitDialogOpen}
        habit={editingHabit}
        groups={groups}
        initialGroupId={selectedGroupForNewHabit}
        busy={isSaving}
        onOpenChange={(open) => {
          setHabitDialogOpen(open)
          if (!open) setEditingHabit(null)
        }}
        onSave={saveHabit}
      />

      <HabitGroupDialog
        open={groupDialogOpen}
        group={editingGroup}
        busy={isSaving}
        onOpenChange={(open) => {
          setGroupDialogOpen(open)
          if (!open) setEditingGroup(null)
        }}
        onSave={saveGroup}
      />

      <DeleteConfirmationDialog
        open={deleteHabitTarget !== null}
        title="Удалить привычку?"
        subject={deleteHabitTarget?.title}
        description="Будут удалены сама привычка и вся история её выполнения."
        notice="Историю выполнения после удаления восстановить нельзя"
        isSubmitting={isDeleting}
        error={error}
        onOpenChange={(open) => {
          if (!open) setDeleteHabitTarget(null)
        }}
        onConfirm={confirmDeleteHabit}
      />

      <DeleteConfirmationDialog
        open={deleteGroupTarget !== null}
        title="Удалить группу?"
        subject={deleteGroupTarget?.name}
        description="Привычки сохранятся и будут перенесены в «Без группы»."
        notice="История привычек и отметки выполнения сохраняются"
        isSubmitting={isDeleting}
        error={error}
        onOpenChange={(open) => {
          if (!open) setDeleteGroupTarget(null)
        }}
        onConfirm={confirmDeleteGroup}
      />
    </StandardModulePage>
  )
}
