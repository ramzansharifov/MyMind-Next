import {
  BarChart3,
  CalendarDays,
  Droplets,
  Flame,
  Leaf,
  Star,
  Utensils,
  type LucideIcon
} from 'lucide-react'
import type { ReactNode } from 'react'

import type {
  NutritionFoodRecord,
  NutritionLogSourceType,
  NutritionMealType,
  NutritionRecipeRecord,
  NutritionReport
} from '../../../../../shared/contracts/nutrition'
import { AppSelect } from '../../../shared/ui/AppSelect'
import {
  NUTRITION_MEAL_OPTIONS,
  NUTRITION_SOURCE_OPTIONS,
  nutritionMealLabel
} from '../nutrition-options'
import { formatNutritionNumber } from '../nutrition-utils'

export type NutritionReportPeriod = '7' | '30' | '90' | '365' | 'custom'

interface NutritionReportsViewProps {
  report: NutritionReport | null
  loading: boolean
  period: NutritionReportPeriod
  dateFrom: string
  dateTo: string
  mealType: 'all' | NutritionMealType
  sourceType: 'all' | NutritionLogSourceType
  sourceId: string
  foods: NutritionFoodRecord[]
  recipes: NutritionRecipeRecord[]
  onPeriodChange: (period: NutritionReportPeriod) => void
  onDateFromChange: (date: string) => void
  onDateToChange: (date: string) => void
  onMealTypeChange: (mealType: 'all' | NutritionMealType) => void
  onSourceTypeChange: (sourceType: 'all' | NutritionLogSourceType) => void
  onSourceIdChange: (sourceId: string) => void
}

export function NutritionReportsView({
  report,
  loading,
  period,
  dateFrom,
  dateTo,
  mealType,
  sourceType,
  sourceId,
  foods,
  recipes,
  onPeriodChange,
  onDateFromChange,
  onDateToChange,
  onMealTypeChange,
  onSourceTypeChange,
  onSourceIdChange
}: NutritionReportsViewProps): React.JSX.Element {
  const sourceOptions =
    sourceType === 'food'
      ? foods.map((food) => ({ value: food.id, label: food.name }))
      : sourceType === 'recipe'
        ? recipes.map((recipe) => ({ value: recipe.id, label: recipe.name }))
        : []

  return (
    <section className="mt-5 space-y-4">
      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
        <div className="flex flex-wrap gap-2">
          <div className="min-w-[150px]">
            <AppSelect
              ariaLabel="Период отчёта"
              value={period}
              options={[
                { value: '7', label: '7 дней' },
                { value: '30', label: '30 дней' },
                { value: '90', label: '90 дней' },
                { value: '365', label: '365 дней' },
                { value: 'custom', label: 'Свой период' }
              ]}
              onValueChange={(value) => onPeriodChange(value as NutritionReportPeriod)}
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            aria-label="Начало отчёта"
            className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none"
            onChange={(event) => onDateFromChange(event.target.value)}
          />
          <input
            type="date"
            value={dateTo}
            aria-label="Конец отчёта"
            className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none"
            onChange={(event) => onDateToChange(event.target.value)}
          />
          <div className="min-w-[175px]">
            <AppSelect
              ariaLabel="Приём пищи в отчёте"
              value={mealType}
              options={[{ value: 'all', label: 'Все приёмы пищи' }, ...NUTRITION_MEAL_OPTIONS]}
              onValueChange={(value) => onMealTypeChange(value as 'all' | NutritionMealType)}
            />
          </div>
          <div className="min-w-[165px]">
            <AppSelect
              ariaLabel="Источник в отчёте"
              value={sourceType}
              options={[{ value: 'all', label: 'Все источники' }, ...NUTRITION_SOURCE_OPTIONS]}
              onValueChange={(value) =>
                onSourceTypeChange(value as 'all' | NutritionLogSourceType)
              }
            />
          </div>
          {sourceType !== 'all' && sourceType !== 'custom' && (
            <div className="min-w-[200px] flex-1">
              <AppSelect
                ariaLabel="Конкретный источник"
                value={sourceId}
                options={[
                  {
                    value: 'all',
                    label: sourceType === 'food' ? 'Все продукты' : 'Все рецепты'
                  },
                  ...sourceOptions
                ]}
                onValueChange={onSourceIdChange}
              />
            </div>
          )}
        </div>
        <p className="mt-3 text-[11px] leading-5 text-[var(--app-muted)]">
          Фильтры меняют статистику продуктов, приёмов пищи и БЖУ. Попадание в дневную калорийную цель всегда считается по полному рациону дня, чтобы частичный фильтр не давал ложный результат.
        </p>
      </div>

      {loading && !report ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-sm text-[var(--app-muted)]">
          Считаем отчёт…
        </div>
      ) : report ? (
        <ReportContents report={report} />
      ) : null}
    </section>
  )
}

