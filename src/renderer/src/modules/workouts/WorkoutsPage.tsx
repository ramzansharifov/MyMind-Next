import {
  Activity,
  BarChart3,
  CalendarDays,
  Clock3,
  Dumbbell,
  FileText,
  Flame,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Scale,
  Sigma,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  X
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type {
  CreateWorkoutExerciseInput,
  CreateWorkoutProgramInput,
  CreateWorkoutProgressEntryInput,
  CreateWorkoutSessionInput,
  UpdateWorkoutExerciseInput,
  UpdateWorkoutProgramInput,
  UpdateWorkoutProgressEntryInput,
  UpdateWorkoutSessionInput,
  WorkoutExerciseRecord,
  WorkoutMuscleGroup,
  WorkoutProgramRecord,
  WorkoutProgressEntryRecord,
  WorkoutProgressPhotoView,
  WorkoutReport,
  WorkoutSessionRecord,
  WorkoutsOverview
} from '../../../../shared/contracts/workouts'
import { cn } from '../../shared/lib/cn'
import { AppDateField } from '../../shared/ui/AppDateField'
import { AppSelect } from '../../shared/ui/AppSelect'
import { DeleteConfirmationDialog } from '../../shared/ui/DeleteConfirmationDialog'
import { ModuleHeader } from '../../shared/ui/ModuleHeader'
import { StandardModulePage } from '../../shared/ui/StandardModulePage'
import { workoutsClient } from './api/workouts-client'
import { WorkoutExerciseDialog } from './components/WorkoutExerciseDialog'
import { WorkoutMuscleArtwork } from './components/WorkoutMuscleArtwork'
import { WorkoutProgramDialog } from './components/WorkoutProgramDialog'
import { WorkoutProgressDialog } from './components/WorkoutProgressDialog'
import { WorkoutProgressSection } from './components/WorkoutProgressSection'
import { WorkoutSessionDetailDialog } from './components/WorkoutSessionDetailDialog'
import { WorkoutSessionDialog } from './components/WorkoutSessionDialog'
import {
  WORKOUT_MUSCLE_GROUP_OPTIONS,
  workoutMuscleGroupClasses,
  workoutMuscleGroupLabel,
  workoutMuscleGroupsLabel,
  WorkoutMuscleGroupIcon
} from './workout-options'

type WorkoutTab = 'journal' | 'exercises' | 'programs' | 'progress' | 'reports'
type MuscleFilter = 'all' | WorkoutMuscleGroup
type ReportPeriod = '7' | '30' | '90' | '365' | 'custom'

interface WorkoutsPageProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

function todayKey(): string {
  const date = new Date()
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function daysAgoKey(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

function formatNumber(value: number, maximumFractionDigits = 1): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits })
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Не удалось выполнить действие'
}

