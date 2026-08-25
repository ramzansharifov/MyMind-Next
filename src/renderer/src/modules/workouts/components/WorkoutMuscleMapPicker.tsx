import { Check } from 'lucide-react'

import type { WorkoutMuscleGroup } from '../../../../../shared/contracts/workouts'
import { cn } from '../../../shared/lib/cn'
import { workoutMuscleGroupLabel } from '../workout-options'
import { WorkoutMuscleArtwork } from './WorkoutMuscleArtwork'
import {
  type ConcreteWorkoutMuscleZone,
  WORKOUT_MUSCLE_ZONE_HINTS
} from './workout-muscle-artwork-model'

interface WorkoutMuscleMapPickerProps {
  value: WorkoutMuscleGroup[]
  onChange: (value: WorkoutMuscleGroup[]) => void
}

const MUSCLE_SECTIONS: Array<{
  id: string
  title: string
  subtitle: string
  zones: ConcreteWorkoutMuscleZone[]
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

function MuscleZoneCard({
  zone,
  selected,
  onToggle
}: {
  zone: ConcreteWorkoutMuscleZone
  selected: boolean
  onToggle: (zone: ConcreteWorkoutMuscleZone) => void
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

      <WorkoutMuscleArtwork groups={[zone]} selected={selected} variant="card" />

      <span
        className={cn(
          'mt-1.5 text-[13px] font-semibold transition-colors',
          selected ? 'text-violet-200' : 'text-[var(--app-text)]'
        )}
      >
        {label}
      </span>
      <span className="mt-0.5 text-[10px] leading-4 text-[var(--app-muted)]">
        {WORKOUT_MUSCLE_ZONE_HINTS[zone]}
      </span>
    </button>
  )
}

export function WorkoutMuscleMapPicker({
  value,
  onChange
}: WorkoutMuscleMapPickerProps): React.JSX.Element {
  function toggle(zone: ConcreteWorkoutMuscleZone): void {
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
