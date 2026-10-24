import { TextControl } from '../../../ui/browser'
import { useMemo, useRef, useState } from 'react'
import type {
  CreateNutritionRecipeInput,
  NutritionFoodRecord,
  NutritionRecipeRecord,
  UpdateNutritionRecipeInput
} from '@mymind/contracts/nutrition'
import {
  createNutritionRecipeInputSchema,
  updateNutritionRecipeInputSchema
} from '@mymind/core/validation/nutrition'
import { notifyDataChanged } from '../../app/changes'
import { messageFor, numeric } from '../../shared/ui/form-model'
import { useConfirmation } from '../../shared/ui/confirmation-context'
import { AppDialog } from '../../shared/ui/AppDialog'
import { Button, ErrorState, Label, SearchField } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
export function NutritionRecipeSheet({
  recipe,
  foods,
  save,
  close
}: {
  recipe?: NutritionRecipeRecord
  foods: NutritionFoodRecord[]
  save(input: CreateNutritionRecipeInput | UpdateNutritionRecipeInput): void
  close(): void
}): React.JSX.Element {
  const theme = useTheme()
  const confirm = useConfirmation()
  const [name, setName] = useState(recipe?.name ?? '')
  const [description, setDescription] = useState(recipe?.description ?? '')
  const [servings, setServings] = useState(String(recipe?.servings ?? 1))
  const [ingredients, setIngredients] = useState<Record<string, string>>(
    Object.fromEntries(recipe?.ingredients.map((item) => [item.foodId, String(item.amount)]) ?? [])
  )
  const [query, setQuery] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const guard = useRef(false)
  const dirty =
    name !== (recipe?.name ?? '') ||
    description !== (recipe?.description ?? '') ||
    servings !== String(recipe?.servings ?? 1) ||
    JSON.stringify(ingredients) !==
      JSON.stringify(
        Object.fromEntries(
          recipe?.ingredients.map((item) => [item.foodId, String(item.amount)]) ?? []
        )
      )
  const visibleFoods = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru-RU')
    return foods.filter((food) =>
      `${food.name} ${food.brand}`.toLocaleLowerCase('ru-RU').includes(normalized)
    )
  }, [foods, query])
  const requestClose = (): void => {
    if (!dirty) return close()
    void confirm({
      title: 'Отменить изменения?',
      description: 'Несохранённые изменения будут потеряны.',
      confirmLabel: 'Не сохранять',
      tone: 'warning',
      notice: null,
      onConfirm: close
    })
  }
  const submit = (): void => {
    if (guard.current) return
    guard.current = true
    setPending(true)
    setError('')
    try {
      const payload = {
        name,
        description,
        servings: numeric(servings),
        ingredients: Object.entries(ingredients).map(([foodId, amount]) => ({
          foodId,
          amount: numeric(amount)
        }))
      }
      const input = recipe
        ? updateNutritionRecipeInputSchema.parse({ id: recipe.id, ...payload })
        : createNutritionRecipeInputSchema.parse(payload)
      save(input)
      notifyDataChanged()
      close()
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      guard.current = false
      setPending(false)
    }
  }
  const inputStyle = {
    color: theme.text,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 14,
    minHeight: 50,
    fontSize: 16
  } as const
  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) requestClose()
      }}
      title={recipe ? 'Изменить рецепт' : 'Новый рецепт'}
      description="Состав, количество порций и ингредиенты"
      icon="nutrition"
      presentation="sheet"
      busy={pending}
      footer={
        <>
          <Button label="Отмена" onClick={requestClose} disabled={pending} />
          <Button
            label={pending ? 'Сохранение…' : 'Сохранить'}
            onClick={submit}
            disabled={pending}
            primary
          />
        </>
      }
    >
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            padding: 16,
            gap: 16,
            paddingBottom: 28
          }}
        >
          {error ? <ErrorState message={error} /> : null}
          <Label>Название</Label>
          <TextControl
            aria-label={'Название'}
            value={name}
            onValueChange={setName}
            style={inputStyle}
          ></TextControl>
          <Label>Описание</Label>
          <TextControl
            aria-label={'Описание'}
            value={description}
            onValueChange={setDescription}
            multiline={true}
            style={{
              ...inputStyle,
              minHeight: 90
            }}
          ></TextControl>
          <Label>Количество порций</Label>
          <TextControl
            aria-label={'Количество порций'}
            value={servings}
            onValueChange={setServings}
            inputMode={'decimal'}
            style={inputStyle}
          ></TextControl>
          <Label>Ингредиенты</Label>
          <SearchField value={query} onValueChange={setQuery} />
          {visibleFoods.map((food) => {
            const selected = food.id in ingredients
            return (
              <div
                className="ui-stack"
                key={food.id}
                style={{
                  borderWidth: 1,
                  borderColor: selected ? theme.accent : theme.border,
                  backgroundColor: theme.surface,
                  borderRadius: 12,
                  padding: 12,
                  gap: 8
                }}
              >
                <Label>{food.name}</Label>
                <Label muted>
                  На {food.baseAmount} {food.baseUnit}: {food.nutrients.calories} ккал
                </Label>
                <div
                  className="ui-stack"
                  style={{
                    flexDirection: 'row',
                    gap: 8,
                    alignItems: 'center'
                  }}
                >
                  <Button
                    label={selected ? 'Убрать' : 'Добавить'}
                    selected={selected}
                    onClick={() =>
                      setIngredients((current) => {
                        const next = { ...current }
                        if (selected) delete next[food.id]
                        else next[food.id] = String(food.baseAmount)
                        return next
                      })
                    }
                  />
                  {selected ? (
                    <TextControl
                      aria-label={`Количество: ${food.name}`}
                      value={ingredients[food.id]}
                      onValueChange={(value) =>
                        setIngredients((current) => ({ ...current, [food.id]: value }))
                      }
                      inputMode={'decimal'}
                      style={{
                        ...inputStyle,
                        flex: '1 1 0%'
                      }}
                    ></TextControl>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppDialog>
  )
}
