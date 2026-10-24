import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  NUTRITION_MEAL_TYPES,
  type NutritionMealType,
  type NutritionReport
} from '@mymind/contracts/nutrition'
import { nutritionReportInputSchema } from '@mymind/core/validation/nutrition'
import { localDateKey } from '@mymind/core/habits'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import { FormSheet } from '../../shared/ui/FormSheet'
import { textField, type FormSpec } from '../../shared/ui/form-model'
import { Button, EmptyState, ErrorState, LoadingState, Row } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import {
  mobileReportPeriodLabels,
  reportDateRange,
  type MobileReportPeriod
} from '../../shared/report-period'
import { NutritionTrendCharts } from './NutritionTrendCharts'
const PERIODS: MobileReportPeriod[] = ['7', '30', '90', '365', 'custom']
const mealLabels: Record<NutritionMealType, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
  other: 'Другое'
}
const macroLabels: Record<'protein' | 'fat' | 'carbs', string> = {
  protein: 'Белки',
  fat: 'Жиры',
  carbs: 'Углеводы'
}
export function NutritionReportsView({
  header
}: {
  header?: ReactNode
} = {}): React.JSX.Element {
  const { nutrition: api } = useServices()
  const today = localDateKey()
  const defaults = useMemo(() => reportDateRange('30', '', '', today), [today])
  const [period, setPeriod] = useState<MobileReportPeriod>('30')
  const [customFrom, setCustomFrom] = useState(defaults.dateFrom)
  const [customTo, setCustomTo] = useState(defaults.dateTo)
  const [mealType, setMealType] = useState<'all' | NutritionMealType>('all')
  const [form, setForm] = useState<FormSpec | null>(null)
  const range = useMemo(
    () => reportDateRange(period, customFrom, customTo, today),
    [customFrom, customTo, period, today]
  )
  const state = useCollection(
    useCallback(
      () =>
        api.getReport(
          nutritionReportInputSchema.parse({
            dateFrom: range.dateFrom,
            dateTo: range.dateTo,
            mealType: mealType === 'all' ? null : mealType,
            sourceType: null,
            foodId: null,
            recipeId: null
          })
        ),
      [api, mealType, range.dateFrom, range.dateTo]
    )
  )
  const chooseCustomPeriod = (): void => {
    setForm({
      title: 'Свой период прогресса',
      initial: { dateFrom: customFrom, dateTo: customTo },
      fields: [
        textField('dateFrom', 'С даты', 'text', 'ГГГГ-ММ-ДД'),
        textField('dateTo', 'По дату', 'text', 'ГГГГ-ММ-ДД')
      ],
      save: (values) => {
        const next = reportDateRange(
          'custom',
          String(values.dateFrom),
          String(values.dateTo),
          today
        )
        nutritionReportInputSchema.parse({
          ...next,
          mealType: mealType === 'all' ? null : mealType,
          sourceType: null,
          foodId: null,
          recipeId: null
        })
        setCustomFrom(next.dateFrom)
        setCustomTo(next.dateTo)
        setPeriod('custom')
      }
    })
  }
  if (state.loading && !state.data) return <LoadingState />
  if (state.error && !state.data) return <ErrorState message={state.error} retry={state.refresh} />
  const report = state.data
  if (!report) return <EmptyState text="Отчёт пока недоступен." />
  return (
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%'
      }}
    >
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 32
          }}
        >
          {
            <>
              {header}
              <NutritionReportHeader
                report={report}
                period={period}
                customFrom={customFrom}
                customTo={customTo}
                mealType={mealType}
                onPeriod={(next) => {
                  if (next === 'custom') chooseCustomPeriod()
                  else setPeriod(next)
                }}
                onMealType={setMealType}
              />
            </>
          }
          <div className="ui-stack ui-list" style={{}}>
            {report.timeline.length > 0 ? (
              report.timeline.map((item) => (
                <div className="ui-stack ui-list-item" key={((item) => item.date)(item)}>
                  {
                    <Row
                      title={`${item.date} · ${Math.round(item.nutrients.calories)} ккал`}
                      subtitle={`Б ${item.nutrients.proteinG} · Ж ${item.nutrients.fatG} · У ${item.nutrients.carbsG} · ${item.waterMl} мл воды`}
                    />
                  }
                </div>
              ))
            ) : (
              <EmptyState text="За выбранный период пока нет записей." />
            )}
          </div>
          {state.error ? <ErrorState message={state.error} retry={state.refresh} /> : null}
        </div>
      </div>
      {form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
    </div>
  )
}
function NutritionReportHeader({
  report,
  period,
  customFrom,
  customTo,
  mealType,
  onPeriod,
  onMealType
}: {
  report: NutritionReport
  period: MobileReportPeriod
  customFrom: string
  customTo: string
  mealType: 'all' | NutritionMealType
  onPeriod(value: MobileReportPeriod): void
  onMealType(value: 'all' | NutritionMealType): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        gap: 14,
        paddingBottom: 16
      }}
    >
      <div
        className="ui-stack"
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8
        }}
      >
        {PERIODS.map((value) => (
          <Button
            key={value}
            label={mobileReportPeriodLabels[value]}
            selected={period === value}
            onClick={() => onPeriod(value)}
          />
        ))}
      </div>

      {period === 'custom' ? (
        <span
          className="ui-text"
          style={{
            color: theme.muted,
            fontSize: 12
          }}
        >
          {customFrom} → {customTo}
        </span>
      ) : null}

      <div
        className="ui-stack"
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8
        }}
      >
        <Button
          label="Все приёмы"
          selected={mealType === 'all'}
          onClick={() => onMealType('all')}
        />
        {NUTRITION_MEAL_TYPES.map((value) => (
          <Button
            key={value}
            label={mealLabels[value]}
            selected={mealType === value}
            onClick={() => onMealType(value)}
          />
        ))}
      </div>

      <div
        className="ui-stack"
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        <Metric label="Дней с записями" value={String(report.summary.loggedDays)} />
        <Metric label="Средние ккал" value={String(Math.round(report.summary.averageCalories))} />
        <Metric label="Вода / день" value={`${Math.round(report.summary.averageWaterMl)} мл`} />
        <Metric
          label="Попадание в цель"
          value={`${Math.round(report.summary.calorieGoalHitPercent)}%`}
        />
      </div>

      <NutritionTrendCharts timeline={report.timeline} />

      <Section title="Среднее КБЖУ">
        <div
          className="ui-stack"
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          <Metric label="Белки" value={`${report.summary.averageProteinG.toFixed(1)} г`} compact />
          <Metric label="Жиры" value={`${report.summary.averageFatG.toFixed(1)} г`} compact />
          <Metric label="Углеводы" value={`${report.summary.averageCarbsG.toFixed(1)} г`} compact />
        </div>
      </Section>

      <Section title="Доля макронутриентов">
        {report.macroShare.map((macro) => (
          <ProgressLine
            key={macro.macro}
            label={macroLabels[macro.macro]}
            percent={macro.percent}
            caption={`${Math.round(macro.calories)} ккал`}
          />
        ))}
      </Section>

      <Section title="По приёмам пищи">
        {report.meals.map((meal) => (
          <ProgressLine
            key={meal.mealType}
            label={mealLabels[meal.mealType]}
            percent={meal.percent}
            caption={`${Math.round(meal.calories)} ккал · ${meal.entries} поз.`}
          />
        ))}
      </Section>

      {report.topItems.length > 0 ? (
        <Section title="Частые позиции">
          {report.topItems.slice(0, 8).map((item, index) => (
            <span
              className="ui-text"
              key={`${item.sourceType}:${item.sourceId ?? item.title}:${index}`}
              style={{
                color: theme.muted,
                fontSize: 12
              }}
            >
              {item.title} · {item.entries} раз · {Math.round(item.calories)} ккал
            </span>
          ))}
        </Section>
      ) : null}

      <span
        className="ui-text"
        style={{
          color: theme.muted,
          fontSize: 12,
          fontWeight: 700
        }}
      >
        Динамика по дням
      </span>
    </div>
  )
}
function Metric({
  label,
  value,
  compact = false
}: {
  label: string
  value: string
  compact?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        minWidth: compact ? 104 : 145,
        flexGrow: 1,
        flexBasis: compact ? '29%' : '46%',
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 15,
        backgroundColor: theme.surface,
        padding: 13,
        gap: 4
      }}
    >
      <span
        className="ui-text"
        style={{
          color: theme.muted,
          fontSize: 11
        }}
      >
        {label}
      </span>
      <span
        className="ui-text"
        style={{
          color: theme.text,
          fontSize: 18,
          fontWeight: 800
        }}
      >
        {value}
      </span>
    </div>
  )
}
function Section({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface,
        padding: 14,
        gap: 10
      }}
    >
      <span
        className="ui-text"
        style={{
          color: theme.text,
          fontSize: 15,
          fontWeight: 800
        }}
      >
        {title}
      </span>
      {children}
    </div>
  )
}
function ProgressLine({
  label,
  percent,
  caption
}: {
  label: string
  percent: number
  caption: string
}): React.JSX.Element {
  const theme = useTheme()
  const width = Math.max(0, Math.min(100, percent))
  return (
    <div
      className="ui-stack"
      style={{
        gap: 5
      }}
    >
      <div
        className="ui-stack"
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 10
        }}
      >
        <span
          className="ui-text"
          style={{
            color: theme.text,
            fontSize: 12,
            fontWeight: 700
          }}
        >
          {label}
        </span>
        <span
          className="ui-text"
          style={{
            color: theme.muted,
            fontSize: 11
          }}
        >
          {caption}
        </span>
      </div>
      <div
        className="ui-stack"
        style={{
          height: 7,
          borderRadius: 99,
          overflow: 'hidden',
          backgroundColor: theme.raised
        }}
      >
        <div
          className="ui-stack"
          style={{
            width: `${width}%`,
            height: '100%',
            backgroundColor: theme.accent
          }}
        ></div>
      </div>
    </div>
  )
}
