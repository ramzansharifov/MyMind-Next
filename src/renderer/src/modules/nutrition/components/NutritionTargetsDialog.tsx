import { Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import type {
  NutritionTargetRecord,
  SetNutritionTargetsInput
} from '../../../../../shared/contracts/nutrition'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { NUTRITION_INPUT_CLASS_NAME, nutritionLocalDateKey } from '../nutrition-utils'
import { NutritionFormField, NutritionSecondaryButton } from './NutritionFormPrimitives'

interface NutritionTargetsDialogProps {
  open: boolean
  target: NutritionTargetRecord | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: SetNutritionTargetsInput) => Promise<void>
}

const FIELDS: Array<{
  key: 'calories' | 'proteinG' | 'fatG' | 'carbsG' | 'fiberG' | 'waterMl'
  label: string
  step: string
}> = [
  { key: 'calories', label: 'Калории, ккал', step: '1' },
  { key: 'proteinG', label: 'Белки, г', step: '0.1' },
  { key: 'fatG', label: 'Жиры, г', step: '0.1' },
  { key: 'carbsG', label: 'Углеводы, г', step: '0.1' },
  { key: 'fiberG', label: 'Клетчатка, г', step: '0.1' },
  { key: 'waterMl', label: 'Вода, мл', step: '1' }
]

type TargetDraft = Record<(typeof FIELDS)[number]['key'], string>

export function NutritionTargetsDialog({
  open,
  target,
  busy,
  onOpenChange,
  onSave
}: NutritionTargetsDialogProps): React.JSX.Element {
  const [effectiveFrom, setEffectiveFrom] = useState(nutritionLocalDateKey())
  const [values, setValues] = useState<TargetDraft>({
    calories: '',
    proteinG: '',
    fatG: '',
    carbsG: '',
    fiberG: '',
    waterMl: ''
  })

  useEffect(() => {
    if (!open) return
    setEffectiveFrom(nutritionLocalDateKey())
    setValues({
      calories: target?.calories?.toString() ?? '',
      proteinG: target?.proteinG?.toString() ?? '',
      fatG: target?.fatG?.toString() ?? '',
      carbsG: target?.carbsG?.toString() ?? '',
      fiberG: target?.fiberG?.toString() ?? '',
      waterMl: target?.waterMl?.toString() ?? ''
    })
  }, [open, target])

  function optionalNumber(value: string): number | null {
    if (!value.trim()) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (busy || !effectiveFrom) return

    await onSave({
      effectiveFrom,
      calories: optionalNumber(values.calories),
      proteinG: optionalNumber(values.proteinG),
      fatG: optionalNumber(values.fatG),
      carbsG: optionalNumber(values.carbsG),
      fiberG: optionalNumber(values.fiberG),
      waterMl: optionalNumber(values.waterMl)
    })
    onOpenChange(false)
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Цели питания"
      description="Дневные ориентиры сохраняются периодами: изменение сегодня не перепишет прошлые отчёты."
      icon={<Settings2 />}
      size="md"
      busy={busy}
      footer={
        <>
          <NutritionSecondaryButton disabled={busy} onClick={() => onOpenChange(false)}>
            Отмена
          </NutritionSecondaryButton>
          <button
            type="submit"
            form="nutrition-targets-form"
            disabled={busy || !effectiveFrom}
            className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-45"
          >
            Сохранить период
          </button>
        </>
      }
    >
      <form
        id="nutrition-targets-form"
        className="space-y-4"
        onSubmit={(event) => void submit(event)}
      >
        <NutritionFormField label="Действует с">
          <input
            type="date"
            value={effectiveFrom}
            className={NUTRITION_INPUT_CLASS_NAME}
            onChange={(event) => setEffectiveFrom(event.target.value)}
          />
        </NutritionFormField>

        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <NutritionFormField key={field.key} label={field.label} hint="необязательно">
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

        <p className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3 text-xs leading-5 text-[var(--app-muted)]">
          Пустое поле означает, что показатель не сравнивается с целью. Значения задаются вручную и используются только для личного отслеживания.
        </p>
      </form>
    </AppDialog>
  )
}
