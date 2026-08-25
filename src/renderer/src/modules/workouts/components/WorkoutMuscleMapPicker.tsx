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
          ? 'fill-violet-400 stroke-violet-200 drop-shadow-[0_0_7px_rgba(167,139,250,0.4)]'
          : 'fill-violet-400/28 stroke-violet-400/45 group-hover:fill-violet-400/45 group-hover:stroke-violet-300/65'
      )}
      strokeWidth="1.35"
      strokeLinejoin="round"
    >
      {paths.map((path) => (
        <path key={path} d={path} />
      ))}
    </g>
  )
}

function ArmIcon({
  zone,
  selected
}: {
  zone: 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  selected: boolean
}): React.JSX.Element {
  const targets: Record<typeof zone, string[]> = {
    shoulders: ['M31 22c4-7 12-10 19-7 5 2 8 6 9 11-5 2-9 6-11 11-8-1-14-6-17-15Z'],
    biceps: ['M43 31c7-4 15-2 19 4 3 5 3 11 0 16-5 4-11 6-17 4-5-6-6-16-2-24Z'],
    triceps: ['M58 35c5 1 9 5 10 10 1 7-2 14-8 18-5-2-8-6-9-11 3-4 5-10 7-17Z'],
    forearms: ['M48 56c6 1 11 5 14 10l7 11c2 4 0 9-4 11-4 2-9 0-11-4l-8-13c-3-5-2-10 2-15Z']
  }

  return (
    <svg viewBox="0 0 96 96" className="h-[92px] w-[92px]" aria-hidden="true">
      <path
        d="M20 64c5-4 8-10 9-18l2-12c1-9 7-16 16-18 9-2 19 1 25 8l5 6c4 5 4 12 0 17-4 5-11 7-17 4l-7-4-2 8c-1 5 1 11 5 15l8 8c3 3 3 8 0 11-4 4-10 4-14 0L37 76c-4-5-10-8-17-8-3 0-4-2-4-4s1-3 4-4Z"
        className="fill-[var(--app-surface)] stroke-[var(--app-border)]"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M31 35c7 4 14 5 21 3M31 47c7 3 13 5 20 4M49 58c4 5 8 10 12 16"
        className="fill-none stroke-[var(--app-border)]/75"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <TargetShape paths={targets[zone]} selected={selected} />
    </svg>
  )
}

function BackIcon({
  zone,
  selected
}: {
  zone: 'traps' | 'lats' | 'lower_back'
  selected: boolean
}): React.JSX.Element {
  const targets: Record<typeof zone, string[]> = {
    traps: [
      'M35 25c4-5 8-8 13-8s9 3 13 8l-6 15H41Z',
      'M41 40 29 34c2-5 5-8 9-10l10 13Z',
      'M55 40 67 34c-2-5-5-8-9-10L48 37Z'
    ],
    lats: [
      'M28 36c6 2 11 5 16 10l-2 25c-8-3-14-10-17-20Z',
      'M68 36c-6 2-11 5-16 10l2 25c8-3 14-10 17-20Z'
    ],
    lower_back: ['M39 60c3 4 6 6 9 6s6-2 9-6l5 18c-4 4-9 6-14 6s-10-2-14-6Z']
  }

  return (
    <svg viewBox="0 0 96 96" className="h-[92px] w-[92px]" aria-hidden="true">
      <path
        d="M48 12c-7 0-12 5-13 12L20 33c-6 4-9 10-8 17l5 34h62l5-34c1-7-2-13-8-17l-15-9c-1-7-6-12-13-12Z"
        className="fill-[var(--app-surface)] stroke-[var(--app-border)]"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M48 23v56M27 37c5 11 7 23 7 36M69 37c-5 11-7 23-7 36"
        className="fill-none stroke-[var(--app-border)]/75"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <TargetShape paths={targets[zone]} selected={selected} />
    </svg>
  )
}

