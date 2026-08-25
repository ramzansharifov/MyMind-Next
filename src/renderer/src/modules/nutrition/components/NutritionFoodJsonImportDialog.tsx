import { Braces, LoaderCircle, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'

import type {
  CreateNutritionFoodInput,
  CreateNutritionFoodsResult
} from '../../../../../shared/contracts/nutrition'
import { createNutritionFoodInputSchema } from '../../../../../shared/validation/nutrition'
import { AppDialog } from '../../../shared/ui/AppDialog'

interface NutritionFoodJsonImportDialogProps {
  open: boolean
  busy: boolean
  onOpenChange: (open: boolean) => void
  onImport: (foods: CreateNutritionFoodInput[]) => Promise<CreateNutritionFoodsResult>
}

interface ParseResult {
  foods: CreateNutritionFoodInput[]
  error: string | null
}

const EXAMPLE_JSON = `[
  {
    "name": "Куриное филе приготовленное",
    "category": "protein",
    "baseAmount": 100,
    "baseUnit": "g",
    "calories": 165,
    "proteinG": 31,
    "fatG": 3.6,
    "carbsG": 0
  },
  {
    "name": "Гречка варёная",
    "category": "grains",
    "baseAmount": 100,
    "baseUnit": "g",
    "nutrients": {
      "calories": 92,
      "proteinG": 3.4,
      "fatG": 0.6,
      "carbsG": 19.9,
      "fiberG": 2.7,
      "sugarG": 0.9,
      "sodiumMg": 4
    }
  }
]`

function stripCodeFence(value: string): string {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```')) return trimmed
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

function firstDefined(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined)
}

function normalizedCandidate(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value

  const source = value as Record<string, unknown>
  const nutrients =
    source.nutrients && typeof source.nutrients === 'object' && !Array.isArray(source.nutrients)
      ? (source.nutrients as Record<string, unknown>)
      : {}

  return {
    name: source.name,
    brand: source.brand ?? '',
    category: source.category ?? 'other',
    baseAmount: source.baseAmount ?? 100,
    baseUnit: source.baseUnit ?? source.unit ?? 'g',
    nutrients: {
      calories: firstDefined(nutrients.calories, source.calories, source.kcal, 0),
      proteinG: firstDefined(nutrients.proteinG, source.proteinG, source.protein, 0),
      fatG: firstDefined(nutrients.fatG, source.fatG, source.fat, 0),
      carbsG: firstDefined(nutrients.carbsG, source.carbsG, source.carbs, 0),
      fiberG: firstDefined(nutrients.fiberG, source.fiberG, source.fiber, 0),
      sugarG: firstDefined(nutrients.sugarG, source.sugarG, source.sugar, 0),
      sodiumMg: firstDefined(nutrients.sodiumMg, source.sodiumMg, source.sodium, 0)
    },
    favorite: source.favorite ?? false,
    status: source.status ?? 'active',
    notes: source.notes ?? ''
  }
}

function formatIssue(index: number, path: PropertyKey[], message: string): string {
  const field = path.length > 0 ? ` · ${path.map(String).join('.')}` : ''
  return `Продукт ${index + 1}${field}: ${message}`
}

export function parseNutritionFoodsJson(value: string): ParseResult {
  const source = stripCodeFence(value)
  if (!source) return { foods: [], error: null }

  let parsed: unknown
  try {
    parsed = JSON.parse(source) as unknown
  } catch {
    return { foods: [], error: 'JSON содержит синтаксическую ошибку' }
  }

  const candidates = Array.isArray(parsed) ? parsed : [parsed]
  if (candidates.length === 0) return { foods: [], error: 'Массив продуктов пуст' }
  if (candidates.length > 300) {
    return { foods: [], error: 'За один раз можно добавить до 300 продуктов' }
  }

  const foods: CreateNutritionFoodInput[] = []
  for (const [index, candidate] of candidates.entries()) {
    const result = createNutritionFoodInputSchema.safeParse(normalizedCandidate(candidate))
    if (!result.success) {
      const issue = result.error.issues[0]
      return {
        foods: [],
        error: formatIssue(index, issue?.path ?? [], issue?.message ?? 'Некорректные данные')
      }
    }
    foods.push(result.data)
  }

  return { foods, error: null }
}

export function NutritionFoodJsonImportDialog({
  open,
  busy,
  onOpenChange,
  onImport
}: NutritionFoodJsonImportDialogProps): React.JSX.Element {
  const [value, setValue] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const parsed = useMemo(() => parseNutritionFoodsJson(value), [value])

  async function submit(): Promise<void> {
    if (parsed.error || parsed.foods.length === 0) return
    setSubmitError(null)
    try {
      await onImport(parsed.foods)
      setValue('')
      onOpenChange(false)
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : 'Не удалось добавить продукты')
    }
  }

  function changeOpen(nextOpen: boolean): void {
    if (!nextOpen) setSubmitError(null)
    onOpenChange(nextOpen)
  }

  const error = submitError ?? parsed.error

  return (
    <AppDialog
      open={open}
      busy={busy}
      onOpenChange={changeOpen}
      title="Добавить продукты из JSON"
      description="Вставьте один продукт или целый список — MyMind проверит данные перед добавлением"
      icon={<Braces />}
      size="xl"
      bodyClassName="space-y-3"
      footer={
        <>
          <button
            type="button"
            disabled={busy}
            className="h-10 rounded-xl border border-[var(--app-border)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-50"
            onClick={() => changeOpen(false)}
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={busy || parsed.foods.length === 0 || Boolean(parsed.error)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-45"
            onClick={() => void submit()}
          >
            {busy && <LoaderCircle className="size-4 animate-spin" />}
            {parsed.foods.length > 1 ? `Добавить ${parsed.foods.length}` : 'Добавить'}
          </button>
        </>
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-3xl text-xs leading-5 text-[var(--app-muted)]">
          Обязательное поле — <code className="text-[var(--app-text)]">name</code>. По умолчанию
          используется 100 г, категория <code className="text-[var(--app-text)]">other</code> и
          нулевые значения БЖУ. Пищевую ценность можно передать вложенным объектом{' '}
          <code className="text-[var(--app-text)]">nutrients</code> или полями{' '}
          <code className="text-[var(--app-text)]">calories / proteinG / fatG / carbsG</code>.
          Категории: protein, dairy, grains, vegetables, fruits, fats, drinks, sweets, prepared,
          other.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={busy}
            className="h-8 rounded-lg border border-[var(--app-border)] px-3 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-50"
            onClick={() => setValue(EXAMPLE_JSON)}
          >
            Вставить пример
          </button>
          <button
            type="button"
            aria-label="Очистить JSON продуктов"
            disabled={busy || !value}
            className="flex size-8 items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-35"
            onClick={() => setValue('')}
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      <textarea
        value={value}
        aria-label="JSON продуктов"
        autoFocus
        spellCheck={false}
        placeholder='[{ "name": "Картофель", "category": "vegetables", "calories": 77, "proteinG": 2, "fatG": 0.1, "carbsG": 17.5 }]'
        className="min-h-[340px] w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4 font-mono text-[13px] leading-6 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
        onChange={(event) => {
          setValue(event.target.value)
          setSubmitError(null)
        }}
      />

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {error}
        </div>
      ) : parsed.foods.length > 0 ? (
        <div className="text-xs text-emerald-300">Готово к добавлению: {parsed.foods.length}</div>
      ) : null}
    </AppDialog>
  )
}