export function WorkoutsPage({
  resourceId,
  onResourceHandled
}: WorkoutsPageProps): React.JSX.Element {
  const [overview, setOverview] = useState<WorkoutsOverview | null>(null)
  const [tab, setTab] = useState<WorkoutTab>('journal')
  const [query, setQuery] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>('all')
  const [programFilter, setProgramFilter] = useState('all')
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<WorkoutExerciseRecord | null>(null)
  const [programDialogOpen, setProgramDialogOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<WorkoutProgramRecord | null>(null)
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<WorkoutSessionRecord | null>(null)
  const [sessionDetailOpen, setSessionDetailOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<WorkoutSessionRecord | null>(null)
  const [progressDialogOpen, setProgressDialogOpen] = useState(false)
  const [editingProgress, setEditingProgress] = useState<WorkoutProgressEntryRecord | null>(null)
  const [deleteExerciseTarget, setDeleteExerciseTarget] = useState<WorkoutExerciseRecord | null>(
    null
  )
  const [deleteProgramTarget, setDeleteProgramTarget] = useState<WorkoutProgramRecord | null>(null)
  const [deleteSessionTarget, setDeleteSessionTarget] = useState<WorkoutSessionRecord | null>(null)
  const [deleteProgressTarget, setDeleteProgressTarget] =
    useState<WorkoutProgressEntryRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handledResourceIdRef = useRef<string | null>(null)

  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('30')
  const [reportDateFrom, setReportDateFrom] = useState(daysAgoKey(29))
  const [reportDateTo, setReportDateTo] = useState(todayKey())
  const [reportProgramId, setReportProgramId] = useState('all')
  const [reportExerciseId, setReportExerciseId] = useState('all')
  const [reportMuscleGroup, setReportMuscleGroup] = useState<MuscleFilter>('all')
  const [report, setReport] = useState<WorkoutReport | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const loadOverview = useCallback(async (): Promise<void> => {
    try {
      const next = await workoutsClient.listOverview()
      setOverview(next)
      setError(null)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    if (!overview || !resourceId) {
      if (!resourceId) handledResourceIdRef.current = null
      return
    }
    if (handledResourceIdRef.current === resourceId) return
    handledResourceIdRef.current = resourceId
    const session = overview.sessions.find((candidate) => candidate.id === resourceId)
    if (session) {
      setTab('journal')
      setSelectedSession(session)
      setSessionDetailOpen(true)
    }
    onResourceHandled?.()
  }, [onResourceHandled, overview, resourceId])

  const exercises = overview?.exercises ?? []
  const programs = overview?.programs ?? []
  const sessions = overview?.sessions ?? []
  const progressEntries = overview?.progressEntries ?? []
  const exerciseMap = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises]
  )

  const filteredExercises = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru-RU')
    return exercises.filter((exercise) => {
      if (muscleFilter !== 'all' && !exercise.muscleGroups.includes(muscleFilter)) return false
      return (
        !normalized ||
        `${exercise.title} ${workoutMuscleGroupsLabel(exercise.muscleGroups)}`
          .toLocaleLowerCase('ru-RU')
          .includes(normalized)
      )
    })
  }, [exercises, muscleFilter, query])

  const filteredPrograms = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru-RU')
    return programs.filter((program) => {
      if (!normalized) return true
      const names = program.exercises
        .map((item) => exerciseMap.get(item.exerciseId)?.title ?? '')
        .join(' ')
      return `${program.name} ${program.description} ${names}`
        .toLocaleLowerCase('ru-RU')
        .includes(normalized)
    })
  }, [exerciseMap, programs, query])

  const filteredSessions = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru-RU')
    return sessions.filter((session) => {
      if (programFilter !== 'all') {
        if (programFilter === 'custom' && session.programId !== null) return false
        if (programFilter !== 'custom' && session.programId !== programFilter) return false
      }
      if (
        muscleFilter !== 'all' &&
        !session.exercises.some((exercise) => exercise.muscleGroups.includes(muscleFilter))
      ) {
        return false
      }
      if (!normalized) return true
      const exerciseNames = session.exercises.map((exercise) => exercise.exerciseTitle).join(' ')
      return `${session.programName ?? ''} ${session.comment} ${exerciseNames}`
        .toLocaleLowerCase('ru-RU')
        .includes(normalized)
    })
  }, [muscleFilter, programFilter, query, sessions])

  const recentStats = useMemo(() => {
    const from = daysAgoKey(29)
    const recent = sessions.filter((session) => session.date >= from && session.date <= todayKey())
    return {
      sessions: recent.length,
      sets: recent.reduce((sum, session) => sum + session.totalSets, 0),
      reps: recent.reduce((sum, session) => sum + session.totalReps, 0),
      volume: recent.reduce((sum, session) => sum + session.totalVolumeKg, 0)
    }
  }, [sessions])

  async function saveExercise(
    input: CreateWorkoutExerciseInput | UpdateWorkoutExerciseInput
  ): Promise<void> {
    setIsBusy(true)
    setError(null)
    try {
      if ('id' in input) await workoutsClient.updateExercise(input)
      else await workoutsClient.createExercise(input)
      await loadOverview()
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsBusy(false)
    }
  }

  async function saveProgram(
    input: CreateWorkoutProgramInput | UpdateWorkoutProgramInput
  ): Promise<void> {
    setIsBusy(true)
    setError(null)
    try {
      if ('id' in input) await workoutsClient.updateProgram(input)
      else await workoutsClient.createProgram(input)
      await loadOverview()
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsBusy(false)
    }
  }

  async function saveSession(
    input: CreateWorkoutSessionInput | UpdateWorkoutSessionInput
  ): Promise<void> {
    setIsBusy(true)
    setError(null)
    try {
      if ('id' in input) await workoutsClient.updateSession(input)
      else await workoutsClient.createSession(input)
      await loadOverview()
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsBusy(false)
    }
  }

  async function saveProgress(
    input: CreateWorkoutProgressEntryInput | UpdateWorkoutProgressEntryInput
  ): Promise<void> {
    setIsBusy(true)
    setError(null)
    try {
      if ('id' in input) await workoutsClient.updateProgressEntry(input)
      else await workoutsClient.createProgressEntry(input)
      await loadOverview()
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsBusy(false)
    }
  }

  async function importPhoto(entryId: string, view: WorkoutProgressPhotoView): Promise<void> {
    setIsBusy(true)
    setError(null)
    try {
      await workoutsClient.importProgressPhoto({ entryId, view })
      await loadOverview()
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsBusy(false)
    }
  }

  async function removePhoto(id: string): Promise<void> {
    setIsBusy(true)
    setError(null)
    try {
      await workoutsClient.deleteProgressPhoto({ id })
      await loadOverview()
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsBusy(false)
    }
  }

  async function confirmDeleteExercise(): Promise<void> {
    if (!deleteExerciseTarget) return
    setIsDeleting(true)
    setError(null)
    try {
      await workoutsClient.deleteExercise({ id: deleteExerciseTarget.id })
      setDeleteExerciseTarget(null)
      await loadOverview()
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsDeleting(false)
    }
  }

  async function confirmDeleteProgram(): Promise<void> {
    if (!deleteProgramTarget) return
    setIsDeleting(true)
    setError(null)
    try {
      await workoutsClient.deleteProgram({ id: deleteProgramTarget.id })
      setDeleteProgramTarget(null)
      await loadOverview()
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsDeleting(false)
    }
  }

  async function confirmDeleteSession(): Promise<void> {
    if (!deleteSessionTarget) return
    setIsDeleting(true)
    setError(null)
    try {
      await workoutsClient.deleteSession({ id: deleteSessionTarget.id })
      setDeleteSessionTarget(null)
      await loadOverview()
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsDeleting(false)
    }
  }

  async function confirmDeleteProgress(): Promise<void> {
    if (!deleteProgressTarget) return
    setIsDeleting(true)
    setError(null)
    try {
      await workoutsClient.deleteProgressEntry({ id: deleteProgressTarget.id })
      setDeleteProgressTarget(null)
      await loadOverview()
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsDeleting(false)
    }
  }

  function applyReportPeriod(value: ReportPeriod): void {
    setReportPeriod(value)
    if (value === 'custom') return
    const days = Number(value)
    setReportDateTo(todayKey())
    setReportDateFrom(daysAgoKey(days - 1))
  }

  const loadReport = useCallback(async (): Promise<void> => {
    if (tab !== 'reports') return
    setReportLoading(true)
    try {
      const next = await workoutsClient.getReport({
        dateFrom: reportDateFrom,
        dateTo: reportDateTo,
        programId: reportProgramId === 'all' ? null : reportProgramId,
        exerciseId: reportExerciseId === 'all' ? null : reportExerciseId,
        muscleGroup: reportMuscleGroup === 'all' ? null : reportMuscleGroup
      })
      setReport(next)
      setError(null)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setReportLoading(false)
    }
  }, [reportDateFrom, reportDateTo, reportExerciseId, reportMuscleGroup, reportProgramId, tab])

  useEffect(() => {
    if (tab !== 'reports') return
    const timer = window.setTimeout(() => void loadReport(), 80)
    return () => window.clearTimeout(timer)
  }, [loadReport, tab])

  if (isLoading || overview === null) {
    return (
      <StandardModulePage>
        <div className="flex min-h-[70vh] items-center justify-center text-sm text-[var(--app-muted)]">
          Загружаем тренировки…
        </div>
      </StandardModulePage>
    )
  }

  const tabs: Array<{ id: WorkoutTab; label: string; icon: typeof Dumbbell }> = [
    { id: 'journal', label: 'Тренировки', icon: Dumbbell },
    { id: 'exercises', label: 'Упражнения', icon: ListChecks },
    { id: 'programs', label: 'Программы', icon: FileText },
    { id: 'progress', label: 'Прогресс', icon: TrendingUp },
    { id: 'reports', label: 'Отчёты', icon: BarChart3 }
  ]

  const headerActions = (
    <>
      {tab === 'journal' && (
        <button
          type="button"
          disabled={exercises.length === 0}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => {
            setEditingSession(null)
            setSessionDialogOpen(true)
          }}
        >
          <Plus className="size-4" /> Записать тренировку
        </button>
      )}
      {tab === 'exercises' && (
        <button
          type="button"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400"
          onClick={() => {
            setEditingExercise(null)
            setExerciseDialogOpen(true)
          }}
        >
          <Plus className="size-4" /> Добавить упражнение
        </button>
      )}
      {tab === 'programs' && (
        <button
          type="button"
          disabled={exercises.length === 0}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-45"
          onClick={() => {
            setEditingProgram(null)
            setProgramDialogOpen(true)
          }}
        >
          <Plus className="size-4" /> Новая программа
        </button>
      )}
      {tab === 'progress' && (
        <button
          type="button"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400"
          onClick={() => {
            setEditingProgress(null)
            setProgressDialogOpen(true)
          }}
        >
          <Plus className="size-4" /> Зафиксировать прогресс
        </button>
      )}
    </>
  )

  return (
    <StandardModulePage>
      <ModuleHeader
        icon={Dumbbell}
        title="Тренировки"
        description="Упражнения, программы, журнал нагрузки, физический прогресс и подробная аналитика."
        actions={headerActions}
      >
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1">
          {tabs.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={tab === item.id}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors',
                  tab === item.id
                    ? 'bg-violet-500 font-semibold text-white'
                    : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                )}
                onClick={() => {
                  setTab(item.id)
                  setQuery('')
                  setMuscleFilter('all')
                  setProgramFilter('all')
                }}
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

      {tab === 'journal' && (
        <section className="mt-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Тренировок за 30 дней', value: recentStats.sessions, icon: Dumbbell },
              { label: 'Подходов', value: recentStats.sets, icon: Sigma },
              { label: 'Повторений', value: recentStats.reps, icon: Activity },
              { label: 'Тоннаж', value: `${formatNumber(recentStats.volume)} кг`, icon: Scale }
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-[var(--app-muted)]">
                      {stat.label}
                    </span>
                    <Icon className="size-4 text-violet-300" />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[var(--app-text)]">
                    {stat.value}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
            <div className="flex flex-wrap gap-2">
              <label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 focus-within:border-violet-500/45">
                <Search className="size-4 text-[var(--app-muted)]" />
                <input
                  type="search"
                  value={query}
                  placeholder="Поиск по тренировкам и упражнениям…"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <div className="min-w-[190px]">
                <AppSelect
                  ariaLabel="Фильтр по программе"
                  value={programFilter}
                  options={[
                    { value: 'all', label: 'Все программы' },
                    { value: 'custom', label: 'Свободные тренировки' },
                    ...programs.map((program) => ({ value: program.id, label: program.name }))
                  ]}
                  onValueChange={setProgramFilter}
                />
              </div>
              <div className="min-w-[170px]">
                <AppSelect
                  ariaLabel="Фильтр по группе мышц"
                  value={muscleFilter}
                  options={[
                    { value: 'all', label: 'Все группы мышц' },
                    ...WORKOUT_MUSCLE_GROUP_OPTIONS.map(({ value, label }) => ({ value, label }))
                  ]}
                  onValueChange={(value) => setMuscleFilter(value as MuscleFilter)}
                />
              </div>
            </div>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 text-center">
              <Dumbbell className="size-9 text-violet-300" />
              <h2 className="mt-4 text-lg font-semibold text-[var(--app-text)]">
                {sessions.length === 0 ? 'Тренировок пока нет' : 'Ничего не найдено'}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--app-muted)]">
                {sessions.length === 0
                  ? exercises.length === 0
                    ? 'Сначала добавьте упражнения, затем создайте программу или сразу запишите свободную тренировку.'
                    : 'Запишите первую тренировку по программе или соберите её из упражнений вручную.'
                  : 'Измените фильтры или поисковый запрос.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSessions.map((session) => {
                const groups = [
                  ...new Set(session.exercises.flatMap((exercise) => exercise.muscleGroups))
                ]
                return (
                  <article
                    key={session.id}
                    className="group rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)] transition-colors hover:bg-[var(--app-card-hover)]"
                  >
                    <div className="flex flex-wrap items-start gap-4">
                      <button
                        type="button"
                        className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1"
                        onClick={() => {
                          setSelectedSession(session)
                          setSessionDetailOpen(true)
                        }}
                      >
                        <WorkoutMuscleArtwork groups={groups} className="size-9 rounded-lg" />
                      </button>
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => {
                          setSelectedSession(session)
                          setSessionDetailOpen(true)
                        }}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-[var(--app-text)]">
                            {session.programName || 'Свободная тренировка'}
                          </h3>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--app-muted)]">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="size-3.5" />
                            {formatDate(session.date)}
                          </span>
                          {session.durationMinutes && (
                            <span className="inline-flex items-center gap-1.5">
                              <Clock3 className="size-3.5" />
                              {session.durationMinutes} мин
                            </span>
                          )}
                          <span>{session.totalSets} подх.</span>
                          <span>{session.totalReps} повт.</span>
                          <span>{formatNumber(session.totalVolumeKg)} кг</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {groups.map((group) => {
                            const classes = workoutMuscleGroupClasses[group]
                            return (
                              <span
                                key={group}
                                className={cn(
                                  'inline-flex h-6 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium',
                                  classes.soft,
                                  classes.text,
                                  classes.border
                                )}
                              >
                                <WorkoutMuscleGroupIcon group={group} className="size-3" />
                                {workoutMuscleGroupLabel(group)}
                              </span>
                            )
                          })}
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Изменить тренировку"
                          className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control)] hover:text-[var(--app-text)]"
                          onClick={() => {
                            setEditingSession(session)
                            setSessionDialogOpen(true)
                          }}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Удалить тренировку"
                          className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                          onClick={() => setDeleteSessionTarget(session)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'exercises' && (
        <section className="mt-5 space-y-4">
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
            <div className="flex flex-wrap gap-2">
              <label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 focus-within:border-violet-500/45">
                <Search className="size-4 text-[var(--app-muted)]" />
                <input
                  type="search"
                  value={query}
                  placeholder="Найти упражнение…"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <div className="min-w-[190px]">
                <AppSelect
                  ariaLabel="Группа мышц"
                  value={muscleFilter}
                  options={[
                    { value: 'all', label: 'Все группы мышц' },
                    ...WORKOUT_MUSCLE_GROUP_OPTIONS.map(({ value, label }) => ({ value, label }))
                  ]}
                  onValueChange={(value) => setMuscleFilter(value as MuscleFilter)}
                />
              </div>
            </div>
          </div>

          {filteredExercises.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] text-center">
              <Target className="size-8 text-violet-300" />
              <h2 className="mt-3 text-lg font-semibold text-[var(--app-text)]">
                Добавьте упражнения
              </h2>
              <p className="mt-1 max-w-md text-sm text-[var(--app-muted)]">
                Справочник упражнений используется во всех программах, тренировках и отчётах.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredExercises.map((exercise) => {
                const classes = workoutMuscleGroupClasses[exercise.muscleGroup]
                return (
                  <article
                    key={exercise.id}
                    className="group rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]"
                  >
                    <div className="flex items-start gap-3">
                      <WorkoutMuscleArtwork
                        groups={exercise.muscleGroups}
                        className="size-12 shrink-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold text-[var(--app-text)]">
                            {exercise.title}
                          </h3>
                        </div>
                        <span className={cn('mt-1 inline-block text-xs font-medium', classes.text)}>
                          {workoutMuscleGroupsLabel(exercise.muscleGroups)}
                        </span>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          aria-label={`Изменить «${exercise.title}»`}
                          className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                          onClick={() => {
                            setEditingExercise(exercise)
                            setExerciseDialogOpen(true)
                          }}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Удалить «${exercise.title}»`}
                          className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                          onClick={() => setDeleteExerciseTarget(exercise)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'programs' && (
        <section className="mt-5 space-y-4">
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
            <div className="flex flex-wrap gap-2">
              <label className="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 focus-within:border-violet-500/45">
                <Search className="size-4 text-[var(--app-muted)]" />
                <input
                  type="search"
                  value={query}
                  placeholder="Найти программу…"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>
          </div>

          {filteredPrograms.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] text-center">
              <FileText className="size-8 text-violet-300" />
              <h2 className="mt-3 text-lg font-semibold text-[var(--app-text)]">
                Программ пока нет
              </h2>
              <p className="mt-1 max-w-md text-sm text-[var(--app-muted)]">
                Соберите программу из упражнений. Подходы, повторения и вес задаются уже в
                тренировке.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredPrograms.map((program) => (
                <article
                  key={program.id}
                  className="group rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300">
                      <FileText className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-[var(--app-text)]">
                          {program.name}
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-[var(--app-muted)]">
                        {program.exercises.length} упражнений
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label="Изменить программу"
                        className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                        onClick={() => {
                          setEditingProgram(program)
                          setProgramDialogOpen(true)
                        }}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Удалить программу"
                        className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                        onClick={() => setDeleteProgramTarget(program)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  {program.description && (
                    <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">
                      {program.description}
                    </p>
                  )}
                  <div className="mt-4 space-y-1.5">
                    {program.exercises.map((item, index) => {
                      const exercise = exerciseMap.get(item.exerciseId)
                      if (!exercise) return null
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2.5"
                        >
                          <span className="w-5 text-xs font-semibold text-[var(--app-muted)]">
                            {index + 1}
                          </span>
                          <WorkoutMuscleArtwork
                            groups={exercise.muscleGroups}
                            className="size-9 shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5"
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--app-text)]">
                            {exercise.title}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'progress' && (
        <WorkoutProgressSection
          entries={progressEntries}
          busy={isBusy}
          onEdit={(entry) => {
            setEditingProgress(entry)
            setProgressDialogOpen(true)
          }}
          onDelete={setDeleteProgressTarget}
          onImportPhoto={importPhoto}
          onRemovePhoto={removePhoto}
        />
      )}

      {tab === 'reports' && (
        <section className="mt-5 space-y-4">
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
            <div className="flex flex-wrap gap-2">
              <div className="min-w-[160px]">
                <AppSelect
                  ariaLabel="Период отчёта"
                  value={reportPeriod}
                  options={[
                    { value: '7', label: '7 дней' },
                    { value: '30', label: '30 дней' },
                    { value: '90', label: '90 дней' },
                    { value: '365', label: '365 дней' },
                    { value: 'custom', label: 'Свой период' }
                  ]}
                  onValueChange={(value) => applyReportPeriod(value as ReportPeriod)}
                />
              </div>
              <AppDateField
                value={reportDateFrom}
                ariaLabel="Начало периода"
                className="w-[155px]"
                onChange={(value) => {
                  setReportPeriod('custom')
                  setReportDateFrom(value)
                }}
              />
              <AppDateField
                value={reportDateTo}
                ariaLabel="Конец периода"
                className="w-[155px]"
                onChange={(value) => {
                  setReportPeriod('custom')
                  setReportDateTo(value)
                }}
              />
              <div className="min-w-[190px] flex-1">
                <AppSelect
                  ariaLabel="Программа в отчёте"
                  value={reportProgramId}
                  options={[
                    { value: 'all', label: 'Все программы' },
                    { value: 'custom', label: 'Свободные тренировки' },
                    ...programs.map((program) => ({ value: program.id, label: program.name }))
                  ]}
                  onValueChange={setReportProgramId}
                />
              </div>
              <div className="min-w-[210px] flex-1">
                <AppSelect
                  ariaLabel="Упражнение в отчёте"
                  value={reportExerciseId}
                  options={[
                    { value: 'all', label: 'Все упражнения' },
                    ...exercises.map((exercise) => ({ value: exercise.id, label: exercise.title }))
                  ]}
                  onValueChange={setReportExerciseId}
                />
              </div>
              <div className="min-w-[170px]">
                <AppSelect
                  ariaLabel="Группа мышц в отчёте"
                  value={reportMuscleGroup}
                  options={[
                    { value: 'all', label: 'Все группы мышц' },
                    ...WORKOUT_MUSCLE_GROUP_OPTIONS.map(({ value, label }) => ({ value, label }))
                  ]}
                  onValueChange={(value) => setReportMuscleGroup(value as MuscleFilter)}
                />
              </div>
            </div>
          </div>

          {reportLoading && !report ? (
            <div className="flex min-h-64 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-sm text-[var(--app-muted)]">
              Считаем отчёт…
            </div>
          ) : (
            report && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  {[
                    {
                      label: 'Тренировки',
                      value: report.summary.sessions,
                      icon: Dumbbell,
                      meta: `${report.summary.exercises} упражн.`
                    },
                    {
                      label: 'Активные дни',
                      value: report.summary.activeDays,
                      icon: CalendarDays,
                      meta: `${report.summary.durationMinutes} мин всего`
                    },
                    {
                      label: 'Подходы',
                      value: report.summary.sets,
                      icon: Sigma,
                      meta: `${report.summary.externalWeightSets} с весом · ${report.summary.bodyweightSets} без веса`
                    },
                    {
                      label: 'Повторения',
                      value: report.summary.reps,
                      icon: Activity,
                      meta: `${report.summary.externalWeightReps} с весом · ${report.summary.bodyweightReps} без веса`
                    },
                    {
                      label: 'Тоннаж с весом',
                      value: `${formatNumber(report.summary.volumeKg)} кг`,
                      icon: Scale,
                      meta: 'Без упражнений с собственным весом'
                    },
                    {
                      label: 'Среднее время',
                      value: `${formatNumber(report.summary.averageDurationMinutes, 0)} мин`,
                      icon: Clock3,
                      meta: 'На одну тренировку'
                    }
                  ].map((stat) => {
                    const Icon = stat.icon
                    return (
                      <div
                        key={stat.label}
                        className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-[var(--app-muted)]">
                            {stat.label}
                          </span>
                          <Icon className="size-4 text-violet-300" />
                        </div>
                        <div className="mt-2 text-xl font-semibold text-[var(--app-text)]">
                          {stat.value}
                        </div>
                        <div className="mt-1 text-[10px] leading-4 text-[var(--app-muted)]">
                          {stat.meta}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="grid gap-4 xl:grid-cols-[1fr_1.25fr]">
                  <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
                    <div className="flex items-center gap-2">
                      <Flame className="size-5 text-violet-300" />
                      <div>
                        <h2 className="text-sm font-semibold text-[var(--app-text)]">
                          Распределение нагрузки
                        </h2>
                        <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                          Процент считается по доле рабочих подходов.
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 space-y-4">
                      {report.muscleGroups
                        .filter((item) => item.sets > 0)
                        .map((item) => {
                          const classes = workoutMuscleGroupClasses[item.muscleGroup]
                          return (
                            <div key={item.muscleGroup}>
                              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-2 font-semibold',
                                    classes.text
                                  )}
                                >
                                  <WorkoutMuscleArtwork
                                    groups={[item.muscleGroup]}
                                    className="size-8 shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] p-0.5"
                                  />
                                  {workoutMuscleGroupLabel(item.muscleGroup)}
                                </span>
                                <span className="text-[var(--app-muted)]">
                                  {formatNumber(item.loadPercent)}% · {item.sets} подх. ·{' '}
                                  {item.reps} повт.
                                </span>
                              </div>
                              <div className="h-2 overflow-hidden rounded-full bg-[var(--app-workspace)]">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-[width]',
                                    classes.bar
                                  )}
                                  style={{ width: `${Math.min(100, item.loadPercent)}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="size-5 text-violet-300" />
                      <div>
                        <h2 className="text-sm font-semibold text-[var(--app-text)]">
                          Динамика нагрузки
                        </h2>
                        <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                          Подходы и повторения по дням; тоннаж показывается только для упражнений с
                          весом.
                        </p>
                      </div>
                    </div>
                    {report.timeline.length === 0 ? (
                      <div className="flex min-h-48 items-center justify-center text-sm text-[var(--app-muted)]">
                        Нет данных за период
                      </div>
                    ) : (
                      <div className="mt-5 space-y-2.5">
                        {report.timeline.slice(-18).map((day) => {
                          const maxSets = Math.max(1, ...report.timeline.map((item) => item.sets))
                          return (
                            <div
                              key={day.date}
                              className="grid grid-cols-[88px_minmax(0,1fr)_110px] items-center gap-3"
                            >
                              <span className="text-xs text-[var(--app-muted)]">
                                {day.date.slice(5)}
                              </span>
                              <div className="h-7 overflow-hidden rounded-lg bg-[var(--app-workspace)]">
                                <div
                                  className="flex h-full items-center rounded-lg bg-violet-500/20 px-2 text-[10px] font-medium text-violet-200"
                                  style={{
                                    width: `${Math.max(
                                      day.sets > 0 ? 8 : 0,
                                      (day.sets / maxSets) * 100
                                    )}%`
                                  }}
                                >
                                  {day.sets} подх.
                                </div>
                              </div>
                              <div className="text-right text-xs text-[var(--app-muted)]">
                                <div>{day.reps} повт.</div>
                                <div className="mt-0.5 text-[10px]">
                                  {day.externalWeightSets > 0 && `${formatNumber(day.volumeKg)} кг`}
                                  {day.externalWeightSets > 0 && day.bodyweightSets > 0
                                    ? ' · '
                                    : ''}
                                  {day.bodyweightSets > 0 && `${day.bodyweightSets} без веса`}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>
                </div>

                <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
                  <div className="flex items-center gap-2 border-b border-[var(--app-border)] px-5 py-4">
                    <Target className="size-5 text-violet-300" />
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--app-text)]">
                        По упражнениям
                      </h2>
                      <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                        Для упражнений с весом — тоннаж и рабочий вес; без дополнительного веса —
                        прогресс по повторениям.
                      </p>
                    </div>
                  </div>
                  {report.exercises.length === 0 ? (
                    <div className="flex min-h-48 items-center justify-center text-sm text-[var(--app-muted)]">
                      Нет упражнений за выбранный период
                    </div>
                  ) : (
                    <div className="grid gap-3 p-4 lg:grid-cols-2">
                      {report.exercises.map((item) => {
                        const change = item.usesExternalWeight
                          ? item.weightChangeKg
                          : item.repsChange
                        return (
                          <article
                            key={`${item.exerciseId}-${item.title}-${item.usesExternalWeight ? 'weight' : 'bodyweight'}`}
                            className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4"
                          >
                            <div className="flex items-start gap-3">
                              <WorkoutMuscleArtwork
                                groups={item.muscleGroups}
                                className="size-12 shrink-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold text-[var(--app-text)]">
                                    {item.title}
                                  </h3>
                                  <span
                                    className={cn(
                                      'rounded-lg border px-2 py-0.5 text-[10px] font-semibold',
                                      item.usesExternalWeight
                                        ? 'border-violet-400/25 bg-violet-500/10 text-violet-200'
                                        : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                                    )}
                                  >
                                    {item.usesExternalWeight
                                      ? 'С дополнительным весом'
                                      : 'Без дополнительного веса'}
                                  </span>
                                </div>
                                <div className="mt-1 text-[11px] text-[var(--app-muted)]">
                                  {workoutMuscleGroupsLabel(item.muscleGroups)}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2">
                              {[
                                ['Тренировки', item.sessions],
                                ['Подходы', item.sets],
                                ['Повторы', item.reps]
                              ].map(([label, value]) => (
                                <div
                                  key={String(label)}
                                  className="rounded-xl bg-[var(--app-surface)] p-2.5"
                                >
                                  <div className="text-[10px] text-[var(--app-muted)]">{label}</div>
                                  <div className="mt-1 text-sm font-semibold text-[var(--app-text)]">
                                    {value}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {item.usesExternalWeight ? (
                              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                                {[
                                  ['Тоннаж', `${formatNumber(item.volumeKg)} кг`],
                                  ['Средний вес', `${formatNumber(item.averageWeightKg)} кг`],
                                  ['Максимум', `${formatNumber(item.maxWeightKg)} кг`],
                                  ['Расч. 1ПМ', `${formatNumber(item.estimatedOneRepMax)} кг`],
                                  [
                                    'Изменение',
                                    `${item.weightChangeKg > 0 ? '+' : ''}${formatNumber(item.weightChangeKg)} кг`
                                  ]
                                ].map(([label, value]) => (
                                  <div
                                    key={String(label)}
                                    className="rounded-xl bg-[var(--app-surface)] p-2.5"
                                  >
                                    <div className="text-[10px] text-[var(--app-muted)]">
                                      {label}
                                    </div>
                                    <div
                                      className={cn(
                                        'mt-1 text-xs font-semibold',
                                        label === 'Изменение'
                                          ? change > 0
                                            ? 'text-emerald-300'
                                            : change < 0
                                              ? 'text-rose-300'
                                              : 'text-[var(--app-muted)]'
                                          : 'text-[var(--app-text)]'
                                      )}
                                    >
                                      {value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {[
                                  ['Лучший подход', `${item.bestSetReps} повт.`],
                                  ['Первая трен.', `${item.firstBestReps} повт.`],
                                  ['Последняя трен.', `${item.lastBestReps} повт.`],
                                  [
                                    'Изменение',
                                    `${item.repsChange > 0 ? '+' : ''}${item.repsChange} повт.`
                                  ]
                                ].map(([label, value]) => (
                                  <div
                                    key={String(label)}
                                    className="rounded-xl bg-[var(--app-surface)] p-2.5"
                                  >
                                    <div className="text-[10px] text-[var(--app-muted)]">
                                      {label}
                                    </div>
                                    <div
                                      className={cn(
                                        'mt-1 text-xs font-semibold',
                                        label === 'Изменение'
                                          ? change > 0
                                            ? 'text-emerald-300'
                                            : change < 0
                                              ? 'text-rose-300'
                                              : 'text-[var(--app-muted)]'
                                          : 'text-[var(--app-text)]'
                                      )}
                                    >
                                      {value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </article>
                        )
                      })}
                    </div>
                  )}
                </section>

                <div className="grid gap-4 xl:grid-cols-2">
                  <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
                    <div className="flex items-center gap-2 border-b border-[var(--app-border)] px-5 py-4">
                      <FileText className="size-5 text-violet-300" />
                      <h2 className="text-sm font-semibold text-[var(--app-text)]">
                        По программам
                      </h2>
                    </div>
                    <div className="divide-y divide-[var(--app-border)]">
                      {report.programs.length === 0 ? (
                        <div className="px-5 py-10 text-center text-sm text-[var(--app-muted)]">
                          Нет данных
                        </div>
                      ) : (
                        report.programs.map((item) => (
                          <div
                            key={item.programId ?? 'custom'}
                            className="flex items-center gap-3 px-5 py-3.5"
                          >
                            <span className="flex size-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                              <FileText className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-[var(--app-text)]">
                                {item.name}
                              </div>
                              <div className="mt-0.5 text-xs text-[var(--app-muted)]">
                                {item.sessions} трен. · {item.sets} подх. · {item.reps} повт.
                              </div>
                            </div>
                            <div className="shrink-0 text-right text-xs font-medium text-[var(--app-muted)]">
                              {item.externalWeightSets > 0 && (
                                <div>{formatNumber(item.volumeKg)} кг</div>
                              )}
                              {item.bodyweightSets > 0 && (
                                <div className="mt-0.5 text-[10px]">
                                  {item.bodyweightSets} подх. без веса
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
                    <div className="flex items-center gap-2 border-b border-[var(--app-border)] px-5 py-4">
                      <Trophy className="size-5 text-amber-300" />
                      <div>
                        <h2 className="text-sm font-semibold text-[var(--app-text)]">
                          Лучшие показатели
                        </h2>
                        <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                          Силовые рекорды и лучшие подходы без дополнительного веса считаются
                          отдельно.
                        </p>
                      </div>
                    </div>
                    {report.personalRecords.length === 0 &&
                    report.bodyweightRecords.length === 0 ? (
                      <div className="px-5 py-10 text-center text-sm text-[var(--app-muted)]">
                        Добавьте тренировки, чтобы появились рекорды
                      </div>
                    ) : (
                      <div>
                        {report.personalRecords.length > 0 && (
                          <div>
                            <div className="border-b border-[var(--app-border)] px-5 py-2 text-[10px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
                              С дополнительным весом
                            </div>
                            <div className="divide-y divide-[var(--app-border)]">
                              {report.personalRecords.slice(0, 8).map((record, index) => (
                                <div
                                  key={`${record.exerciseId}-${record.title}`}
                                  className="flex items-center gap-3 px-5 py-3.5"
                                >
                                  <WorkoutMuscleArtwork
                                    groups={record.muscleGroups}
                                    className="size-9 shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] p-0.5"
                                  />
                                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-[10px] font-bold text-amber-300">
                                    {index + 1}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-[var(--app-text)]">
                                      {record.title}
                                    </div>
                                    <div className="mt-0.5 text-xs text-[var(--app-muted)]">
                                      {record.weightKg} кг × {record.reps} ·{' '}
                                      {formatDate(record.date)}
                                    </div>
                                  </div>
                                  <span className="text-sm font-semibold text-amber-200">
                                    ≈ {formatNumber(record.estimatedOneRepMax)} кг
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {report.bodyweightRecords.length > 0 && (
                          <div>
                            <div className="border-y border-[var(--app-border)] px-5 py-2 text-[10px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
                              Без дополнительного веса
                            </div>
                            <div className="divide-y divide-[var(--app-border)]">
                              {report.bodyweightRecords.slice(0, 8).map((record) => (
                                <div
                                  key={`${record.exerciseId}-${record.title}`}
                                  className="flex items-center gap-3 px-5 py-3.5"
                                >
                                  <WorkoutMuscleArtwork
                                    groups={record.muscleGroups}
                                    className="size-9 shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] p-0.5"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-[var(--app-text)]">
                                      {record.title}
                                    </div>
                                    <div className="mt-0.5 text-xs text-[var(--app-muted)]">
                                      Лучший подход · {formatDate(record.date)}
                                    </div>
                                  </div>
                                  <span className="text-sm font-semibold text-emerald-200">
                                    {record.reps} повт.
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                </div>

                <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="size-5 text-violet-300" />
                    <h2 className="text-sm font-semibold text-[var(--app-text)]">
                      Средние показатели периода
                    </h2>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                    {[
                      ['Подходов / трен.', formatNumber(report.summary.averageSetsPerSession)],
                      ['Повторов / трен.', formatNumber(report.summary.averageRepsPerSession)],
                      [
                        'Тоннаж / трен.',
                        `${formatNumber(report.summary.averageVolumeKgPerSession)} кг`
                      ],
                      [
                        'Средний вес (с весом)',
                        `${formatNumber(report.summary.averageWeightKg)} кг`
                      ],
                      ['Подходов с весом', report.summary.externalWeightSets],
                      ['Без доп. веса', report.summary.bodyweightSets]
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3"
                      >
                        <div className="text-[11px] text-[var(--app-muted)]">{label}</div>
                        <div className="mt-1 text-lg font-semibold text-[var(--app-text)]">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )
          )}
        </section>
      )}

      <WorkoutExerciseDialog
        open={exerciseDialogOpen}
        exercise={editingExercise}
        busy={isBusy}
        onOpenChange={(open) => {
          setExerciseDialogOpen(open)
          if (!open) setEditingExercise(null)
        }}
        onSave={saveExercise}
      />
      <WorkoutProgramDialog
        open={programDialogOpen}
        program={editingProgram}
        exercises={exercises}
        busy={isBusy}
        onOpenChange={(open) => {
          setProgramDialogOpen(open)
          if (!open) setEditingProgram(null)
        }}
        onSave={saveProgram}
      />
      <WorkoutSessionDialog
        open={sessionDialogOpen}
        session={editingSession}
        exercises={exercises}
        programs={programs}
        busy={isBusy}
        onOpenChange={(open) => {
          setSessionDialogOpen(open)
          if (!open) setEditingSession(null)
        }}
        onSave={saveSession}
      />
      <WorkoutProgressDialog
        open={progressDialogOpen}
        entry={editingProgress}
        exercises={exercises}
        busy={isBusy}
        onOpenChange={(open) => {
          setProgressDialogOpen(open)
          if (!open) setEditingProgress(null)
        }}
        onSave={saveProgress}
      />
      <WorkoutSessionDetailDialog
        open={sessionDetailOpen}
        session={selectedSession}
        onOpenChange={(open) => {
          setSessionDetailOpen(open)
          if (!open) setSelectedSession(null)
        }}
        onEdit={() => {
          if (!selectedSession) return
          setEditingSession(selectedSession)
          setSessionDetailOpen(false)
          setSessionDialogOpen(true)
        }}
      />

      <DeleteConfirmationDialog
        open={deleteExerciseTarget !== null}
        title="Удалить упражнение?"
        subject={deleteExerciseTarget?.title}
        description="Удаление возможно только если упражнение не используется в программах или истории."
        notice="Если упражнение используется в программе, сначала удалите его из этой программы."
        isSubmitting={isDeleting}
        error={error}
        onOpenChange={(open) => {
          if (!open) setDeleteExerciseTarget(null)
        }}
        onConfirm={confirmDeleteExercise}
      />
      <DeleteConfirmationDialog
        open={deleteProgramTarget !== null}
        title="Удалить программу?"
        subject={deleteProgramTarget?.name}
        description="Записанные тренировки сохранятся и продолжат показывать название программы из исторического снимка."
        notice="Состав программы будет удалён"
        isSubmitting={isDeleting}
        error={error}
        onOpenChange={(open) => {
          if (!open) setDeleteProgramTarget(null)
        }}
        onConfirm={confirmDeleteProgram}
      />
      <DeleteConfirmationDialog
        open={deleteSessionTarget !== null}
        title="Удалить тренировку?"
        subject={deleteSessionTarget?.programName || deleteSessionTarget?.date}
        description="Будут удалены все упражнения, подходы, повторения и веса этой записи."
        notice="Это изменит статистику и отчёты"
        isSubmitting={isDeleting}
        error={error}
        onOpenChange={(open) => {
          if (!open) setDeleteSessionTarget(null)
        }}
        onConfirm={confirmDeleteSession}
      />
      <DeleteConfirmationDialog
        open={deleteProgressTarget !== null}
        title="Удалить запись прогресса?"
        subject={deleteProgressTarget ? formatDate(deleteProgressTarget.date) : undefined}
        description="Будут удалены показатели, заметки и локальные фотографии этой записи."
        notice="Восстановить запись после удаления нельзя"
        isSubmitting={isDeleting}
        error={error}
        onOpenChange={(open) => {
          if (!open) setDeleteProgressTarget(null)
        }}
        onConfirm={confirmDeleteProgress}
      />
    </StandardModulePage>
  )
}
