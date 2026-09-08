import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, BackHandler, FlatList, Pressable, Text, View } from 'react-native'
import {
  DIARY_COVER_TONES,
  DIARY_ICON_NAMES,
  DIARY_MOODS,
  DIARY_PAPER_PATTERNS,
  DIARY_PAPER_TONES,
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
import { useTheme } from '../../shared/ui/theme'
import {
  buildDiaryCalendarMonth,
  diaryAppearancePalette,
  diaryCoverToneLabels,
  diaryMonthKey,
  diaryMonthLabel,
  diaryMoodMeta,
  diaryPaperPatternLabels,
  diaryPaperToneLabels,
  shiftDiaryMonth
} from './diary-presentation'

type DiaryDetailView = 'day' | 'history' | 'calendar' | 'report' | 'settings'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const MOOD_CHOICES = DIARY_MOODS.map((value) => ({
  value,
  label: `${diaryMoodMeta(value)?.emoji ?? ''} ${diaryMoodMeta(value)?.label ?? value}`
}))

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

  if (selected) {
    return (
      <DiaryDetail
        diary={selected}
        back={() => {
          setSelected(null)
          state.refresh()
        }}
      />
    )
  }

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
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <DiaryNotebookCard
              diary={item}
              onOpen={() => setSelected(item)}
              onEdit={() => edit(item)}
              onDelete={() =>
                state.confirmDelete(
                  'Удалить дневник?',
                  () => {
                    api.deleteDiary({ id: item.id })
                  },
                  'Все дни и записи этого дневника будут удалены.'
                )
              }
            />
          )}
        />
      )}
      {form && <FormSheet spec={form} close={() => setForm(null)} />}
    </View>
  )
}

