import { motionValue, motion } from 'framer-motion'
import { Action, subscribeBack, playMotion, motionStep } from '../../../ui/browser'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
  Library,
  Settings2,
  SunMedium,
  type LucideIcon
} from 'lucide-react'
import { localDateKey } from '@mymind/core/habits'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import { Button, EmptyState, ErrorState, LoadingState } from '../../shared/ui/primitives'
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
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%',
        gap: 12
      }}
    >
      {state.error ? <ErrorState message={state.error} retry={state.refresh} /> : null}
      {state.loading ? (
        <LoadingState />
      ) : (
        <div className="ui-scroll">
          <div
            className="ui-stack ui-scroll-content"
            style={{
              paddingBottom: 88
            }}
          >
            <div className="ui-stack ui-list" style={{}}>
              {(state.data?.diaries ?? []).length > 0 ? (
                (state.data?.diaries ?? []).map((item) => (
                  <div className="ui-stack ui-list-item" key={((item) => item.id)(item)}>
                    {<DiaryNotebookCard diary={item} onOpen={() => setSelected(item)} />}
                  </div>
                ))
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        </div>
      )}
      <MobileCreateAction
        actions={[
          {
            key: 'diary',
            label: 'Новый дневник',
            description: 'Создать отдельный личный дневник',
            icon: 'diary',
            onClick: () => editDiary()
          }
        ]}
      />
      {form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
    </div>
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
    <div
      className="ui-stack"
      style={{
        marginBottom: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: palette.coverBackground,
        overflow: 'hidden'
      }}
    >
      <Action
        role={'button'}
        aria-label={`Открыть дневник ${diary.title}`}
        onClick={onOpen}
        style={{
          minHeight: 126,
          paddingInline: 18,
          paddingBlock: 17,
          opacity: 1,
          flexDirection: 'row',
          gap: 14
        }}
        pressedStyle={{
          opacity: 0.78
        }}
      >
        <div
          className="ui-stack"
          style={{
            width: 7,
            borderRadius: 99,
            backgroundColor: palette.coverText,
            opacity: 0.2
          }}
        ></div>
        <div
          className="ui-stack"
          style={{
            flex: '1 1 0%',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div
            className="ui-stack"
            style={{
              gap: 5
            }}
          >
            <span
              className="ui-text"
              style={{
                color: palette.coverText,
                fontSize: 12,
                opacity: 0.72
              }}
            >
              {diary.icon}
            </span>
            <span
              className="ui-text"
              style={{
                color: palette.coverText,
                fontSize: 21,
                fontWeight: 800
              }}
            >
              {diary.title}
            </span>
          </div>
          <span
            className="ui-text"
            style={{
              color: palette.coverText,
              fontSize: 13,
              opacity: 0.76
            }}
          >
            {diary.pageCount} дней · {diary.entryCount} записей
          </span>
        </div>
      </Action>
    </div>
  )
}
function DiarySectionTab({
  label,
  icon: Icon,
  selected,
  onClick
}: {
  label: string
  icon: LucideIcon
  selected: boolean
  onClick(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Action
      role={'tab'}
      aria-selected={selected}
      onClick={onClick}
      style={{
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingInline: 14,
        borderRadius: 12,
        backgroundColor: selected ? theme.accent : 'transparent',
        opacity: 1
      }}
      pressedStyle={{
        backgroundColor: selected ? theme.accent : theme.raised,
        opacity: 0.78
      }}
    >
      <Icon size={16} color={selected ? '#ffffff' : theme.muted} />
      <span
        className="ui-text"
        style={{
          color: selected ? '#ffffff' : theme.muted,
          fontSize: 13,
          fontWeight: selected ? '700' : '500'
        }}
      >
        {label}
      </span>
    </Action>
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
    const subscription = subscribeBack(() => {
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
  const [pageOffset] = useState(() => motionValue(0))
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
    pageOffset.set(direction >= 0 ? 24 : -24)
    setDate(nextDate)
    setCalendarMonth(diaryMonthKey(nextDate))
    setView('reader')
    playMotion(
      motionStep(pageOffset, 0, {
        duration: 180 / 1000,
        type: 'tween'
      })
    )
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
    () =>
      (state.data?.days ?? [])
        .slice()
        .sort((left, right) => left.dayKey.localeCompare(right.dayKey)),
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
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%',
        minHeight: 0
      }}
    >
      <div
        className="ui-stack"
        style={{
          marginBottom: 12,
          padding: 6,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 16,
          backgroundColor: theme.surface
        }}
      >
        <div className="ui-scroll" data-horizontal={true}>
          <div
            className="ui-stack ui-scroll-content"
            style={{
              alignItems: 'center',
              gap: 4,
              flexDirection: 'row'
            }}
          >
            <DiarySectionTab label="Мои дневники" icon={Library} selected={false} onClick={back} />
            <DiarySectionTab
              label="Сегодня"
              icon={SunMedium}
              selected={view === 'today'}
              onClick={() => openSection('today')}
            />
            <DiarySectionTab
              label="Просмотр"
              icon={BookOpen}
              selected={view === 'reader'}
              onClick={() => openSection('reader')}
            />
            <DiarySectionTab
              label="Календарь"
              icon={CalendarDays}
              selected={view === 'calendar'}
              onClick={() => openSection('calendar')}
            />
            <DiarySectionTab
              label="Отчёты"
              icon={BarChart3}
              selected={view === 'reports'}
              onClick={() => openSection('reports')}
            />
            <DiarySectionTab
              label="Настройки"
              icon={Settings2}
              selected={view === 'settings'}
              onClick={() => openSection('settings')}
            />
          </div>
        </div>
      </div>

      {view === 'today' ? (
        <div
          className="ui-stack"
          style={{
            marginBottom: 10,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8
          }}
        >
          <Button
            label={moodMeta ? `${moodMeta.emoji} ${moodMeta.label}` : 'Настроение'}
            onClick={editMood}
          />
        </div>
      ) : null}

      {view === 'reader' && readerPages.length > 0 ? (
        <div
          className="ui-stack"
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
            onClick={() => {
              if (previousReaderPage) turnToDate(previousReaderPage.dayKey, -1)
            }}
          />
          <div
            className="ui-stack"
            style={{
              minWidth: 132,
              alignItems: 'center'
            }}
          >
            <span
              className="ui-text"
              style={{
                color: theme.text,
                fontSize: 13,
                fontWeight: 600
              }}
            >
              {readerIndex >= 0
                ? `${readerIndex + 1} / ${readerPages.length}`
                : `1 / ${readerPages.length}`}
            </span>
            <span
              className="ui-text"
              style={{
                marginTop: 2,
                color: theme.muted,
                fontSize: 11
              }}
            >
              {date}
            </span>
          </div>
          <Button
            label="›"
            accessibilityLabel="Следующая страница"
            disabled={!nextReaderPage}
            onClick={() => {
              if (nextReaderPage) turnToDate(nextReaderPage.dayKey, 1)
            }}
          />
        </div>
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
          <EmptyState text="В дневнике пока нет страниц. Страница появится после записи или настроения." />
        ) : (
          <motion.div
            className="ui-stack"
            style={{
              flex: '1 1 0%',
              x: pageOffset
            }}
          >
            <DiaryPaperDay
              diary={currentDiary}
              date={date}
              entries={state.data?.day?.entries ?? []}
              moodLabel={moodMeta ? `${moodMeta.emoji} ${moodMeta.label}` : null}
              readOnly
            />
          </motion.div>
        )
      ) : (
        <motion.div
          className="ui-stack"
          style={{
            flex: '1 1 0%',
            x: pageOffset
          }}
        >
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
        </motion.div>
      )}

      {view === 'today' ? (
        <MobileCreateAction
          actions={[
            {
              key: 'entry',
              label: 'Новая запись',
              description: 'Добавить запись на сегодня',
              icon: 'diary',
              onClick: () => editEntry()
            }
          ]}
        />
      ) : null}
      {form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
    </div>
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
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%',
        gap: 10
      }}
    >
      <div
        className="ui-stack"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8
        }}
      >
        <Button label="‹" onClick={() => onMonthChange(shiftDiaryMonth(monthKey, -1))} />
        <div
          className="ui-stack"
          style={{
            flex: '1 1 0%',
            alignItems: 'center'
          }}
        >
          <span
            className="ui-text"
            style={{
              color: theme.text,
              fontSize: 17,
              fontWeight: 800
            }}
          >
            {diaryMonthLabel(monthKey)}
          </span>
        </div>
        <Button label="›" onClick={() => onMonthChange(shiftDiaryMonth(monthKey, 1))} />
      </div>

      <div
        className="ui-stack"
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: theme.surface
        }}
      >
        <div
          className="ui-stack"
          style={{
            flexDirection: 'row',
            borderBottomWidth: 1,
            borderBottomColor: theme.border
          }}
        >
          {WEEKDAYS.map((weekday) => (
            <div
              className="ui-stack"
              key={weekday}
              style={{
                flex: '1 1 0%',
                alignItems: 'center',
                paddingBlock: 8
              }}
            >
              <span
                className="ui-text"
                style={{
                  color: theme.muted,
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                {weekday}
              </span>
            </div>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div
            className="ui-stack"
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
                <Action
                  key={cell.dayKey}
                  role={'button'}
                  aria-label={`${cell.dayKey}${cell.summary ? `, ${cell.summary.entryCount} записей` : ''}`}
                  onClick={() => onOpenDay(cell.dayKey)}
                  style={{
                    flex: '1 1 0%',
                    minHeight: 58,
                    paddingBlock: 6,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRightWidth: dayIndex === 6 ? 0 : 1,
                    borderRightColor: theme.border,
                    backgroundColor: cell.isToday ? theme.accent + '16' : 'transparent',
                    opacity: cell.inMonth ? 1 : 0.35
                  }}
                  pressedStyle={{
                    opacity: 0.58
                  }}
                >
                  <span
                    className="ui-text"
                    style={{
                      color: cell.isToday ? theme.accent : theme.text,
                      fontSize: 13,
                      fontWeight: cell.isToday ? '800' : '600'
                    }}
                  >
                    {cell.day}
                  </span>
                  {mood ? (
                    <span
                      className="ui-text"
                      style={{
                        fontSize: 13
                      }}
                    >
                      {mood.emoji}
                    </span>
                  ) : cell.summary?.entryCount ? (
                    <div
                      className="ui-stack"
                      style={{
                        minWidth: 18,
                        borderRadius: 8,
                        backgroundColor: theme.raised,
                        paddingInline: 5,
                        paddingBlock: 1,
                        alignItems: 'center'
                      }}
                    >
                      <span
                        className="ui-text"
                        style={{
                          color: theme.muted,
                          fontSize: 9
                        }}
                      >
                        {cell.summary.entryCount}
                      </span>
                    </div>
                  ) : (
                    <div
                      className="ui-stack"
                      style={{
                        height: 14
                      }}
                    ></div>
                  )}
                </Action>
              )
            })}
          </div>
        ))}
      </div>
    </div>
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
    <div className="ui-scroll">
      <div
        className="ui-stack ui-scroll-content"
        style={{
          gap: 14,
          paddingBottom: 28
        }}
      >
        <div
          className="ui-stack"
          style={{
            padding: 18,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 24,
            backgroundColor: theme.surface
          }}
        >
          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 14
            }}
          >
            <div
              className="ui-stack"
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
              <span
                className="ui-text"
                style={{
                  color: theme.accent,
                  fontSize: 12,
                  fontWeight: 700
                }}
              >
                {diary.icon}
              </span>
            </div>
            <div
              className="ui-stack"
              style={{
                minWidth: 0,
                flex: '1 1 0%'
              }}
            >
              <span
                className="ui-text"
                data-lines={1}
                style={{
                  color: theme.text,
                  fontSize: 20,
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 1
                }}
              >
                {diary.title}
              </span>
              <span
                className="ui-text"
                style={{
                  marginTop: 7,
                  color: theme.muted,
                  fontSize: 12,
                  lineHeight: '18px'
                }}
              >
                {diary.pageCount} страниц · {diary.entryCount} записей
              </span>
            </div>
          </div>
          <div
            className="ui-stack"
            style={{
              marginTop: 18,
              alignItems: 'flex-start'
            }}
          >
            <Button label="Изменить название и иконку" icon="edit" onClick={onEdit} />
          </div>
        </div>

        <div
          className="ui-stack"
          style={{
            padding: 18,
            borderWidth: 1,
            borderColor: theme.error + '26',
            borderRadius: 24,
            backgroundColor: theme.error + '08'
          }}
        >
          <span
            className="ui-text"
            style={{
              color: theme.error,
              fontSize: 15,
              fontWeight: 700
            }}
          >
            Удаление дневника
          </span>
          <span
            className="ui-text"
            style={{
              marginTop: 7,
              color: theme.muted,
              fontSize: 13,
              lineHeight: '21px'
            }}
          >
            Удаляются все страницы, настроения и записи. Действие необратимо.
          </span>
          <div
            className="ui-stack"
            style={{
              marginTop: 16,
              alignItems: 'flex-start'
            }}
          >
            <Button
              label="Удалить дневник"
              icon="delete"
              danger
              disabled={!canDelete}
              onClick={onDelete}
            />
          </div>
          {!canDelete ? (
            <span
              className="ui-text"
              style={{
                marginTop: 8,
                color: theme.muted,
                fontSize: 11
              }}
            >
              Последний дневник удалить нельзя.
            </span>
          ) : null}
        </div>

        <div
          className="ui-stack"
          style={{
            padding: 18,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 24,
            backgroundColor: theme.surface
          }}
        >
          <span
            className="ui-text"
            style={{
              color: theme.text,
              fontSize: 15,
              fontWeight: 700
            }}
          >
            Оформление бумаги
          </span>
          <span
            className="ui-text"
            style={{
              marginTop: 5,
              color: theme.muted,
              fontSize: 13,
              lineHeight: '20px'
            }}
          >
            Разметка, оттенок листов и цвет переплёта применяются ко всему дневнику.
          </span>
          <div
            className="ui-stack"
            style={{
              marginTop: 16,
              overflow: 'hidden',
              borderRadius: 16,
              backgroundColor: palette.coverBackground,
              padding: 14
            }}
          >
            <div
              className="ui-stack"
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
              <span
                className="ui-text"
                style={{
                  color: palette.paperText,
                  fontSize: 16,
                  fontWeight: 700
                }}
              >
                Предпросмотр страницы
              </span>
              <span
                className="ui-text"
                style={{
                  marginTop: 9,
                  color: palette.paperMuted,
                  fontSize: 13,
                  lineHeight: '20px'
                }}
              >
                Разметка «{diaryPaperPatternLabels[diary.paperPattern]}» · бумага «
                {diaryPaperToneLabels[diary.paperTone]}» · переплёт «
                {diaryCoverToneLabels[diary.coverTone]}».
              </span>
            </div>
          </div>
          <div
            className="ui-stack"
            style={{
              marginTop: 16,
              alignItems: 'flex-start'
            }}
          >
            <Button label="Изменить оформление" onClick={onEditAppearance} />
          </div>
        </div>
      </div>
    </div>
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
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%',
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: palette.paperBackground,
        paddingInline: 14,
        paddingTop: 14
      }}
    >
      <PaperPattern pattern={diary.paperPattern} lineColor={palette.paperLine} />
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 24
          }}
        >
          {
            <div
              className="ui-stack"
              style={{
                marginBottom: 14,
                gap: 5
              }}
            >
              <span
                className="ui-text"
                style={{
                  color: palette.paperText,
                  fontSize: 20,
                  fontWeight: 800
                }}
              >
                {date}
              </span>
              {moodLabel ? (
                <span
                  className="ui-text"
                  style={{
                    color: palette.paperMuted,
                    fontSize: 13
                  }}
                >
                  {moodLabel}
                </span>
              ) : null}
            </div>
          }
          <div className="ui-stack ui-list" style={{}}>
            {entries.length > 0 ? (
              entries.map((item) => (
                <div className="ui-stack ui-list-item" key={((item) => item.id)(item)}>
                  {
                    <div
                      className="ui-stack"
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
                      <Action
                        role={readOnly ? undefined : 'button'}
                        aria-label={readOnly ? undefined : `Изменить запись ${item.text}`}
                        disabled={readOnly}
                        onClick={() => onEdit?.(item)}
                        style={{
                          opacity: 1,
                          gap: 5
                        }}
                        pressedStyle={{
                          opacity: !readOnly ? 0.65 : 1
                        }}
                      >
                        <span
                          className="ui-text"
                          style={{
                            color: palette.paperText,
                            fontSize: 16,
                            lineHeight: '23px'
                          }}
                        >
                          {item.text}
                        </span>
                        <span
                          className="ui-text"
                          style={{
                            color: palette.paperMuted,
                            fontSize: 11
                          }}
                        >
                          {new Date(item.occurredAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </Action>
                      {!readOnly ? (
                        <div
                          className="ui-stack"
                          style={{
                            flexDirection: 'row',
                            gap: 8
                          }}
                        >
                          <Button label="Изменить" onClick={() => onEdit?.(item)} />
                          <Button label="Удалить" danger onClick={() => onDelete?.(item)} />
                        </div>
                      ) : null}
                    </div>
                  }
                </div>
              ))
            ) : readOnly ? (
              <div
                className="ui-stack"
                style={{
                  paddingBlock: 36,
                  paddingInline: 8
                }}
              >
                <span
                  className="ui-text"
                  style={{
                    color: palette.paperMuted,
                    fontSize: 15,
                    lineHeight: '22px'
                  }}
                >
                  В этот день осталось только настроение.
                </span>
              </div>
            ) : (
              <Action
                role={'button'}
                aria-label={'Добавить первую запись'}
                onClick={() => onEdit?.()}
                style={{
                  paddingBlock: 36,
                  paddingInline: 8
                }}
              >
                <span
                  className="ui-text"
                  style={{
                    color: palette.paperMuted,
                    fontSize: 15,
                    lineHeight: '22px'
                  }}
                >
                  В этот день ещё нет записей. Нажмите, чтобы начать страницу.
                </span>
              </Action>
            )}
          </div>
        </div>
      </div>
    </div>
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
      <div
        className="ui-stack"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.75,
          pointerEvents: 'none'
        }}
      >
        {Array.from({ length: 10 }, (_, row) => (
          <div
            className="ui-stack"
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
              <div
                className="ui-stack"
                key={column}
                style={{
                  width: 2,
                  height: 2,
                  borderRadius: 1,
                  backgroundColor: lineColor
                }}
              ></div>
            ))}
          </div>
        ))}
      </div>
    )
  }
  return (
    <div
      className="ui-stack"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none'
      }}
    >
      {Array.from({ length: 14 }, (_, index) => (
        <div
          className="ui-stack"
          key={`h-${index}`}
          style={{
            position: 'absolute',
            top: 22 + index * 25,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: lineColor
          }}
        ></div>
      ))}
      {pattern === 'grid'
        ? Array.from({ length: 10 }, (_, index) => (
            <div
              className="ui-stack"
              key={`v-${index}`}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 22 + index * 32,
                width: 1,
                backgroundColor: lineColor
              }}
            ></div>
          ))
        : null}
    </div>
  )
}
