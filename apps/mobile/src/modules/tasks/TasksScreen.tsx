import { useCallback, useState } from 'react'
import { FlatList, View } from 'react-native'
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
  LoadingState,
  Row,
  SearchField
} from '../../shared/ui/primitives'
import { FormSheet } from '../../shared/ui/FormSheet'
import { choiceField, textField, type FormSpec } from '../../shared/ui/form-model'

export function TasksScreen(): React.JSX.Element {
  const { tasks: api } = useServices()
  const state = useCollection(useCallback(() => api.listTasksOverview(), [api]))
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [group, setGroup] = useState<string | null | undefined>(undefined)
  const [groupsView, setGroupsView] = useState(false)
  const [form, setForm] = useState<FormSpec | null>(null)
  const groupChoices = [
    { value: null, label: 'Без группы' },
    ...(state.data?.groups ?? []).map((g) => ({ value: g.id, label: g.name }))
  ]
  const edit = (task?: TaskRecord): void =>
    setForm({
      title: task ? 'Редактировать задачу' : 'Новая задача',
      initial: task
        ? {
            title: task.title,
            description: task.description,
            groupId: task.groupId,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
            dueTime: task.dueTime
          }
        : {
            title: '',
            description: '',
            groupId: group ?? null,
            status: 'active',
            priority: 'normal',
            dueDate: null,
            dueTime: null
          },
      fields: [
        textField('title', 'Название'),
        textField('description', 'Описание', 'multiline'),
        choiceField('groupId', 'Группа', groupChoices),
        choiceField('priority', 'Приоритет', [
          { value: 'low', label: 'Низкий' },
          { value: 'normal', label: 'Обычный' },
          { value: 'high', label: 'Высокий' }
        ]),
        choiceField('status', 'Статус', [
          { value: 'active', label: 'Активная' },
          { value: 'completed', label: 'Выполнена' }
        ]),
        textField('dueDate', 'Дата', 'text', 'ГГГГ-ММ-ДД; пустое поле — без срока'),
        textField('dueTime', 'Время', 'text', 'ЧЧ:ММ; необязательно')
      ],
      save: (values) => {
        const input = schema.createTaskInputSchema.parse({
          ...values,
          dueDate: values.dueDate || null,
          dueTime: values.dueTime || null
        })
        if (task) api.updateTask({ ...input, id: task.id })
        else api.createTask(input)
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
      api.updateTask({
        id: task.id,
        title: task.title,
        description: task.description,
        groupId: task.groupId,
        status: task.status === 'active' ? 'completed' : 'active',
        priority: task.priority,
        dueDate: task.dueDate,
        dueTime: task.dueTime
      })
    })
  const tasks = sortTasks(state.data?.tasks ?? []).filter(
    (task) =>
      (filter === 'all' || task.status === filter) &&
      (group === undefined || task.groupId === group) &&
      `${task.title} ${task.description}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  )
  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 10, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button
            label={groupsView ? 'К задачам' : 'Группы'}
            onPress={() => setGroupsView(!groupsView)}
          />
          <Button
            label={groupsView ? '+ Группа' : '+ Задача'}
            selected
            onPress={() => (groupsView ? editGroup() : edit())}
          />
        </View>
        {!groupsView && (
          <>
            <SearchField value={query} onChangeText={setQuery} />
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {[
                { value: 'all', label: 'Все' },
                { value: 'active', label: 'Активные' },
                { value: 'completed', label: 'Готово' }
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
              subtitle={`${state.data?.tasks.filter((t) => t.groupId === item.id).length ?? 0} задач`}
              onPress={() => {
                setGroup(item.id)
                setGroupsView(false)
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
                      api.deleteTaskGroup({ id: item.id })
                      if (group === item.id) setGroup(undefined)
                    },
                    'Задачи сохранятся без группы.'
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
          renderItem={({ item }) => (
            <Row
              title={`${item.status === 'completed' ? '✓ ' : ''}${item.title}`}
              subtitle={[
                item.description,
                item.dueDate,
                item.dueTime,
                item.priority === 'high' ? 'Высокий приоритет' : '',
                state.data?.groups.find((g) => g.id === item.groupId)?.name
              ]
                .filter(Boolean)
                .join(' · ')}
              onPress={() => edit(item)}
            >
              <Button
                label={item.status === 'active' ? 'Выполнить' : 'Вернуть'}
                disabled={state.pending}
                onPress={() => toggle(item)}
              />
              <Button
                label="Удалить"
                danger
                disabled={state.pending}
                onPress={() =>
                  state.confirmDelete('Удалить задачу?', () => {
                    api.deleteTask({ id: item.id })
                  })
                }
              />
            </Row>
          )}
        />
      )}
      {form && <FormSheet spec={form} close={() => setForm(null)} />}
    </View>
  )
}