function DiaryNotebookCard({
  diary,
  onOpen,
  onEdit,
  onDelete
}: {
  diary: DiarySummary
  onOpen(): void
  onEdit(): void
  onDelete(): void
}): React.JSX.Element {
  const theme = useTheme()
  const palette = diaryAppearancePalette(diary.paperTone, diary.coverTone)

  return (
    <View
      style={{
        marginBottom: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: palette.coverBackground,
        overflow: 'hidden'
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Открыть дневник ${diary.title}`}
        onPress={onOpen}
        style={({ pressed }) => ({
          minHeight: 126,
          paddingHorizontal: 18,
          paddingVertical: 17,
          opacity: pressed ? 0.78 : 1,
          flexDirection: 'row',
          gap: 14
        })}
      >
        <View
          style={{
            width: 7,
            borderRadius: 99,
            backgroundColor: palette.coverText,
            opacity: 0.2
          }}
        />
        <View style={{ flex: 1, justifyContent: 'space-between', gap: 16 }}>
          <View style={{ gap: 5 }}>
            <Text style={{ color: palette.coverText, fontSize: 12, opacity: 0.72 }}>
              {diary.icon}
            </Text>
            <Text style={{ color: palette.coverText, fontSize: 21, fontWeight: '800' }}>
              {diary.title}
            </Text>
          </View>
          <Text style={{ color: palette.coverText, fontSize: 13, opacity: 0.76 }}>
            {diary.pageCount} дней · {diary.entryCount} записей
          </Text>
        </View>
      </Pressable>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          padding: 10,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.surface
        }}
      >
        <Button label="Открыть" onPress={onOpen} />
        <Button label="Изменить" onPress={onEdit} />
        <Button label="Удалить" danger onPress={onDelete} />
      </View>
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
  const [currentDiary, setCurrentDiary] = useState(diary)
  const [date, setDate] = useState(localDateKey())
  const [view, setView] = useState<DiaryDetailView>('day')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormSpec | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(() => diaryMonthKey(localDateKey()))
  const pageOffset = useRef(new Animated.Value(0)).current

  const state = useCollection(
    useCallback(
      () => ({
        day: api.getDiaryDay({ diaryId: currentDiary.id, dayKey: date }),
        days: api.listDiaryDays({ diaryId: currentDiary.id }),
        report: api.getDiaryReport({ diaryId: currentDiary.id })
      }),
      [api, currentDiary.id, date]
    )
  )

  const turnToDate = (nextDate: string, direction = 1): void => {
    pageOffset.setValue(direction >= 0 ? 24 : -24)
    setDate(nextDate)
    setCalendarMonth(diaryMonthKey(nextDate))
    setView('day')
    Animated.timing(pageOffset, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true
    }).start()
  }

  const edit = (entry?: DiaryEntry): void =>
    setForm({
      title: entry ? 'Изменить запись' : 'Новая запись',
      initial: { text: entry?.text ?? '' },
      fields: [textField('text', 'О чём вы думаете?', 'multiline')],
      save: (values) => {
        if (entry) {
          api.updateDiaryEntry(
            schema.updateDiaryEntryInputSchema.parse({ ...values, id: entry.id })
          )
        } else {
          api.createDiaryEntry(
            schema.createDiaryEntryInputSchema.parse({
              ...values,
              diaryId: currentDiary.id,
              dayKey: date
            })
          )
        }
        state.refresh()
      }
    })

  const chooseDate = (): void =>
    setForm({
      title: 'Перейти к дате',
      initial: { dayKey: date },
      fields: [textField('dayKey', 'Дата', 'text', 'ГГГГ-ММ-ДД')],
      save: (values) => {
        turnToDate(schema.diaryDayKeySchema.parse(values.dayKey))
      }
    })

  const mood = (): void =>
    setForm({
      title: 'Настроение дня',
      initial: { mood: state.data?.day?.mood ?? null },
      fields: [
        choiceField('mood', 'Как прошёл день?', [
          { value: null, label: 'Без оценки' },
          ...MOOD_CHOICES
        ])
      ],
      save: (values) => {
        api.setDiaryMood(
          schema.setDiaryMoodInputSchema.parse({
            ...values,
            diaryId: currentDiary.id,
            dayKey: date
          })
        )
        state.refresh()
      }
    })

  const appearance = (): void =>
    setForm({
      title: 'Оформление дневника',
      initial: {
        paperPattern: currentDiary.paperPattern,
        paperTone: currentDiary.paperTone,
        coverTone: currentDiary.coverTone
      },
      fields: [
        choiceField(
          'paperPattern',
          'Разметка бумаги',
          DIARY_PAPER_PATTERNS.map((value) => ({
            value,
            label: diaryPaperPatternLabels[value]
          }))
        ),
        choiceField(
          'paperTone',
          'Оттенок бумаги',
          DIARY_PAPER_TONES.map((value) => ({ value, label: diaryPaperToneLabels[value] }))
        ),
        choiceField(
          'coverTone',
          'Цвет обложки',
          DIARY_COVER_TONES.map((value) => ({ value, label: diaryCoverToneLabels[value] }))
        )
      ],
      save: (values) => {
        const saved = api.updateDiaryAppearance(
          schema.updateDiaryAppearanceInputSchema.parse({ id: currentDiary.id, ...values })
        )
        setCurrentDiary(saved)
        state.refresh()
      }
    })

  const moodMeta = diaryMoodMeta(state.data?.day?.mood ?? null)
  const palette = diaryAppearancePalette(currentDiary.paperTone, currentDiary.coverTone)
  const calendarCells = useMemo(
    () => buildDiaryCalendarMonth(calendarMonth, state.data?.days ?? [], localDateKey()),
    [calendarMonth, state.data?.days]
  )

  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 10, marginBottom: 12 }}>
        <Button label="‹ Дневники" onPress={back} />
        <View
          style={{
            borderRadius: 16,
            padding: 14,
            backgroundColor: palette.coverBackground,
            gap: 3
          }}
        >
          <Text style={{ color: palette.coverText, fontSize: 20, fontWeight: '800' }}>
            {currentDiary.title}
          </Text>
          <Text style={{ color: palette.coverText, opacity: 0.72, fontSize: 12 }}>
            {currentDiary.pageCount} дней · {currentDiary.entryCount} записей
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label="День" selected={view === 'day'} onPress={() => setView('day')} />
          <Button
            label="Календарь"
            selected={view === 'calendar'}
            onPress={() => setView('calendar')}
          />
          <Button
            label="История"
            selected={view === 'history'}
            onPress={() => setView('history')}
          />
          <Button label="Отчёт" selected={view === 'report'} onPress={() => setView('report')} />
          <Button
            label="Оформление"
            selected={view === 'settings'}
            onPress={() => setView('settings')}
          />
        </View>

        {view === 'day' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button label="‹" onPress={() => turnToDate(addDays(date, -1), -1)} />
            <Button label={date} onPress={chooseDate} />
            <Button label="›" onPress={() => turnToDate(addDays(date, 1), 1)} />
            <Button label="Сегодня" onPress={() => turnToDate(localDateKey())} />
            <Button label="+ Запись" selected onPress={() => edit()} />
            <Button
              label={moodMeta ? `${moodMeta.emoji} ${moodMeta.label}` : 'Настроение'}
              onPress={mood}
            />
          </View>
        ) : null}
      </View>

      {state.error && <ErrorState message={state.error} retry={state.refresh} />}
      {state.loading ? (
        <LoadingState />
      ) : view === 'history' ? (
        <DiaryHistory
          days={state.data?.days ?? []}
          query={query}
          setQuery={setQuery}
          onOpenDay={(dayKey) => turnToDate(dayKey)}
        />
      ) : view === 'calendar' ? (
        <DiaryCalendar
          monthKey={calendarMonth}
          cells={calendarCells}
          onMonthChange={setCalendarMonth}
          onOpenDay={(dayKey) => turnToDate(dayKey)}
        />
      ) : view === 'report' ? (
        <FlatList
          data={state.data?.report.timeline ?? []}
          keyExtractor={(item) => item.dayKey}
          ListHeaderComponent={
            <View style={{ marginBottom: 16, gap: 3 }}>
              <Label title>{state.data?.report.entryCount ?? 0} записей</Label>
              <Label>Активных дней: {state.data?.report.activeDays ?? 0}</Label>
              <Label>
                Среднее настроение: {state.data?.report.averageMoodScore?.toFixed(1) ?? '—'} / 5
              </Label>
              <Label>
                В среднем записей за активный день:{' '}
                {state.data?.report.averageEntriesPerActiveDay.toFixed(1) ?? '0.0'}
              </Label>
            </View>
          }
          ListEmptyComponent={<EmptyState text="Для отчёта пока недостаточно данных." />}
          renderItem={({ item }) => {
            const reportMood = diaryMoodMeta(item.mood)
            return (
              <Row
                title={item.dayKey}
                subtitle={`${item.entryCount} записей${reportMood ? ` · ${reportMood.emoji} ${reportMood.label}` : ''}`}
                onPress={() => turnToDate(item.dayKey)}
              />
            )
          }}
        />
      ) : view === 'settings' ? (
        <DiaryAppearancePreview diary={currentDiary} onEdit={appearance} />
      ) : (
        <Animated.View style={{ flex: 1, transform: [{ translateX: pageOffset }] }}>
          <DiaryPaperDay
            diary={currentDiary}
            date={date}
            entries={state.data?.day?.entries ?? []}
            moodLabel={moodMeta ? `${moodMeta.emoji} ${moodMeta.label}` : null}
            onEdit={edit}
            onDelete={(entry) =>
              state.confirmDelete('Удалить запись?', () => {
                api.deleteDiaryEntry({ id: entry.id })
              })
            }
          />
        </Animated.View>
      )}

      {form && <FormSheet spec={form} close={() => setForm(null)} />}
    </View>
  )
}

function DiaryHistory({
  days,
  query,
  setQuery,
  onOpenDay
}: {
  days: ReturnType<ReturnType<typeof useServices>['diary']['listDiaryDays']>
  query: string
  setQuery(value: string): void
  onOpenDay(dayKey: string): void
}): React.JSX.Element {
  const normalized = query.trim().toLocaleLowerCase('ru-RU')
  const visibleDays = days.filter((day) => {
    const mood = diaryMoodMeta(day.mood)
    return `${day.dayKey} ${mood?.label ?? ''}`.toLocaleLowerCase('ru-RU').includes(normalized)
  })

  return (
    <>
      <SearchField value={query} onChangeText={setQuery} />
      <FlatList
        data={visibleDays}
        keyExtractor={(day) => day.id}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => {
          const mood = diaryMoodMeta(item.mood)
          return (
            <Row
              title={item.dayKey}
              subtitle={`${item.entryCount} записей${mood ? ` · ${mood.emoji} ${mood.label}` : ''}`}
              onPress={() => onOpenDay(item.dayKey)}
            />
          )
        }}
      />
    </>
  )
}

function DiaryCalendar({
  monthKey,
  cells,
  onMonthChange,
  onOpenDay
}: {
  monthKey: string
  cells: ReturnType<typeof buildDiaryCalendarMonth>
  onMonthChange(monthKey: string): void
  onOpenDay(dayKey: string): void
}): React.JSX.Element {
  const theme = useTheme()
  const weeks = Array.from({ length: 6 }, (_, index) => cells.slice(index * 7, index * 7 + 7))

  return (
    <View style={{ flex: 1, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Button label="‹" onPress={() => onMonthChange(shiftDiaryMonth(monthKey, -1))} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>
            {diaryMonthLabel(monthKey)}
          </Text>
        </View>
        <Button label="›" onPress={() => onMonthChange(shiftDiaryMonth(monthKey, 1))} />
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: theme.surface
        }}
      >
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border }}>
          {WEEKDAYS.map((weekday) => (
            <View key={weekday} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
              <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '700' }}>{weekday}</Text>
            </View>
          ))}
        </View>
        {weeks.map((week, weekIndex) => (
          <View
            key={`${monthKey}-${weekIndex}`}
            style={{
              flexDirection: 'row',
              borderBottomWidth: weekIndex === weeks.length - 1 ? 0 : 1,
              borderBottomColor: theme.border
            }}
          >
            {week.map((cell, dayIndex) => {
              const mood = diaryMoodMeta(cell.summary?.mood ?? null)
              return (
                <Pressable
                  key={cell.dayKey}
                  accessibilityRole="button"
                  accessibilityLabel={`${cell.dayKey}${cell.summary ? `, ${cell.summary.entryCount} записей` : ''}`}
                  onPress={() => onOpenDay(cell.dayKey)}
                  style={({ pressed }) => ({
                    flex: 1,
                    minHeight: 58,
                    paddingVertical: 6,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRightWidth: dayIndex === 6 ? 0 : 1,
                    borderRightColor: theme.border,
                    backgroundColor: cell.isToday ? theme.accent + '16' : 'transparent',
                    opacity: pressed ? 0.58 : cell.inMonth ? 1 : 0.35
                  })}
                >
                  <Text
                    style={{
                      color: cell.isToday ? theme.accent : theme.text,
                      fontSize: 13,
                      fontWeight: cell.isToday ? '800' : '600'
                    }}
                  >
                    {cell.day}
                  </Text>
                  {mood ? (
                    <Text style={{ fontSize: 13 }}>{mood.emoji}</Text>
                  ) : cell.summary?.entryCount ? (
                    <View
                      style={{
                        minWidth: 18,
                        borderRadius: 8,
                        backgroundColor: theme.raised,
                        paddingHorizontal: 5,
                        paddingVertical: 1,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ color: theme.muted, fontSize: 9 }}>
                        {cell.summary.entryCount}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ height: 14 }} />
                  )}
                </Pressable>
              )
            })}
          </View>
        ))}
      </View>
    </View>
  )
}

function DiaryAppearancePreview({
  diary,
  onEdit
}: {
  diary: DiarySummary
  onEdit(): void
}): React.JSX.Element {
  const theme = useTheme()
  const palette = diaryAppearancePalette(diary.paperTone, diary.coverTone)

  return (
    <View style={{ gap: 14 }}>
      <View
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: palette.coverBackground,
          padding: 18,
          gap: 12
        }}
      >
        <Text style={{ color: palette.coverText, fontSize: 20, fontWeight: '800' }}>
          {diary.title}
        </Text>
        <View
          style={{
            minHeight: 180,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: palette.paperBackground,
            padding: 16
          }}
        >
          <PaperPattern pattern={diary.paperPattern} lineColor={palette.paperLine} />
          <Text style={{ color: palette.paperText, fontSize: 17, fontWeight: '700' }}>
            Предпросмотр страницы
          </Text>
          <Text style={{ color: palette.paperMuted, fontSize: 13, lineHeight: 20, marginTop: 10 }}>
            Разметка «{diaryPaperPatternLabels[diary.paperPattern]}», бумага «
            {diaryPaperToneLabels[diary.paperTone]}», обложка «
            {diaryCoverToneLabels[diary.coverTone]}».
          </Text>
        </View>
      </View>
      <Button label="Изменить оформление" selected onPress={onEdit} />
    </View>
  )
}

function DiaryPaperDay({
  diary,
  date,
  entries,
  moodLabel,
  onEdit,
  onDelete
}: {
  diary: DiarySummary
  date: string
  entries: DiaryEntry[]
  moodLabel: string | null
  onEdit(entry?: DiaryEntry): void
  onDelete(entry: DiaryEntry): void
}): React.JSX.Element {
  const palette = diaryAppearancePalette(diary.paperTone, diary.coverTone)

  return (
    <View
      style={{
        flex: 1,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: palette.paperBackground,
        paddingHorizontal: 14,
        paddingTop: 14
      }}
    >
      <PaperPattern pattern={diary.paperPattern} lineColor={palette.paperLine} />
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 14, gap: 5 }}>
            <Text style={{ color: palette.paperText, fontSize: 20, fontWeight: '800' }}>{date}</Text>
            {moodLabel ? (
              <Text style={{ color: palette.paperMuted, fontSize: 13 }}>{moodLabel}</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Добавить первую запись"
            onPress={() => onEdit()}
            style={{ paddingVertical: 36, paddingHorizontal: 8 }}
          >
            <Text style={{ color: palette.paperMuted, fontSize: 15, lineHeight: 22 }}>
              В этот день ещё нет записей. Нажмите, чтобы начать страницу.
            </Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <View
            style={{
              borderRadius: 13,
              borderWidth: 1,
              borderColor: palette.paperLine,
              backgroundColor: '#ffffff70',
              marginBottom: 10,
              padding: 13,
              gap: 10
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Изменить запись ${item.text}`}
              onPress={() => onEdit(item)}
              style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1, gap: 5 })}
            >
              <Text style={{ color: palette.paperText, fontSize: 16, lineHeight: 23 }}>{item.text}</Text>
              <Text style={{ color: palette.paperMuted, fontSize: 11 }}>
                {new Date(item.occurredAt).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="Изменить" onPress={() => onEdit(item)} />
              <Button label="Удалить" danger onPress={() => onDelete(item)} />
            </View>
          </View>
        )}
      />
    </View>
  )
}

function PaperPattern({
  pattern,
  lineColor
}: {
  pattern: DiarySummary['paperPattern']
  lineColor: string
}): React.JSX.Element | null {
  if (pattern === 'plain') return null

  if (pattern === 'dots') {
    return (
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0, opacity: 0.75 }}>
        {Array.from({ length: 10 }, (_, row) => (
          <View
            key={row}
            style={{
              position: 'absolute',
              top: 18 + row * 24,
              left: 14,
              right: 14,
              flexDirection: 'row',
              justifyContent: 'space-between'
            }}
          >
            {Array.from({ length: 9 }, (_, column) => (
              <View
                key={column}
                style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: lineColor }}
              />
            ))}
          </View>
        ))}
      </View>
    )
  }

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
      {Array.from({ length: 14 }, (_, index) => (
        <View
          key={`h-${index}`}
          style={{
            position: 'absolute',
            top: 22 + index * 25,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: lineColor
          }}
        />
      ))}
      {pattern === 'grid'
        ? Array.from({ length: 10 }, (_, index) => (
            <View
              key={`v-${index}`}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 22 + index * 32,
                width: 1,
                backgroundColor: lineColor
              }}
            />
          ))
        : null}
    </View>
  )
}
