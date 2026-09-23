import { useCallback, useMemo, useState } from 'react'
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native'
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Hash,
  Target,
  type LucideIcon
} from 'lucide-react-native'
import { type HabitGroupRecord, type HabitRecord } from '@mymind/contracts/habits'
import { addDays, isHabitScheduledOn, localDateKey } from '@mymind/core/habits'
import * as schema from '@mymind/core/validation/habits'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import { Button, EmptyState, ErrorState, IconButton, LoadingState } from '../../shared/ui/primitives'
import { FormSheet } from '../../shared/ui/FormSheet'
import { AppDialog } from '../../shared/ui/AppDialog'
import { AppDateField } from '../../shared/ui/FormControls'
import { ActionMenu } from '../../shared/ui/ActionMenu'
import { WorkspaceNodeCard } from '../../shared/ui/Workspace'
import { VisualIconBadge } from '../../shared/ui/VisualPickers'
import { GROUP_COLOR_CHOICES, HABIT_GROUP_ICON_CHOICES } from '../../shared/ui/visual-options'
import {
  choiceField,
  colorField,
  iconField,
  textField,
  type FormSpec
} from '../../shared/ui/form-model'
import { AppIcon } from '../../shared/ui/icons'
import { useTheme } from '../../shared/ui/theme'
import { useToast } from '../../shared/ui/toast-context'
import { SwipeableTabContent } from '../../shared/ui/SwipeableTabContent'
import { SwipeTabBar } from '../../shared/ui/SwipeTabBar'
import { useSwipeTabFeedback } from '../../shared/ui/useSwipeTabFeedback'
import { HabitsReportsView } from './HabitsReportsView'

type HabitView = 'today' | 'all' | 'reports'

const HABIT_VIEW_TABS = ['today', 'all', 'reports'] as const

const VIEW_FILTERS: ReadonlyArray<{
  id: HabitView
  label: string
  icon: LucideIcon
}> = [
  { id: 'today', label: 'Сегодня', icon: CalendarDays },
  { id: 'all', label: 'Все привычки', icon: Target },
  { id: 'reports', label: 'Отчёты', icon: BarChart3 }
]

const TRACKING_FILTERS: ReadonlyArray<{
  id: 'all' | 'check' | 'count'
  label: string
  icon: LucideIcon
}> = [
  { id: 'all', label: 'Все типы', icon: Target },
  { id: 'check', label: 'Простая отметка', icon: CheckCircle2 },
  { id: 'count', label: 'Количество / прогресс', icon: Hash }
]

