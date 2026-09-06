import { useCallback, useMemo, useState } from 'react'
import { FlatList, ScrollView, View } from 'react-native'
import type {
  NutritionFoodCategory,
  NutritionFoodRecord,
  NutritionLogEntryRecord,
  NutritionMealType,
  NutritionRecipeRecord,
  NutritionValues
} from '@mymind/contracts/nutrition'
import { NUTRITION_FOOD_CATEGORIES, NUTRITION_MEAL_TYPES } from '@mymind/contracts/nutrition'
import * as validation from '@mymind/core/validation/nutrition'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import { FormSheet } from '../../shared/ui/FormSheet'
import { choiceField, messageFor, textField, type FormSpec } from '../../shared/ui/form-model'
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Row,
  SearchField
} from '../../shared/ui/primitives'
import { NutritionRecipeSheet } from './NutritionRecipeSheet'

type Tab = 'today' | 'diary' | 'foods' | 'recipes' | 'report'
type ListItem =
  | { kind: 'entry'; value: NutritionLogEntryRecord }
  | { kind: 'food'; value: NutritionFoodRecord }
  | { kind: 'recipe'; value: NutritionRecipeRecord }

const mealLabels: Record<NutritionMealType, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
  other: 'Другое'
}
const categoryLabels: Record<NutritionFoodCategory, string> = {
  protein: 'Белковые',
  dairy: 'Молочные',
  grains: 'Крупы',
  vegetables: 'Овощи',
  fruits: 'Фрукты',
  fats: 'Жиры',
  drinks: 'Напитки',
  sweets: 'Сладкое',
  prepared: 'Готовые блюда',
  other: 'Другое'
}
const unitLabels = { g: 'г', ml: 'мл', piece: 'шт.', serving: 'порц.' } as const
const zeroNutrients: NutritionValues = {
  calories: 0,
  proteinG: 0,
  fatG: 0,
  carbsG: 0,
  fiberG: 0,
  sugarG: 0,
  sodiumMg: 0
}

