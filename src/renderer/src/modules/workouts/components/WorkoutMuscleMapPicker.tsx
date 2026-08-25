import { Check } from 'lucide-react'

import type { WorkoutMuscleGroup } from '../../../../../shared/contracts/workouts'
import { cn } from '../../../shared/lib/cn'
import { workoutMuscleGroupLabel } from '../workout-options'

interface WorkoutMuscleMapPickerProps {
  value: WorkoutMuscleGroup[]
  onChange: (value: WorkoutMuscleGroup[]) => void
}

type ConcreteMuscleZone = Exclude<WorkoutMuscleGroup, 'arms' | 'back' | 'legs'>

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

const BODY_FILL = 'fill-[var(--app-surface)]'
const BODY_STROKE = 'stroke-[var(--app-border)]'
const DETAIL_STROKE = 'stroke-[var(--app-muted)]/35'

function TargetShape({
  paths,
  selected
}: {
  paths: string[]
  selected: boolean
}): React.JSX.Element {
  return (
    <g
      className={cn(
        'transition-all duration-200',
        selected
          ? 'fill-violet-400 stroke-violet-200 drop-shadow-[0_0_7px_rgba(167,139,250,0.38)]'
          : 'fill-violet-400/30 stroke-violet-400/55 group-hover:fill-violet-400/48 group-hover:stroke-violet-300/75'
      )}
      strokeWidth="1.2"
      strokeLinejoin="round"
    >
      {paths.map((path) => (
        <path key={path} d={path} />
      ))}
    </g>
  )
}

function ArmAnatomyIcon({
  zone,
  selected
}: {
  zone: 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  selected: boolean
}): React.JSX.Element {
  const targets: Record<typeof zone, string[]> = {
    shoulders: [
      'M29 32c2-7 8-12 15-14 8-2 16 1 21 7 2 3 3 7 3 11-5 6-12 9-20 9-8 0-15-5-19-13Z'
    ],
    biceps: [
      'M38 43c6-4 14-4 20-1 6 3 9 9 8 15-1 7-6 12-13 14-7 1-14-2-18-8-3-7-2-15 3-20Z'
    ],
    triceps: [
      'M28 43c4-4 9-4 13-1 3 3 5 8 4 13-1 7-5 13-10 17-5 3-11 1-13-4-3-8-1-18 6-25Z'
    ],
    forearms: [
      'M67 59c6-3 12-9 17-14 4-4 9-6 14-5 6 1 10 5 11 10 1 5-1 10-5 14L88 80c-5 5-12 8-18 6-6-2-9-7-8-13-1-6 1-11 5-14Z'
    ]
  }

  return (
    <svg viewBox="0 0 128 104" className="h-[98px] w-[118px]" aria-hidden="true">
      <path
        d="M17 72c3-10 5-22 7-33 2-10 8-18 17-21 10-4 21-1 28 7 5 6 7 14 4 22-2 6-7 11-13 15 5 2 10 2 15-1l13-13c4-4 9-7 15-7 8 0 14 5 16 12 2 6 0 13-5 18L92 86c-7 7-16 10-26 9l-16-2c-8-1-15 1-22 5l-7 4c-5 3-10 1-12-3-2-5 0-10 5-13l7-4c-3-3-5-6-4-10Z"
        className={cn(BODY_FILL, BODY_STROKE)}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g className={cn('fill-none', DETAIL_STROKE)} strokeWidth="1.1" strokeLinecap="round">
        <path d="M29 33c8 7 18 10 29 8" />
        <path d="M34 48c9 6 18 8 28 5" />
        <path d="M34 62c7 5 14 7 22 7" />
        <path d="M65 64c8 6 16 10 25 12" />
        <path d="M78 57c7 3 13 7 17 12" />
      </g>
      <circle cx="60" cy="63" r="2.1" className="fill-[var(--app-muted)]/25" />
      <TargetShape paths={targets[zone]} selected={selected} />
    </svg>
  )
}