export function HabitsScreen(): React.JSX.Element {
  const { habits: api } = useServices()
  const theme = useTheme()
  const toast = useToast()
  const [date, setDate] = useState(localDateKey())
  const [view, setView] = useState<HabitView>('today')
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<string | null | undefined>(undefined)
  const [trackingFilter, setTrackingFilter] = useState<'all' | 'check' | 'count'>('all')
  const [groupsOpen, setGroupsOpen] = useState(false)
  const [form, setForm] = useState<FormSpec | null>(null)
  const [swipeTabFeedback, showSwipeTabFeedback] = useSwipeTabFeedback<HabitView>()
  const [searchOpen, setSearchOpen] = useState(false)

  const changeView = useCallback(
    (next: HabitView): void => {
      if (next === view) return
      setView(next)
    },
    [view]
  )

  const state = useCollection(
    useCallback(
      () => api.listHabitsOverview(schema.habitsOverviewInputSchema.parse({ date })),
      [api, date]
    )
  )

  const groupChoices = useMemo(
    () => [
      { value: null, label: 'Без группы' },
      ...(state.data?.groups ?? []).map((item) => ({ value: item.id, label: item.name }))
    ],
    [state.data?.groups]
  )

  const groupById = useMemo(
    () => new Map((state.data?.groups ?? []).map((item) => [item.id, item])),
    [state.data?.groups]
  )

  const edit = (habit?: HabitRecord): void =>
    setForm({
      title: habit ? 'Редактировать привычку' : 'Новая привычка',
      initial: {
        title: habit?.title ?? '',
        groupId: habit?.groupId ?? (typeof group === 'string' ? group : null),
        trackingType: habit?.trackingType ?? 'check',
        targetValue: habit?.targetValue ?? 1,
        unit: habit?.unit ?? '',
        repeatEveryDays: habit?.repeatEveryDays ?? 1,
        weekdays: habit?.weekdays.map(String) ?? [],
        preferredTimes: habit?.preferredTimes ?? []
      },
      fields: [
        textField('title', 'Название'),
        choiceField('groupId', 'Группа', groupChoices),
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

  const move = (habit: HabitRecord): void =>
    setForm({
      title: 'Группа привычки',
      initial: { groupId: habit.groupId },
      fields: [choiceField('groupId', 'Группа', groupChoices)],
      save: (values) => {
        const nextGroupId = typeof values.groupId === 'string' ? values.groupId : null
        api.updateHabit({
          ...habit,
          groupId: nextGroupId
        })
        state.refresh()
      }
    })

  const editGroup = (item?: HabitGroupRecord): void =>
    setForm({
      title: item ? 'Группа привычек' : 'Новая группа',
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
    (habit) =>
      (view !== 'today' || isHabitScheduledOn(habit, date)) &&
      (view !== 'all' || trackingFilter === 'all' || habit.trackingType === trackingFilter) &&
      (group === undefined || habit.groupId === group) &&
      habit.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  )

  const scopeLabel =
    group === undefined
      ? 'Все привычки'
      : group === null
        ? 'Без группы'
        : (groupById.get(group)?.name ?? 'Выбранная группа')

  const activeGroupLabel = scopeLabel

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View style={{ marginBottom: 12, gap: 10 }}>
        <SwipeTabBar
          items={VIEW_FILTERS}
          value={view}
          onChange={changeView}
          feedback={swipeTabFeedback}
          search={view === 'reports' ? undefined : { value: query, onChangeText: setQuery }}
          onSearchOpenChange={setSearchOpen}
          renderIcon={(item, selected) => {
            const Icon = item.icon
            return (
              <Icon
                size={19}
                strokeWidth={selected ? 2.4 : 2}
                color={selected ? theme.accent : theme.muted}
              />
            )
          }}
          trailing={
            <>
              <View
                style={{
                  width: 1,
                  height: 26,
                  marginHorizontal: 2,
                  backgroundColor: theme.border
                }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Группы. Сейчас: ${activeGroupLabel}`}
                accessibilityState={{ selected: group !== undefined }}
                disabled={state.pending}
                onPress={() => setGroupsOpen(true)}
                style={({ pressed }) => ({
                  position: 'relative',
                  flex: 1,
                  minWidth: 0,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor:
                    group !== undefined
                      ? theme.accent + '18'
                      : pressed
                        ? theme.raised
                        : 'transparent',
                  opacity: state.pending ? 0.45 : pressed ? 0.72 : 1
                })}
              >
                <AppIcon
                  name="folder"
                  size={19}
                  strokeWidth={group !== undefined ? 2.4 : 2}
                  color={group !== undefined ? theme.accent : theme.muted}
                />
                {group !== undefined ? (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 7,
                      right: 12,
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: theme.accent
                    }}
                  />
                ) : null}
              </Pressable>
            </>
          }
        />

                {view === 'all' ? (
          <View
            style={{
              minHeight: 46,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              padding: 4,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 15,
              backgroundColor: theme.surface
            }}
          >
            {TRACKING_FILTERS.map((item) => {
              const selected = trackingFilter === item.id
              const Icon = item.icon

              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    if (selected) return
                    setTrackingFilter(item.id)
                    toast.info(item.label, 'habits-tracking-filter')
                  }}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 36,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 11,
                    backgroundColor: selected
                      ? theme.accent + '14'
                      : pressed
                        ? theme.raised
                        : 'transparent',
                    opacity: pressed ? 0.72 : 1
                  })}
                >
                  <Icon
                    size={17}
                    strokeWidth={selected ? 2.35 : 2}
                    color={selected ? theme.accent : theme.muted}
                  />
                </Pressable>
              )
            })}
          </View>
        ) : null}

        {view === 'today' ? (
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
              disabled={date >= localDateKey()}
              onPress={() => {
                const next = addDays(date, 1)
                setDate(next > localDateKey() ? localDateKey() : next)
              }}
            />
            <IconButton
              label="Сегодня"
              icon="calendar"
              selected={date === localDateKey()}
              onPress={() => setDate(localDateKey())}
            />
          </View>
        ) : null}
      </View>

      {state.error && <ErrorState message={state.error} retry={state.refresh} />}

      <SwipeableTabContent
        tabs={HABIT_VIEW_TABS}
        value={view}
        onChange={changeView}
        onSwipeChange={showSwipeTabFeedback}
        disabled={state.pending || searchOpen}
      >
        {state.loading ? (
          <LoadingState />
        ) : view === 'reports' ? (
          <View style={{ flex: 1, minHeight: 0 }}>
            <HabitsReportsView api={api} groupId={group} scopeLabel={scopeLabel} />
          </View>
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={visible}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 8 }}
            ListEmptyComponent={<EmptyState />}
            onRefresh={state.refresh}
            refreshing={state.loading}
            renderItem={({ item }) => {
              const entry = state.data?.entries.find((candidate) => candidate.habitId === item.id)
              const scheduled = isHabitScheduledOn(item, date)
              const habitGroup = item.groupId ? (groupById.get(item.groupId) ?? null) : null
              const currentValue = entry?.value ?? 0
              const completed = currentValue >= item.targetValue && !entry?.skipped

              return (
                <View
                  style={{
                    position: 'relative',
                    minHeight: 70,
                    marginBottom: 8,
                    overflow: 'hidden',
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 16,
                    backgroundColor: completed
                      ? theme.success + '0E'
                      : entry?.skipped
                        ? theme.muted + '08'
                        : theme.surface
                  }}
                >
                  {completed || entry?.skipped ? (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 8,
                        bottom: 8,
                        left: 0,
                        width: 2,
                        borderTopRightRadius: 2,
                        borderBottomRightRadius: 2,
                        backgroundColor: completed ? theme.success : theme.muted
                      }}
                    />
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Изменить привычку ${item.title}`}
                    onPress={() => edit(item)}
                    disabled={state.pending}
                    style={({ pressed }) => ({
                      flex: 1,
                      minWidth: 0,
                      minHeight: 68,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 11,
                      paddingLeft: 14,
                      paddingRight: 6,
                      paddingVertical: 10,
                      opacity: pressed ? 0.72 : 1
                    })}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        flexShrink: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: completed ? theme.success + '44' : theme.border,
                        borderRadius: 11,
                        backgroundColor: completed ? theme.success + '12' : theme.background
                      }}
                    >
                      <AppIcon
                        name={completed ? 'check' : 'habits'}
                        size={17}
                        strokeWidth={completed ? 2.5 : 2}
                        color={completed ? theme.success : theme.accent}
                      />
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        numberOfLines={2}
                        style={{
                          color: completed ? theme.muted : theme.text,
                          fontSize: 14,
                          lineHeight: 20,
                          fontWeight: '600'
                        }}
                      >
                        {item.title}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{
                          marginTop: 3,
                          color: entry?.skipped
                            ? theme.muted
                            : completed
                              ? theme.success
                              : theme.muted,
                          fontSize: 11,
                          lineHeight: 15,
                          fontWeight: completed ? '600' : '500'
                        }}
                      >
                        {entry?.skipped
                          ? 'Пропущено'
                          : !scheduled
                            ? 'Не запланировано на эту дату'
                            : `${currentValue} / ${item.targetValue}${item.unit ? ` ${item.unit}` : ''}`}
                      </Text>
                    </View>
                  </Pressable>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingRight: 6
                    }}
                  >
                    {scheduled ? (
                      <IconButton
                        label={item.trackingType === 'count' ? 'Добавить единицу' : 'Выполнить'}
                        icon="check"
                        compact
                        selected={completed}
                        disabled={state.pending}
                        onPress={() =>
                          state.mutate(() => {
                            api.upsertHabitEntry(
                              schema.upsertHabitEntryInputSchema.parse({
                                habitId: item.id,
                                date,
                                value: item.trackingType === 'count' ? currentValue + 1 : 1,
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
                        {
                          key: 'group',
                          label: `Группа: ${habitGroup?.name ?? 'Без группы'}`,
                          icon: 'folder',
                          onPress: () => move(item)
                        },
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
                </View>
              )
            }}
          />
        )}
      </SwipeableTabContent>

      <View
        style={{
          paddingTop: 10,
          paddingBottom: 2,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.background
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Создать привычку"
          disabled={state.pending}
          onPress={() => edit()}
          style={({ pressed }) => ({
            minHeight: 50,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            opacity: state.pending ? 0.45 : pressed ? 0.76 : 1
          })}
        >
          <View
            style={{
              flex: 1,
              minHeight: 48,
              justifyContent: 'center',
              paddingHorizontal: 15,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 16,
              backgroundColor: theme.surface
            }}
          >
            <Text style={{ color: theme.muted, fontSize: 14 }}>Новая привычка…</Text>
          </View>

          <View
            style={{
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: theme.accent + '33',
              borderRadius: 12,
              backgroundColor: theme.accent
            }}
          >
            <AppIcon name="add" size={18} strokeWidth={2.3} color="#ffffff" />
          </View>
        </Pressable>
      </View>

      <AppDialog
        open={groupsOpen}
        onOpenChange={setGroupsOpen}
        title="Группы"
        description="Выберите группу, измените её или создайте новую"
        icon="folder"
        presentation="sheet"
      >
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
          <WorkspaceNodeCard
            title="Все привычки"
            subtitle={`${state.data?.habits.length ?? 0} привычек`}
            leadingIcon="habits"
            selected={group === undefined}
            onPress={() => {
              setGroup(undefined)
              setGroupsOpen(false)
            }}
          />
          <WorkspaceNodeCard
            title="Без группы"
            subtitle={`${(state.data?.habits ?? []).filter((item) => item.groupId === null).length} привычек`}
            leadingIcon="folder"
            selected={group === null}
            onPress={() => {
              setGroup(null)
              setGroupsOpen(false)
            }}
          />
          {(state.data?.groups ?? []).map((item) => (
            <WorkspaceNodeCard
              key={item.id}
              title={item.name}
              subtitle={`${(state.data?.habits ?? []).filter((habit) => habit.groupId === item.id).length} привычек`}
              leading={<VisualIconBadge value={item.icon} colorKey={item.color} />}
              selected={group === item.id}
              onPress={() => {
                setGroup(item.id)
                setGroupsOpen(false)
              }}
              action={
                <ActionMenu
                  title={item.name}
                  items={[
                    {
                      label: 'Изменить группу',
                      icon: 'edit',
                      onPress: () => {
                        setGroupsOpen(false)
                        editGroup(item)
                      }
                    },
                    {
                      label: 'Удалить группу',
                      icon: 'delete',
                      danger: true,
                      onPress: () => {
                        setGroupsOpen(false)
                        state.confirmDelete(
                          'Удалить группу?',
                          () => {
                            api.deleteHabitGroup({ id: item.id })
                            if (group === item.id) setGroup(undefined)
                          },
                          'Привычки сохранятся без группы.'
                        )
                      }
                    }
                  ]}
                />
              }
            />
          ))}
          <View style={{ marginTop: 8, alignItems: 'flex-start' }}>
            <Button
              label="Создать группу"
              icon="add"
              primary
              onPress={() => {
                setGroupsOpen(false)
                editGroup()
              }}
            />
          </View>
        </ScrollView>
      </AppDialog>

      {form && <FormSheet spec={form} close={() => setForm(null)} />}
    </View>
  )
}
