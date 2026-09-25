import { useCallback, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native'
import { type TaskGroupRecord, type TaskRecord } from '@mymind/contracts/tasks'
import * as schema from '@mymind/core/validation/tasks'
import { sortTasks } from '@mymind/core/tasks'
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
import { ActionMenu, ActionMenuDialog } from '../../shared/ui/ActionMenu'
import { WorkspaceNodeCard } from '../../shared/ui/Workspace'
import { VisualIconBadge } from '../../shared/ui/VisualPickers'
import { TASK_GROUP_COLOR_CHOICES, TASK_GROUP_ICON_CHOICES } from '../../shared/ui/visual-options'
import {
  choiceField,
  colorField,
  iconField,
  textField,
  type FormSpec
} from '../../shared/ui/form-model'
import { AppIcon, type AppIconName } from '../../shared/ui/icons'
import { useTheme } from '../../shared/ui/theme'
import { SwipeableTabContent } from '../../shared/ui/SwipeableTabContent'
import { SwipeTabBar } from '../../shared/ui/SwipeTabBar'
import { useSwipeTabFeedback } from '../../shared/ui/useSwipeTabFeedback'
import { quickTaskInput, taskEditorInput, taskSearchText } from './task-presentation'

type TaskStatusFilter = 'all' | 'active' | 'completed'

const TASK_STATUS_TABS = ['all', 'active', 'completed'] as const

const STATUS_FILTERS: ReadonlyArray<{
  id: TaskStatusFilter
  label: string
  icon: AppIconName
}> = [
  { id: 'all', label: 'Все задачи', icon: 'tasks' },
  { id: 'active', label: 'Активные задачи', icon: 'circle' },
  { id: 'completed', label: 'Выполненные задачи', icon: 'completed' }
]

export function TasksScreen(): React.JSX.Element {
  const { tasks: api } = useServices()
  const theme = useTheme()
  const state = useCollection(useCallback(() => api.listTasksOverview(), [api]))
  const [query, setQuery] = useState('')
  const [quickTitle, setQuickTitle] = useState('')
  const [filter, setFilter] = useState<TaskStatusFilter>('all')
  const [group, setGroup] = useState<string | null | undefined>(undefined)
  const [groupsOpen, setGroupsOpen] = useState(false)
  const [form, setForm] = useState<FormSpec | null>(null)
  const [taskActionsId, setTaskActionsId] = useState<string | null>(null)
  const longPressedTaskId = useRef<string | null>(null)
  const [swipeTabFeedback, showSwipeTabFeedback] = useSwipeTabFeedback<TaskStatusFilter>()
  const [searchOpen, setSearchOpen] = useState(false)

  const changeFilter = useCallback(
    (next: TaskStatusFilter): void => {
      if (next === filter) return
      setFilter(next)
    },
    [filter]
  )

  const groupChoices = useMemo(
    () => [
      { value: null, label: 'Без группы' },
      ...(state.data?.groups ?? []).map((item) => ({ value: item.id, label: item.name }))
    ],
    [state.data?.groups]
  )

  const edit = (task?: TaskRecord): void =>
    setForm({
      title: task ? 'Редактировать задачу' : 'Новая задача',
      initial: {
        title: task?.title ?? '',
        groupId: task?.groupId ?? (typeof group === 'string' ? group : null),
        status: task?.status ?? 'active'
      },
      fields: [
        textField('title', 'Название'),
        choiceField('groupId', 'Группа', groupChoices),
        choiceField('status', 'Статус', [
          { value: 'active', label: 'Активная' },
          { value: 'completed', label: 'Выполнена' }
        ])
      ],
      preview: {
        titleKey: 'name',
        iconKey: 'icon',
        colorKey: 'color',
        iconFamily: 'task',
        description: 'Так группа будет выглядеть в списке задач.'
      },
      save: (values) => {
        const input = taskEditorInput(
          String(values.title ?? ''),
          typeof values.groupId === 'string' ? values.groupId : null,
          values.status === 'completed' ? 'completed' : 'active',
          task
        )
        if (task) api.updateTask(schema.updateTaskInputSchema.parse({ ...input, id: task.id }))
        else api.createTask(schema.createTaskInputSchema.parse(input))
        state.refresh()
      }
    })

  const editGroup = (item?: TaskGroupRecord): void =>
    setForm({
      title: item ? 'Группа задач' : 'Новая группа',
      initial: {
        name: item?.name ?? '',
        icon: item?.icon ?? 'folder',
        color: item?.color ?? 'accent'
      },
      fields: [
        textField('name', 'Название'),
        iconField('icon', 'Иконка', TASK_GROUP_ICON_CHOICES, 'task'),
        colorField(
          'color',
          'Цвет',
          TASK_GROUP_COLOR_CHOICES,
          '«Без цвета» использует акцент приложения.'
        )
      ],
      save: (values) => {
        const input = schema.createTaskGroupInputSchema.parse(values)
        if (item) api.updateTaskGroup({ ...input, id: item.id })
        else api.createTaskGroup(input)
        state.refresh()
      }
    })

  const toggle = (task: TaskRecord): void =>
    state.mutate(() => {
      api.updateTask(
        schema.updateTaskInputSchema.parse({
          ...taskEditorInput(
            task.title,
            task.groupId,
            task.status === 'active' ? 'completed' : 'active',
            task
          ),
          id: task.id
        })
      )
    })

  const move = (task: TaskRecord): void =>
    setForm({
      title: 'Группа задачи',
      initial: { groupId: task.groupId },
      fields: [choiceField('groupId', 'Группа', groupChoices)],
      save: (values) => {
        const nextGroupId = typeof values.groupId === 'string' ? values.groupId : null
        api.updateTask(
          schema.updateTaskInputSchema.parse({
            ...taskEditorInput(task.title, nextGroupId, task.status, task),
            id: task.id
          })
        )
        state.refresh()
      }
    })

  const quickAdd = (): void => {
    const title = quickTitle.trim()
    if (!title || state.pending) return
    state.mutate(() => {
      api.createTask(
        schema.createTaskInputSchema.parse(
          quickTaskInput(title, typeof group === 'string' ? group : null)
        )
      )
      setQuickTitle('')
    })
  }

  const groupById = useMemo(
    () => new Map((state.data?.groups ?? []).map((item) => [item.id, item])),
    [state.data?.groups]
  )

  const activeGroupLabel =
    group === undefined
      ? 'Все задачи'
      : group === null
        ? 'Без группы'
        : (groupById.get(group)?.name ?? 'Группа')

  const normalizedQuery = query.trim().toLocaleLowerCase('ru')
  const tasks = sortTasks(state.data?.tasks ?? []).filter((task) => {
    if (filter !== 'all' && task.status !== filter) return false
    if (group !== undefined && task.groupId !== group) return false
    if (!normalizedQuery) return true
    return taskSearchText(
      task,
      task.groupId ? (groupById.get(task.groupId)?.name ?? '') : ''
    ).includes(normalizedQuery)
  })

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, minHeight: 0 }}
    >
      <View style={{ marginBottom: 12 }}>
        <SwipeTabBar
          items={STATUS_FILTERS}
          value={filter}
          onChange={changeFilter}
          feedback={swipeTabFeedback}
          search={{ value: query, onChangeText: setQuery }}
          onSearchOpenChange={setSearchOpen}
          renderIcon={(item, selected) => (
            <AppIcon
              name={item.icon}
              size={19}
              strokeWidth={selected ? 2.4 : 2}
              color={selected ? theme.accent : theme.muted}
            />
          )}
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
      </View>

      {state.error && <ErrorState message={state.error} retry={state.refresh} />}

      <SwipeableTabContent
        tabs={TASK_STATUS_TABS}
        value={filter}
        onChange={changeFilter}
        onSwipeChange={showSwipeTabFeedback}
        disabled={state.pending || searchOpen}
      >
        {state.loading ? (
          <LoadingState />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={tasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 8 }}
            refreshing={state.loading}
            onRefresh={state.refresh}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<EmptyState />}
            renderItem={({ item }) => {
              const taskGroup = item.groupId ? (groupById.get(item.groupId) ?? null) : null
              const completed = item.status === 'completed'

              return (
                <View
                  style={{
                    position: 'relative',
                    minHeight: 66,
                    marginBottom: 8,
                    overflow: 'hidden',
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 16,
                    backgroundColor: completed ? theme.success + '0E' : theme.surface
                  }}
                >
                  {completed ? (
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
                        backgroundColor: theme.success
                      }}
                    />
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      completed ? 'Вернуть задачу ' + item.title : 'Выполнить задачу ' + item.title
                    }
                    accessibilityHint="Удерживайте для действий с задачей"
                    onPress={() => {
                      if (longPressedTaskId.current === item.id) {
                        longPressedTaskId.current = null
                        return
                      }
                      toggle(item)
                    }}
                    onLongPress={() => {
                      if (state.pending) return
                      longPressedTaskId.current = item.id
                      setTaskActionsId(item.id)
                    }}
                    delayLongPress={380}
                    disabled={state.pending}
                    style={({ pressed }) => ({
                      flex: 1,
                      minWidth: 0,
                      minHeight: 64,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 11,
                      paddingLeft: 14,
                      paddingRight: 14,
                      paddingVertical: 11,
                      opacity: pressed ? 0.72 : 1
                    })}
                  >
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        flexShrink: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 11,
                        borderWidth: 1,
                        borderColor: completed ? theme.success : theme.muted,
                        backgroundColor: completed ? theme.success + '22' : 'transparent'
                      }}
                    >
                      {completed ? (
                        <AppIcon name="check" size={13} strokeWidth={3} color={theme.success} />
                      ) : null}
                    </View>

                    <Text
                      style={{
                        flex: 1,
                        minWidth: 0,
                        color: completed ? theme.muted : theme.text,
                        fontSize: 14,
                        lineHeight: 20,
                        fontWeight: '600',
                        textDecorationLine: completed ? 'line-through' : 'none',
                        textDecorationColor: completed ? theme.success : undefined
                      }}
                    >
                      {item.title}
                    </Text>
                  </Pressable>

                  <ActionMenuDialog
                    open={taskActionsId === item.id}
                    onOpenChange={(open) => {
                      if (!open) {
                        setTaskActionsId(null)
                        longPressedTaskId.current = null
                      }
                    }}
                    title={item.title}
                    items={[
                      {
                        key: 'group',
                        label: `Группа: ${taskGroup?.name ?? 'Без группы'}`,
                        icon: 'folder',
                        disabled: state.pending,
                        onPress: () => move(item)
                      },
                      {
                        key: 'edit',
                        label: 'Изменить',
                        icon: 'edit',
                        disabled: state.pending,
                        onPress: () => edit(item)
                      },
                      {
                        key: 'delete',
                        label: 'Удалить',
                        icon: 'delete',
                        danger: true,
                        disabled: state.pending,
                        onPress: () =>
                          state.confirmDelete('Удалить задачу?', () => {
                            api.deleteTask({ id: item.id })
                          })
                      }
                    ]}
                  />
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
        <View
          style={{
            minHeight: 50,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8
          }}
        >
          <TextInput
            accessibilityLabel="Быстро добавить задачу"
            placeholder={
              typeof group === 'string'
                ? `Новая задача в «${groupById.get(group)?.name ?? ''}»…`
                : 'Новая задача…'
            }
            placeholderTextColor={theme.muted}
            value={quickTitle}
            onChangeText={setQuickTitle}
            onSubmitEditing={quickAdd}
            returnKeyType="send"
            editable={!state.pending}
            maxLength={240}
            style={{
              flex: 1,
              minHeight: 48,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 16,
              backgroundColor: theme.surface,
              color: theme.text,
              paddingHorizontal: 15,
              paddingVertical: 10,
              fontSize: 14
            }}
          />
          <IconButton
            label="Добавить задачу"
            icon="add"
            primary
            disabled={!quickTitle.trim() || state.pending}
            onPress={quickAdd}
          />
        </View>
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
            title="Все задачи"
            subtitle={`${state.data?.tasks.length ?? 0} задач`}
            leadingIcon="tasks"
            selected={group === undefined}
            onPress={() => {
              setGroup(undefined)
              setGroupsOpen(false)
            }}
          />
          <WorkspaceNodeCard
            title="Без группы"
            subtitle={`${(state.data?.tasks ?? []).filter((task) => task.groupId === null).length} задач`}
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
              subtitle={`${(state.data?.tasks ?? []).filter((task) => task.groupId === item.id).length} задач`}
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
                            api.deleteTaskGroup({ id: item.id })
                            if (group === item.id) setGroup(null)
                          },
                          'Сами задачи сохранятся и будут перенесены в «Без группы».'
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
    </KeyboardAvoidingView>
  )
}