function BackAnatomyIcon({
  zone,
  selected
}: {
  zone: 'traps' | 'lats' | 'lower_back'
  selected: boolean
}): React.JSX.Element {
  const targets: Record<typeof zone, string[]> = {
    traps: [
      'M50 22c4-4 8-6 14-6s10 2 14 6l9 12c-7 6-14 9-23 9s-16-3-23-9Z',
      'M41 27c-6 2-11 5-16 8 5 5 11 8 18 9l10-15Z',
      'M87 27c6 2 11 5 16 8-5 5-11 8-18 9L75 29Z'
    ],
    lats: [
      'M27 39c8 1 15 5 22 12l-3 30c-10-3-18-11-22-22-2-7-1-14 3-20Z',
      'M101 39c-8 1-15 5-22 12l3 30c10-3 18-11 22-22 2-7 1-14-3-20Z'
    ],
    lower_back: [
      'M47 75c4-4 10-7 17-7s13 3 17 7l5 17c-7 5-14 7-22 7s-15-2-22-7Z'
    ]
  }

  return (
    <svg viewBox="0 0 128 112" className="h-[100px] w-[116px]" aria-hidden="true">
      <path
        d="M56 10v10c-7 2-14 4-21 7-10 4-17 10-20 18-2 6-1 12 1 20l8 34c2 7 8 11 15 9l14-5c7-2 15-2 22 0l14 5c7 2 13-2 15-9l8-34c2-8 3-14 1-20-3-8-10-14-20-18-7-3-14-5-21-7V10Z"
        className={cn(BODY_FILL, BODY_STROKE)}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g className={cn('fill-none', DETAIL_STROKE)} strokeWidth="1.05" strokeLinecap="round">
        <path d="M64 22v72" />
        <path d="M37 31c6 8 15 13 27 14 12-1 21-6 27-14" />
        <path d="M31 48c7 5 13 11 18 19" />
        <path d="M97 48c-7 5-13 11-18 19" />
        <path d="M45 54c3 6 5 13 5 21" />
        <path d="M83 54c-3 6-5 13-5 21" />
        <path d="M53 88c7-3 15-3 22 0" />
      </g>
      <TargetShape paths={targets[zone]} selected={selected} />
    </svg>
  )
}

function FrontTorsoAnatomyIcon({
  zone,
  selected
}: {
  zone: 'chest' | 'abs'
  selected: boolean
}): React.JSX.Element {
  const targets: Record<typeof zone, string[]> = {
    chest: [
      'M34 35c7-7 16-10 28-9v20c-11 4-22 3-31-3Z',
      'M94 35c-7-7-16-10-28-9v20c11 4 22 3 31-3Z'
    ],
    abs: [
      'M52 48h10v12H51Z',
      'M66 48h10l1 12H66Z',
      'M50 63h12v13H49Z',
      'M66 63h12l1 13H66Z',
      'M49 79h13v14H48Z',
      'M66 79h13l1 14H66Z'
    ]
  }

  return (
    <svg viewBox="0 0 128 112" className="h-[100px] w-[116px]" aria-hidden="true">
      <path
        d="M56 10v10c-7 2-14 4-21 7-10 4-17 10-20 18-2 6-1 12 1 20l8 34c2 7 8 11 15 9l14-5c7-2 15-2 22 0l14 5c7 2 13-2 15-9l8-34c2-8 3-14 1-20-3-8-10-14-20-18-7-3-14-5-21-7V10Z"
        className={cn(BODY_FILL, BODY_STROKE)}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g className={cn('fill-none', DETAIL_STROKE)} strokeWidth="1.05" strokeLinecap="round">
        <path d="M42 26c5 6 12 9 22 9s17-3 22-9" />
        <path d="M64 35v61" />
        <path d="M29 49c10 4 22 6 35 6s25-2 35-6" />
        <path d="M45 57c-2 11-3 22-2 34" />
        <path d="M83 57c2 11 3 22 2 34" />
      </g>
      <TargetShape paths={targets[zone]} selected={selected} />
    </svg>
  )
}

