import { useCallback, useState } from 'react'
import { FlatList, View } from 'react-native'
import type { CalendarOccurrenceRecord } from '@mymind/contracts/calendar'
import * as schema from '@mymind/core/validation/calendar'
import { diaryDayKeySchema } from '@mymind/core/validation/diary'
import { addDays, localDateKey } from '@mymind/core/habits'
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

export function CalendarScreen(): React.JSX.Element {
  const { calendar: api } = useServices()
  const [from, setFrom] = useState(localDateKey())
  const [to, setTo] = useState(addDays(localDateKey(), 30))
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormSpec | null>(null)
  const state = useCollection(
    useCallback(
      () => api.listCalendarOccurrences(schema.calendarRangeInputSchema.parse({ from, to })),
      [api, from, to]
    )
  )
  const edit = (item?: CalendarOccurrenceRecord): void =>
    setForm({
      title: item ? 'Изменить событие' : 'Новое событие',
      initial: {
        title: item?.title ?? '',
        kind: item?.kind ?? 'one_time',
        date: item?.occurrenceDate ?? from,
        time: item?.time ?? null,
        startDate: item?.startDate ?? null,
        note: item?.note ?? '',
        offsets: item?.reminderOffsets.join(', ') ?? ''
      },
      fields: [
        textField('title', 'Название'),
        choiceField('kind', 'Повторение', [
          { value: 'one_time', label: 'Один раз' },
          { value: 'annual', label: 'Каждый год' }
        ]),
        textField('date', 'Дата события', 'text', 'ГГГГ-ММ-ДД'),
        textField('time', 'Время', 'text', 'ЧЧ:ММ, необязательно'),
        textField(
          'startDate',
          'Отсчитывать время от даты',
          'text',
          'Для ежегодных событий; ГГГГ-ММ-ДД'
        ),
        textField('note', 'Заметка к этому событию', 'multiline'),
        textField('offsets', 'Напомнить за N минут', 'text', 'Через запятую, например: 30, 1440')
      ],
      save: (values) => {
        const { offsets, ...rest } = values
        diaryDayKeySchema.parse(values.date)
        if (values.startDate) diaryDayKeySchema.parse(values.startDate)
        const input = schema.calendarCreateEventInputSchema.parse({
          ...rest,
          time: values.time || null,
          startDate: values.startDate || null,
          reminderOffsets: String(offsets).trim() ? String(offsets).split(',').map(Number) : []
        })
        if (item)
          api.updateCalendarEvent({
            ...input,
            id: item.eventId,
            occurrenceDate: item.occurrenceDate
          })
        else api.createCalendarEvent(input)
        state.refresh()
      }
    })
  const range = (): void =>
    setForm({
      title: 'Период календаря',
      initial: { from, to },
      fields: [
        textField('from', 'С даты', 'text', 'ГГГГ-ММ-ДД'),
        textField('to', 'По дату', 'text', 'ГГГГ-ММ-ДД')
      ],
      save: (values) => {
        const input = schema.calendarRangeInputSchema.parse(values)
        diaryDayKeySchema.parse(input.from)
        diaryDayKeySchema.parse(input.to)
        if (Number(input.to.slice(0, 4)) - Number(input.from.slice(0, 4)) > 10)
          throw new Error('Выберите период не больше 10 лет')
        setFrom(input.from)
        setTo(input.to)
      }
    })
  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 10, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label="+ Событие" selected onPress={() => edit()} />
          <Button label="Период" onPress={range} />
          <Button
            label="Сегодня"
            onPress={() => {
              setFrom(localDateKey())
              setTo(localDateKey())
            }}
          />
          <Button
            label="Месяц"
            onPress={() => {
              setFrom(localDateKey())
              setTo(addDays(localDateKey(), 30))
            }}
          />
        </View>
        <Button label={`${from} — ${to}`} onPress={range} />
        <SearchField value={query} onChangeText={setQuery} />
      </View>
      {state.error && <ErrorState message={state.error} retry={state.refresh} />}
      {state.loading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={(state.data ?? []).filter((item) =>
            `${item.title} ${item.note}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())
          )}
          keyExtractor={(item) => `${item.eventId}:${item.occurrenceDate}`}
          ListEmptyComponent={<EmptyState text="В этом периоде нет событий." />}
          refreshing={state.loading}
          onRefresh={state.refresh}
          renderItem={({ item }) => (
            <Row
              title={item.title}
              subtitle={[
                item.occurrenceDate,
                item.time,
                item.kind === 'annual' ? 'Каждый год' : '',
                item.note,
                item.elapsed
                  ? `${item.elapsed.years} лет, ${item.elapsed.months} мес., ${item.elapsed.days} дн.`
                  : ''
              ]
                .filter(Boolean)
                .join(' · ')}
              onPress={() => edit(item)}
            >
              {item.kind === 'annual' && (
                <Button
                  label="Пропустить в этом году"
                  onPress={() =>
                    state.confirmDelete(
                      'Скрыть это повторение?',
                      () => {
                        api.setCalendarOccurrenceHidden({
                          eventId: item.eventId,
                          occurrenceDate: item.occurrenceDate,
                          hidden: true
                        })
                      },
                      'Остальные ежегодные повторения сохранятся.'
                    )
                  }
                />
              )}
              <Button
                label="Удалить событие"
                danger
                onPress={() =>
                  state.confirmDelete(
                    'Удалить событие?',
                    () => {
                      api.deleteCalendarEvent(item.eventId)
                    },
                    item.kind === 'annual'
                      ? 'Будут удалены все ежегодные повторения и заметки.'
                      : 'Событие и заметка будут удалены.'
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
