import { useCallback, useEffect, useMemo, useState } from 'react'
import { Animated, BackHandler, FlatList, Pressable, ScrollView, Text, View } from 'react-native'
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
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Library,
  Settings2,
  SunMedium,
  type LucideIcon
} from 'lucide-react-native'
import { localDateKey } from '@mymind/core/habits'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState
} from '../../shared/ui/primitives'
import { FormSheet } from '../../shared/ui/FormSheet'
import { MobileCreateAction } from '../../shared/ui/MobileCreateAction'
import { choiceField, textField, type FormSpec } from '../../shared/ui/form-model'
import { useTheme } from '../../shared/ui/theme'
import { DiaryReportsView } from './DiaryReportsView'
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

type DiaryDetailView = 'today' | 'reader' | 'calendar' | 'reports' | 'settings'

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

  const editDiary = (item?: DiarySummary): void =>
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
        canDelete={(state.data?.diaries.length ?? 0) > 1}
        back={() => {
          setSelected(null)
          state.refresh()
        }}
      />
    )
  }

  return (
    <View style={{ flex: 1, gap: 12 }}>
      {state.error ? <ErrorState message={state.error} retry={state.refresh} /> : null}
      {state.loading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={state.data?.diaries ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 88 }}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <DiaryNotebookCard diary={item} onOpen={() => setSelected(item)} />
          )}
        />
      )}
      <MobileCreateAction
        actions={[
          {
            key: 'diary',
            label: 'Новый дневник',
            description: 'Создать отдельный личный дневник',
            icon: 'diary',
            onPress: () => editDiary()
          }
        ]}
      />
      {form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
    </View>
  )
}

function DiaryNotebookCard({
  diary,
  onOpen
}: {
  diary: DiarySummary
  onOpen(): void
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
    </View>
  )
}

function DiarySectionTab({
  label,
  icon: Icon,
  selected,
  onPress
}: {
  label: string
  icon: LucideIcon
  selected: boolean
  onPress(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingHorizontal: 14,
        borderRadius: 12,
        backgroundColor: selected ? theme.accent : pressed ? theme.raised : 'transparent',
        opacity: pressed ? 0.78 : 1
      })}
    >
      <Icon size={16} color={selected ? '#ffffff' : theme.muted} />
      <Text style={{ color: selected ? '#ffffff' : theme.muted, fontSize: 13, fontWeight: selected ? '700' : '500' }}>
        {label}
      </Text>
    </Pressable>
  )
}

