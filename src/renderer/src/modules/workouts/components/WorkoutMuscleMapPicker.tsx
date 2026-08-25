import { Check } from 'lucide-react'

import type { WorkoutMuscleGroup } from '../../../../../shared/contracts/workouts'
import { cn } from '../../../shared/lib/cn'
import {
  workoutMuscleGroupLabel,
  workoutMuscleGroupOptionsForFamily,
  type WorkoutMuscleFamily
} from '../workout-options'

interface WorkoutMuscleMapPickerProps {
  value: WorkoutMuscleGroup[]
  onChange: (value: WorkoutMuscleGroup[]) => void
}

interface MuscleCardProps {
  title: string
  subtitle: string
  family: WorkoutMuscleFamily
  value: WorkoutMuscleGroup[]
  onToggle: (zone: WorkoutMuscleGroup) => void
  illustration: React.ReactNode
}

interface ZonePathProps {
  zone: WorkoutMuscleGroup
  label: string
  d: string
  selected: boolean
  onToggle: (zone: WorkoutMuscleGroup) => void
}

function ZonePath({ zone, label, d, selected, onToggle }: ZonePathProps): React.JSX.Element {
  return (
    <path
      d={d}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        'cursor-pointer stroke-[1.4] transition-all outline-none',
        selected
          ? 'fill-violet-400/80 stroke-violet-200 drop-shadow-[0_0_8px_rgba(167,139,250,0.35)]'
          : 'fill-[var(--app-control)] stroke-[var(--app-border)] hover:fill-violet-500/20 hover:stroke-violet-400/45 focus:fill-violet-500/20 focus:stroke-violet-400/55'
      )}
      onClick={() => onToggle(zone)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onToggle(zone)
      }}
    />
  )
}

function ZoneChip({
  zone,
  selected,
  onToggle
}: {
  zone: WorkoutMuscleGroup
  selected: boolean
  onToggle: (zone: WorkoutMuscleGroup) => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-medium transition-colors',
        selected
          ? 'border-violet-400/35 bg-violet-500/16 text-violet-200'
          : 'border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:border-violet-400/25 hover:text-[var(--app-text)]'
      )}
      onClick={() => onToggle(zone)}
    >
      {selected && <Check className="size-3" />}
      {workoutMuscleGroupLabel(zone)}
    </button>
  )
}

function MuscleCard({
  title,
  subtitle,
  family,
  value,
  onToggle,
  illustration
}: MuscleCardProps): React.JSX.Element {
  const options = workoutMuscleGroupOptionsForFamily(family)
  const selectedCount = options.filter((option) => value.includes(option.value)).length

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border bg-[var(--app-workspace)] transition-colors',
        selectedCount > 0 ? 'border-violet-400/30' : 'border-[var(--app-border)]'
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[var(--app-border)] px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--app-text)]">{title}</h3>
          <p className="mt-0.5 text-[11px] text-[var(--app-muted)]">{subtitle}</p>
        </div>
        {selectedCount > 0 && (
          <span className="rounded-lg bg-violet-500/12 px-2 py-1 text-[10px] font-semibold text-violet-300">
            {selectedCount} выбрано
          </span>
        )}
      </div>
      <div className="flex min-h-48 items-center justify-center bg-[radial-gradient(circle_at_50%_45%,rgba(139,92,246,0.08),transparent_62%)] px-4 py-3">
        {illustration}
      </div>
      <div className="flex flex-wrap gap-1.5 border-t border-[var(--app-border)] px-3 py-3">
        {options.map((option) => (
          <ZoneChip
            key={option.value}
            zone={option.value}
            selected={value.includes(option.value)}
            onToggle={onToggle}
          />
        ))}
      </div>
    </section>
  )
}

