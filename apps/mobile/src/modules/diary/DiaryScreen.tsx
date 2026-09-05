import { useCallback, useEffect, useState } from 'react'
import { BackHandler, FlatList, View } from 'react-native'
import {
  DIARY_ICON_NAMES,
  DIARY_MOODS,
  type DiaryEntry,
  type DiarySummary
} from '@mymind/contracts/diary'
import * as schema from '@mymind/core/validation/diary'
import { addDays, localDateKey } from '@mymind/core/habits'
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

const moods = ['Отлично', 'Хорошо', 'Нейтрально', 'Трудно', 'Плохо']
export function DiaryScreen(): React.JSX.Element {
  const { diary: api } = useServices()
  const state = useCollection(useCallback(() => api.listDiaryOverview(), [api]))
  const [selected, setSelected] = useState<DiarySummary | null>(null)
  const [form, setForm] = useState<FormSpec | null>(null)
  const edit = (item?: DiarySummary): void =>
    setForm({
      title: item ? 'Изменить дневник' : 'Новый дневник',
      initial: { title: item?.title ?? '', icon: item?.icon ?? 'book-heart' },
      fields: [
        textField('title', 'Название'),
        choiceField(
          'icon',
          'Значок',
          DIARY_ICON_NAMES.map((value) => ({ value, label: value }))
        )
      ],
      save: (values) => {
        const input = schema.createDiaryInputSchema.parse(values)
        if (item) api.updateDiary({ ...input, id: item.id })
        else api.createDiary(input)
        state.refresh()
      }
    })
  if (selected)
    return (
      <DiaryDetail
        diary={selected}
        back={() => {
          setSelected(null)
          state.refresh()
        }}
      />
    )
  return (
    <View style={{ flex: 1, gap: 12 }}>
      <Button label="+ Дневник" selected onPress={() => edit()} />
      {state.error && <ErrorState message={state.error} retry={state.refresh} />}
      {state.loading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={state.data?.diaries ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <Row
              title={item.title}
              subtitle={`${item.pageCount} дней · ${item.entryCount} записей`}
              onPress={() => setSelected(item)}
            >
              <Button label="Изменить" onPress={() => edit(item)} />
              <Button
                label="Удалить"
                danger
                onPress={() =>
                  state.confirmDelete(
                    'Удалить дневник?',
                    () => {
                      api.deleteDiary({ id: item.id })
                    },
                    'Все дни и записи этого дневника будут удалены.'
                  )
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

function DiaryDetail({ diary, back }: { diary: DiarySummary; back(): void }): React.JSX.Element {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      back()
      return true
    })
    return () => subscription.remove()
  }, [back])
  const { diary: api } = useServices()
  const [date, setDate] = useState(localDateKey())
  const [view, setView] = useState('day')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormSpec | null>(null)
  const state = useCollection(
    useCallback(
      () => ({
        day: api.getDiaryDay({ diaryId: diary.id, dayKey: date }),
        days: api.listDiaryDays({ diaryId: diary.id }),
        report: api.getDiaryReport({ diaryId: diary.id })
      }),
      [api, diary.id, date]
    )
  )
  const edit = (entry?: DiaryEntry): void =>
    setForm({
      title: entry ? 'Изменить запись' : 'Новая запись',
      initial: { text: entry?.text ?? '' },
      fields: [textField('text', 'О чём вы думаете?', 'multiline')],
      save: (values) => {
        if (entry)
          api.updateDiaryEntry(
            schema.updateDiaryEntryInputSchema.parse({ ...values, id: entry.id })
          )
        else
          api.createDiaryEntry(
            schema.createDiaryEntryInputSchema.parse({ ...values, diaryId: diary.id, dayKey: date })
          )
        state.refresh()
      }
    })
  const chooseDate = (): void =>
    setForm({
      title: 'Перейти к дате',
      initial: { dayKey: date },
      fields: [textField('dayKey', 'Дата', 'text', 'ГГГГ-ММ-ДД')],
      save: (values) => {
        setDate(schema.diaryDayKeySchema.parse(values.dayKey))
        setView('day')
      }
    })
  const mood = (): void =>
    setForm({
      title: 'Настроение дня',
      initial: { mood: state.data?.day?.mood ?? null },
      fields: [
        choiceField('mood', 'Как прошёл день?', [
          { value: null, label: 'Без оценки' },
          ...DIARY_MOODS.map((value, index) => ({ value, label: moods[index] }))
        ])
      ],
      save: (values) => {
        api.setDiaryMood(
          schema.setDiaryMoodInputSchema.parse({ ...values, diaryId: diary.id, dayKey: date })
        )
        state.refresh()
      }
    })
  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 10, marginBottom: 12 }}>
        <Button label="‹ Дневники" onPress={back} />
        <Label title>{diary.title}</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label="День" selected={view === 'day'} onPress={() => setView('day')} />
          <Button
            label="История"
            selected={view === 'history'}
            onPress={() => setView('history')}
          />
          <Button label="Отчёт" selected={view === 'report'} onPress={() => setView('report')} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label="‹" onPress={() => setDate(addDays(date, -1))} />
          <Button label={date} onPress={chooseDate} />
          <Button label="›" onPress={() => setDate(addDays(date, 1))} />
          <Button label="+ Запись" selected onPress={() => edit()} />
          <Button label="Настроение" onPress={mood} />
        </View>
      </View>
      {state.error && <ErrorState message={state.error} retry={state.refresh} />}
      {state.loading ? (
        <LoadingState />
      ) : view === 'history' ? (
        <>
          <SearchField value={query} onChangeText={setQuery} />
          <FlatList
            data={(state.data?.days ?? []).filter((day) => day.dayKey.includes(query))}
            keyExtractor={(day) => day.id}
            ListEmptyComponent={<EmptyState />}
            renderItem={({ item }) => (
              <Row
                title={item.dayKey}
                subtitle={`${item.entryCount} записей${item.mood ? ` · ${moods[DIARY_MOODS.indexOf(item.mood)]}` : ''}`}
                onPress={() => {
                  setDate(item.dayKey)
                  setView('day')
                }}
              />
            )}
          />
        </>
      ) : view === 'report' ? (
        <FlatList
          data={state.data?.report.timeline ?? []}
          keyExtractor={(item) => item.dayKey}
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              <Label title>{state.data?.report.entryCount ?? 0} записей</Label>
              <Label>Активных дней: {state.data?.report.activeDays ?? 0}</Label>
              <Label>
                Среднее настроение: {state.data?.report.averageMoodScore?.toFixed(1) ?? '—'} / 5
              </Label>
            </View>
          }
          renderItem={({ item }) => (
            <Row
              title={item.dayKey}
              subtitle={`${item.entryCount} записей · Настроение ${item.moodScore ?? '—'}/5`}
              onPress={() => {
                setDate(item.dayKey)
                setView('day')
              }}
            />
          )}
        />
      ) : (
        <FlatList
          data={state.data?.day?.entries ?? []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            state.data?.day?.mood ? (
              <Label muted>{moods[DIARY_MOODS.indexOf(state.data.day.mood)]}</Label>
            ) : null
          }
          ListEmptyComponent={<EmptyState text="В этот день ещё нет записей." />}
          renderItem={({ item }) => (
            <Row
              title={item.text}
              subtitle={new Date(item.occurredAt).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
              })}
              onPress={() => edit(item)}
            >
              <Button
                label="Удалить"
                danger
                onPress={() =>
                  state.confirmDelete('Удалить запись?', () => {
                    api.deleteDiaryEntry({ id: item.id })
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