function TorsoIcon({
  zone,
  selected
}: {
  zone: 'chest' | 'abs'
  selected: boolean
}): React.JSX.Element {
  const targets: Record<typeof zone, string[]> = {
    chest: [
      'M27 34c6-7 13-10 20-8v18c-8 3-16 2-23-3Z',
      'M69 34c-6-7-13-10-20-8v18c8 3 16 2 23-3Z'
    ],
    abs: [
      'M39 45h8v10h-9Z',
      'M49 45h8l1 10h-9Z',
      'M38 57h9v10H37Z',
      'M49 57h9l1 10H49Z',
      'M37 69h10v11H36Z',
      'M49 69h10l1 11H49Z'
    ]
  }

  return (
    <svg viewBox="0 0 96 96" className="h-[92px] w-[92px]" aria-hidden="true">
      <path
        d="M48 11c-7 0-12 5-13 12L20 32c-6 4-9 10-8 17l5 35h62l5-35c1-7-2-13-8-17l-15-9c-1-7-6-12-13-12Z"
        className="fill-[var(--app-surface)] stroke-[var(--app-border)]"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M36 23c3 4 7 6 12 6s9-2 12-6M48 29v52M29 47c5 2 11 3 19 3s14-1 19-3"
        className="fill-none stroke-[var(--app-border)]/75"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <TargetShape paths={targets[zone]} selected={selected} />
    </svg>
  )
}

function LegIcon({
  zone,
  selected
}: {
  zone: 'glutes' | 'quadriceps' | 'hamstrings' | 'calves'
  selected: boolean
}): React.JSX.Element {
  const targets: Record<typeof zone, string[]> = {
    glutes: [
      'M28 25c5-6 11-8 18-5v16c-6 5-13 5-20 1Z',
      'M68 25c-5-6-11-8-18-5v16c6 5 13 5 20 1Z'
    ],
    quadriceps: [
      'M27 38c6-2 12-1 17 2l-3 25c-5 4-10 5-15 2Z',
      'M69 38c-6-2-12-1-17 2l3 25c5 4 10 5 15 2Z'
    ],
    hamstrings: [
      'M28 40c5-3 10-3 15 0l-2 25c-5 3-10 3-14 0Z',
      'M68 40c-5-3-10-3-15 0l2 25c5 3 10 3 14 0Z'
    ],
    calves: [
      'M26 65c5-3 10-2 14 2l-3 18c-4 4-8 4-12 1Z',
      'M70 65c-5-3-10-2-14 2l3 18c4 4 8 4 12 1Z'
    ]
  }

  return (
    <svg viewBox="0 0 96 96" className="h-[92px] w-[92px]" aria-hidden="true">
      <path
        d="M31 14c-7 0-12 5-13 12l4 18-3 43h22l7-39 7 39h22l-3-43 4-18c-1-7-6-12-13-12Z"
        className="fill-[var(--app-surface)] stroke-[var(--app-border)]"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M48 19v29M23 45c7 3 14 4 25 3 11 1 18 0 25-3M31 65c3 2 6 3 9 3M65 65c-3 2-6 3-9 3"
        className="fill-none stroke-[var(--app-border)]/75"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
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
    return <ArmIcon zone={zone} selected={selected} />
  }
  if (zone === 'traps' || zone === 'lats' || zone === 'lower_back') {
    return <BackIcon zone={zone} selected={selected} />
  }
  if (zone === 'chest' || zone === 'abs') {
    return <TorsoIcon zone={zone} selected={selected} />
  }
  return <LegIcon zone={zone} selected={selected} />
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
        'group relative flex min-h-[154px] flex-col items-center overflow-hidden rounded-2xl border p-3 text-center outline-none transition-all duration-200',
        'focus-visible:ring-2 focus-visible:ring-violet-400/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-workspace)]',
        selected
          ? 'border-violet-400/45 bg-violet-500/[0.09] shadow-[0_10px_28px_rgba(124,58,237,0.09)]'
          : 'border-[var(--app-border)] bg-[var(--app-workspace)] hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-[var(--app-control)]'
      )}
      onClick={() => onToggle(zone)}
    >
      <span
        className={cn(
          'absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-full border transition-all',
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
          'mb-1.5 grid h-[98px] w-full place-items-center rounded-xl transition-colors',
          selected
            ? 'bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.13),transparent_68%)]'
            : 'bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.055),transparent_68%)] group-hover:bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.09),transparent_68%)]'
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
            Каждая иконка показывает конкретную мышцу. Нажмите на карточку, чтобы добавить или убрать её из упражнения.
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
