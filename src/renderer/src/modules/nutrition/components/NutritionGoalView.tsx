import { Save, Target } from 'lucide-react'
import { useState } from 'react'

import type {
  NutritionTargetRecord,
  SetNutritionTargetsInput
} from '../../../../../shared/contracts/nutrition'
import { NUTRITION_INPUT_CLASS_NAME } from '../nutrition-utils'
import { NutritionFormField } from './NutritionFormPrimitives'

interface NutritionGoalViewProps {
  target: NutritionTargetRecord | null
  busy: boolean
  onSave: (input: SetNutritionTargetsInput) => Promise<void>
}

const FIELDS: Array<{
  key: 'calories' | 'proteinG' | 'fatG' | 'carbsG' | 'fiberG' | 'waterMl'
  label: string
  hint: string
  step: string
}> = [
  { key: 'calories', label: 'Калории', hint: 'ккал', step: '1' },
  { key: 'proteinG', label: 'Белки', hint: 'г', step: '0.1' },
  { key: 'fatG', label: 'Жиры', hint: 'г', step: '0.1' },
  { key: 'carbsG', label: 'Углеводы', hint: 'г', step: '0.1' },
  { key: 'fiberG', label: 'Клетчатка', hint: 'г', step: '0.1' },
  { key: 'waterMl', label: 'Вода', hint: 'мл', step: '1' }
]

type GoalDraft = Record<(typeof FIELDS)[number]['key'], string>

function targetDraft(target: NutritionTargetRecord | null): GoalDraft {
  return {
    calories: target?.calories?.toString() ?? '',
    proteinG: target?.proteinG?.toString() ?? '',
    fatG: target?.fatG?.toString() ?? '',
    carbsG: target?.carbsG?.toString() ?? '',
    fiberG: target?.fiberG?.toString() ?? '',
    waterMl: target?.waterMl?.toString() ?? ''
  }
}

function optionalNumber(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function NutritionGoalView({
  target,
  busy,
  onSave
}: NutritionGoalViewProps): React.JSX.Element {
  const [values, setValues] = useState<GoalDraft>(() => targetDraft(target))

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (busy) return

    const waterMl = optionalNumber(values.waterMl)
    await onSave({
      calories: optionalNumber(values.calories),
      proteinG: optionalNumber(values.proteinG),
      fatG: optionalNumber(values.fatG),
      carbsG: optionalNumber(values.carbsG),
      fiberG: optionalNumber(values.fiberG),
      waterMl: waterMl === null ? null : Math.round(waterMl)
    })
  }

  return (
    <section className="mt-5">
      <form
        className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]"
        onSubmit={(event) => void submit(event).catch(() => undefined)}
      >
        <div className="flex items-start gap-3 border-b border-[var(--app-border)] px-5 py-5">
          <span className="bg-accent-500/10 text-accent-300 flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Target className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[var(--app-text)]">Общая цель питания</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--app-muted)]">
              Это единые ориентиры для питания. Они не привязаны к конкретному дню и применяются в
              «Сегодня», «Дневнике» и «Прогрессе» ко всем датам.
            </p>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {FIELDS.map((field) => (
            <NutritionFormField key={field.key} label={field.label} hint={field.hint}>
              <input
                type="number"
                min="0.001"
                step={field.step}
                value={values[field.key]}
                placeholder="Не задано"
                className={NUTRITION_INPUT_CLASS_NAME}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.key]: event.target.value }))
                }
              />
            </NutritionFormField>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--app-border)] px-5 py-4">
          <p className="text-xs text-[var(--app-muted)]">
            Пустое поле означает, что по этому показателю цель не задана.
          </p>
          <button
            type="submit"
            disabled={busy}
            className="bg-accent-500 hover:bg-accent-400 inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Save className="size-4" />
            Сохранить цель
          </button>
        </div>
      </form>
    </section>
  )
}
