import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import type {
  NutritionLogEntryRecord,
  NutritionTargetRecord,
  NutritionMealType,
  NutritionValues
} from '@mymind/contracts/nutrition'
import { NUTRITION_MEAL_TYPES } from '@mymind/contracts/nutrition'
import * as validation from '@mymind/core/validation/nutrition'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import { FormSheet } from '../../shared/ui/FormSheet'
import { MobileCreateAction } from '../../shared/ui/MobileCreateAction'
import { choiceField, textField, type FormSpec } from '../../shared/ui/form-model'
import { Button, ErrorState, IconButton, LoadingState } from '../../shared/ui/primitives'
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Droplets,
  Flame,
  Target,
  Utensils
} from 'lucide-react-native'
import { ActionMenu } from '../../shared/ui/ActionMenu'
import { useToast } from '../../shared/ui/toast-context'
import { NutritionReportsView } from './NutritionReportsView'
import { useTheme } from '../../shared/ui/theme'
import { SwipeableTabContent } from '../../shared/ui/SwipeableTabContent'

type Tab = 'today' | 'diary' | 'goal' | 'progress'

const NUTRITION_TAB_IDS = ['today', 'diary', 'goal', 'progress'] as const
const NUTRITION_TABS = [
  { id: 'today' as const, label: 'Сегодня', icon: Utensils },
  { id: 'diary' as const, label: 'Дневник', icon: CalendarDays },
  { id: 'goal' as const, label: 'Цель', icon: Target },
  { id: 'progress' as const, label: 'Прогресс', icon: BarChart3 }
]

const mealLabels: Record<NutritionMealType, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
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
  return `${formatNutritionNumber(values.calories, 0)} ккал · Б ${formatNutritionNumber(values.proteinG)} · Ж ${formatNutritionNumber(values.fatG)} · У ${formatNutritionNumber(values.carbsG)}`
}

const goalFields = [
  { key: 'calories', label: 'Калории', hint: 'ккал' },
  { key: 'proteinG', label: 'Белки', hint: 'г' },
  { key: 'fatG', label: 'Жиры', hint: 'г' },
  { key: 'carbsG', label: 'Углеводы', hint: 'г' },
  { key: 'fiberG', label: 'Клетчатка', hint: 'г' },
  { key: 'waterMl', label: 'Вода', hint: 'мл' }
] as const

type GoalFieldKey = (typeof goalFields)[number]['key']
type GoalDraft = Record<GoalFieldKey, string>

function goalDraft(target: NutritionTargetRecord | null): GoalDraft {
  return {
    calories: target?.calories?.toString() ?? '',
    proteinG: target?.proteinG?.toString() ?? '',
    fatG: target?.fatG?.toString() ?? '',
    carbsG: target?.carbsG?.toString() ?? '',
    fiberG: target?.fiberG?.toString() ?? '',
    waterMl: target?.waterMl?.toString() ?? ''
  }
}

function optionalPositive(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function formatNutritionNumber(value: number, maximumFractionDigits = 1): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits })
}

function nutritionProgress(value: number, target: number | null): number {
  if (!target || target <= 0) return 0
  return Math.min(100, Math.max(0, (value / target) * 100))
}

function nutritionDateTitle(value: string): string {
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long'
  }).format(new Date(`${value}T12:00:00`))
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function NutritionMacroMetric({
  label,
  value,
  target
}: {
  label: string
  value: number
  target: number | null
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 4
        }}
      >
        <Text numberOfLines={1} style={{ color: theme.text, fontSize: 11, fontWeight: '700' }}>
          {label}
        </Text>
        <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 9.5 }}>
          {formatNutritionNumber(value)}
          {target ? ` / ${formatNutritionNumber(target)}` : ''} г
        </Text>
      </View>
      <View
        style={{ height: 5, overflow: 'hidden', borderRadius: 99, backgroundColor: theme.raised }}
      >
        <View
          style={{
            width: `${nutritionProgress(value, target)}%`,
            height: '100%',
            borderRadius: 99,
            backgroundColor: theme.accent
          }}
        />
      </View>
    </View>
  )
}

