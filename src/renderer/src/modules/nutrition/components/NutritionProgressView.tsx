import { BarChart3, CalendarDays, Droplets, Flame, Leaf, Utensils } from 'lucide-react'

import type { NutritionMealType, NutritionReport } from '../../../../../shared/contracts/nutrition'
import { AppDateField } from '../../../shared/ui/AppDateField'
import { AppSelect } from '../../../shared/ui/AppSelect'
import { NUTRITION_MEAL_OPTIONS, nutritionMealLabel } from '../nutrition-options'
import { formatNutritionNumber } from '../nutrition-utils'

export type NutritionProgressPeriod = '7' | '30' | '90' | '365' | 'custom'

interface NutritionProgressViewProps {
  report: NutritionReport | null
  loading: boolean
  period: NutritionProgressPeriod
  dateFrom: string
  dateTo: string
  mealType: 'all' | NutritionMealType
  onPeriodChange: (period: NutritionProgressPeriod) => void
  onDateFromChange: (date: string) => void
  onDateToChange: (date: string) => void
  onMealTypeChange: (mealType: 'all' | NutritionMealType) => void
}

export function NutritionProgressView({
  report,
  loading,
  period,
  dateFrom,
  dateTo,
  mealType,
  onPeriodChange,
  onDateFromChange,
  onDateToChange,
  onMealTypeChange
}: NutritionProgressViewProps): React.JSX.Element {
  return (
    <section className="mt-5 space-y-4">
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
        <div className="flex flex-wrap gap-2">
          <div className="min-w-[150px]">
            <AppSelect
              ariaLabel="Период прогресса"
              value={period}
              options={[
                { value: '7', label: '7 дней' },
                { value: '30', label: '30 дней' },
                { value: '90', label: '90 дней' },
                { value: '365', label: '365 дней' },
                { value: 'custom', label: 'Свой период' }
              ]}
              onValueChange={(value) => onPeriodChange(value as NutritionProgressPeriod)}
            />
          </div>
          <AppDateField ariaLabel="Начало периода" value={dateFrom} onChange={onDateFromChange} />
          <AppDateField ariaLabel="Конец периода" value={dateTo} onChange={onDateToChange} />
          <div className="min-w-[190px]">
            <AppSelect
              ariaLabel="Приём пищи в прогрессе"
              value={mealType}
              options={[{ value: 'all', label: 'Все приёмы пищи' }, ...NUTRITION_MEAL_OPTIONS]}
              onValueChange={(value) => onMealTypeChange(value as 'all' | NutritionMealType)}
            />
          </div>
        </div>
      </div>

      {loading && !report ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-sm text-[var(--app-muted)]">
          Считаем прогресс…
        </div>
      ) : report ? (
        <ProgressContents report={report} />
      ) : null}
    </section>
  )
}

