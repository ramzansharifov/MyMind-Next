import * as Collapsible from '@radix-ui/react-collapsible'
import { ChevronDown, Pencil } from 'lucide-react'
import { useEffect, useState } from 'react'

import type {
  NutritionLogEntryRecord,
  NutritionMealType,
  NutritionUnit,
  NutritionValues,
  UpdateNutritionLogEntryInput
} from '../../../../../shared/contracts/nutrition'
import { cn } from '../../../shared/lib/cn'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { AppSelect } from '../../../shared/ui/AppSelect'
import { NUTRITION_MEAL_OPTIONS, NUTRITION_UNIT_OPTIONS } from '../nutrition-options'
import { NUTRITION_INPUT_CLASS_NAME, NUTRITION_TEXTAREA_CLASS_NAME } from '../nutrition-utils'
import { NutritionFormField, NutritionSecondaryButton } from './NutritionFormPrimitives'

interface NutritionEntryEditDialogProps {
  open: boolean
  entry: NutritionLogEntryRecord | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: UpdateNutritionLogEntryInput) => Promise<void>
}

export function NutritionEntryEditDialog({
  open,
  entry,
  busy,
  onOpenChange,
  onSave
}: NutritionEntryEditDialogProps): React.JSX.Element {
  const [mealType, setMealType] = useState<NutritionMealType>('breakfast')
  const [customMealName, setCustomMealName] = useState('')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState(100)
  const [unit, setUnit] = useState<NutritionUnit>('g')
  const [nutrients, setNutrients] = useState<NutritionValues>(emptyNutrients())
  const [notes, setNotes] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    if (!open || !entry) return
    const timerId = window.setTimeout(() => {
      setMealType(entry.mealType)
      setCustomMealName(entry.customMealName)
      setTitle(entry.title)
      setAmount(entry.amount)
      setUnit(entry.unit)
      setNutrients(entry.nutrients)
      setNotes(entry.notes)
      setDetailsOpen(false)
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [entry, open])

  function updateNutrient(key: keyof NutritionValues, rawValue: string): void {
    const value = Number(rawValue)
    setNutrients((current) => ({
      ...current,
      [key]: Number.isFinite(value) ? Math.max(0, value) : 0
    }))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!entry || busy || !title.trim() || !Number.isFinite(amount) || amount <= 0) return
    if (mealType === 'other' && !customMealName.trim()) return

    await onSave({
      id: entry.id,
      date: entry.date,
      mealType,
      customMealName: customMealName.trim(),
      sourceType: 'custom',
      sourceId: null,
      amount,
      customTitle: title.trim(),
      customUnit: unit,
      customNutrients: nutrients,
      notes
    })
    onOpenChange(false)
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Изменить запись"
      description="Исправьте оценку GPT вручную, если знаете более точное количество или КБЖУ."
      icon={<Pencil />}
      size="lg"
      busy={busy}
      footer={
        <>
          <NutritionSecondaryButton disabled={busy} onClick={() => onOpenChange(false)}>
            Отмена
          </NutritionSecondaryButton>
          <button
            type="submit"
            form="nutrition-entry-edit-form"
            disabled={busy || !entry || !title.trim() || amount <= 0}
            className="bg-accent-500 hover:bg-accent-400 h-10 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-45"
          >
            Сохранить
          </button>
        </>
      }
    >
      <form
        id="nutrition-entry-edit-form"
        className="space-y-4"
        onSubmit={(event) => void submit(event).catch(() => undefined)}
      >
        <div>
          <div className="mb-2 text-xs font-medium text-[var(--app-muted)]">Приём пищи</div>
          <div className="flex flex-wrap gap-1.5">
            {NUTRITION_MEAL_OPTIONS.map((meal) => (
              <button
                key={meal.value}
                type="button"
                aria-pressed={mealType === meal.value}
                className={cn(
                  'h-9 rounded-xl px-3 text-xs font-medium transition-colors',
                  mealType === meal.value
                    ? 'bg-accent-500/15 text-accent-200'
                    : 'bg-[var(--app-workspace)] text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                )}
                onClick={() => setMealType(meal.value)}
              >
                {meal.label}
              </button>
            ))}
          </div>
        </div>

        {mealType === 'other' && (
          <NutritionFormField label="Название приёма">
            <input
              value={customMealName}
              maxLength={80}
              className={NUTRITION_INPUT_CLASS_NAME}
              onChange={(event) => setCustomMealName(event.target.value)}
            />
          </NutritionFormField>
        )}

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px_140px]">
          <NutritionFormField label="Название">
            <input
              autoFocus
              value={title}
              maxLength={180}
              className={NUTRITION_INPUT_CLASS_NAME}
              onChange={(event) => setTitle(event.target.value)}
            />
          </NutritionFormField>
          <NutritionFormField label="Количество">
            <input
              type="number"
              min="0.001"
              max="100000"
              step="0.001"
              value={amount}
              className={NUTRITION_INPUT_CLASS_NAME}
              onChange={(event) => setAmount(Number(event.target.value))}
            />
          </NutritionFormField>
          <NutritionFormField label="Единица">
            <AppSelect
              ariaLabel="Единица количества"
              value={unit}
              options={NUTRITION_UNIT_OPTIONS}
              onValueChange={(value) => setUnit(value as NutritionUnit)}
            />
          </NutritionFormField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NutrientInput
            label="Калории"
            value={nutrients.calories}
            onChange={(value) => updateNutrient('calories', value)}
          />
          <NutrientInput
            label="Белки, г"
            value={nutrients.proteinG}
            onChange={(value) => updateNutrient('proteinG', value)}
          />
          <NutrientInput
            label="Жиры, г"
            value={nutrients.fatG}
            onChange={(value) => updateNutrient('fatG', value)}
          />
          <NutrientInput
            label="Углеводы, г"
            value={nutrients.carbsG}
            onChange={(value) => updateNutrient('carbsG', value)}
          />
        </div>

        <Collapsible.Root open={detailsOpen} onOpenChange={setDetailsOpen}>
          <Collapsible.Trigger asChild>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
            >
              Дополнительные показатели
              <ChevronDown
                className={cn('size-3.5 transition-transform', detailsOpen && 'rotate-180')}
              />
            </button>
          </Collapsible.Trigger>
          <Collapsible.Content className="mt-3 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <NutrientInput
                label="Клетчатка, г"
                value={nutrients.fiberG}
                onChange={(value) => updateNutrient('fiberG', value)}
              />
              <NutrientInput
                label="Сахар, г"
                value={nutrients.sugarG}
                onChange={(value) => updateNutrient('sugarG', value)}
              />
              <NutrientInput
                label="Натрий, мг"
                value={nutrients.sodiumMg}
                onChange={(value) => updateNutrient('sodiumMg', value)}
              />
            </div>
            <NutritionFormField label="Комментарий" hint="необязательно">
              <textarea
                value={notes}
                rows={2}
                maxLength={4000}
                className={NUTRITION_TEXTAREA_CLASS_NAME}
                onChange={(event) => setNotes(event.target.value)}
              />
            </NutritionFormField>
          </Collapsible.Content>
        </Collapsible.Root>
      </form>
    </AppDialog>
  )
}

function NutrientInput({
  label,
  value,
  onChange
}: {
  label: string
  value: number
  onChange: (value: string) => void
}): React.JSX.Element {
  return (
    <NutritionFormField label={label}>
      <input
        type="number"
        min="0"
        step="0.01"
        value={value}
        className={NUTRITION_INPUT_CLASS_NAME}
        onChange={(event) => onChange(event.target.value)}
      />
    </NutritionFormField>
  )
}

function emptyNutrients(): NutritionValues {
  return {
    calories: 0,
    proteinG: 0,
    fatG: 0,
    carbsG: 0,
    fiberG: 0,
    sugarG: 0,
    sodiumMg: 0
  }
}