function localDateKey(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

function daysAgoKey(days: number): string {
  return shiftDate(localDateKey(), -days)
}

function nutrientFields(): ReturnType<typeof textField>[] {
  return [
    textField('calories', 'Калории, ккал', 'number'),
    textField('proteinG', 'Белки, г', 'number'),
    textField('fatG', 'Жиры, г', 'number'),
    textField('carbsG', 'Углеводы, г', 'number'),
    textField('fiberG', 'Клетчатка, г', 'number'),
    textField('sugarG', 'Сахар, г', 'number'),
    textField('sodiumMg', 'Натрий, мг', 'number')
  ]
}

function nutrientsFrom(values: Record<string, unknown>): NutritionValues {
  return {
    calories: values.calories as number,
    proteinG: values.proteinG as number,
    fatG: values.fatG as number,
    carbsG: values.carbsG as number,
    fiberG: values.fiberG as number,
    sugarG: values.sugarG as number,
    sodiumMg: values.sodiumMg as number
  }
}

function macroLine(values: NutritionValues): string {
  return `${values.calories} ккал · Б ${values.proteinG} · Ж ${values.fatG} · У ${values.carbsG}`
}

export function NutritionScreen(): React.JSX.Element {
  const { nutrition: api } = useServices()
  const [date, setDate] = useState(localDateKey())
  const overview = useCollection(useCallback(() => api.listOverview({ date }), [api, date]))
  const [tab, setTab] = useState<Tab>('today')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormSpec | null>(null)
  const [recipeEditor, setRecipeEditor] = useState<NutritionRecipeRecord | 'new' | null>(null)
  const data = overview.data
  const foods = useMemo(() => data?.foods ?? [], [data?.foods])
  const recipes = useMemo(() => data?.recipes ?? [], [data?.recipes])
  const entries = data?.entries ?? []
  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')

  const filteredFoods = useMemo(
    () =>
      foods.filter((food) =>
        `${food.name} ${food.brand} ${categoryLabels[food.category]}`
          .toLocaleLowerCase('ru-RU')
          .includes(normalizedQuery)
      ),
    [foods, normalizedQuery]
  )
  const filteredRecipes = useMemo(
    () =>
      recipes.filter((recipe) =>
        `${recipe.name} ${recipe.description}`.toLocaleLowerCase('ru-RU').includes(normalizedQuery)
      ),
    [recipes, normalizedQuery]
  )

  const editFood = (food?: NutritionFoodRecord): void => {
    const nutrients = food?.nutrients ?? zeroNutrients
    setForm({
      title: food ? 'Изменить продукт' : 'Новый продукт',
      initial: {
        name: food?.name ?? '',
        brand: food?.brand ?? '',
        category: food?.category ?? 'other',
        baseAmount: food?.baseAmount ?? 100,
        baseUnit: food?.baseUnit ?? 'g',
        ...nutrients,
        notes: food?.notes ?? ''
      },
      fields: [
        textField('name', 'Название'),
        textField('brand', 'Бренд'),
        choiceField(
          'category',
          'Категория',
          NUTRITION_FOOD_CATEGORIES.map((value) => ({ value, label: categoryLabels[value] }))
        ),
        textField('baseAmount', 'Базовое количество', 'number'),
        choiceField('baseUnit', 'Единица', [
          { value: 'g', label: 'г' },
          { value: 'ml', label: 'мл' },
          { value: 'piece', label: 'шт.' }
        ]),
        ...nutrientFields(),
        textField('notes', 'Заметки', 'multiline')
      ],
      save: (values) => {
        const payload = {
          name: values.name,
          brand: values.brand,
          category: values.category,
          baseAmount: values.baseAmount,
          baseUnit: values.baseUnit,
          nutrients: nutrientsFrom(values),
          notes: values.notes
        }
        if (food)
          api.updateFood(
            validation.updateNutritionFoodInputSchema.parse({ id: food.id, ...payload })
          )
        else api.createFood(validation.createNutritionFoodInputSchema.parse(payload))
        overview.refresh()
      }
    })
  }

  const editLog = (entry?: NutritionLogEntryRecord): void => {
    const source = entry
      ? entry.sourceType === 'custom'
        ? 'custom'
        : `${entry.sourceType}:${entry.sourceId}`
      : foods[0]
        ? `food:${foods[0].id}`
        : 'custom'
    const nutrients = entry?.nutrients ?? zeroNutrients
    setForm({
      title: entry ? 'Изменить запись' : 'Добавить в дневник',
      initial: {
        date: entry?.date ?? date,
        mealType: entry?.mealType ?? 'breakfast',
        customMealName: entry?.customMealName ?? '',
        source,
        amount: entry?.amount ?? 1,
        customTitle: entry?.sourceType === 'custom' ? entry.title : '',
        customUnit: entry?.unit ?? 'serving',
        ...nutrients,
        notes: entry?.notes ?? ''
      },
      fields: [
        textField('date', 'Дата', 'text', 'ГГГГ-ММ-ДД'),
        choiceField(
          'mealType',
          'Приём пищи',
          NUTRITION_MEAL_TYPES.map((value) => ({ value, label: mealLabels[value] }))
        ),
        textField('customMealName', 'Название другого приёма пищи'),
        choiceField('source', 'Источник', [
          ...foods.map((food) => ({ value: `food:${food.id}`, label: `Продукт · ${food.name}` })),
          ...recipes.map((recipe) => ({
            value: `recipe:${recipe.id}`,
            label: `Рецепт · ${recipe.name}`
          })),
          { value: 'custom', label: 'Своя запись' }
        ]),
        textField('amount', 'Количество', 'number'),
        textField('customTitle', 'Название своей записи'),
        choiceField('customUnit', 'Единица своей записи', [
          { value: 'g', label: 'г' },
          { value: 'ml', label: 'мл' },
          { value: 'piece', label: 'шт.' },
          { value: 'serving', label: 'порция' }
        ]),
        ...nutrientFields(),
        textField('notes', 'Заметки', 'multiline')
      ],
      save: (values) => {
        const selected = String(values.source)
        const [sourceType, sourceId] =
          selected === 'custom' ? (['custom', null] as const) : selected.split(':')
        const payload = {
          date: values.date,
          mealType: values.mealType,
          customMealName: values.customMealName,
          sourceType,
          sourceId,
          amount: values.amount,
          customTitle: values.customTitle,
          customUnit: values.customUnit,
          customNutrients: sourceType === 'custom' ? nutrientsFrom(values) : null,
          notes: values.notes
        }
        if (entry)
          api.updateLogEntry(
            validation.updateNutritionLogEntryInputSchema.parse({ id: entry.id, ...payload })
          )
        else api.createLogEntry(validation.createNutritionLogEntryInputSchema.parse(payload))
        overview.refresh()
      }
    })
  }

  const editWater = (): void => {
    setForm({
      title: 'Вода за день',
      initial: { waterMl: data?.day.waterMl ?? 0 },
      fields: [textField('waterMl', 'Миллилитры', 'number')],
      save: (values) => {
        api.setWater(
          validation.setNutritionWaterInputSchema.parse({ date, waterMl: values.waterMl })
        )
        overview.refresh()
      }
    })
  }

  const editTargets = (): void => {
    const target = data?.currentTarget
    setForm({
      title: 'Цели питания',
      initial: {
        calories: target?.calories ?? '',
        proteinG: target?.proteinG ?? '',
        fatG: target?.fatG ?? '',
        carbsG: target?.carbsG ?? '',
        fiberG: target?.fiberG ?? '',
        waterMl: target?.waterMl ?? ''
      },
      fields: [
        textField('calories', 'Калории, ккал', 'nullableNumber'),
        textField('proteinG', 'Белки, г', 'nullableNumber'),
        textField('fatG', 'Жиры, г', 'nullableNumber'),
        textField('carbsG', 'Углеводы, г', 'nullableNumber'),
        textField('fiberG', 'Клетчатка, г', 'nullableNumber'),
        textField('waterMl', 'Вода, мл', 'nullableNumber')
      ],
      save: (values) => {
        api.setTargets(validation.setNutritionTargetsInputSchema.parse(values))
        overview.refresh()
      }
    })
  }

  const importDiary = (): void => {
    setForm({
      title: 'Импорт дневника JSON',
      initial: {
        json: JSON.stringify(
          {
            schemaVersion: 1,
            date,
            meals: [
              {
                mealType: 'lunch',
                customMealName: '',
                items: [
                  { name: 'Блюдо', amount: 1, unit: 'serving', nutrients: zeroNutrients, notes: '' }
                ]
              }
            ]
          },
          null,
          2
        )
      },
      fields: [textField('json', 'Данные', 'multiline')],
      save: (values) => {
        const input = validation.importNutritionMealsInputSchema.parse(
          JSON.parse(String(values.json))
        )
        api.importMeals(input)
        setDate(input.date)
        overview.refresh()
      }
    })
  }

  let report: ReturnType<typeof api.getReport> | null = null
  let reportError = ''
  try {
    report = api.getReport({
      dateFrom: daysAgoKey(29),
      dateTo: localDateKey(),
      mealType: null,
      sourceType: null,
      foodId: null,
      recipeId: null
    })
  } catch (reason) {
    reportError = messageFor(reason)
  }

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'today', label: 'Сегодня' },
    { key: 'diary', label: 'Дневник' },
    { key: 'foods', label: 'Продукты' },
    { key: 'recipes', label: 'Рецепты' },
    { key: 'report', label: 'Прогресс' }
  ]
  const header = (
    <View style={{ gap: 10, paddingBottom: 12 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {tabs.map((item) => (
          <Button
            key={item.key}
            label={item.label}
            selected={tab === item.key}
            onPress={() => setTab(item.key)}
          />
        ))}
      </ScrollView>
      {tab === 'today' || tab === 'diary' ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Button label="‹" onPress={() => setDate((value) => shiftDate(value, -1))} />
          <View style={{ flex: 1 }}>
            <Row title={date === localDateKey() ? 'Сегодня' : date} subtitle={date} />
          </View>
          <Button label="›" onPress={() => setDate((value) => shiftDate(value, 1))} />
        </View>
      ) : null}
      {tab === 'foods' || tab === 'recipes' ? (
        <SearchField value={query} onChangeText={setQuery} />
      ) : null}
      {tab === 'diary' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button label="+ Запись" selected onPress={() => editLog()} />
          </View>
          <Button label="Импорт JSON" onPress={importDiary} />
        </View>
      ) : null}
      {tab === 'foods' ? <Button label="+ Продукт" selected onPress={() => editFood()} /> : null}
      {tab === 'recipes' ? (
        <Button label="+ Рецепт" selected onPress={() => setRecipeEditor('new')} />
      ) : null}
    </View>
  )

  if (overview.loading) return <LoadingState />
  if (tab === 'today') {
    const day = data?.day
    const target = data?.currentTarget
    return (
      <View style={{ flex: 1 }}>
        {header}
        {overview.error ? <ErrorState message={overview.error} retry={overview.refresh} /> : null}
        <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
          <Row
            title={macroLine(day?.nutrients ?? zeroNutrients)}
            subtitle="Итого за выбранный день"
          />
          <Row
            title={`Вода · ${day?.waterMl ?? 0}${target?.waterMl ? ` / ${target.waterMl}` : ''} мл`}
            subtitle="Нажмите, чтобы указать точное значение"
            onPress={editWater}
          >
            <Button
              label="+250 мл"
              onPress={() =>
                overview.mutate(() =>
                  api.setWater({ date, waterMl: Math.min(100_000, (day?.waterMl ?? 0) + 250) })
                )
              }
            />
            <Button
              label="−250 мл"
              disabled={(day?.waterMl ?? 0) === 0}
              onPress={() =>
                overview.mutate(() =>
                  api.setWater({ date, waterMl: Math.max(0, (day?.waterMl ?? 0) - 250) })
                )
              }
            />
          </Row>
          <Row
            title={target?.calories ? `Цель · ${target.calories} ккал` : 'Цели не заданы'}
            subtitle={
              target
                ? `Б ${target.proteinG ?? '—'} · Ж ${target.fatG ?? '—'} · У ${target.carbsG ?? '—'}`
                : 'Задайте калории, макронутриенты и воду'
            }
            onPress={editTargets}
          />
          {NUTRITION_MEAL_TYPES.map((mealType) => {
            const mealEntries = entries.filter((entry) => entry.mealType === mealType)
            const calories = mealEntries.reduce((sum, entry) => sum + entry.nutrients.calories, 0)
            return (
              <Row
                key={mealType}
                title={`${mealLabels[mealType]} · ${Math.round(calories)} ккал`}
                subtitle={
                  mealEntries.length
                    ? mealEntries.map((entry) => entry.title).join(' · ')
                    : 'Нет записей'
                }
                onPress={() => editLog()}
              />
            )
          })}
        </ScrollView>
        {form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
      </View>
    )
  }

  if (tab === 'report') {
    return (
      <View style={{ flex: 1 }}>
        {header}
        {reportError ? <ErrorState message={reportError} retry={overview.refresh} /> : null}
        <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
          {!report ? (
            <EmptyState text="Отчёт пока недоступен." />
          ) : (
            <>
              <Row title="Последние 30 дней" subtitle={`${report.dateFrom} — ${report.dateTo}`} />
              <Row
                title={`${report.summary.loggedDays} дней · ${report.summary.entries} записей`}
                subtitle={`В среднем ${report.summary.averageCalories} ккал · ${report.summary.averageWaterMl} мл воды`}
              />
              <Row
                title={`Попадание в цель: ${report.summary.calorieGoalHitPercent}%`}
                subtitle={`${report.summary.calorieGoalHitDays} из ${report.summary.calorieGoalDays} дней · выше ${report.summary.daysAboveCalories} · ниже ${report.summary.daysBelowCalories}`}
              />
              {report.macroShare.map((macro) => (
                <Row
                  key={macro.macro}
                  title={`${macro.macro}: ${macro.percent}%`}
                  subtitle={`${macro.calories} ккал`}
                />
              ))}
              {report.topItems.slice(0, 10).map((item, index) => (
                <Row
                  key={`${item.sourceType}:${item.sourceId ?? item.title}:${index}`}
                  title={item.title}
                  subtitle={`${item.entries} раз · ${item.calories} ккал`}
                />
              ))}
            </>
          )}
        </ScrollView>
      </View>
    )
  }

  const list: ListItem[] =
    tab === 'diary'
      ? entries.map((value) => ({ kind: 'entry', value }))
      : tab === 'foods'
        ? filteredFoods.map((value) => ({ kind: 'food', value }))
        : filteredRecipes.map((value) => ({ kind: 'recipe', value }))

  return (
    <View style={{ flex: 1 }}>
      {header}
      {overview.error ? <ErrorState message={overview.error} retry={overview.refresh} /> : null}
      <FlatList<ListItem>
        data={list}
        keyExtractor={(item) => `${item.kind}:${item.value.id}`}
        refreshing={overview.loading}
        onRefresh={overview.refresh}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => {
          if (item.kind === 'entry') {
            const entry = item.value
            return (
              <Row
                title={`${mealLabels[entry.mealType]} · ${entry.title}`}
                subtitle={`${entry.amount} ${unitLabels[entry.unit]} · ${macroLine(entry.nutrients)}`}
                onPress={() => editLog(entry)}
                onLongPress={() =>
                  overview.confirmDelete('Удалить запись?', () =>
                    api.deleteLogEntry({ id: entry.id })
                  )
                }
              />
            )
          }
          if (item.kind === 'food') {
            const food = item.value
            return (
              <Row
                title={food.name}
                subtitle={`${food.brand ? `${food.brand} · ` : ''}${food.baseAmount} ${unitLabels[food.baseUnit]} · ${macroLine(food.nutrients)}`}
                onPress={() => editFood(food)}
                onLongPress={() =>
                  overview.confirmDelete(
                    'Удалить продукт?',
                    () => api.deleteFood({ id: food.id }),
                    'Продукт из рецепта удалить нельзя. Записи дневника сохранят снимок данных.'
                  )
                }
              />
            )
          }
          const recipe = item.value
          return (
            <Row
              title={recipe.name}
              subtitle={`${recipe.servings} порц. · ${recipe.ingredients.length} ингредиентов · ${macroLine(recipe.perServingNutrients)}`}
              onPress={() => setRecipeEditor(recipe)}
              onLongPress={() =>
                overview.confirmDelete(
                  'Удалить рецепт?',
                  () => api.deleteRecipe({ id: recipe.id }),
                  'Записи дневника сохранят снимок рецепта.'
                )
              }
            />
          )
        }}
      />
      {form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
      {recipeEditor ? (
        <NutritionRecipeSheet
          recipe={recipeEditor === 'new' ? undefined : recipeEditor}
          foods={foods}
          save={(input) => {
            if ('id' in input) api.updateRecipe(input)
            else api.createRecipe(input)
            overview.refresh()
          }}
          close={() => setRecipeEditor(null)}
        />
      ) : null}
    </View>
  )
}
