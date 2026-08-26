import { ArrowLeft, Braces, Check, ClipboardPaste } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type {
  ImportNutritionMealsInput,
  ImportNutritionMealsResult,
  NutritionMealType,
  NutritionValues
} from '../../../../../shared/contracts/nutrition'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { cn } from '../../../shared/lib/cn'
import { nutritionMealLabel, nutritionUnitLabel } from '../nutrition-options'
import { formatNutritionNumber } from '../nutrition-utils'
import {
  NUTRITION_JSON_EXAMPLE,
  parseNutritionMealsJson
} from '../nutrition-json-import'
import { NutritionSecondaryButton } from './NutritionFormPrimitives'

interface NutritionMealsJsonImportDialogProps {
  open: boolean
  busy: boolean
  selectedDate: string
  onOpenChange: (open: boolean) => void
  onImport: (input: ImportNutritionMealsInput) => Promise<ImportNutritionMealsResult>
}

type Step = 'input' | 'preview'

const ZERO_VALUES: NutritionValues = {
  calories: 0,
  proteinG: 0,
  fatG: 0,
  carbsG: 0,
  fiberG: 0,
  sugarG: 0,
  sodiumMg: 0
}

export function NutritionMealsJsonImportDialog({
  open,
  busy,
  selectedDate,
  onOpenChange,
  onImport
}: NutritionMealsJsonImportDialogProps): React.JSX.Element {
  const [step, setStep] = useState<Step>('input')
  const [rawJson, setRawJson] = useState('')
  const [preview, setPreview] = useState<ImportNutritionMealsInput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showExample, setShowExample] = useState(false)

  useEffect(() => {
    if (!open) return
    const timerId = window.setTimeout(() => {
      setStep('input')
      setRawJson('')
      setPreview(null)
      setError(null)
      setShowExample(false)
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [open])

  const totals = useMemo(() => {
    if (!preview) return ZERO_VALUES
    return preview.meals
      .flatMap((meal) => meal.items)
      .reduce(
        (sum, item) => ({
          calories: sum.calories + item.nutrients.calories,
          proteinG: sum.proteinG + item.nutrients.proteinG,
          fatG: sum.fatG + item.nutrients.fatG,
          carbsG: sum.carbsG + item.nutrients.carbsG,
          fiberG: sum.fiberG + item.nutrients.fiberG,
          sugarG: sum.sugarG + item.nutrients.sugarG,
          sodiumMg: sum.sodiumMg + item.nutrients.sodiumMg
        }),
        { ...ZERO_VALUES }
      )
  }, [preview])

  function previewJson(): void {
    setError(null)
    try {
      const parsed = parseNutritionMealsJson(rawJson)
      setPreview(parsed)
      setStep('preview')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось проверить JSON')
    }
  }

  async function confirmImport(): Promise<void> {
    if (!preview || busy) return
    setError(null)
    try {
      await onImport(preview)
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось добавить питание')
    }
  }

  const itemCount = preview?.meals.reduce((sum, meal) => sum + meal.items.length, 0) ?? 0

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={step === 'input' ? 'Добавить питание из JSON' : 'Проверьте перед добавлением'}
      description={
        step === 'input'
          ? 'Вставьте JSON от вашего GPT. MyMind проверит структуру до сохранения.'
          : `${preview?.date ?? selectedDate} · ${preview?.meals.length ?? 0} приёмов пищи · ${itemCount} позиций`
      }
      icon={<Braces />}
      size="xl"
      busy={busy}
      footer={
        step === 'input' ? (
          <>
            <NutritionSecondaryButton disabled={busy} onClick={() => onOpenChange(false)}>
              Отмена
            </NutritionSecondaryButton>
            <button
              type="button"
              disabled={busy || !rawJson.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-45"
              onClick={previewJson}
            >
              <Check className="size-4" /> Проверить
            </button>
          </>
        ) : (
          <>
            <NutritionSecondaryButton
              disabled={busy}
              onClick={() => {
                setStep('input')
                setError(null)
              }}
            >
              <ArrowLeft className="size-4" /> Назад
            </NutritionSecondaryButton>
            <button
              type="button"
              disabled={busy || !preview}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-45"
              onClick={() => void confirmImport()}
            >
              Добавить {itemCount > 0 ? `(${itemCount})` : ''}
            </button>
          </>
        )
      }
    >
      {step === 'input' ? (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-[var(--app-muted)]">JSON питания</span>
            <textarea
              autoFocus
              value={rawJson}
              rows={15}
              spellCheck={false}
              aria-label="JSON питания"
              placeholder={`Вставьте JSON. Например:\n${NUTRITION_JSON_EXAMPLE}`}
              className="w-full resize-y rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 py-3 font-mono text-xs leading-5 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/45 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/10"
              onChange={(event) => {
                setRawJson(event.target.value)
                setError(null)
              }}
            />
          </label>

          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--app-text)]">Формат для GPT</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                  schemaVersion всегда 1. КБЖУ каждой позиции указывается для её фактического количества.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-medium text-violet-300 hover:bg-violet-500/10"
                onClick={() => setShowExample((current) => !current)}
              >
                <ClipboardPaste className="size-3.5" />
                {showExample ? 'Скрыть пример' : 'Показать пример'}
              </button>
            </div>
            {showExample && (
              <pre className="mt-3 max-h-72 overflow-auto rounded-xl bg-[var(--app-surface)] p-3 text-[11px] leading-5 text-[var(--app-muted)]">
                {NUTRITION_JSON_EXAMPLE}
              </pre>
            )}
          </div>

          {error && <ImportError message={error} />}
        </div>
      ) : preview ? (
        <div className="space-y-4">
          {preview.date !== selectedDate && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-xs text-amber-200">
              В JSON указана дата {preview.date}. После добавления дневник автоматически откроет этот день.
            </div>
          )}

          {preview.meals.map((meal, mealIndex) => (
            <MealPreview key={`${meal.mealType}-${mealIndex}`} meal={meal} />
          ))}

          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/8 p-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs text-violet-200/70">Итого будет добавлено</div>
                <div className="mt-1 text-2xl font-semibold text-[var(--app-text)]">
                  {formatNutritionNumber(totals.calories, 0)} ккал
                </div>
              </div>
              <div className="flex gap-4 text-xs text-[var(--app-muted)]">
                <span>Б {formatNutritionNumber(totals.proteinG)} г</span>
                <span>Ж {formatNutritionNumber(totals.fatG)} г</span>
                <span>У {formatNutritionNumber(totals.carbsG)} г</span>
              </div>
            </div>
          </div>

          {error && <ImportError message={error} />}
        </div>
      ) : null}
    </AppDialog>
  )
}

