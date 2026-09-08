import { useMemo, useRef, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
    Alert.alert('Отменить изменения?', 'Несохранённые изменения будут потеряны.', [
      { text: 'Продолжить', style: 'cancel' },
      { text: 'Не сохранять', style: 'destructive', onPress: close }
    ])
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
    <Modal animationType="slide" onRequestClose={requestClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={{ padding: 16, gap: 12 }}>
            <Label title>{recipe ? 'Изменить рецепт' : 'Новый рецепт'}</Label>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <Button label="Отмена" onPress={requestClose} disabled={pending} />
              <Button label="Сохранить" onPress={submit} disabled={pending} selected />
            </View>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 56 }}
          >
            {error ? <ErrorState message={error} /> : null}
            <Label>Название</Label>
            <TextInput
              accessibilityLabel="Название"
              value={name}
              onChangeText={setName}
              style={inputStyle}
            />
            <Label>Описание</Label>
            <TextInput
              accessibilityLabel="Описание"
              value={description}
              onChangeText={setDescription}
              multiline
              style={{ ...inputStyle, minHeight: 90, textAlignVertical: 'top' }}
            />
            <Label>Количество порций</Label>
            <TextInput
              accessibilityLabel="Количество порций"
              value={servings}
              onChangeText={setServings}
              keyboardType="decimal-pad"
              style={inputStyle}
            />
            <Label>Ингредиенты</Label>
            <SearchField value={query} onChangeText={setQuery} />
            {visibleFoods.map((food) => {
              const selected = food.id in ingredients
              return (
                <View
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
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <Button
                      label={selected ? 'Убрать' : 'Добавить'}
                      selected={selected}
                      onPress={() =>
                        setIngredients((current) => {
                          const next = { ...current }
                          if (selected) delete next[food.id]
                          else next[food.id] = String(food.baseAmount)
                          return next
                        })
                      }
                    />
                    {selected ? (
                      <TextInput
                        accessibilityLabel={`Количество: ${food.name}`}
                        value={ingredients[food.id]}
                        onChangeText={(value) =>
                          setIngredients((current) => ({ ...current, [food.id]: value }))
                        }
                        keyboardType="decimal-pad"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    ) : null}
                  </View>
                </View>
              )
            })}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}
