import { getBodyDiagram } from '@musclemap/assets'
import maleBack from '@musclemap/assets/bodies/male-back.webp'
import maleFront from '@musclemap/assets/bodies/male-front.webp'
import type { MuscleGroup as AnatomyMuscleGroup, MuscleMapValues } from '@musclemap/core'
import { BodyFigure } from '@musclemap/react'
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { WorkoutMuscleGroup } from '../../../../../shared/contracts/workouts'
import { cn } from '../../../shared/lib/cn'
import { workoutMuscleGroupLabel } from '../workout-options'

interface WorkoutMuscleMapPickerProps {
  value: WorkoutMuscleGroup[]
  onChange: (value: WorkoutMuscleGroup[]) => void
}

type ConcreteMuscleZone = Exclude<WorkoutMuscleGroup, 'arms' | 'back' | 'legs'>
type AnatomyView = 'FRONT' | 'BACK'

interface AnatomyConfig {
  view: AnatomyView
  groups: AnatomyMuscleGroup[]
  cropViewBox: string
}

const MUSCLE_SECTIONS: Array<{
  id: string
  title: string
  subtitle: string
  zones: ConcreteMuscleZone[]
}> = [
  {
    id: 'arms',
    title: 'Руки',
    subtitle: 'Плечевой пояс и мышцы рук',
    zones: ['shoulders', 'biceps', 'triceps', 'forearms']
  },
  {
    id: 'back',
    title: 'Спина',
    subtitle: 'Верх, широчайшие и поясница',
    zones: ['traps', 'lats', 'lower_back']
  },
  {
    id: 'torso',
    title: 'Корпус',
    subtitle: 'Передняя поверхность корпуса',
    zones: ['chest', 'abs']
  },
  {
    id: 'legs',
    title: 'Ноги',
    subtitle: 'Ягодицы, бедро и голень',
    zones: ['glutes', 'quadriceps', 'hamstrings', 'calves']
  }
]

const ZONE_HINTS: Record<ConcreteMuscleZone, string> = {
  shoulders: 'Дельтовидные',
  biceps: 'Передняя часть плеча',
  triceps: 'Задняя часть плеча',
  forearms: 'Предплечья',
  traps: 'Верх спины',
  lats: 'Боковая часть спины',
  lower_back: 'Нижняя часть спины',
  chest: 'Грудные мышцы',
  abs: 'Прямая мышца живота',
  glutes: 'Ягодичные мышцы',
  quadriceps: 'Передняя поверхность бедра',
  hamstrings: 'Задняя поверхность бедра',
  calves: 'Икроножные мышцы'
}

const ANATOMY_CONFIG: Record<ConcreteMuscleZone, AnatomyConfig> = {
  shoulders: {
    view: 'FRONT',
    groups: ['SHOULDERS_FRONT', 'SHOULDERS_SIDE'],
    cropViewBox: '120 135 470 610'
  },
  biceps: {
    view: 'FRONT',
    groups: ['BICEPS'],
    cropViewBox: '120 175 470 590'
  },
  triceps: {
    view: 'BACK',
    groups: ['TRICEPS'],
    cropViewBox: '115 165 470 610'
  },
  forearms: {
    view: 'FRONT',
    groups: ['FOREARMS'],
    cropViewBox: '105 235 500 610'
  },
  traps: {
    view: 'BACK',
    groups: ['TRAPEZIUS'],
    cropViewBox: '250 105 525 565'
  },
  lats: {
    view: 'BACK',
    groups: ['LATS'],
    cropViewBox: '245 190 535 590'
  },
  lower_back: {
    view: 'BACK',
    groups: ['BACK_LOWER'],
    cropViewBox: '285 350 455 500'
  },
  chest: {
    view: 'FRONT',
    groups: ['CHEST'],
    cropViewBox: '270 180 485 520'
  },
  abs: {
    view: 'FRONT',
    groups: ['CORE'],
    cropViewBox: '300 310 430 500'
  },
  glutes: {
    view: 'BACK',
    groups: ['GLUTES'],
    cropViewBox: '265 565 495 560'
  },
  quadriceps: {
    view: 'FRONT',
    groups: ['QUADS'],
    cropViewBox: '245 585 535 760'
  },
  hamstrings: {
    view: 'BACK',
    groups: ['HAMSTRINGS'],
    cropViewBox: '245 585 535 760'
  },
  calves: {
    view: 'BACK',
    groups: ['CALVES'],
    cropViewBox: '245 760 535 690'
  }
}

const FALLBACK_ACCENT = '#8b5cf6'

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
    const root = document.documentElement
    const update = (): void => setAccentColor(readAccentColor())

    update()
    if (typeof MutationObserver === 'undefined') return

    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['data-accent'] })
    return () => observer.disconnect()
  }, [])

  return accentColor
}

