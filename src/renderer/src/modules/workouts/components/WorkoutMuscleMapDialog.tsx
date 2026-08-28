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

interface HoverPosition {
  x: number
  y: number
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
const TOOLTIP_WIDTH = 280
const TOOLTIP_HEIGHT = 164
const TOOLTIP_GAP = 16

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

function zoneForAnatomyGroup(group: AnatomyMuscleGroup | null): WorkoutMuscleZone | null {
  if (!group) return null
  for (const zone of Object.keys(ZONE_CONFIG) as WorkoutMuscleZone[]) {
    if (ZONE_CONFIG[zone].groups.includes(group)) return zone
  }
  return null
}

function MuscleMapBody({
  view,
  zoneCounts,
  maxCount,
  activeGroup,
  onHover
}: {
  view: AnatomyView
  zoneCounts: Map<WorkoutMuscleZone, number>
  maxCount: number
  activeGroup: AnatomyMuscleGroup | null
  onHover: (group: AnatomyMuscleGroup | null) => void
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
      activeGroup={activeGroup}
      glow
      idPrefix={`workout-muscle-map-${view.toLowerCase()}-${id}`}
      width={440}
      backgroundImage={view === 'FRONT' ? maleFront : maleBack}
      backgroundOpacity={0.86}
      backgroundGrayscale
      backgroundBrightness={0.76}
      onHover={onHover}
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
  const [hoveredGroup, setHoveredGroup] = useState<AnatomyMuscleGroup | null>(null)
  const [hoverPosition, setHoverPosition] = useState<HoverPosition | null>(null)

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

  const hoveredZone = zoneForAnatomyGroup(hoveredGroup)
  const hoveredInfo = hoveredZone
    ? (analysis.rows.find((row) => row.zone === hoveredZone) ?? null)
    : null

  function clearHover(): void {
    setHoveredGroup(null)
    setHoverPosition(null)
  }

  function changeView(nextView: AnatomyView): void {
    clearHover()
    setView(nextView)
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      icon={<Activity />}
      size="xl"
    >
      {analysis.rows.length === 0 ? (
        <div className="flex min-h-[560px] items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-6 text-center text-sm text-[var(--app-muted)]">
          {emptyMessage}
        </div>
      ) : (
        <section
          aria-label="Интерактивная карта мышц"
          className="relative isolate h-[620px] overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] [perspective:1400px]"
          onPointerMove={(event) => {
            if (!hoveredGroup) return
            const bounds = event.currentTarget.getBoundingClientRect()
            const relativeX = event.clientX - bounds.left + TOOLTIP_GAP
            const relativeY = event.clientY - bounds.top + TOOLTIP_GAP
            setHoverPosition({
              x: Math.min(
                Math.max(relativeX, TOOLTIP_GAP),
                Math.max(TOOLTIP_GAP, bounds.width - TOOLTIP_WIDTH - TOOLTIP_GAP)
              ),
              y: Math.min(
                Math.max(relativeY, TOOLTIP_GAP),
                Math.max(TOOLTIP_GAP, bounds.height - TOOLTIP_HEIGHT - TOOLTIP_GAP)
              )
            })
          }}
          onPointerLeave={clearHover}
        >
          <div className="sr-only">
            <span>Задействованные мышцы</span>
            {analysis.rows.map((row) => (
              <span key={row.zone}>{workoutMuscleGroupLabel(row.zone)}</span>
            ))}
          </div>

          <div className="absolute top-4 left-1/2 z-20 flex -translate-x-1/2 items-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]/90 p-1 shadow-[var(--app-shadow-card)] backdrop-blur-xl">
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
                onClick={() => changeView(side)}
              >
                {side === 'FRONT' ? 'Спереди' : 'Сзади'}
              </button>
            ))}
            <button
              type="button"
              aria-label="Повернуть модель"
              className="ml-1 flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
              onClick={() => changeView(view === 'FRONT' ? 'BACK' : 'FRONT')}
            >
              <RotateCcw className="size-4" />
            </button>
          </div>

          <div
            className={cn(
              'relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]',
              view === 'BACK' && '[transform:rotateY(180deg)]'
            )}
          >
            <div className="absolute inset-0 flex items-start justify-center px-5 pt-10 pb-12 [backface-visibility:hidden] [&>svg]:max-h-full [&>svg]:w-full">
              <MuscleMapBody
                view="FRONT"
                zoneCounts={analysis.zoneCounts}
                maxCount={analysis.maxCount}
                activeGroup={view === 'FRONT' ? hoveredGroup : null}
                onHover={setHoveredGroup}
              />
            </div>
            <div className="absolute inset-0 flex [transform:rotateY(180deg)] items-start justify-center px-5 pt-10 pb-12 [backface-visibility:hidden] [&>svg]:max-h-full [&>svg]:w-full">
              <MuscleMapBody
                view="BACK"
                zoneCounts={analysis.zoneCounts}
                maxCount={analysis.maxCount}
                activeGroup={view === 'BACK' ? hoveredGroup : null}
                onHover={setHoveredGroup}
              />
            </div>
          </div>

          {hoveredInfo && hoverPosition && (
            <div
              role="status"
              className="pointer-events-none absolute z-30 w-[280px] rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]/95 p-3.5 shadow-[var(--app-shadow-card)] backdrop-blur-xl transition-opacity"
              style={{ left: hoverPosition.x, top: hoverPosition.y }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-semibold text-[var(--app-text)]">
                  {workoutMuscleGroupLabel(hoveredInfo.zone)}
                </div>
                <span className="shrink-0 rounded-lg bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-300">
                  {hoveredInfo.count} {exerciseCountLabel(hoveredInfo.count)}
                </span>
              </div>
              <div className="mt-2 space-y-1 text-xs leading-5 text-[var(--app-muted)]">
                {hoveredInfo.exercises.slice(0, 4).map((exercise) => (
                  <div key={exercise} className="truncate">
                    {exercise}
                  </div>
                ))}
                {hoveredInfo.exercises.length > 4 && (
                  <div className="text-[var(--app-muted)]/75">
                    + ещё {hoveredInfo.exercises.length - 4}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </AppDialog>
  )
}
