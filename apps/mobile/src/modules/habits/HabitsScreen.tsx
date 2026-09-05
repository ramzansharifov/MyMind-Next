import { useCallback, useState } from 'react'
import { FlatList, TextInput, View } from 'react-native'
import {
  HABIT_GROUP_COLORS,
  HABIT_GROUP_ICONS,
  type HabitGroupRecord,
  type HabitRecord,
  type HabitReport
} from '@mymind/contracts/habits'
import { addDays, isHabitScheduledOn, localDateKey } from '@mymind/core/habits'
import * as schema from '@mymind/core/validation/habits'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import {
  Button,
  EmptyState,
  ErrorState,
  Label,
  LoadingState,
  Row,
  SearchField
} from '../../shared/ui/primitives'
import { FormSheet } from '../../shared/ui/FormSheet'
import { choiceField, textField, type FormSpec } from '../../shared/ui/form-model'
import { useTheme } from '../../shared/ui/theme'

export function HabitsScreen(): React.JSX.Element {
  const { habits: api } = useServices()
  const theme = useTheme()
  const [date, setDate] = useState(localDateKey())
  const [view, setView] = useState('today')
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<string | null | undefined>(undefined)
  const [form, setForm] = useState<FormSpec | null>(null)
  const [report, setReport] = useState<HabitReport | null>(null)
  const state = useCollection(
    useCallback(
      () => api.listHabitsOverview(schema.habitsOverviewInputSchema.parse({ date })),
      [api, date]
    )
  )
  const edit = (habit?: HabitRecord): void =>
    setForm({
      title: habit ? 'Редактировать привычку' : 'Новая привычка',
      initial: {
        title: habit?.title ?? '',
        groupId: habit?.groupId ?? group ?? null,
        trackingType: habit?.trackingType ?? 'check',
        targetValue: habit?.targetValue ?? 1,
        unit: habit?.unit ?? '',
        repeatEveryDays: habit?.repeatEveryDays ?? 1,
        weekdays: habit?.weekdays.map(String) ?? [],
        preferredTimes: habit?.preferredTimes ?? []
      },
      fields: [
        textField('title', 'Название'),
        choiceField('groupId', 'Группа', [
          { value: null, label: 'Без группы' },
          ...(state.data?.groups ?? []).map((g) => ({ value: g.id, label: g.name }))
        ]),
        choiceField('trackingType', 'Как отмечать', [
          { value: 'check', label: 'Отметка' },
          { value: 'count', label: 'Количество' }
        ]),
        textField('targetValue', 'Цель за день', 'number'),
        textField('unit', 'Единица измерения', 'text', 'Для отметки оставьте пустым'),
        textField('repeatEveryDays', 'Повторять каждые N дней', 'number'),
        {
          key: 'weekdays',
          label: 'Дни недели',
          kind: 'multiple',
          hint: 'Если не выбирать дни, используется интервал.',
          choices: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((label, index) => ({
            value: String(index + 1),
            label
          }))
        },
        textField(
          'preferredTimes',
          'Предпочтительное время',
          'times',
          'Номер единицы и время. Например: вторая чашка воды в 13:00.'
        )
      ],
      save: (values) => {
        const input = schema.createHabitInputSchema.parse({
          ...values,
          weekdays: (values.weekdays as string[]).map(Number)
        })
        if (habit) api.updateHabit({ ...input, id: habit.id })
        else api.createHabit(input)
        state.refresh()
      }
    })
  const editGroup = (item?: HabitGroupRecord): void =>
    setForm({
      title: 'Группа привычек',
      initial: {
        name: item?.name ?? '',
        icon: item?.icon ?? 'folder',
        color: item?.color ?? 'violet'
      },
      fields: [
        textField('name', 'Название'),
        choiceField(
          'icon',
          'Значок',
          HABIT_GROUP_ICONS.map((value) => ({ value, label: value }))
        ),
        choiceField(
          'color',
          'Цвет',
          HABIT_GROUP_COLORS.map((value) => ({ value, label: value }))
        )
      ],
      save: (values) => {
        const input = schema.createHabitGroupInputSchema.parse(values)
        if (item) api.updateHabitGroup({ ...input, id: item.id })
        else api.createHabitGroup(input)
        state.refresh()
      }
    })
  const reportForm = (): void =>
    setForm({
      title: 'Отчёт по привычкам',
      initial: { dateFrom: addDays(date, -29), dateTo: date },
      fields: [
        textField('dateFrom', 'С даты', 'text', 'ГГГГ-ММ-ДД'),
        textField('dateTo', 'По дату', 'text', 'ГГГГ-ММ-ДД')
      ],
      save: (values) => {
        setReport(
          api.getHabitsReport(
            schema.habitReportInputSchema.parse({
              ...values,
              groupId: group ?? null,
              ungroupedOnly: group === null
            })
          )
        )
        setView('report')
      }
    })
  const visible = (state.data?.habits ?? []).filter(
    (h) =>
      (view !== 'today' || isHabitScheduledOn(h, date)) &&
      (group === undefined || h.groupId === group) &&
      h.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  )
  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 10, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {[
            { id: 'today', label: 'День' },
            { id: 'all', label: 'Все' },
            { id: 'groups', label: 'Группы' }
          ].map((v) => (
            <Button
              key={v.id}
              label={v.label}
              selected={view === v.id}
              onPress={() => setView(v.id)}
            />
          ))}
          <Button label="Отчёт" onPress={reportForm} />
          <Button
            label={view === 'groups' ? '+ Группа' : '+ Привычка'}
            selected
            onPress={() => (view === 'groups' ? editGroup() : edit())}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Button label="‹" onPress={() => setDate(addDays(date, -1))} />
          <TextInput
            accessibilityLabel="Дата привычек"
            value={date}
            onChangeText={setDate}
            style={{
              flex: 1,
              color: theme.text,
              padding: 12,
              fontSize: 16,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: 12
            }}
          />
          <Button label="›" onPress={() => setDate(addDays(date, 1))} />
          <Button label="Сегодня" onPress={() => setDate(localDateKey())} />
        </View>
        {view !== 'groups' && <SearchField value={query} onChangeText={setQuery} />}
        {group !== undefined && (
          <Button label="Сбросить группу" onPress={() => setGroup(undefined)} />
        )}
      </View>
      {state.error && <ErrorState message={state.error} retry={state.refresh} />}
      {state.loading ? (
        <LoadingState />
      ) : view === 'groups' ? (
        <FlatList
          data={state.data?.groups ?? []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <Button
              label="Без группы"
              onPress={() => {
                setGroup(null)
                setView('all')
              }}
            />
          }
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <Row
              title={item.name}
              onPress={() => {
                setGroup(item.id)
                setView('all')
              }}
            >
              <Button label="Изменить" onPress={() => editGroup(item)} />
              <Button
                label="Удалить"
                danger
                onPress={() =>
                  state.confirmDelete(
                    'Удалить группу?',
                    () => {
                      api.deleteHabitGroup({ id: item.id })
                      if (group === item.id) setGroup(undefined)
                    },
                    'Привычки сохранятся без группы.'
                  )
                }
              />
            </Row>
          )}
        />
      ) : view === 'report' && report ? (
        <FlatList
          data={report.habits}
          keyExtractor={(item) => item.habitId}
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              <Label>
                {report.dateFrom} — {report.dateTo}
              </Label>
              <Label title>{report.summary.completionRate}% выполнено</Label>
              <Label muted>
                Выполнено {report.summary.completed} · Пропущено {report.summary.skipped} · Не
                выполнено {report.summary.missed}
              </Label>
            </View>
          }
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <Row
              title={item.title}
              subtitle={`Прогресс ${item.completionRate}% · Серия ${item.currentStreak} · Лучшая ${item.bestStreak} · Всего ${item.totalValue} ${item.unit}`}
            />
          )}
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<EmptyState />}
          onRefresh={state.refresh}
          refreshing={state.loading}
          renderItem={({ item }) => {
            const entry = state.data?.entries.find((e) => e.habitId === item.id)
            const scheduled = isHabitScheduledOn(item, date)
            return (
              <Row
                title={`${entry?.skipped ? 'Пропуск · ' : (entry?.value ?? 0) >= item.targetValue ? '✓ ' : ''}${item.title}`}
                subtitle={`${entry?.value ?? 0} / ${item.targetValue} ${item.unit}${!scheduled ? ' · Не запланировано на эту дату' : ''}`}
                onPress={() => edit(item)}
              >
                {scheduled && (
                  <>
                    <Button
                      label={item.trackingType === 'count' ? '+1' : 'Выполнить'}
                      disabled={state.pending}
                      onPress={() =>
                        state.mutate(() => {
                          api.upsertHabitEntry(
                            schema.upsertHabitEntryInputSchema.parse({
                              habitId: item.id,
                              date,
                              value: item.trackingType === 'count' ? (entry?.value ?? 0) + 1 : 1,
                              skipped: false
                            })
                          )
                        })
                      }
                    />
                    <Button
                      label="Пропустить"
                      onPress={() =>
                        state.mutate(() => {
                          api.upsertHabitEntry({ habitId: item.id, date, value: 0, skipped: true })
                        })
                      }
                    />
                    {entry && (
                      <Button
                        label="Сбросить"
                        onPress={() =>
                          state.mutate(() => {
                            api.deleteHabitEntry({ habitId: item.id, date })
                          })
                        }
                      />
                    )}
                  </>
                )}
                <Button
                  label="Удалить"
                  danger
                  onPress={() =>
                    state.confirmDelete(
                      'Удалить привычку?',
                      () => {
                        api.deleteHabit({ id: item.id })
                      },
                      'Будет удалена и история отметок.'
                    )
                  }
                />
              </Row>
            )
          }}
        />
      )}
      {form && <FormSheet spec={form} close={() => setForm(null)} />}
    </View>
  )
}
