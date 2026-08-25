import { Braces, LoaderCircle, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'

import type {
  CreateNutritionFoodInput,
  CreateNutritionFoodsResult
} from '../../../../../shared/contracts/nutrition'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { NUTRITION_FOODS_JSON_EXAMPLE, parseNutritionFoodsJson } from '../nutrition-food-json'

interface NutritionFoodJsonImportDialogProps {
  open: boolean
  busy: boolean
  onOpenChange: (open: boolean) => void
  onImport: (foods: CreateNutritionFoodInput[]) => Promise<CreateNutritionFoodsResult>
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
            onClick={() => setValue(NUTRITION_FOODS_JSON_EXAMPLE)}
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