function NutritionDaySummary({
  nutrients,
  target,
  waterMl,
  onWaterChange,
  onEditWater,
  onEditTargets
}: {
  nutrients: NutritionValues
  target: NutritionTargetRecord | null
  waterMl: number
  onWaterChange(delta: number): void
  onEditWater(): void
  onEditTargets(): void
}): React.JSX.Element {
  const theme = useTheme()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const calorieTarget = target?.calories ?? null

  return (
    <View
      style={{
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 18,
        backgroundColor: theme.surface
      }}
    >
      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 42,
              height: 42,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.accent + '26',
              backgroundColor: theme.accent + '12'
            }}
          >
            <Flame size={19} color={theme.accent} />
          </View>
          <View style={{ minWidth: 0, flex: 1 }}>
            <Text style={{ color: theme.muted, fontSize: 10.5, fontWeight: '600' }}>За день</Text>
            <View style={{ marginTop: 2, flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
              <Text style={{ color: theme.text, fontSize: 27, lineHeight: 31, fontWeight: '800' }}>
                {formatNutritionNumber(nutrients.calories, 0)}
              </Text>
              <Text style={{ color: theme.muted, fontSize: 11.5 }}>
                {calorieTarget ? `/ ${formatNutritionNumber(calorieTarget, 0)} ккал` : 'ккал'}
              </Text>
            </View>
          </View>
          {!target ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Настроить цель питания"
              onPress={onEditTargets}
              style={({ pressed }) => ({
                paddingHorizontal: 9,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: pressed ? theme.accent + '1F' : theme.accent + '10',
                opacity: pressed ? 0.72 : 1
              })}
            >
              <Text style={{ color: theme.accent, fontSize: 10.5, fontWeight: '700' }}>Цель</Text>
            </Pressable>
          ) : null}
        </View>

        <View
          style={{ height: 7, overflow: 'hidden', borderRadius: 99, backgroundColor: theme.raised }}
        >
          <View
            style={{
              width: `${nutritionProgress(nutrients.calories, calorieTarget)}%`,
              height: '100%',
              borderRadius: 99,
              backgroundColor: theme.accent
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <NutritionMacroMetric
            label="Белки"
            value={nutrients.proteinG}
            target={target?.proteinG ?? null}
          />
          <NutritionMacroMetric label="Жиры" value={nutrients.fatG} target={target?.fatG ?? null} />
          <NutritionMacroMetric
            label="Углеводы"
            value={nutrients.carbsG}
            target={target?.carbsG ?? null}
          />
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          gap: 10
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Указать точное количество воды"
          onPress={onEditWater}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            opacity: pressed ? 0.72 : 1
          })}
        >
          <View
            style={{
              width: 34,
              height: 34,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 11,
              backgroundColor: '#22d3ee14'
            }}
          >
            <Droplets size={16} color="#22d3ee" />
          </View>
          <View style={{ minWidth: 0, flex: 1, gap: 5 }}>
            <Text style={{ color: theme.text, fontSize: 12.5, fontWeight: '700' }}>
              Вода · {waterMl}
              {target?.waterMl ? ` / ${target.waterMl}` : ''} мл
            </Text>
            <View
              style={{
                height: 5,
                overflow: 'hidden',
                borderRadius: 99,
                backgroundColor: theme.raised
              }}
            >
              <View
                style={{
                  width: `${nutritionProgress(waterMl, target?.waterMl ?? null)}%`,
                  height: '100%',
                  borderRadius: 99,
                  backgroundColor: '#22d3ee'
                }}
              />
            </View>
          </View>
        </Pressable>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 7 }}>
          <Button label="+250 мл" compact onPress={() => onWaterChange(250)} />
          <Button
            label="−250 мл"
            compact
            disabled={waterMl === 0}
            onPress={() => onWaterChange(-250)}
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          detailsOpen ? 'Скрыть дополнительные показатели' : 'Показать дополнительные показатели'
        }
        accessibilityState={{ expanded: detailsOpen }}
        onPress={() => setDetailsOpen((current) => !current)}
        style={({ pressed }) => ({
          minHeight: 38,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: pressed ? theme.raised : 'transparent',
          opacity: pressed ? 0.78 : 1
        })}
      >
        <Text style={{ color: theme.muted, fontSize: 10.5, fontWeight: '600' }}>Подробнее</Text>
        <ChevronDown
          size={14}
          color={theme.muted}
          style={{ transform: [{ rotate: detailsOpen ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {detailsOpen ? (
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            padding: 12,
            paddingTop: 0
          }}
        >
          {[
            ['Клетчатка', `${formatNutritionNumber(nutrients.fiberG)} г`],
            ['Сахар', `${formatNutritionNumber(nutrients.sugarG)} г`],
            ['Натрий', `${formatNutritionNumber(nutrients.sodiumMg, 0)} мг`]
          ].map(([label, value]) => (
            <View
              key={label}
              style={{
                flex: 1,
                minWidth: 0,
                paddingHorizontal: 9,
                paddingVertical: 9,
                borderRadius: 11,
                backgroundColor: theme.background
              }}
            >
              <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 9 }}>
                {label}
              </Text>
              <Text
                numberOfLines={1}
                style={{ marginTop: 2, color: theme.text, fontSize: 11.5, fontWeight: '700' }}
              >
                {value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

function NutritionMealSection({
  mealType,
  label,
  entries,
  onAdd,
  onEdit,
  onDelete
}: {
  mealType: NutritionMealType
  label: string
  entries: NutritionLogEntryRecord[]
  onAdd(): void
  onEdit(entry: NutritionLogEntryRecord): void
  onDelete(entry: NutritionLogEntryRecord): void
}): React.JSX.Element {
  const theme = useTheme()
  const calories = entries.reduce((sum, entry) => sum + entry.nutrients.calories, 0)

  return (
    <View
      style={{
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface
      }}
    >
      <View
        style={{
          minHeight: 54,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingLeft: 13,
          paddingRight: 7,
          paddingVertical: 7
        }}
      >
        <View style={{ minWidth: 0, flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 13.5, fontWeight: '700' }}>{label}</Text>
          <Text numberOfLines={1} style={{ marginTop: 2, color: theme.muted, fontSize: 10.5 }}>
            {entries.length
              ? `${formatNutritionNumber(calories, 0)} ккал · ${entries.length} поз.`
              : 'Нет записей'}
          </Text>
        </View>
        <IconButton label={`Добавить в «${label}»`} icon="add" compact onPress={onAdd} />
      </View>

      {entries.map((entry) => (
        <Pressable
          key={entry.id}
          accessibilityRole="button"
          accessibilityLabel={`Изменить «${entry.title}»`}
          onPress={() => onEdit(entry)}
          onLongPress={() => onDelete(entry)}
          style={({ pressed }) => ({
            minHeight: 58,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingLeft: 13,
            paddingRight: 5,
            paddingVertical: 9,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            backgroundColor: pressed ? theme.raised : 'transparent',
            opacity: pressed ? 0.78 : 1
          })}
        >
          <View style={{ minWidth: 0, flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{ color: theme.text, fontSize: 12.5, fontWeight: '600' }}
            >
              {entry.title}
            </Text>
            <Text numberOfLines={1} style={{ marginTop: 2, color: theme.muted, fontSize: 10 }}>
              {formatNutritionNumber(entry.amount)} {unitLabels[entry.unit]} ·{' '}
              {macroLine(entry.nutrients)}
              {mealType === 'other' && entry.customMealName ? ` · ${entry.customMealName}` : ''}
            </Text>
          </View>
          <ActionMenu
            title={entry.title}
            description={`${label} · ${formatNutritionNumber(entry.nutrients.calories, 0)} ккал`}
            items={[
              { label: 'Изменить', icon: 'edit', onPress: () => onEdit(entry) },
              { label: 'Удалить', icon: 'delete', danger: true, onPress: () => onDelete(entry) }
            ]}
          />
        </Pressable>
      ))}
    </View>
  )
}

function NutritionGoalCard({
  target,
  onSave
}: {
  target: NutritionTargetRecord | null
  onSave(input: {
    calories: number | null
    proteinG: number | null
    fatG: number | null
    carbsG: number | null
    fiberG: number | null
    waterMl: number | null
  }): void
}): React.JSX.Element {
  const theme = useTheme()
  const [values, setValues] = useState<GoalDraft>(() => goalDraft(target))

  const save = (): void => {
    const water = optionalPositive(values.waterMl)
    onSave(
      validation.setNutritionTargetsInputSchema.parse({
        calories: optionalPositive(values.calories),
        proteinG: optionalPositive(values.proteinG),
        fatG: optionalPositive(values.fatG),
        carbsG: optionalPositive(values.carbsG),
        fiberG: optionalPositive(values.fiberG),
        waterMl: water === null ? null : Math.round(water)
      })
    )
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
      <View
        style={{
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 16,
          backgroundColor: theme.surface
        }}
      >
        <View
          style={{
            padding: 18,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: theme.accent + '14'
            }}
          >
            <Target size={20} color={theme.accent} />
          </View>
          <View style={{ minWidth: 0, flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>
              Общая цель питания
            </Text>
            <Text style={{ marginTop: 4, color: theme.muted, fontSize: 12, lineHeight: 19 }}>
              Единые ориентиры для «Сегодня», «Дневника» и «Прогресса». Пустое поле означает, что
              цель по показателю не задана.
            </Text>
          </View>
        </View>

        <View
          style={{
            padding: 18,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          {goalFields.map((field) => (
            <View key={field.key} style={{ width: '47%', minWidth: 140, flexGrow: 1, gap: 6 }}>
              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>
                {field.label} · {field.hint}
              </Text>
              <TextInput
                accessibilityLabel={field.label}
                value={values[field.key]}
                placeholder="Не задано"
                placeholderTextColor={theme.muted}
                keyboardType="decimal-pad"
                onChangeText={(value) =>
                  setValues((current) => ({ ...current, [field.key]: value }))
                }
                style={{
                  minHeight: 44,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 12,
                  backgroundColor: theme.background,
                  color: theme.text,
                  fontSize: 14
                }}
              />
            </View>
          ))}
        </View>

        <View
          style={{
            padding: 16,
            alignItems: 'flex-end',
            borderTopWidth: 1,
            borderTopColor: theme.border
          }}
        >
          <Button label="Сохранить цель" icon="check" primary onPress={save} />
        </View>
      </View>
    </ScrollView>
  )
}

export function NutritionScreen(): React.JSX.Element {
  const { nutrition: api } = useServices()
  const theme = useTheme()
  const toast = useToast()
  const [date, setDate] = useState(localDateKey())
  const overview = useCollection(useCallback(() => api.listOverview({ date }), [api, date]))
  const [tab, setTab] = useState<Tab>('today')
  const [form, setForm] = useState<FormSpec | null>(null)

  const changeTab = useCallback(
    (next: Tab): void => {
      if (next === tab) return
      if (next === 'today') setDate(localDateKey())
      setTab(next)
      toast.info(
        NUTRITION_TABS.find((item) => item.id === next)?.label ?? 'Питание',
        'nutrition-tab'
      )
    },
    [tab, toast]
  )

  const data = overview.data
  const foods = useMemo(() => data?.foods ?? [], [data?.foods])
  const recipes = useMemo(() => data?.recipes ?? [], [data?.recipes])
  const entries = data?.entries ?? []
  const editLog = (
    entry?: NutritionLogEntryRecord,
    preferredMealType?: NutritionMealType
  ): void => {
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
        mealType: entry?.mealType ?? preferredMealType ?? 'breakfast',
        customMealName: entry?.customMealName ?? '',
        source,
        amount: entry?.amount ?? 1,
        customTitle: entry?.sourceType === 'custom' ? entry.title : '',
        customUnit: entry?.unit ?? 'serving',
        ...nutrients,
        notes: entry?.notes ?? ''
      },
      fields: [
        textField('date', 'Дата', 'date'),
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
        setTab(input.date === localDateKey() ? 'today' : 'diary')
        overview.refresh()
      }
    })
  }

  const chooseDiaryDate = (): void => {
    setForm({
      title: 'Дата дневника',
      initial: { date },
      fields: [textField('date', 'Дата', 'date')],
      save: (values) => {
        const next = validation.nutritionOverviewInputSchema.parse({ date: values.date }).date
        setDate(next)
      }
    })
  }

  const header = (
    <View style={{ gap: 10, paddingBottom: 12 }}>
      <View
        accessibilityRole="tablist"
        style={{
          minHeight: 50,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          padding: 4,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 16,
          backgroundColor: theme.surface
        }}
      >
        {NUTRITION_TABS.map((item) => {
          const selected = tab === item.id
          const Icon = item.icon
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
              onPress={() => changeTab(item.id)}
              style={({ pressed }) => ({
                flex: 1,
                minWidth: 0,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: selected
                  ? theme.accent + '18'
                  : pressed
                    ? theme.raised
                    : 'transparent',
                opacity: pressed ? 0.72 : 1
              })}
            >
              <Icon
                size={18}
                strokeWidth={selected ? 2.4 : 2}
                color={selected ? theme.accent : theme.muted}
              />
            </Pressable>
          )
        })}
      </View>

      {tab === 'diary' ? (
        <View
          style={{
            minHeight: 54,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 5,
            paddingVertical: 5,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 15,
            backgroundColor: theme.surface
          }}
        >
          <IconButton
            label="Предыдущий день"
            icon="back"
            ghost
            onPress={() => setDate((value) => shiftDate(value, -1))}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Выбрать дату дневника"
            onPress={chooseDiaryDate}
            style={({ pressed }) => ({
              minWidth: 0,
              flex: 1,
              alignItems: 'center',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 10,
              backgroundColor: pressed ? theme.raised : 'transparent',
              opacity: pressed ? 0.74 : 1
            })}
          >
            <Text
              numberOfLines={1}
              style={{ color: theme.text, fontSize: 12.5, fontWeight: '700' }}
            >
              {nutritionDateTitle(date)}
            </Text>
            <Text style={{ marginTop: 1, color: theme.muted, fontSize: 9.5 }}>
              {date === localDateKey() ? 'Сегодня' : date}
            </Text>
          </Pressable>
          <IconButton
            label="Следующий день"
            icon="forward"
            ghost
            onPress={() => setDate((value) => shiftDate(value, 1))}
          />
        </View>
      ) : null}
    </View>
  )

  if (overview.loading) return <LoadingState />
  if (tab === 'today' || tab === 'diary') {
    const day = data?.day
    const target = data?.currentTarget
    const visibleMeals: NutritionMealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
    const otherEntries = entries.filter((entry) => entry.mealType === 'other')
    const deleteEntry = (entry: NutritionLogEntryRecord): void => {
      overview.confirmDelete(
        `Удалить «${entry.title}»?`,
        () => api.deleteLogEntry({ id: entry.id }),
        'Запись перестанет учитываться в дневнике и прогрессе.'
      )
    }

    return (
      <View style={{ flex: 1 }}>
        {header}
        {overview.error ? <ErrorState message={overview.error} retry={overview.refresh} /> : null}
        <SwipeableTabContent tabs={NUTRITION_TAB_IDS} value={tab} onChange={changeTab}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingBottom: 96 }}
          >
            <NutritionDaySummary
              nutrients={day?.nutrients ?? zeroNutrients}
              target={target ?? null}
              waterMl={day?.waterMl ?? 0}
              onEditWater={editWater}
              onEditTargets={editTargets}
              onWaterChange={(delta) =>
                overview.mutate(() =>
                  api.setWater({
                    date,
                    waterMl: Math.min(100_000, Math.max(0, (day?.waterMl ?? 0) + delta))
                  })
                )
              }
            />

            <View style={{ gap: 8 }}>
              {visibleMeals.map((mealType) => (
                <NutritionMealSection
                  key={mealType}
                  mealType={mealType}
                  label={mealLabels[mealType]}
                  entries={entries.filter((entry) => entry.mealType === mealType)}
                  onAdd={() => editLog(undefined, mealType)}
                  onEdit={editLog}
                  onDelete={deleteEntry}
                />
              ))}
              {otherEntries.length ? (
                <NutritionMealSection
                  mealType="other"
                  label="Другое"
                  entries={otherEntries}
                  onAdd={() => editLog(undefined, 'other')}
                  onEdit={editLog}
                  onDelete={deleteEntry}
                />
              ) : null}
            </View>
          </ScrollView>
        </SwipeableTabContent>

        <MobileCreateAction
          iconOnly
          actions={[
            {
              key: 'entry',
              label: 'Новая запись',
              description: 'Добавить еду в выбранный день',
              icon: 'nutrition',
              onPress: () => editLog()
            },
            {
              key: 'json',
              label: 'Добавить из JSON',
              description: 'Импортировать готовый дневник питания',
              icon: 'json',
              onPress: importDiary
            }
          ]}
        />
        {form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
      </View>
    )
  }

  if (tab === 'goal') {
    return (
      <View style={{ flex: 1 }}>
        {header}
        {overview.error ? <ErrorState message={overview.error} retry={overview.refresh} /> : null}
        <SwipeableTabContent tabs={NUTRITION_TAB_IDS} value={tab} onChange={changeTab}>
          <NutritionGoalCard
            key={data?.currentTarget?.id ?? 'nutrition-goal-empty'}
            target={data?.currentTarget ?? null}
            onSave={(input) =>
              overview.mutate(() => {
                api.setTargets(input)
              }, 'Цель питания сохранена')
            }
          />
        </SwipeableTabContent>
      </View>
    )
  }

  if (tab === 'progress') {
    return (
      <View style={{ flex: 1 }}>
        {header}
        {overview.error ? <ErrorState message={overview.error} retry={overview.refresh} /> : null}
        <SwipeableTabContent tabs={NUTRITION_TAB_IDS} value={tab} onChange={changeTab}>
          <NutritionReportsView />
        </SwipeableTabContent>
      </View>
    )
  }

  return <View style={{ flex: 1 }}>{header}</View>
}