function MealPreview({ meal }: { meal: ImportNutritionMealsInput['meals'][number] }): React.JSX.Element {
  const calories = meal.items.reduce((sum, item) => sum + item.nutrients.calories, 0)
  const label =
    meal.mealType === 'other' && meal.customMealName
      ? meal.customMealName
      : nutritionMealLabel(meal.mealType as NutritionMealType)

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)]">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--app-border)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--app-text)]">{label}</h3>
        <span className="text-xs text-[var(--app-muted)]">
          {formatNutritionNumber(calories, 0)} ккал
        </span>
      </header>
      <div>
        {meal.items.map((item, index) => (
          <div
            key={`${item.name}-${index}`}
            className={cn(
              'flex gap-3 px-4 py-3',
              index > 0 && 'border-t border-[var(--app-border)]'
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-[var(--app-text)]">{item.name}</div>
              <div className="mt-1 text-[11px] text-[var(--app-muted)]">
                {formatNutritionNumber(item.amount)} {nutritionUnitLabel(item.unit)} · Б{' '}
                {formatNutritionNumber(item.nutrients.proteinG)} · Ж{' '}
                {formatNutritionNumber(item.nutrients.fatG)} · У{' '}
                {formatNutritionNumber(item.nutrients.carbsG)}
              </div>
            </div>
            <div className="shrink-0 text-sm font-medium text-[var(--app-text)]">
              {formatNutritionNumber(item.nutrients.calories, 0)} ккал
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function ImportError({ message }: { message: string }): React.JSX.Element {
  return (
    <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-xs text-red-300">
      {message}
    </div>
  )
}