function LowerBodyAnatomyIcon({
  zone,
  selected
}: {
  zone: 'glutes' | 'quadriceps' | 'hamstrings' | 'calves'
  selected: boolean
}): React.JSX.Element {
  const posterior = zone === 'glutes' || zone === 'hamstrings' || zone === 'calves'
  const targets: Record<typeof zone, string[]> = {
    glutes: [
      'M33 22c7-6 16-7 27-3v18c-8 6-18 7-28 2Z',
      'M95 22c-7-6-16-7-27-3v18c8 6 18 7 28 2Z'
    ],
    quadriceps: [
      'M34 40c7-4 15-4 23 0l-3 31c-6 6-13 8-20 5-4-10-4-23 0-36Z',
      'M94 40c-7-4-15-4-23 0l3 31c6 6 13 8 20 5 4-10 4-23 0-36Z'
    ],
    hamstrings: [
      'M34 41c7-4 15-4 22 0l-3 30c-6 4-12 5-19 2-4-10-4-21 0-32Z',
      'M94 41c-7-4-15-4-22 0l3 30c6 4 12 5 19 2 4-10 4-21 0-32Z'
    ],
    calves: [
      'M34 76c5-4 11-4 17 0l-4 25c-4 5-9 7-14 4-2-9-1-19 1-29Z',
      'M94 76c-5-4-11-4-17 0l4 25c4 5 9 7 14 4 2-9 1-19-1-29Z'
    ]
  }

  return (
    <svg viewBox="0 0 128 116" className="h-[102px] w-[112px]" aria-hidden="true">
      <path
        d="M35 11c-7 7-9 17-6 29l3 14c1 6 1 12 0 18l-4 32c-1 7 4 11 10 11h8c5 0 9-3 10-8l6-33c1-4 3-4 4 0l6 33c1 5 5 8 10 8h8c6 0 11-4 10-11l-4-32c-1-6-1-12 0-18l3-14c3-12 1-22-6-29-16-4-42-4-58 0Z"
        className={cn(BODY_FILL, BODY_STROKE)}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g className={cn('fill-none', DETAIL_STROKE)} strokeWidth="1.05" strokeLinecap="round">
        <path d="M64 15v59" />
        <path d="M31 38c10 5 21 7 33 7s23-2 33-7" />
        <path d="M38 74c5 3 10 4 16 3" />
        <path d="M90 74c-5 3-10 4-16 3" />
        <path d="M37 92c4 2 8 3 12 2" />
        <path d="M91 92c-4 2-8 3-12 2" />
      </g>
      {posterior && (
        <path
          d="M33 29c8 7 18 10 31 10s23-3 31-10"
          className={cn('fill-none', DETAIL_STROKE)}
          strokeWidth="1.05"
          strokeLinecap="round"
        />
      )}
      <TargetShape paths={targets[zone]} selected={selected} />
    </svg>
  )
}

function MuscleZoneIcon({
  zone,
  selected
}: {
  zone: ConcreteMuscleZone
  selected: boolean
}): React.JSX.Element {
  if (zone === 'shoulders' || zone === 'biceps' || zone === 'triceps' || zone === 'forearms') {
    return <ArmAnatomyIcon zone={zone} selected={selected} />
  }
  if (zone === 'traps' || zone === 'lats' || zone === 'lower_back') {
    return <BackAnatomyIcon zone={zone} selected={selected} />
  }
  if (zone === 'chest' || zone === 'abs') {
    return <FrontTorsoAnatomyIcon zone={zone} selected={selected} />
  }
  return <LowerBodyAnatomyIcon zone={zone} selected={selected} />
}

function MuscleZoneCard({
  zone,
  selected,
  onToggle
}: {
  zone: ConcreteMuscleZone
  selected: boolean
  onToggle: (zone: ConcreteMuscleZone) => void
}): React.JSX.Element {
  const label = workoutMuscleGroupLabel(zone)

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${selected ? 'Убрать' : 'Выбрать'}: ${label}`}
      className={cn(
        'group relative flex min-h-[166px] flex-col items-center overflow-hidden rounded-2xl border p-3 text-center transition-all duration-200 outline-none',
        'focus-visible:ring-2 focus-visible:ring-violet-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-workspace)]',
        selected
          ? 'border-violet-400/45 bg-violet-500/[0.09] shadow-[0_10px_28px_rgba(124,58,237,0.09)]'
          : 'border-[var(--app-border)] bg-[var(--app-workspace)] hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-[var(--app-control)]'
      )}
      onClick={() => onToggle(zone)}
    >
      <span
        className={cn(
          'absolute top-2.5 right-2.5 grid size-6 place-items-center rounded-full border transition-all',
          selected
            ? 'border-violet-300/45 bg-violet-500 text-white shadow-[0_0_14px_rgba(139,92,246,0.28)]'
            : 'border-[var(--app-border)] bg-[var(--app-surface)] text-transparent group-hover:border-violet-400/25'
        )}
        aria-hidden="true"
      >
        <Check className="size-3.5" strokeWidth={2.5} />
      </span>

      <div
        className={cn(
          'mb-1.5 grid h-[108px] w-full place-items-center rounded-xl transition-colors',
          selected
            ? 'bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.13),transparent_70%)]'
            : 'bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.045),transparent_70%)] group-hover:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.085),transparent_70%)]'
        )}
      >
        <MuscleZoneIcon zone={zone} selected={selected} />
      </div>

      <span
        className={cn(
          'text-[13px] font-semibold transition-colors',
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
  function toggle(zone: ConcreteMuscleZone): void {
    onChange(value.includes(zone) ? value.filter((item) => item !== zone) : [...value, zone])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-medium text-[var(--app-muted)]">Работающие мышцы</span>
          <p className="mt-1 max-w-2xl text-[11px] leading-5 text-[var(--app-muted)]/80">
            Выберите все основные зоны, которые активно работают в упражнении.
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