function ProgressContents({ report }: { report: NutritionReport }): React.JSX.Element {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Дней с записями" value={String(report.summary.loggedDays)} />
        <MetricCard
          label="Средние ккал"
          value={formatNutritionNumber(report.summary.averageCalories, 0)}
        />
        <MetricCard
          label="Вода / день"
          value={`${formatNutritionNumber(report.summary.averageWaterMl, 0)} мл`}
        />
        <MetricCard
          label="Попадание в цель"
          value={`${formatNutritionNumber(report.summary.calorieGoalHitPercent, 0)}%`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Среднее КБЖУ за день" icon={BarChart3}>
          <div className="grid grid-cols-3 gap-3">
            <SmallMetric
              label="Белки"
              value={`${formatNutritionNumber(report.summary.averageProteinG)} г`}
            />
            <SmallMetric
              label="Жиры"
              value={`${formatNutritionNumber(report.summary.averageFatG)} г`}
            />
            <SmallMetric
              label="Углеводы"
              value={`${formatNutritionNumber(report.summary.averageCarbsG)} г`}
            />
          </div>
        </Panel>

        <Panel title="По приёмам пищи" icon={Utensils}>
          <div className="space-y-3">
            {report.meals.map((meal) => (
              <ProgressBar
                key={meal.mealType}
                label={nutritionMealLabel(meal.mealType)}
                percent={meal.percent}
                caption={`${formatNutritionNumber(meal.calories, 0)} ккал · ${meal.entries} поз.`}
              />
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Динамика калорий" icon={CalendarDays}>
        <Timeline report={report} />
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Дополнительные показатели" icon={Leaf}>
          <div className="grid grid-cols-3 gap-3 max-[560px]:grid-cols-1">
            <SmallMetric
              label="Клетчатка / день"
              value={`${formatNutritionNumber(report.summary.averageFiberG)} г`}
            />
            <SmallMetric
              label="Сахар / день"
              value={`${formatNutritionNumber(report.summary.averageSugarG)} г`}
            />
            <SmallMetric
              label="Натрий / день"
              value={`${formatNutritionNumber(report.summary.averageSodiumMg, 0)} мг`}
            />
          </div>
        </Panel>

        <Panel title="Калорийная цель" icon={Flame}>
          <div className="grid grid-cols-3 gap-3 max-[560px]:grid-cols-1">
            <SmallMetric
              label="В пределах ±10%"
              value={String(report.summary.calorieGoalHitDays)}
            />
            <SmallMetric label="Выше" value={String(report.summary.daysAboveCalories)} />
            <SmallMetric label="Ниже" value={String(report.summary.daysBelowCalories)} />
          </div>
        </Panel>
      </div>

      <Panel title="Вода по дням" icon={Droplets}>
        <WaterTimeline report={report} />
      </Panel>
    </>
  )
}

function Timeline({ report }: { report: NutritionReport }): React.JSX.Element {
  if (report.timeline.length === 0) {
    return <EmptyText>Нет данных за выбранный период</EmptyText>
  }

  const maxCalories = Math.max(1, ...report.timeline.map((day) => day.nutrients.calories))
  return (
    <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
      {report.timeline.slice(-60).map((day) => (
        <div
          key={day.date}
          className="grid grid-cols-[82px_minmax(0,1fr)_110px] items-center gap-3 max-[560px]:grid-cols-[70px_minmax(0,1fr)]"
        >
          <span className="text-xs text-[var(--app-muted)]">{day.date.slice(5)}</span>
          <div className="h-7 overflow-hidden rounded-lg bg-[var(--app-workspace)]">
            <div
              className="flex h-full items-center rounded-lg bg-violet-500/20 px-2 text-[10px] text-violet-200"
              style={{
                width: `${Math.max(day.nutrients.calories > 0 ? 6 : 0, (day.nutrients.calories / maxCalories) * 100)}%`
              }}
            >
              {day.nutrients.calories > 0
                ? `${formatNutritionNumber(day.nutrients.proteinG)} г белка`
                : ''}
            </div>
          </div>
          <span className="text-right text-xs text-[var(--app-muted)] max-[560px]:col-span-2">
            {formatNutritionNumber(day.nutrients.calories, 0)} ккал
            {day.targetCalories ? ` / ${formatNutritionNumber(day.targetCalories, 0)}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

function WaterTimeline({ report }: { report: NutritionReport }): React.JSX.Element {
  if (report.timeline.length === 0) return <EmptyText>Нет данных</EmptyText>
  const maxWater = Math.max(1, ...report.timeline.map((day) => day.waterMl))
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {report.timeline.slice(-28).map((day) => (
        <div
          key={day.date}
          className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3"
        >
          <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--app-muted)]">
            <span>{day.date.slice(5)}</span>
            <span>
              {day.waterMl} мл{day.targetWaterMl ? ` / ${day.targetWaterMl}` : ''}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--app-surface)]">
            <div
              className="h-full rounded-full bg-cyan-400"
              style={{ width: `${Math.min(100, (day.waterMl / maxWater) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function ProgressBar({
  label,
  percent,
  caption
}: {
  label: string
  percent: number
  caption: string
}): React.JSX.Element {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-[var(--app-text)]">{label}</span>
        <span className="text-[var(--app-muted)]">{caption}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--app-workspace)]">
        <div
          className="h-full rounded-full bg-violet-400/80"
          style={{ width: `${Math.max(percent > 0 ? 2 : 0, Math.min(100, percent))}%` }}
        />
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
      <div className="text-[11px] text-[var(--app-muted)]">{label}</div>
      <div className="mt-2 text-xl font-semibold text-[var(--app-text)]">{value}</div>
    </div>
  )
}

function SmallMetric({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-xl bg-[var(--app-workspace)] p-3">
      <div className="text-[10px] text-[var(--app-muted)]">{label}</div>
      <div className="mt-1 text-base font-semibold text-[var(--app-text)]">{value}</div>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  children
}: {
  title: string
  icon: typeof BarChart3
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-4 text-violet-300" />
        <h2 className="text-sm font-semibold text-[var(--app-text)]">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function EmptyText({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="py-8 text-center text-sm text-[var(--app-muted)]">{children}</div>
}