function DiaryDetail({
  diary,
  canDelete,
  back
}: {
  diary: DiarySummary
  canDelete: boolean
  back(): void
}): React.JSX.Element {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      back()
      return true
    })
    return () => subscription.remove()
  }, [back])

  const { diary: api } = useServices()
  const theme = useTheme()
  const [currentDiary, setCurrentDiary] = useState(diary)
  const [date, setDate] = useState(localDateKey())
  const [view, setView] = useState<DiaryDetailView>('today')
  const [form, setForm] = useState<FormSpec | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(() => diaryMonthKey(localDateKey()))
  const [pageOffset] = useState(() => new Animated.Value(0))

  const state = useCollection(
    useCallback(
      () => ({
        day: api.getDiaryDay({ diaryId: currentDiary.id, dayKey: date }),
        days: api.listDiaryDays({ diaryId: currentDiary.id })
      }),
      [api, currentDiary.id, date]
    )
  )

  const refreshDetail = (): void => {
    state.refresh()
    const latest = api.listDiaryOverview().diaries.find((item) => item.id === currentDiary.id)
    if (latest) setCurrentDiary(latest)
  }

  const turnToDate = (nextDate: string, direction = 1): void => {
    pageOffset.setValue(direction >= 0 ? 24 : -24)
    setDate(nextDate)
    setCalendarMonth(diaryMonthKey(nextDate))
    setView('reader')
    Animated.timing(pageOffset, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true
    }).start()
  }

  const editEntry = (entry?: DiaryEntry): void =>
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
        refreshDetail()
      }
    })

  const editMood = (): void =>
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
        refreshDetail()
      }
    })

  const editAppearance = (): void =>
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
          DIARY_PAPER_PATTERNS.map((value) => ({ value, label: diaryPaperPatternLabels[value] }))
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

  const editDiaryMetadata = (): void =>
    setForm({
      title: 'Изменить дневник',
      initial: { title: currentDiary.title, icon: currentDiary.icon },
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
        const saved = api.updateDiary({ ...input, id: currentDiary.id })
        setCurrentDiary(saved)
        state.refresh()
      }
    })

  const deleteDiary = (): void => {
    if (!canDelete) return
    state.confirmDelete(
      'Удалить дневник?',
      () => {
        api.deleteDiary({ id: currentDiary.id })
        back()
      },
      'Все страницы, настроения и записи этого дневника будут удалены.'
    )
  }

  const moodMeta = diaryMoodMeta(state.data?.day?.mood ?? null)
  const calendarCells = useMemo(
    () => buildDiaryCalendarMonth(calendarMonth, state.data?.days ?? [], localDateKey()),
    [calendarMonth, state.data?.days]
  )

  const readerPages = useMemo(
    () => (state.data?.days ?? []).slice().sort((left, right) => left.dayKey.localeCompare(right.dayKey)),
    [state.data?.days]
  )
  const readerIndex = readerPages.findIndex((item) => item.dayKey === date)
  const previousReaderPage = readerIndex > 0 ? readerPages[readerIndex - 1] : null
  const nextReaderPage =
    readerIndex >= 0 && readerIndex < readerPages.length - 1 ? readerPages[readerIndex + 1] : null

  const openSection = (next: DiaryDetailView): void => {
    if (next === 'today') {
      setDate(localDateKey())
      setView('today')
      return
    }
    if (next === 'reader') {
      const target = readerIndex >= 0 ? date : (readerPages[0]?.dayKey ?? date)
      setDate(target)
      setCalendarMonth(diaryMonthKey(target))
      setView('reader')
      return
    }
    setView(next)
  }

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View
        style={{
          marginBottom: 12,
          padding: 6,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 16,
          backgroundColor: theme.surface
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', gap: 4 }}
        >
          <DiarySectionTab label="Мои дневники" icon={Library} selected={false} onPress={back} />
          <DiarySectionTab
            label="Сегодня"
            icon={SunMedium}
            selected={view === 'today'}
            onPress={() => openSection('today')}
          />
          <DiarySectionTab
            label="Просмотр"
            icon={BookOpen}
            selected={view === 'reader'}
            onPress={() => openSection('reader')}
          />
          <DiarySectionTab
            label="Календарь"
            icon={CalendarDays}
            selected={view === 'calendar'}
            onPress={() => openSection('calendar')}
          />
          <DiarySectionTab
            label="Отчёты"
            icon={BarChart3}
            selected={view === 'reports'}
            onPress={() => openSection('reports')}
          />
          <DiarySectionTab
            label="Настройки"
            icon={Settings2}
            selected={view === 'settings'}
            onPress={() => openSection('settings')}
          />
        </ScrollView>
      </View>

      {view === 'today' ? (
        <View style={{ marginBottom: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            label={moodMeta ? `${moodMeta.emoji} ${moodMeta.label}` : 'Настроение'}
            onPress={editMood}
          />
        </View>
      ) : null}

      {view === 'reader' && readerPages.length > 0 ? (
        <View
          style={{
            marginBottom: 10,
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          <Button
            label="‹"
            accessibilityLabel="Предыдущая страница"
            disabled={!previousReaderPage}
            onPress={() => {
              if (previousReaderPage) turnToDate(previousReaderPage.dayKey, -1)
            }}
          />
          <View style={{ minWidth: 132, alignItems: 'center' }}>
            <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>
              {readerIndex >= 0 ? `${readerIndex + 1} / ${readerPages.length}` : `1 / ${readerPages.length}`}
            </Text>
            <Text style={{ marginTop: 2, color: theme.muted, fontSize: 11 }}>{date}</Text>
          </View>
          <Button
            label="›"
            accessibilityLabel="Следующая страница"
            disabled={!nextReaderPage}
            onPress={() => {
              if (nextReaderPage) turnToDate(nextReaderPage.dayKey, 1)
            }}
          />
        </View>
      ) : null}

      {state.error ? <ErrorState message={state.error} retry={state.refresh} /> : null}
      {state.loading ? (
        <LoadingState />
      ) : view === 'calendar' ? (
        <DiaryCalendar
          monthKey={calendarMonth}
          cells={calendarCells}
          onMonthChange={setCalendarMonth}
          onOpenDay={(dayKey) => turnToDate(dayKey)}
        />
      ) : view === 'reports' ? (
        <DiaryReportsView diaryId={currentDiary.id} onOpenDay={(dayKey) => turnToDate(dayKey)} />
      ) : view === 'settings' ? (
        <DiarySettingsMobile
          diary={currentDiary}
          canDelete={canDelete}
          onEdit={editDiaryMetadata}
          onEditAppearance={editAppearance}
          onDelete={deleteDiary}
        />
      ) : view === 'reader' ? (
        readerPages.length === 0 ? (
          <EmptyState
            text="В дневнике пока нет страниц. Страница появится после записи или настроения."
          />
        ) : (
          <Animated.View style={{ flex: 1, transform: [{ translateX: pageOffset }] }}>
            <DiaryPaperDay
              diary={currentDiary}
              date={date}
              entries={state.data?.day?.entries ?? []}
              moodLabel={moodMeta ? `${moodMeta.emoji} ${moodMeta.label}` : null}
              readOnly
            />
          </Animated.View>
        )
      ) : (
        <Animated.View style={{ flex: 1, transform: [{ translateX: pageOffset }] }}>
          <DiaryPaperDay
            diary={currentDiary}
            date={date}
            entries={state.data?.day?.entries ?? []}
            moodLabel={moodMeta ? `${moodMeta.emoji} ${moodMeta.label}` : null}
            onEdit={editEntry}
            onDelete={(entry) =>
              state.confirmDelete('Удалить запись?', () => {
                api.deleteDiaryEntry({ id: entry.id })
                refreshDetail()
              })
            }
          />
        </Animated.View>
      )}

      {view === 'today' ? (
        <MobileCreateAction
          actions={[
            {
              key: 'entry',
              label: 'Новая запись',
              description: 'Добавить запись на сегодня',
              icon: 'diary',
              onPress: () => editEntry()
            }
          ]}
        />
      ) : null}
      {form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
    </View>
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
        <View
          style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.border }}
        >
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

function DiarySettingsMobile({
  diary,
  canDelete,
  onEdit,
  onEditAppearance,
  onDelete
}: {
  diary: DiarySummary
  canDelete: boolean
  onEdit(): void
  onEditAppearance(): void
  onDelete(): void
}): React.JSX.Element {
  const theme = useTheme()
  const palette = diaryAppearancePalette(diary.paperTone, diary.coverTone)

  return (
    <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 28 }}>
      <View
        style={{
          padding: 18,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 24,
          backgroundColor: theme.surface
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
          <View
            style={{
              width: 54,
              height: 54,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: theme.accent + '26',
              borderRadius: 16,
              backgroundColor: theme.accent + '14'
            }}
          >
            <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700' }}>{diary.icon}</Text>
          </View>
          <View style={{ minWidth: 0, flex: 1 }}>
            <Text numberOfLines={1} style={{ color: theme.text, fontSize: 20, fontWeight: '700' }}>
              {diary.title}
            </Text>
            <Text style={{ marginTop: 7, color: theme.muted, fontSize: 12, lineHeight: 18 }}>
              {diary.pageCount} страниц · {diary.entryCount} записей
            </Text>
          </View>
        </View>
        <View style={{ marginTop: 18, alignItems: 'flex-start' }}>
          <Button label="Изменить название и иконку" icon="edit" onPress={onEdit} />
        </View>
      </View>

      <View
        style={{
          padding: 18,
          borderWidth: 1,
          borderColor: theme.error + '26',
          borderRadius: 24,
          backgroundColor: theme.error + '08'
        }}
      >
        <Text style={{ color: theme.error, fontSize: 15, fontWeight: '700' }}>Удаление дневника</Text>
        <Text style={{ marginTop: 7, color: theme.muted, fontSize: 13, lineHeight: 21 }}>
          Удаляются все страницы, настроения и записи. Действие необратимо.
        </Text>
        <View style={{ marginTop: 16, alignItems: 'flex-start' }}>
          <Button label="Удалить дневник" icon="delete" danger disabled={!canDelete} onPress={onDelete} />
        </View>
        {!canDelete ? (
          <Text style={{ marginTop: 8, color: theme.muted, fontSize: 11 }}>
            Последний дневник удалить нельзя.
          </Text>
        ) : null}
      </View>

      <View
        style={{
          padding: 18,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 24,
          backgroundColor: theme.surface
        }}
      >
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>Оформление бумаги</Text>
        <Text style={{ marginTop: 5, color: theme.muted, fontSize: 13, lineHeight: 20 }}>
          Разметка, оттенок листов и цвет переплёта применяются ко всему дневнику.
        </Text>
        <View
          style={{
            marginTop: 16,
            overflow: 'hidden',
            borderRadius: 16,
            backgroundColor: palette.coverBackground,
            padding: 14
          }}
        >
          <View
            style={{
              minHeight: 170,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: palette.paperLine,
              borderRadius: 12,
              backgroundColor: palette.paperBackground,
              padding: 16
            }}
          >
            <PaperPattern pattern={diary.paperPattern} lineColor={palette.paperLine} />
            <Text style={{ color: palette.paperText, fontSize: 16, fontWeight: '700' }}>
              Предпросмотр страницы
            </Text>
            <Text style={{ marginTop: 9, color: palette.paperMuted, fontSize: 13, lineHeight: 20 }}>
              Разметка «{diaryPaperPatternLabels[diary.paperPattern]}» · бумага «
              {diaryPaperToneLabels[diary.paperTone]}» · переплёт «
              {diaryCoverToneLabels[diary.coverTone]}».
            </Text>
          </View>
        </View>
        <View style={{ marginTop: 16, alignItems: 'flex-start' }}>
          <Button label="Изменить оформление" onPress={onEditAppearance} />
        </View>
      </View>
    </ScrollView>
  )
}

function DiaryPaperDay({
  diary,
  date,
  entries,
  moodLabel,
  readOnly = false,
  onEdit,
  onDelete
}: {
  diary: DiarySummary
  date: string
  entries: DiaryEntry[]
  moodLabel: string | null
  readOnly?: boolean
  onEdit?(entry?: DiaryEntry): void
  onDelete?(entry: DiaryEntry): void
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
            <Text style={{ color: palette.paperText, fontSize: 20, fontWeight: '800' }}>
              {date}
            </Text>
            {moodLabel ? (
              <Text style={{ color: palette.paperMuted, fontSize: 13 }}>{moodLabel}</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          readOnly ? (
            <View style={{ paddingVertical: 36, paddingHorizontal: 8 }}>
              <Text style={{ color: palette.paperMuted, fontSize: 15, lineHeight: 22 }}>
                В этот день осталось только настроение.
              </Text>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Добавить первую запись"
              onPress={() => onEdit?.()}
              style={{ paddingVertical: 36, paddingHorizontal: 8 }}
            >
              <Text style={{ color: palette.paperMuted, fontSize: 15, lineHeight: 22 }}>
                В этот день ещё нет записей. Нажмите, чтобы начать страницу.
              </Text>
            </Pressable>
          )
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
              accessibilityRole={readOnly ? undefined : 'button'}
              accessibilityLabel={readOnly ? undefined : `Изменить запись ${item.text}`}
              disabled={readOnly}
              onPress={() => onEdit?.(item)}
              style={({ pressed }) => ({ opacity: pressed && !readOnly ? 0.65 : 1, gap: 5 })}
            >
              <Text style={{ color: palette.paperText, fontSize: 16, lineHeight: 23 }}>
                {item.text}
              </Text>
              <Text style={{ color: palette.paperMuted, fontSize: 11 }}>
                {new Date(item.occurredAt).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </Pressable>
            {!readOnly ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button label="Изменить" onPress={() => onEdit?.(item)} />
                <Button label="Удалить" danger onPress={() => onDelete?.(item)} />
              </View>
            ) : null}
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