function BackGraphic({
  value,
  onToggle
}: Pick<WorkoutMuscleMapPickerProps, 'value'> & {
  onToggle: (zone: WorkoutMuscleGroup) => void
}): React.JSX.Element {
  return (
    <svg viewBox="0 0 180 190" className="h-44 w-40" aria-label="Схема мышц спины">
      <path
        d="M90 12c-13 0-22 10-22 23 0 9 5 17 12 21l-7 8-24 10-14 31 13 7 14-23 2 68h52l2-68 14 23 13-7-14-31-24-10-7-8c7-4 12-12 12-21 0-13-9-23-22-23Z"
        className="fill-[var(--app-surface)] stroke-[var(--app-border)] stroke-[1.4]"
      />
      <ZonePath
        zone="traps"
        label="Трапеции"
        d="M75 58 90 49l15 9 10 17-25 10-25-10Z"
        selected={value.includes('traps')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="lats"
        label="Левая широчайшая"
        d="M65 77 88 87l-4 43-19 18-9-53Z"
        selected={value.includes('lats')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="lats"
        label="Правая широчайшая"
        d="M115 77 92 87l4 43 19 18 9-53Z"
        selected={value.includes('lats')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="lower_back"
        label="Поясница"
        d="M84 128h12l15 21-8 13H77l-8-13Z"
        selected={value.includes('lower_back')}
        onToggle={onToggle}
      />
    </svg>
  )
}

function ArmsGraphic({
  value,
  onToggle
}: Pick<WorkoutMuscleMapPickerProps, 'value'> & {
  onToggle: (zone: WorkoutMuscleGroup) => void
}): React.JSX.Element {
  return (
    <svg viewBox="0 0 210 190" className="h-44 w-48" aria-label="Схема мышц рук">
      <path
        d="M105 18c-15 0-26 12-26 27 0 10 5 18 13 23l-17 8-23 2-16 25 11 8 19-18 15 4-8 31 7 45h50l7-45-8-31 15-4 19 18 11-8-16-25-23-2-17-8c8-5 13-13 13-23 0-15-11-27-26-27Z"
        className="fill-[var(--app-surface)] stroke-[var(--app-border)] stroke-[1.4]"
      />
      <ZonePath
        zone="shoulders"
        label="Левое плечо"
        d="M75 75c-12-2-22 2-27 12l13 16 18-8Z"
        selected={value.includes('shoulders')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="shoulders"
        label="Правое плечо"
        d="M135 75c12-2 22 2 27 12l-13 16-18-8Z"
        selected={value.includes('shoulders')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="biceps"
        label="Бицепс"
        d="M59 102 76 95l-5 32-13 5-10-20Z"
        selected={value.includes('biceps')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="triceps"
        label="Трицепс"
        d="m151 102-17-7 5 32 13 5 10-20Z"
        selected={value.includes('triceps')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="forearms"
        label="Левое предплечье"
        d="m48 116 12 17-8 34-10-4-4-33Z"
        selected={value.includes('forearms')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="forearms"
        label="Правое предплечье"
        d="m162 116-12 17 8 34 10-4 4-33Z"
        selected={value.includes('forearms')}
        onToggle={onToggle}
      />
    </svg>
  )
}

function ChestGraphic({
  value,
  onToggle
}: Pick<WorkoutMuscleMapPickerProps, 'value'> & {
  onToggle: (zone: WorkoutMuscleGroup) => void
}): React.JSX.Element {
  return (
    <svg viewBox="0 0 180 190" className="h-44 w-40" aria-label="Схема грудных мышц">
      <path
        d="M90 14c-14 0-24 11-24 25 0 10 5 18 13 22L55 73l-10 73 21 28h48l21-28-10-73-24-12c8-4 13-12 13-22 0-14-10-25-24-25Z"
        className="fill-[var(--app-surface)] stroke-[var(--app-border)] stroke-[1.4]"
      />
      <ZonePath
        zone="chest"
        label="Левая грудная мышца"
        d="M62 76c8-10 17-14 27-12v35c-15 2-25-4-30-14Z"
        selected={value.includes('chest')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="chest"
        label="Правая грудная мышца"
        d="M118 76c-8-10-17-14-27-12v35c15 2 25-4 30-14Z"
        selected={value.includes('chest')}
        onToggle={onToggle}
      />
    </svg>
  )
}

function AbsGraphic({
  value,
  onToggle
}: Pick<WorkoutMuscleMapPickerProps, 'value'> & {
  onToggle: (zone: WorkoutMuscleGroup) => void
}): React.JSX.Element {
  const selected = value.includes('abs')
  const parts = [
    'M73 75h15v22H70Z',
    'M92 75h15l3 22H92Z',
    'M70 101h18v23H67Z',
    'M92 101h18l3 23H92Z',
    'M67 128h21v25H64Z',
    'M92 128h21l3 25H92Z'
  ]
  return (
    <svg viewBox="0 0 180 190" className="h-44 w-40" aria-label="Схема мышц пресса">
      <path
        d="M90 14c-14 0-24 11-24 25 0 10 5 18 13 22L57 73l-9 76 20 25h44l20-25-9-76-22-12c8-4 13-12 13-22 0-14-10-25-24-25Z"
        className="fill-[var(--app-surface)] stroke-[var(--app-border)] stroke-[1.4]"
      />
      {parts.map((d, index) => (
        <ZonePath
          key={index}
          zone="abs"
          label="Пресс"
          d={d}
          selected={selected}
          onToggle={onToggle}
        />
      ))}
    </svg>
  )
}

function LegsGraphic({
  value,
  onToggle
}: Pick<WorkoutMuscleMapPickerProps, 'value'> & {
  onToggle: (zone: WorkoutMuscleGroup) => void
}): React.JSX.Element {
  return (
    <svg viewBox="0 0 220 190" className="h-44 w-52" aria-label="Схема мышц ног">
      <text x="53" y="17" className="fill-[var(--app-muted)] text-[8px] font-semibold uppercase">
        спереди
      </text>
      <text x="147" y="17" className="fill-[var(--app-muted)] text-[8px] font-semibold uppercase">
        сзади
      </text>
      <path
        d="M54 24c-13 0-22 9-22 21l8 45-5 73 18 10 12-66 12 66 18-10-5-73 8-45c0-12-9-21-22-21Z"
        className="fill-[var(--app-surface)] stroke-[var(--app-border)] stroke-[1.4]"
      />
      <path
        d="M144 24c-13 0-22 9-22 21l8 45-5 73 18 10 12-66 12 66 18-10-5-73 8-45c0-12-9-21-22-21Z"
        className="fill-[var(--app-surface)] stroke-[var(--app-border)] stroke-[1.4]"
      />
      <ZonePath
        zone="quadriceps"
        label="Квадрицепсы"
        d="M43 55h19l-1 55-18 9-8-32Z"
        selected={value.includes('quadriceps')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="quadriceps"
        label="Квадрицепсы"
        d="M67 55h19l8 32-18 32-18-9Z"
        selected={value.includes('quadriceps')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="glutes"
        label="Ягодицы"
        d="M129 48c8-8 17-8 25-2v27c-10 7-19 5-27-2Z"
        selected={value.includes('glutes')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="glutes"
        label="Ягодицы"
        d="M181 48c-8-8-17-8-25-2v27c10 7 19 5 27-2Z"
        selected={value.includes('glutes')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="hamstrings"
        label="Задняя поверхность бедра"
        d="M130 77h22l-4 46-18-10-5-27Z"
        selected={value.includes('hamstrings')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="hamstrings"
        label="Задняя поверхность бедра"
        d="M158 77h22l5 9-5 27-18 10Z"
        selected={value.includes('hamstrings')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="calves"
        label="Икры"
        d="m39 119 20-6-5 52-10 2-9-10Z"
        selected={value.includes('calves')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="calves"
        label="Икры"
        d="m71 113 20 6 4 38-9 10-10-2Z"
        selected={value.includes('calves')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="calves"
        label="Икры"
        d="m129 119 20-6-5 52-10 2-9-10Z"
        selected={value.includes('calves')}
        onToggle={onToggle}
      />
      <ZonePath
        zone="calves"
        label="Икры"
        d="m161 113 20 6 4 38-9 10-10-2Z"
        selected={value.includes('calves')}
        onToggle={onToggle}
      />
    </svg>
  )
}

export function WorkoutMuscleMapPicker({
  value,
  onChange
}: WorkoutMuscleMapPickerProps): React.JSX.Element {
  function toggle(zone: WorkoutMuscleGroup): void {
    onChange(value.includes(zone) ? value.filter((item) => item !== zone) : [...value, zone])
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="text-xs font-medium text-[var(--app-muted)]">
            Активные мышечные зоны
          </span>
          <p className="mt-1 text-[11px] leading-5 text-[var(--app-muted)]/80">
            Нажмите прямо на область рисунка или на название. Можно выбрать несколько зон.
          </p>
        </div>
        <span className="shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--app-muted)]">
          {value.length} выбрано
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <MuscleCard
          title="Спина"
          subtitle="Широчайшие, трапеции и поясница"
          family="back"
          value={value}
          onToggle={toggle}
          illustration={<BackGraphic value={value} onToggle={toggle} />}
        />
        <MuscleCard
          title="Руки"
          subtitle="Плечи, бицепс, трицепс и предплечья"
          family="arms"
          value={value}
          onToggle={toggle}
          illustration={<ArmsGraphic value={value} onToggle={toggle} />}
        />
        <MuscleCard
          title="Грудные мышцы"
          subtitle="Большая и малая грудные области"
          family="chest"
          value={value}
          onToggle={toggle}
          illustration={<ChestGraphic value={value} onToggle={toggle} />}
        />
        <MuscleCard
          title="Пресс"
          subtitle="Передняя область корпуса"
          family="abs"
          value={value}
          onToggle={toggle}
          illustration={<AbsGraphic value={value} onToggle={toggle} />}
        />
        <div className="lg:col-span-2">
          <MuscleCard
            title="Ноги"
            subtitle="Ягодицы, квадрицепсы, задняя поверхность бедра и икры"
            family="legs"
            value={value}
            onToggle={toggle}
            illustration={<LegsGraphic value={value} onToggle={toggle} />}
          />
        </div>
      </div>
    </div>
  )
}
