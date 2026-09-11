import { useCallback, useMemo, useState } from 'react'
import { FlatList, TextInput, View } from 'react-native'
import {
  TASK_GROUP_COLORS,
  TASK_GROUP_ICONS,
  type TaskGroupRecord,
  type TaskRecord
} from '@mymind/contracts/tasks'
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
  Row,
  SearchField
} from '../../shared/ui/primitives'
import { FormSheet } from '../../shared/ui/FormSheet'
import { choiceField, textField, type FormSpec } from '../../shared/ui/form-model'
import { useTheme } from '../../shared/ui/theme'
import { quickTaskInput, taskEditorInput, taskSearchText } from './task-presentation'

export function TasksScreen(): React.JSX.Element {
  const { tasks: api } = useServices()
  const theme = useTheme()
  const state = useCollection(useCallback(() => api.listTasksOverview(), [api]))
  const [query, setQuery] = useState('')
  const [quickTitle, setQuickTitle] = useState('')
  const [filter, setFilter] = useState('all')
  const [group, setGroup] = useState<string | null | undefined>(undefined)
  const [groupsView, setGroupsView] = useState(false)
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
        choiceField(
          'icon',
          'Значок',
          TASK_GROUP_ICONS.map((value) => ({ value, label: value }))
        ),
        choiceField(
          'color',
          'Цвет',
          TASK_GROUP_COLORS.map((value) => ({ value, label: value }))
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
    () => new Map((state.data?.groups ?? []).map((item) => [item.id, item.name])),
    [state.data?.groups]
  )
  const normalizedQuery = query.trim().toLocaleLowerCase('ru')
  const tasks = sortTasks(state.data?.tasks ?? []).filter((task) => {
    if (filter !== 'all' && task.status !== filter) return false
    if (group !== undefined && task.groupId !== group) return false
    if (!normalizedQuery) return true
    return taskSearchText(task, task.groupId ? (groupById.get(task.groupId) ?? '') : '').includes(
      normalizedQuery
    )
  })

  const selectedGroupName =
    typeof group === 'string'
      ? (groupById.get(group) ?? 'Группа')
      : group === null
        ? 'Без группы'
        : null

  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 10, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button
            label={groupsView ? 'К задачам' : 'Группы'}
            icon={groupsView ? 'tasks' : 'folder'}
            compact
            onPress={() => setGroupsView(!groupsView)}
          />
          <IconButton
            label={groupsView ? 'Создать группу' : 'Создать задачу'}
            icon="add"
            selected
            onPress={() => (groupsView ? editGroup() : edit())}
          />
        </View>

        {!groupsView && (
          <>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'stretch' }}>
              <TextInput
                accessibilityLabel="Быстро добавить задачу"
                placeholder="Быстро добавить задачу…"
                placeholderTextColor={theme.muted}
                value={quickTitle}
                onChangeText={setQuickTitle}
                onSubmitEditing={quickAdd}
                returnKeyType="done"
                editable={!state.pending}
                style={{
                  flex: 1,
                  minHeight: 48,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  color: theme.text,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  fontSize: 16
                }}
              />
              <IconButton
                label="Добавить задачу"
                icon="add"
                selected
                disabled={!quickTitle.trim() || state.pending}
                onPress={quickAdd}
              />
            </View>

            <SearchField value={query} onChangeText={setQuery} />
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {[
                { value: 'all', label: 'Все' },
                { value: 'active', label: 'Активные' },
                { value: 'completed', label: 'Выполненные' }
              ].map((item) => (
                <Button
                  key={item.value}
                  label={item.label}
                  selected={filter === item.value}
                  onPress={() => setFilter(item.value)}
                />
              ))}
              <Button
                label="Все группы"
                selected={group === undefined}
                onPress={() => setGroup(undefined)}
              />
              <Button label="Без группы" selected={group === null} onPress={() => setGroup(null)} />
              {selectedGroupName && typeof group === 'string' ? (
                <Button label={selectedGroupName} selected onPress={() => setGroup(undefined)} />
              ) : null}
            </View>
          </>
        )}
      </View>

      {state.error && <ErrorState message={state.error} retry={state.refresh} />}
      {state.loading ? (
        <LoadingState />
      ) : groupsView ? (
        <FlatList
          data={state.data?.groups ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <Row
              title={item.name}
              subtitle={
                (state.data?.tasks.filter((task) => task.groupId === item.id).length ?? 0) +
                ' задач'
              }
              leadingIcon="folder"
              onPress={() => {
                setGroup(item.id)
                setGroupsView(false)
              }}
            >
              <IconButton
                label="Изменить группу"
                icon="edit"
                compact
                onPress={() => editGroup(item)}
              />
              <IconButton
                label="Удалить группу"
                icon="delete"
                compact
                danger
                onPress={() =>
                  state.confirmDelete(
                    'Удалить группу?',
                    () => {
                      api.deleteTaskGroup({ id: item.id })
                      if (group === item.id) setGroup(null)
                    },
                    'Сами задачи сохранятся и будут перенесены в «Без группы».'
                  )
                }
              />
            </Row>
          )}
        />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          refreshing={state.loading}
          onRefresh={state.refresh}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => {
            const groupName = item.groupId ? groupById.get(item.groupId) : null
            return (
              <Row
                title={item.title}
                leadingIcon="tasks"
                subtitle={[groupName, item.status === 'completed' ? 'Выполнено' : 'Активная']
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() => toggle(item)}
              >
                <IconButton
                  label={item.status === 'active' ? 'Выполнить' : 'Вернуть'}
                  icon={item.status === 'active' ? 'check' : 'reset'}
                  selected={item.status === 'completed'}
                  compact
                  disabled={state.pending}
                  onPress={() => toggle(item)}
                />
                <IconButton
                  label="Перенести"
                  icon="move"
                  compact
                  disabled={state.pending}
                  onPress={() => move(item)}
                />
                <IconButton
                  label="Изменить"
                  icon="edit"
                  compact
                  disabled={state.pending}
                  onPress={() => edit(item)}
                />
                <IconButton
                  label="Удалить"
                  icon="delete"
                  compact
                  danger
                  disabled={state.pending}
                  onPress={() =>
                    state.confirmDelete('Удалить задачу?', () => {
                      api.deleteTask({ id: item.id })
                    })
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
