import { Apple } from 'lucide-react'
import { useEffect, useState } from 'react'

import type {
  CreateNutritionFoodInput,
  NutritionEntityStatus,
  NutritionFoodCategory,
  NutritionFoodRecord,
  NutritionUnit,
  NutritionValues,
  UpdateNutritionFoodInput
} from '../../../../../shared/contracts/nutrition'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { AppSelect } from '../../../shared/ui/AppSelect'
import {
  NUTRITION_CATEGORY_OPTIONS,
  NUTRITION_UNIT_OPTIONS
} from '../nutrition-options'
import {
  EMPTY_NUTRITION_VALUES,
  NUTRITION_INPUT_CLASS_NAME,
  NUTRITION_TEXTAREA_CLASS_NAME
} from '../nutrition-utils'
import {
  NutritionCheckField,
  NutritionFormField,
  NutritionSecondaryButton
} from './NutritionFormPrimitives'

const NUTRIENT_FIELDS: Array<{
  key: keyof NutritionValues
  label: string
  unit: string
}> = [
  { key: 'calories', label: 'Калории', unit: 'ккал' },
  { key: 'proteinG', label: 'Белки', unit: 'г' },
  { key: 'fatG', label: 'Жиры', unit: 'г' },
  { key: 'carbsG', label: 'Углеводы', unit: 'г' },
  { key: 'fiberG', label: 'Клетчатка', unit: 'г' },
  { key: 'sugarG', label: 'Сахар', unit: 'г' },
  { key: 'sodiumMg', label: 'Натрий', unit: 'мг' }
]

interface NutritionFoodDialogProps {
  open: boolean
  food: NutritionFoodRecord | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: CreateNutritionFoodInput | UpdateNutritionFoodInput) => Promise<void>
}

export function NutritionFoodDialog({
  open,
  food,
  busy,
  onOpenChange,
  onSave
}: NutritionFoodDialogProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState<NutritionFoodCategory>('other')
  const [baseAmount, setBaseAmount] = useState(100)
  const [baseUnit, setBaseUnit] = useState<Exclude<NutritionUnit, 'serving'>>('g')
  const [nutrients, setNutrients] = useState<NutritionValues>({ ...EMPTY_NUTRITION_VALUES })
  const [favorite, setFavorite] = useState(false)
  const [status, setStatus] = useState<NutritionEntityStatus>('active')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    setName(food?.name ?? '')
    setBrand(food?.brand ?? '')
    setCategory(food?.category ?? 'other')
    setBaseAmount(food?.baseAmount ?? 100)
    setBaseUnit(food?.baseUnit ?? 'g')
    setNutrients(food?.nutrients ?? { ...EMPTY_NUTRITION_VALUES })
    setFavorite(food?.favorite ?? false)
    setStatus(food?.status ?? 'active')
    setNotes(food?.notes ?? '')
  }, [food, open])

  function updateNutrient(key: keyof NutritionValues, value: string): void {
    const parsed = Number(value)
    setNutrients((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0
    }))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!name.trim() || !Number.isFinite(baseAmount) || baseAmount <= 0 || busy) return

    const payload: CreateNutritionFoodInput = {
      name: name.trim(),
      brand: brand.trim(),
      category,
      baseAmount,
      baseUnit,
      nutrients,
      favorite,
      status,
      notes
    }
    await onSave(food ? { ...payload, id: food.id } : payload)
    onOpenChange(false)
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={food ? 'Изменить продукт' : 'Новый продукт'}
      description="Добавьте продукт один раз — затем его можно быстро использовать в дневнике и рецептах."
      icon={<Apple />}
      size="lg"
      busy={busy}
      footer={
        <>
          <NutritionSecondaryButton disabled={busy} onClick={() => onOpenChange(false)}>
            Отмена
          </NutritionSecondaryButton>
          <button
            type="submit"
            form="nutrition-food-form"
            disabled={busy || !name.trim() || baseAmount <= 0}
            className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-45"
          >
            {food ? 'Сохранить' : 'Добавить'}
          </button>
        </>
      }
    >
      <form id="nutrition-food-form" className="space-y-4" onSubmit={(event) => void submit(event)}>
        <NutritionFormField label="Название">
          <input
            autoFocus
            value={name}
            maxLength={180}
            placeholder="Например, куриная грудка"
            className={NUTRITION_INPUT_CLASS_NAME}
            onChange={(event) => setName(event.target.value)}
          />
        </NutritionFormField>

        <div className="grid gap-3 sm:grid-cols-2">
          <NutritionFormField label="Бренд / производитель" hint="необязательно">
            <input
              value={brand}
              maxLength={160}
              placeholder="Например, Простоквашино"
              className={NUTRITION_INPUT_CLASS_NAME}
              onChange={(event) => setBrand(event.target.value)}
            />
          </NutritionFormField>
          <NutritionFormField label="Категория">
            <AppSelect
              ariaLabel="Категория продукта"
              value={category}
              options={NUTRITION_CATEGORY_OPTIONS}
              onValueChange={(value) => setCategory(value as NutritionFoodCategory)}
            />
          </NutritionFormField>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_160px] gap-3 max-[560px]:grid-cols-1">
          <NutritionFormField label="Пищевая ценность указана на">
            <input
              type="number"
              min="0.001"
              max="100000"
              step="0.001"
              value={baseAmount}
              className={NUTRITION_INPUT_CLASS_NAME}
              onChange={(event) => setBaseAmount(Number(event.target.value))}
            />
          </NutritionFormField>
          <NutritionFormField label="Единица">
            <AppSelect
              ariaLabel="Единица продукта"
              value={baseUnit}
              options={NUTRITION_UNIT_OPTIONS.filter((option) => option.value !== 'serving')}
              onValueChange={(value) =>
                setBaseUnit(value as Exclude<NutritionUnit, 'serving'>)
              }
            />
          </NutritionFormField>
        </div>

        <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
          <div>
            <h3 className="text-xs font-semibold text-[var(--app-text)]">Пищевая ценность</h3>
            <p className="mt-1 text-[11px] text-[var(--app-muted)]">
              Значения относятся к количеству, указанному выше.
            </p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {NUTRIENT_FIELDS.map((field) => (
              <NutritionFormField
                key={field.key}
                label={`${field.label}, ${field.unit}`}
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={nutrients[field.key]}
                  className={NUTRITION_INPUT_CLASS_NAME}
                  onChange={(event) => updateNutrient(field.key, event.target.value)}
                />
              </NutritionFormField>
            ))}
          </div>
        </section>

        <NutritionFormField label="Заметка" hint="необязательно">
          <textarea
            value={notes}
            rows={3}
            maxLength={10000}
            className={NUTRITION_TEXTAREA_CLASS_NAME}
            onChange={(event) => setNotes(event.target.value)}
          />
        </NutritionFormField>

        <div className="flex flex-wrap gap-5">
          <NutritionCheckField label="Избранное" checked={favorite} onChange={setFavorite} />
          <NutritionCheckField
            label="В архиве"
            checked={status === 'archived'}
            onChange={(checked) => setStatus(checked ? 'archived' : 'active')}
          />
        </div>
      </form>
    </AppDialog>
  )
}
