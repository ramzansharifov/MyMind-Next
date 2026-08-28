import { getBodyDiagram } from '@musclemap/assets'
import maleBack from '@musclemap/assets/bodies/male-back.webp'
import maleFront from '@musclemap/assets/bodies/male-front.webp'
import type { MuscleGroup as AnatomyMuscleGroup, MuscleMapValues } from '@musclemap/core'
import { BodyFigure } from '@musclemap/react'
import { Activity, RotateCcw } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'

import type {
  WorkoutMuscleGroup,
  WorkoutMuscleZone
} from '../../../../../shared/contracts/workouts'
import { cn } from '../../../shared/lib/cn'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { workoutMuscleGroupLabel } from '../workout-options'

type AnatomyView = 'FRONT' | 'BACK'

interface ZoneConfig {
  view: AnatomyView
  groups: AnatomyMuscleGroup[]
}

export interface WorkoutMuscleMapExercise {
  title: string
  muscleGroups: readonly WorkoutMuscleGroup[]
}

interface WorkoutMuscleMapDialogProps {
  open: boolean
  title: string
  description: string
  exercises: readonly WorkoutMuscleMapExercise[]
  emptyMessage: string
  onOpenChange: (open: boolean) => void
}

const FALLBACK_ACCENT = '#8b5cf6'

const LEGACY_GROUP_EXPANSIONS: Partial<Record<WorkoutMuscleGroup, WorkoutMuscleZone[]>> = {
  arms: ['shoulders', 'biceps', 'triceps', 'forearms'],
  back: ['traps', 'lats', 'lower_back'],
  legs: ['glutes', 'quadriceps', 'hamstrings', 'calves']
}

const ZONE_CONFIG: Record<WorkoutMuscleZone, ZoneConfig> = {
  shoulders: { view: 'FRONT', groups: ['SHOULDERS_FRONT', 'SHOULDERS_SIDE'] },
  biceps: { view: 'FRONT', groups: ['BICEPS'] },
  triceps: { view: 'BACK', groups: ['TRICEPS'] },
  forearms: { view: 'FRONT', groups: ['FOREARMS'] },
  traps: { view: 'BACK', groups: ['TRAPEZIUS'] },
  lats: { view: 'BACK', groups: ['LATS'] },
  lower_back: { view: 'BACK', groups: ['BACK_LOWER'] },
  chest: { view: 'FRONT', groups: ['CHEST'] },
  abs: { view: 'FRONT', groups: ['CORE'] },
  glutes: { view: 'BACK', groups: ['GLUTES'] },
  quadriceps: { view: 'FRONT', groups: ['QUADS'] },
  hamstrings: { view: 'BACK', groups: ['HAMSTRINGS'] },
  calves: { view: 'BACK', groups: ['CALVES'] }
}

function readAccentColor(): string {
  if (typeof document === 'undefined' || typeof window === 'undefined') return FALLBACK_ACCENT
  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue('--app-accent-500')
    .trim()
  return /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(value) ? value : FALLBACK_ACCENT
}

function useAccentColor(): string {
  const [accentColor, setAccentColor] = useState(readAccentColor)

  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return
    const root = document.documentElement
    const update = (): void => setAccentColor(readAccentColor())
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['data-accent'] })
    return () => observer.disconnect()
  }, [])

  return accentColor
}

function expandGroups(groups: readonly WorkoutMuscleGroup[]): WorkoutMuscleZone[] {
  const result: WorkoutMuscleZone[] = []
  for (const group of groups) {
    const expanded = LEGACY_GROUP_EXPANSIONS[group] ?? [group as WorkoutMuscleZone]
    for (const zone of expanded) {
      if (!result.includes(zone)) result.push(zone)
    }
  }
  return result
}

function exerciseCountLabel(count: number): string {
  const mod100 = count % 100
  const mod10 = count % 10
  if (mod100 >= 11 && mod100 <= 14) return 'упражнений'
  if (mod10 === 1) return 'упражнение'
  if (mod10 >= 2 && mod10 <= 4) return 'упражнения'
  return 'упражнений'
}

function MuscleMapBody({
  view,
  zoneCounts,
  maxCount
}: {
  view: AnatomyView
  zoneCounts: Map<WorkoutMuscleZone, number>
  maxCount: number
}): React.JSX.Element {
  const accentColor = useAccentColor()
  const id = useId().replace(/:/g, '')
  const anatomyScores = new Map<AnatomyMuscleGroup, number>()

  for (const [zone, count] of zoneCounts) {
    const config = ZONE_CONFIG[zone]
    if (config.view !== view || count <= 0) continue
    const score = maxCount > 0 ? 52 + Math.round((count / maxCount) * 48) : 52
    for (const group of config.groups) {
      anatomyScores.set(group, Math.max(anatomyScores.get(group) ?? 0, score))
    }
  }

  const values = Object.fromEntries(
    [...anatomyScores].map(([group, score]) => [group, { score }])
  ) as MuscleMapValues
  const visibleGroups = new Set<AnatomyMuscleGroup>(anatomyScores.keys())

  return (
    <BodyFigure
      diagram={getBodyDiagram('MALE', view)}
      values={values}
      colorModel="LOAD"
      monochromeColor={accentColor}
      monochromeBaseColor="#475569"
      visibleGroups={visibleGroups}
      activeGroup={null}
      glow
      idPrefix={`workout-muscle-map-${view.toLowerCase()}-${id}`}
      width={340}
      backgroundImage={view === 'FRONT' ? maleFront : maleBack}
      backgroundOpacity={0.84}
      backgroundGrayscale
      backgroundBrightness={0.76}
      onHover={() => undefined}
      onSelect={() => undefined}
    />
  )
}