function ReportContents({ report }: { report: NutritionReport }): React.JSX.Element {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <MetricCard label="Дней с записями" value={String(report.summary.loggedDays)} />
        <MetricCard label="Позиций" value={String(report.summary.entries)} />
        <MetricCard
          label="Средние ккал"
          value={formatNutritionNumber(report.summary.averageCalories, 0)}
        />
        <MetricCard
          label="Белки / день"
          value={`${formatNutritionNumber(report.summary.averageProteinG)} г`}
        />
        <MetricCard
          label="Жиры / день"
          value={`${formatNutritionNumber(report.summary.averageFatG)} г`}
        />
        <MetricCard
          label="Углеводы / день"
          value={`${formatNutritionNumber(report.summary.averageCarbsG)} г`}
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
        <ReportPanel title="Распределение БЖУ" icon={BarChart3}>
          {report.macroShare.map((item) => (
            <ReportBar
              key={item.macro}
              label={
                item.macro === 'protein'
                  ? 'Белки'
                  : item.macro === 'fat'
                    ? 'Жиры'
                    : 'Углеводы'
              }
              percent={item.percent}
              caption={`${formatNutritionNumber(item.percent)}% · ${formatNutritionNumber(item.calories, 0)} ккал`}
            />
          ))}
        </ReportPanel>

        <ReportPanel title="По приёмам пищи" icon={Utensils}>
          {report.meals.map((meal) => (
            <ReportBar
              key={meal.mealType}
              label={nutritionMealLabel(meal.mealType)}
              percent={meal.percent}
              caption={`${formatNutritionNumber(meal.percent)}% · ${formatNutritionNumber(meal.calories, 0)} ккал · ${meal.entries} поз.`}
            />
          ))}
        </ReportPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <ReportPanel title="Динамика по дням" icon={CalendarDays}>
          <NutritionTimeline report={report} />
        </ReportPanel>
        <ReportPanel title="Чаще всего" icon={Star}>
          <TopItems report={report} />
        </ReportPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportPanel title="Дополнительные показатели" icon={Leaf}>
          <div className="grid grid-cols-2 gap-3">
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
            <SmallMetric label="Дней с целью" value={String(report.summary.calorieGoalDays)} />
          </div>
        </ReportPanel>

        <ReportPanel title="Сравнение с калорийной целью" icon={Flame}>
          <div className="grid grid-cols-3 gap-3 max-[520px]:grid-cols-1">
            <SmallMetric
              label="В пределах ±10%"
              value={String(report.summary.calorieGoalHitDays)}
            />
            <SmallMetric label="Выше" value={String(report.summary.daysAboveCalories)} />
            <SmallMetric label="Ниже" value={String(report.summary.daysBelowCalories)} />
          </div>
          <p className="mt-3 text-[11px] leading-5 text-[var(--app-muted)]">
            Для каждого дня используется цель, которая действовала на его дату.
          </p>
        </ReportPanel>
      </div>

      <ReportPanel title="Вода по дням" icon={Droplets}>
        <WaterTimeline report={report} />
      </ReportPanel>
    </>
  )
}

function NutritionTimeline({ report }: { report: NutritionReport }): React.JSX.Element {
  if (report.timeline.length === 0) {
    return <EmptyReportText>Нет данных за выбранный период</EmptyReportText>
  }

  const maxCalories = Math.max(1, ...report.timeline.map((day) => day.nutrients.calories))
  return (
    <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
      {report.timeline.slice(-60).map((day) => (
        <div
          key={day.date}
          className="grid grid-cols-[82px_minmax(0,1fr)_100px] items-center gap-3 max-[520px]:grid-cols-[70px_minmax(0,1fr)]"
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
          <span className="text-right text-xs text-[var(--app-muted)] max-[520px]:col-span-2">
            {formatNutritionNumber(day.nutrients.calories, 0)} ккал
            {day.targetCalories ? ` / ${formatNutritionNumber(day.targetCalories, 0)}` : ''}
          </span>
        </div>
      ))}
    </div>
  )
}

function WaterTimeline({ report }: { report: NutritionReport }): React.JSX.Element {
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

function TopItems({ report }: { report: NutritionReport }): React.JSX.Element {
  if (report.topItems.length === 0) return <EmptyReportText>Нет данных</EmptyReportText>

  return (
    <div className="space-y-2">
      {report.topItems.slice(0, 12).map((item, index) => (
        <div
          key={`${item.sourceType}-${item.sourceId ?? item.title}`}
          className="flex items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-semibold text-violet-300">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[var(--app-text)]">{item.title}</div>
            <div className="mt-0.5 text-[11px] text-[var(--app-muted)]">
              {item.entries} раз · {formatNutritionNumber(item.calories, 0)} ккал
            </div>
          </div>
        </div>
      ))}
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

function ReportPanel({
  title,
  icon: Icon,
  children
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
}): React.JSX.Element {
  return (
    <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="size-4 text-violet-300" />
        <h2 className="text-sm font-semibold text-[var(--app-text)]">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function ReportBar({
  label,
  percent,
  caption
}: {
  label: string
  percent: number
  caption: string
}): React.JSX.Element {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-[var(--app-text)]">{label}</span>
        <span className="text-right text-[var(--app-muted)]">{caption}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--app-workspace)]">
        <div
          className="h-full rounded-full bg-violet-400"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  )
}

function SmallMetric({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3">
      <div className="text-[11px] text-[var(--app-muted)]">{label}</div>
      <div className="mt-1 text-lg font-semibold text-[var(--app-text)]">{value}</div>
    </div>
  )
}

function EmptyReportText({ children }: { children: ReactNode }): React.JSX.Element {
  return <p className="py-12 text-center text-sm text-[var(--app-muted)]">{children}</p>
}
