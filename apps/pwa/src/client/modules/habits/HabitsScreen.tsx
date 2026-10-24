import { Action, RefreshRegion } from '../../../ui/browser'
import { useCallback, useMemo, useRef, useState } from 'react'
import { BarChart3, CalendarDays, CheckCircle2, Hash, Target, type LucideIcon } from 'lucide-react'
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
  LoadingState
} from '../../shared/ui/primitives'
import { FormSheet } from '../../shared/ui/FormSheet'
import { AppDialog } from '../../shared/ui/AppDialog'
import { AppDateField } from '../../shared/ui/FormControls'
import { ActionMenu, ActionMenuDialog } from '../../shared/ui/ActionMenu'
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
  const [habitActionsId, setHabitActionsId] = useState<string | null>(null)
  const longPressedHabitId = useRef<string | null>(null)
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
  const tabHeader = (
    <>
      <div
        className="ui-stack"
        style={{
          marginBottom: 12,
          gap: 10
        }}
      >
        <SwipeTabBar
          items={VIEW_FILTERS}
          value={view}
          onChange={changeView}
          feedback={swipeTabFeedback}
          search={view === 'reports' ? undefined : { value: query, onValueChange: setQuery }}
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
              <div
                className="ui-stack"
                style={{
                  width: 1,
                  height: 26,
                  marginInline: 2,
                  backgroundColor: theme.border
                }}
              ></div>
              <Action
                role={'button'}
                aria-label={`Группы. Сейчас: ${activeGroupLabel}`}
                aria-selected={group !== undefined}
                disabled={state.pending}
                onClick={() => setGroupsOpen(true)}
                style={{
                  position: 'relative',
                  flex: '1 1 0%',
                  minWidth: 0,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor: group !== undefined ? theme.accent + '18' : 'transparent',
                  opacity: state.pending ? 0.45 : 1
                }}
                pressedStyle={{
                  backgroundColor: group !== undefined ? theme.accent + '18' : theme.raised,
                  opacity: state.pending ? 0.45 : 0.72
                }}
              >
                <AppIcon
                  name="folder"
                  size={19}
                  strokeWidth={group !== undefined ? 2.4 : 2}
                  color={group !== undefined ? theme.accent : theme.muted}
                />
                {group !== undefined ? (
                  <div
                    className="ui-stack"
                    style={{
                      position: 'absolute',
                      top: 7,
                      right: 12,
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: theme.accent,
                      pointerEvents: 'none'
                    }}
                  ></div>
                ) : null}
              </Action>
            </>
          }
        />

        {view === 'all' ? (
          <div
            className="ui-stack"
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
                <Action
                  key={item.id}
                  role={'button'}
                  aria-label={item.label}
                  aria-selected={selected}
                  onClick={() => {
                    if (selected) return
                    setTrackingFilter(item.id)
                    toast.info(item.label, 'habits-tracking-filter')
                  }}
                  style={{
                    flex: '1 1 0%',
                    height: 36,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 11,
                    backgroundColor: selected ? theme.accent + '14' : 'transparent',
                    opacity: 1
                  }}
                  pressedStyle={{
                    backgroundColor: selected ? theme.accent + '14' : theme.raised,
                    opacity: 0.72
                  }}
                >
                  <Icon
                    size={17}
                    strokeWidth={selected ? 2.35 : 2}
                    color={selected ? theme.accent : theme.muted}
                  />
                </Action>
              )
            })}
          </div>
        ) : null}

        {view === 'today' ? (
          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8
            }}
          >
            <IconButton
              label="Предыдущий день"
              icon="back"
              onClick={() => setDate(addDays(date, -1))}
            />
            <div
              className="ui-stack"
              style={{
                flex: '1 1 0%'
              }}
            >
              <AppDateField
                label="Дата привычек"
                value={date}
                max={localDateKey()}
                onValueChange={setDate}
              />
            </div>
            <IconButton
              label="Следующий день"
              icon="forward"
              disabled={date >= localDateKey()}
              onClick={() => {
                const next = addDays(date, 1)
                setDate(next > localDateKey() ? localDateKey() : next)
              }}
            />
            <IconButton
              label="Сегодня"
              icon="calendar"
              selected={date === localDateKey()}
              onClick={() => setDate(localDateKey())}
            />
          </div>
        ) : null}
      </div>

      {state.error && <ErrorState message={state.error} retry={state.refresh} />}
    </>
  )
  return (
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%',
        minHeight: 0
      }}
    >
      {state.loading ? tabHeader : null}

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
          <div
            className="ui-stack"
            style={{
              flex: '1 1 0%',
              minHeight: 0
            }}
          >
            <HabitsReportsView
              api={api}
              groupId={group}
              scopeLabel={scopeLabel}
              header={tabHeader}
            />
          </div>
        ) : (
          <RefreshRegion
            className="ui-scroll"
            style={{
              flex: '1 1 0%'
            }}
            onRefresh={state.refresh}
            busy={state.loading}
          >
            <div
              className="ui-stack ui-scroll-content"
              style={{
                paddingBottom: 8
              }}
            >
              {tabHeader}
              <div className="ui-stack ui-list" style={{}}>
                {visible.length > 0 ? (
                  visible.map((item) => {
                    const entry = state.data?.entries.find(
                      (candidate) => candidate.habitId === item.id
                    )
                    const scheduled = isHabitScheduledOn(item, date)
                    const habitGroup = item.groupId ? (groupById.get(item.groupId) ?? null) : null
                    const currentValue = entry?.value ?? 0
                    const completed = currentValue >= item.targetValue && !entry?.skipped
                    return (
                      <div className="ui-stack ui-list-item" key={((item) => item.id)(item)}>
                        {
                          <div
                            className="ui-stack"
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
                              <div
                                className="ui-stack"
                                style={{
                                  position: 'absolute',
                                  top: 8,
                                  bottom: 8,
                                  left: 0,
                                  width: 2,
                                  borderTopRightRadius: 2,
                                  borderBottomRightRadius: 2,
                                  backgroundColor: completed ? theme.success : theme.muted,
                                  pointerEvents: 'none'
                                }}
                              ></div>
                            ) : null}

                            <Action
                              role={'button'}
                              aria-label={`Изменить привычку ${item.title}`}
                              title={'Удерживайте для дополнительных действий'}
                              onClick={() => {
                                if (longPressedHabitId.current === item.id) {
                                  longPressedHabitId.current = null
                                  return
                                }
                                edit(item)
                              }}
                              onHold={() => {
                                if (state.pending) return
                                longPressedHabitId.current = item.id
                                setHabitActionsId(item.id)
                              }}
                              holdDelay={380}
                              disabled={state.pending}
                              style={{
                                flex: '1 1 0%',
                                minWidth: 0,
                                minHeight: 68,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 11,
                                paddingLeft: 14,
                                paddingRight: 6,
                                paddingBlock: 10,
                                opacity: 1
                              }}
                              pressedStyle={{
                                opacity: 0.72
                              }}
                            >
                              <div
                                className="ui-stack"
                                style={{
                                  width: 34,
                                  height: 34,
                                  flexShrink: 0,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderWidth: 1,
                                  borderColor: completed ? theme.success + '44' : theme.border,
                                  borderRadius: 11,
                                  backgroundColor: completed
                                    ? theme.success + '12'
                                    : theme.background
                                }}
                              >
                                <AppIcon
                                  name={completed ? 'check' : 'habits'}
                                  size={17}
                                  strokeWidth={completed ? 2.5 : 2}
                                  color={completed ? theme.success : theme.accent}
                                />
                              </div>

                              <div
                                className="ui-stack"
                                style={{
                                  flex: '1 1 0%',
                                  minWidth: 0
                                }}
                              >
                                <span
                                  className="ui-text"
                                  data-lines={2}
                                  style={{
                                    color: completed ? theme.muted : theme.text,
                                    fontSize: 14,
                                    lineHeight: '20px',
                                    fontWeight: 600,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: 2
                                  }}
                                >
                                  {item.title}
                                </span>
                                <span
                                  className="ui-text"
                                  data-lines={1}
                                  style={{
                                    marginTop: 3,
                                    color: entry?.skipped
                                      ? theme.muted
                                      : completed
                                        ? theme.success
                                        : theme.muted,
                                    fontSize: 11,
                                    lineHeight: '15px',
                                    fontWeight: completed ? '600' : '500',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    WebkitLineClamp: 1
                                  }}
                                >
                                  {entry?.skipped
                                    ? 'Пропущено'
                                    : !scheduled
                                      ? 'Не запланировано на эту дату'
                                      : `${currentValue} / ${item.targetValue}${item.unit ? ` ${item.unit}` : ''}`}
                                </span>
                              </div>
                            </Action>

                            <div
                              className="ui-stack"
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                paddingRight: 6
                              }}
                            >
                              {scheduled ? (
                                <IconButton
                                  label={
                                    item.trackingType === 'count' ? 'Добавить единицу' : 'Выполнить'
                                  }
                                  icon="check"
                                  compact
                                  selected={completed}
                                  disabled={state.pending}
                                  onClick={() =>
                                    state.mutate(() => {
                                      api.upsertHabitEntry(
                                        schema.upsertHabitEntryInputSchema.parse({
                                          habitId: item.id,
                                          date,
                                          value:
                                            item.trackingType === 'count' ? currentValue + 1 : 1,
                                          skipped: false
                                        })
                                      )
                                    })
                                  }
                                />
                              ) : null}

                              <ActionMenuDialog
                                open={habitActionsId === item.id}
                                onOpenChange={(open) => {
                                  if (!open) {
                                    setHabitActionsId(null)
                                    longPressedHabitId.current = null
                                  }
                                }}
                                title={item.title}
                                items={[
                                  {
                                    key: 'group',
                                    label: `Группа: ${habitGroup?.name ?? 'Без группы'}`,
                                    icon: 'folder',
                                    disabled: state.pending,
                                    onClick: () => move(item)
                                  },
                                  ...(scheduled
                                    ? [
                                        {
                                          key: 'skip',
                                          label: 'Пропустить',
                                          icon: 'skip' as const,
                                          disabled: state.pending,
                                          onClick: () =>
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
                                          disabled: state.pending,
                                          onClick: () =>
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
                                    disabled: state.pending,
                                    onClick: () => edit(item)
                                  },
                                  {
                                    key: 'delete',
                                    label: 'Удалить привычку',
                                    icon: 'delete',
                                    danger: true,
                                    disabled: state.pending,
                                    onClick: () =>
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
                            </div>
                          </div>
                        }
                      </div>
                    )
                  })
                ) : (
                  <EmptyState />
                )}
              </div>
            </div>
          </RefreshRegion>
        )}
      </SwipeableTabContent>

      <div
        className="ui-stack"
        style={{
          paddingTop: 10,
          paddingBottom: 2,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.background
        }}
      >
        <Action
          role={'button'}
          aria-label={'Создать привычку'}
          disabled={state.pending}
          onClick={() => edit()}
          style={{
            minHeight: 50,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            opacity: state.pending ? 0.45 : 1
          }}
          pressedStyle={{
            opacity: state.pending ? 0.45 : 0.76
          }}
        >
          <div
            className="ui-stack"
            style={{
              flex: '1 1 0%',
              minHeight: 48,
              justifyContent: 'center',
              paddingInline: 15,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 16,
              backgroundColor: theme.surface
            }}
          >
            <span
              className="ui-text"
              style={{
                color: theme.muted,
                fontSize: 14
              }}
            >
              Новая привычка…
            </span>
          </div>

          <div
            className="ui-stack"
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
          </div>
        </Action>
      </div>

      <AppDialog
        open={groupsOpen}
        onOpenChange={setGroupsOpen}
        title="Группы"
        description="Выберите группу, измените её или создайте новую"
        icon="folder"
        presentation="sheet"
      >
        <div className="ui-scroll">
          <div
            className="ui-stack ui-scroll-content"
            style={{
              padding: 12,
              paddingBottom: 24
            }}
          >
            <WorkspaceNodeCard
              title="Все привычки"
              subtitle={`${state.data?.habits.length ?? 0} привычек`}
              leadingIcon="habits"
              selected={group === undefined}
              onClick={() => {
                setGroup(undefined)
                setGroupsOpen(false)
              }}
            />
            <WorkspaceNodeCard
              title="Без группы"
              subtitle={`${(state.data?.habits ?? []).filter((item) => item.groupId === null).length} привычек`}
              leadingIcon="folder"
              selected={group === null}
              onClick={() => {
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
                onClick={() => {
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
                        onClick: () => {
                          setGroupsOpen(false)
                          editGroup(item)
                        }
                      },
                      {
                        label: 'Удалить группу',
                        icon: 'delete',
                        danger: true,
                        onClick: () => {
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
            <div
              className="ui-stack"
              style={{
                marginTop: 8,
                alignItems: 'flex-start'
              }}
            >
              <Button
                label="Создать группу"
                icon="add"
                primary
                onClick={() => {
                  setGroupsOpen(false)
                  editGroup()
                }}
              />
            </div>
          </div>
        </div>
      </AppDialog>

      {form && <FormSheet spec={form} close={() => setForm(null)} />}
    </div>
  )
}
