import { useCallback, useMemo, useState } from 'react'
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
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
  LoadingState,
  SearchField
} from '../../shared/ui/primitives'
import { FormSheet } from '../../shared/ui/FormSheet'
import { AppDialog } from '../../shared/ui/AppDialog'
import { ModuleTabs } from '../../shared/ui/ModuleTabs'
import { ActionMenu } from '../../shared/ui/ActionMenu'
import { WorkspaceNodeCard } from '../../shared/ui/Workspace'
import { MobileCreateAction } from '../../shared/ui/MobileCreateAction'
import { VisualIconBadge } from '../../shared/ui/VisualPickers'
import { TASK_GROUP_COLOR_CHOICES, TASK_GROUP_ICON_CHOICES } from '../../shared/ui/visual-options'
import {
  choiceField,
  colorField,
  iconField,
  textField,
  type FormSpec
} from '../../shared/ui/form-model'
import { AppIcon } from '../../shared/ui/icons'
import { useTheme } from '../../shared/ui/theme'
import { quickTaskInput, taskEditorInput, taskSearchText } from './task-presentation'

export function TasksScreen(): React.JSX.Element {
  const { tasks: api } = useServices()
  const theme = useTheme()
  const state = useCollection(useCallback(() => api.listTasksOverview(), [api]))
  const [query, setQuery] = useState('')
  const [quickTitle, setQuickTitle] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [group, setGroup] = useState<string | null | undefined>(undefined)
  const [groupsOpen, setGroupsOpen] = useState(false)
  const [form, setForm] = useState<FormSpec | null>(null)

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
      title: 'Перенести задачу',
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
    <View style={{ flex: 1 }}>
      <View style={{ gap: 10, marginBottom: 12 }}>
        <SearchField value={query} onChangeText={setQuery} />

        <ModuleTabs
          items={[
            { id: 'all' as const, label: 'Все' },
            { id: 'active' as const, label: 'Активные' },
            { id: 'completed' as const, label: 'Выполненные' }
          ]}
          value={filter}
          onChange={setFilter}
          compact
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, alignItems: 'center' }}
        >
          <Button
            label="Все задачи"
            selected={group === undefined}
            onPress={() => setGroup(undefined)}
          />
          <Button
            label="Без группы"
            selected={group === null}
            onPress={() => setGroup(null)}
          />
          {(state.data?.groups ?? []).map((item) => (
            <Button
              key={item.id}
              label={item.name}
              selected={group === item.id}
              onPress={() => setGroup(item.id)}
            />
          ))}
          <Button label="Управление группами" icon="folder" onPress={() => setGroupsOpen(true)} />
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'stretch' }}>
          <View
            style={{
              width: 36,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: theme.accent + '14'
            }}
          >
            <AppIcon name="add" size={16} color={theme.accent} />
          </View>
          <TextInput
            accessibilityLabel="Быстро добавить задачу"
            placeholder={
              typeof group === 'string'
                ? `Новая задача в «${groupById.get(group)?.name ?? ''}»…`
                : 'Быстро добавить задачу…'
            }
            placeholderTextColor={theme.muted}
            value={quickTitle}
            onChangeText={setQuickTitle}
            onSubmitEditing={quickAdd}
            returnKeyType="done"
            editable={!state.pending}
            maxLength={240}
            style={{
              flex: 1,
              minHeight: 44,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              color: theme.text,
              paddingHorizontal: 14,
              borderRadius: 12,
              fontSize: 14
            }}
          />
          <Button
            label="Добавить"
            primary
            disabled={!quickTitle.trim() || state.pending}
            onPress={quickAdd}
          />
        </View>
      </View>

      {state.error && <ErrorState message={state.error} retry={state.refresh} />}
      {state.loading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 88 }}
          refreshing={state.loading}
          onRefresh={state.refresh}
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
                  onPress={() => toggle(item)}
                  disabled={state.pending}
                  style={({ pressed }) => ({
                    flex: 1,
                    minWidth: 0,
                    minHeight: 64,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 11,
                    paddingLeft: 14,
                    paddingRight: 6,
                    paddingVertical: 11,
                    opacity: pressed ? 0.72 : 1
                  })}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
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

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      numberOfLines={2}
                      style={{
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
                    {taskGroup ? (
                      <View
                        style={{
                          alignSelf: 'flex-start',
                          marginTop: 6,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5
                        }}
                      >
                        <VisualIconBadge
                          value={taskGroup.icon}
                          colorKey={taskGroup.color}
                          size={24}
                        />
                        <Text
                          numberOfLines={1}
                          style={{ maxWidth: 120, color: theme.muted, fontSize: 10.5 }}
                        >
                          {taskGroup.name}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </Pressable>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingRight: 6
                  }}
                >
                  <ActionMenu
                    disabled={state.pending}
                    title={item.title}
                    items={[
                      {
                        label: 'Перенести',
                        icon: 'move',
                        onPress: () => move(item)
                      },
                      {
                        label: 'Изменить',
                        icon: 'edit',
                        onPress: () => edit(item)
                      },
                      {
                        label: 'Удалить',
                        icon: 'delete',
                        danger: true,
                        onPress: () =>
                          state.confirmDelete('Удалить задачу?', () => {
                            api.deleteTask({ id: item.id })
                          })
                      }
                    ]}
                  />
                </View>
              </View>
            )
          }}
        />
      )}
      <MobileCreateAction
        disabled={state.pending}
        actions={[
          {
            key: 'task',
            label: 'Новая задача',
            description: 'Открыть полную форму задачи',
            icon: 'tasks',
            onPress: () => edit()
          },
          {
            key: 'group',
            label: 'Новая группа',
            description: 'Создать отдельный контекст для задач',
            icon: 'folder',
            onPress: () => editGroup()
          }
        ]}
      />
      <AppDialog
        open={groupsOpen}
        onOpenChange={setGroupsOpen}
        title="Группы"
        description="Фильтр и управление группами задач"
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
              label="Новая группа"
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