export function WorkoutMuscleMapDialog({
  open,
  title,
  description,
  exercises,
  emptyMessage,
  onOpenChange
}: WorkoutMuscleMapDialogProps): React.JSX.Element {
  const [view, setView] = useState<AnatomyView>('FRONT')

  const analysis = useMemo(() => {
    const zoneCounts = new Map<WorkoutMuscleZone, number>()
    const zoneExercises = new Map<WorkoutMuscleZone, string[]>()

    for (const exercise of exercises) {
      const zones = expandGroups(exercise.muscleGroups)
      for (const zone of zones) {
        zoneCounts.set(zone, (zoneCounts.get(zone) ?? 0) + 1)
        const names = zoneExercises.get(zone) ?? []
        if (!names.includes(exercise.title)) zoneExercises.set(zone, [...names, exercise.title])
      }
    }

    const rows = [...zoneCounts.entries()]
      .map(([zone, count]) => ({ zone, count, exercises: zoneExercises.get(zone) ?? [] }))
      .sort(
        (left, right) =>
          right.count - left.count ||
          workoutMuscleGroupLabel(left.zone).localeCompare(
            workoutMuscleGroupLabel(right.zone),
            'ru'
          )
      )

    return {
      zoneCounts,
      rows,
      maxCount: Math.max(0, ...zoneCounts.values())
    }
  }, [exercises])

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      icon={<Activity />}
      size="xl"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-[var(--app-text)]">
                Анатомическая карта
              </div>
              <div className="mt-0.5 text-xs text-[var(--app-muted)]">
                {exercises.length} {exerciseCountLabel(exercises.length)} · {analysis.rows.length}{' '}
                мышечных зон
              </div>
            </div>
            <div className="flex items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1">
              {(['FRONT', 'BACK'] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  aria-pressed={view === side}
                  className={cn(
                    'h-8 rounded-lg px-3 text-xs font-medium transition-colors',
                    view === side
                      ? 'bg-violet-500 text-white'
                      : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                  )}
                  onClick={() => setView(side)}
                >
                  {side === 'FRONT' ? 'Спереди' : 'Сзади'}
                </button>
              ))}
              <button
                type="button"
                aria-label="Повернуть модель"
                className="ml-1 flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={() => setView((current) => (current === 'FRONT' ? 'BACK' : 'FRONT'))}
              >
                <RotateCcw className="size-4" />
              </button>
            </div>
          </div>

          {analysis.rows.length === 0 ? (
            <div className="flex min-h-[440px] items-center justify-center px-6 text-center text-sm text-[var(--app-muted)]">
              {emptyMessage}
            </div>
          ) : (
            <div className="relative mx-auto h-[500px] w-full max-w-[390px] [perspective:1200px]">
              <div
                className={cn(
                  'relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]',
                  view === 'BACK' && '[transform:rotateY(180deg)]'
                )}
              >
                <div className="absolute inset-0 flex items-start justify-center px-4 pt-1 pb-8 [backface-visibility:hidden] [&>svg]:max-h-full [&>svg]:w-full">
                  <MuscleMapBody
                    view="FRONT"
                    zoneCounts={analysis.zoneCounts}
                    maxCount={analysis.maxCount}
                  />
                </div>
                <div className="absolute inset-0 flex [transform:rotateY(180deg)] items-start justify-center px-4 pt-1 pb-8 [backface-visibility:hidden] [&>svg]:max-h-full [&>svg]:w-full">
                  <MuscleMapBody
                    view="BACK"
                    zoneCounts={analysis.zoneCounts}
                    maxCount={analysis.maxCount}
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
          <div className="text-sm font-semibold text-[var(--app-text)]">Задействованные мышцы</div>
          <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
            Чем больше упражнений затрагивает мышцу, тем ярче она выделена на карте.
          </p>

          <div className="mt-4 space-y-2">
            {analysis.rows.map((row) => (
              <div
                key={row.zone}
                className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[var(--app-text)]">
                    {workoutMuscleGroupLabel(row.zone)}
                  </span>
                  <span className="rounded-lg bg-violet-500/10 px-2 py-1 text-[11px] font-semibold text-violet-300">
                    {row.count} {exerciseCountLabel(row.count)}
                  </span>
                </div>
                <div className="mt-1.5 text-xs leading-5 text-[var(--app-muted)]">
                  {row.exercises.join(' · ')}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppDialog>
  )
}
