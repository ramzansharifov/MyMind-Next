import { useCallback, useState } from 'react'
import { FlatList, View } from 'react-native'
import { type HabitGroupRecord, type HabitRecord } from '@mymind/contracts/habits'
import { addDays, isHabitScheduledOn, localDateKey } from '@mymind/core/habits'
import * as schema from '@mymind/core/validation/habits'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import {
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  SearchField
} from '../../shared/ui/primitives'
import { FormSheet } from '../../shared/ui/FormSheet'
import { AppDateField } from '../../shared/ui/FormControls'
import { ActionMenu } from '../../shared/ui/ActionMenu'
import { WorkspaceNodeCard } from '../../shared/ui/Workspace'
import { VisualIconBadge } from '../../shared/ui/VisualPickers'
import { GROUP_COLOR_CHOICES, HABIT_GROUP_ICON_CHOICES } from '../../shared/ui/visual-options'
import { choiceField, colorField, iconField, textField, type FormSpec } from '../../shared/ui/form-model'
import { HabitsReportsView } from './HabitsReportsView'

export function HabitsScreen(): React.JSX.Element {
  const { habits: api } = useServices()
  const [date, setDate] = useState(localDateKey())
  const [view, setView] = useState('today')
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<string | null | undefined>(undefined)
  const [form, setForm] = useState<FormSpec | null>(null)
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
      preview: {
        titleKey: 'name',
        iconKey: 'icon',
        colorKey: 'color',
        iconFamily: 'habit',
        description: 'Так группа будет выглядеть в модуле привычек.'
      },
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
        iconField('icon', 'Иконка', HABIT_GROUP_ICON_CHOICES, 'habit'),
        colorField('color', 'Цвет', GROUP_COLOR_CHOICES)
      ],
      save: (values) => {
        const input = schema.createHabitGroupInputSchema.parse(values)
        if (item) api.updateHabitGroup({ ...input, id: item.id })
        else api.createHabitGroup(input)
        state.refresh()
      }
    })
  const visible = (state.data?.habits ?? []).filter(
    (h) =>
      (view !== 'today' || isHabitScheduledOn(h, date)) &&
      (group === undefined || h.groupId === group) &&
      h.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  )
  const scopeLabel =
    group === undefined
      ? 'Все привычки'
      : group === null
        ? 'Без группы'
        : (state.data?.groups.find((item) => item.id === group)?.name ?? 'Выбранная группа')

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
          <Button label="Отчёт" selected={view === 'report'} onPress={() => setView('report')} />
          <IconButton
            label={view === 'groups' ? 'Создать группу' : 'Создать привычку'}
            icon="add"
            selected
            onPress={() => (view === 'groups' ? editGroup() : edit())}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <IconButton
            label="Предыдущий день"
            icon="back"
            onPress={() => setDate(addDays(date, -1))}
          />
          <View style={{ flex: 1 }}>
            <AppDateField label="Дата привычек" value={date} onChangeText={setDate} />
          </View>
          <IconButton
            label="Следующий день"
            icon="forward"
            onPress={() => setDate(addDays(date, 1))}
          />
          <Button label="Сегодня" onPress={() => setDate(localDateKey())} />
        </View>
        {(view === 'today' || view === 'all') && (
          <SearchField value={query} onChangeText={setQuery} />
        )}
        {group !== undefined && (
          <Button
            label="Сбросить группу"
            icon="reset"
            compact
            onPress={() => setGroup(undefined)}
          />
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
            <WorkspaceNodeCard
              title={item.name}
              leading={<VisualIconBadge value={item.icon} colorKey={item.color} />}
              onPress={() => {
                setGroup(item.id)
                setView('all')
              }}
              action={
                <ActionMenu
                  title={item.name}
                  items={[
                    {
                      label: 'Изменить группу',
                      icon: 'edit',
                      onPress: () => editGroup(item)
                    },
                    {
                      label: 'Удалить группу',
                      icon: 'delete',
                      danger: true,
                      onPress: () =>
                        state.confirmDelete(
                          'Удалить группу?',
                          () => {
                            api.deleteHabitGroup({ id: item.id })
                            if (group === item.id) setGroup(undefined)
                          },
                          'Привычки сохранятся без группы.'
                        )
                    }
                  ]}
                />
              }
            />
          )}
        />
      ) : view === 'report' ? (
        <HabitsReportsView api={api} groupId={group} scopeLabel={scopeLabel} />
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
              <WorkspaceNodeCard
                title={item.title}
                leadingIcon="habits"
                subtitle={[
                  entry?.skipped
                    ? 'Пропущено'
                    : (entry?.value ?? 0) >= item.targetValue
                      ? 'Выполнено'
                      : null,
                  (entry?.value ?? 0) +
                    ' / ' +
                    item.targetValue +
                    (item.unit ? ' ' + item.unit : ''),
                  !scheduled ? 'Не запланировано на эту дату' : null
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() => edit(item)}
                action={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {scheduled ? (
                      <IconButton
                        label={item.trackingType === 'count' ? 'Добавить единицу' : 'Выполнить'}
                        icon="check"
                        compact
                        selected={(entry?.value ?? 0) >= item.targetValue && !entry?.skipped}
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
                    ) : null}
                    <ActionMenu
                      disabled={state.pending}
                      title={item.title}
                      items={[
                        ...(scheduled
                          ? [
                              {
                                key: 'skip',
                                label: 'Пропустить',
                                icon: 'skip' as const,
                                onPress: () =>
                                  state.mutate(() => {
                                    api.upsertHabitEntry({
                                      habitId: item.id,
                                      date,
                                      value: 0,
                                      skipped: true
                                    })
                                  })
                              }
                            ]
                          : []),
                        ...(entry
                          ? [
                              {
                                key: 'reset',
                                label: 'Сбросить отметку',
                                icon: 'reset' as const,
                                onPress: () =>
                                  state.mutate(() => {
                                    api.deleteHabitEntry({ habitId: item.id, date })
                                  })
                              }
                            ]
                          : []),
                        {
                          key: 'edit',
                          label: 'Изменить',
                          icon: 'edit',
                          onPress: () => edit(item)
                        },
                        {
                          key: 'delete',
                          label: 'Удалить привычку',
                          icon: 'delete',
                          danger: true,
                          onPress: () =>
                            state.confirmDelete(
                              'Удалить привычку?',
                              () => {
                                api.deleteHabit({ id: item.id })
                              },
                              'Будет удалена и история отметок.'
                            )
                        }
                      ]}
                    />
                  </View>
                }
              />
            )
          }}
        />
      )}
      {form && <FormSheet spec={form} close={() => setForm(null)} />}
    </View>
  )
}