function MuscleIllustration({
  zone,
  selected,
  accentColor
}: {
  zone: ConcreteMuscleZone
  selected: boolean
  accentColor: string
}): React.JSX.Element {
  const config = ANATOMY_CONFIG[zone]
  const diagram = getBodyDiagram('MALE', config.view)
  const values = Object.fromEntries(
    config.groups.map((group) => [group, { score: selected ? 100 : 68 }])
  ) as MuscleMapValues
  const visibleGroups = new Set<AnatomyMuscleGroup>(config.groups)

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none grid h-[132px] w-full place-items-center overflow-hidden rounded-xl transition-all duration-200',
        selected
          ? 'bg-[radial-gradient(circle_at_50%_48%,color-mix(in_srgb,var(--app-accent-500)_13%,transparent),transparent_68%)]'
          : 'bg-[radial-gradient(circle_at_50%_48%,color-mix(in_srgb,var(--app-accent-500)_5%,transparent),transparent_68%)] group-hover:bg-[radial-gradient(circle_at_50%_48%,color-mix(in_srgb,var(--app-accent-500)_8%,transparent),transparent_68%)]'
      )}
    >
      <BodyFigure
        diagram={diagram}
        values={values}
        colorModel="LOAD"
        monochromeColor={accentColor}
        monochromeBaseColor="#475569"
        visibleGroups={visibleGroups}
        activeGroup={null}
        glow={selected}
        idPrefix={`workout-muscle-${zone}`}
        width={176}
        cropViewBox={config.cropViewBox}
        backgroundImage={config.view === 'FRONT' ? maleFront : maleBack}
        backgroundOpacity={0.78}
        backgroundGrayscale
        backgroundBrightness={0.78}
        onHover={() => undefined}
        onSelect={() => undefined}
      />
    </div>
  )
}

function MuscleZoneCard({
  zone,
  selected,
  accentColor,
  onToggle
}: {
  zone: ConcreteMuscleZone
  selected: boolean
  accentColor: string
  onToggle: (zone: ConcreteMuscleZone) => void
}): React.JSX.Element {
  const label = workoutMuscleGroupLabel(zone)

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${selected ? 'Убрать' : 'Выбрать'}: ${label}`}
      className={cn(
        'group relative flex min-h-[190px] flex-col items-center overflow-hidden rounded-2xl border p-2.5 text-center transition-all duration-200 outline-none',
        'focus-visible:ring-2 focus-visible:ring-violet-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-workspace)]',
        selected
          ? 'border-violet-400/45 bg-violet-500/[0.09] shadow-[0_10px_28px_rgba(0,0,0,0.14)]'
          : 'border-[var(--app-border)] bg-[var(--app-workspace)] hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-[var(--app-control)]'
      )}
      onClick={() => onToggle(zone)}
    >
      <span
        className={cn(
          'absolute top-2.5 right-2.5 z-10 grid size-6 place-items-center rounded-full border transition-all',
          selected
            ? 'border-violet-300/45 bg-violet-500 text-white shadow-[0_0_14px_color-mix(in_srgb,var(--app-accent-500)_28%,transparent)]'
            : 'border-[var(--app-border)] bg-[var(--app-surface)] text-transparent group-hover:border-violet-400/25'
        )}
        aria-hidden="true"
      >
        <Check className="size-3.5" strokeWidth={2.5} />
      </span>

      <MuscleIllustration zone={zone} selected={selected} accentColor={accentColor} />

      <span
        className={cn(
          'mt-1.5 text-[13px] font-semibold transition-colors',
          selected ? 'text-violet-200' : 'text-[var(--app-text)]'
        )}
      >
        {label}
      </span>
      <span className="mt-0.5 text-[10px] leading-4 text-[var(--app-muted)]">
        {ZONE_HINTS[zone]}
      </span>
    </button>
  )
}

export function WorkoutMuscleMapPicker({
  value,
  onChange
}: WorkoutMuscleMapPickerProps): React.JSX.Element {
  const accentColor = useAccentColor()

  function toggle(zone: ConcreteMuscleZone): void {
    onChange(value.includes(zone) ? value.filter((item) => item !== zone) : [...value, zone])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-medium text-[var(--app-muted)]">Работающие мышцы</span>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-[var(--app-muted)]/80">
            Выберите все мышечные зоны, которые участвуют в упражнении.
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors',
            value.length > 0
              ? 'border-violet-400/30 bg-violet-500/10 text-violet-300'
              : 'border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)]'
          )}
        >
          {value.length} выбрано
        </span>
      </div>

      <div className="space-y-4">
        {MUSCLE_SECTIONS.map((section) => (
          <section key={section.id} aria-labelledby={`muscle-section-${section.id}`}>
            <div className="mb-2 flex items-baseline gap-2">
              <h3
                id={`muscle-section-${section.id}`}
                className="text-xs font-semibold text-[var(--app-text)]"
              >
                {section.title}
              </h3>
              <span className="text-[10px] text-[var(--app-muted)]">{section.subtitle}</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {section.zones.map((zone) => (
                <MuscleZoneCard
                  key={zone}
                  zone={zone}
                  selected={value.includes(zone)}
                  accentColor={accentColor}
                  onToggle={toggle}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
