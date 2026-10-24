import { Action, RefreshRegion } from '../../ui/browser'
import { useCallback, useEffect, useState } from 'react'
import type { CalendarUnreadReminderRecord } from '@mymind/contracts/calendar'
import type { HabitUnreadReminderRecord } from '@mymind/contracts/habits'
import { ErrorState, IconButton } from '../shared/ui/primitives'
import { AppIcon } from '../shared/ui/icons'
import { messageFor } from '../shared/ui/form-model'
import { useTheme } from '../shared/ui/theme'
import { navigationRoutes, routeTitles, routeIcons, type Route } from './navigation'
import { subscribeDataChanges } from './changes'
import type { ClientServices } from './services'
const HOME_MODULES = navigationRoutes
  .filter((route) => route !== 'home' && route !== 'settings')
  .map((route) => ({ route, title: routeTitles[route] }))
export function Home({
  services,
  navigate
}: {
  services: ClientServices
  navigate(route: Route): void
}): React.JSX.Element {
  const theme = useTheme()
  const [error, setError] = useState('')
  const [calendarReminders, setCalendarReminders] = useState<CalendarUnreadReminderRecord[]>([])
  const [habitReminders, setHabitReminders] = useState<HabitUnreadReminderRecord[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const refresh = useCallback((): void => {
    setRefreshing(true)
    try {
      setCalendarReminders(services.calendar.listUnreadCalendarReminders())
      setHabitReminders(services.habits.listUnreadHabitReminders())
      setError('')
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setRefreshing(false)
    }
  }, [services])
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) refresh()
    })
    const unsubscribe = subscribeDataChanges(() => {
      if (active) refresh()
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [refresh])
  const acknowledgeCalendar = (deliveryId: string): void => {
    try {
      services.calendar.acknowledgeCalendarReminder({ deliveryId })
      refresh()
    } catch (reason) {
      setError(messageFor(reason))
    }
  }
  const acknowledgeHabit = (deliveryId: string): void => {
    try {
      services.habits.acknowledgeHabitReminder({ deliveryId })
      refresh()
    } catch (reason) {
      setError(messageFor(reason))
    }
  }
  return (
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%'
      }}
    >
      {error ? <ErrorState message={error} retry={refresh} /> : null}
      <RefreshRegion className="ui-scroll" onRefresh={refresh} busy={refreshing}>
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 16,
            gap: 10
          }}
        >
          {
            <div
              className="ui-stack"
              style={{
                gap: 12,
                marginBottom: 4
              }}
            >
              <ReminderInbox
                title="Напоминания календаря"
                reminders={calendarReminders.map((reminder) => ({
                  key: reminder.deliveryId,
                  title: reminder.title,
                  subtitle:
                    reminder.occurrenceDate +
                    (reminder.eventTime ? ` · ${reminder.eventTime}` : ''),
                  acknowledge: () => acknowledgeCalendar(reminder.deliveryId)
                }))}
                open={() => navigate('calendar')}
              />
              <ReminderInbox
                title="Напоминания привычек"
                reminders={habitReminders.map((reminder) => ({
                  key: reminder.deliveryId,
                  title: reminder.title,
                  subtitle: `${reminder.occurrenceDate} · ${reminder.preferredTime}`,
                  acknowledge: () => acknowledgeHabit(reminder.deliveryId)
                }))}
                open={() => navigate('habits')}
              />
            </div>
          }
          <div
            className="ui-stack ui-list"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${2}, minmax(0, 1fr))`,
              gap: 10
            }}
          >
            {HOME_MODULES.map((item) => ({
              ...item,
              icon: routeIcons[item.route],
              onClick: () => navigate(item.route)
            })).map((item) => {
              const hasNotification =
                (item.route === 'calendar' && calendarReminders.length > 0) ||
                (item.route === 'habits' && habitReminders.length > 0)
              return (
                <div className="ui-stack ui-list-item" key={((item) => item.route)(item)}>
                  {
                    <Action
                      role={'button'}
                      aria-label={item.title}
                      onClick={item.onClick}
                      style={{
                        flex: '1 1 0%',
                        minHeight: 112,
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        padding: 16,
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 12,
                        backgroundColor: theme.surface,
                        opacity: 1
                      }}
                      pressedStyle={{
                        backgroundColor: theme.raised,
                        opacity: 0.78
                      }}
                    >
                      <div
                        className="ui-stack"
                        style={{
                          width: 36,
                          height: 36,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: theme.accent + '26',
                          backgroundColor: theme.accent + '12'
                        }}
                      >
                        <AppIcon name={item.icon} size={19} color={theme.accent} />
                        {hasNotification ? (
                          <div
                            className="ui-stack"
                            aria-label={'Есть непрочитанные напоминания'}
                            style={{
                              position: 'absolute',
                              top: -4,
                              right: -4,
                              width: 9,
                              height: 9,
                              borderRadius: 5,
                              backgroundColor: theme.error,
                              borderWidth: 2,
                              borderColor: theme.surface
                            }}
                          ></div>
                        ) : null}
                      </div>
                      <span
                        className="ui-text"
                        style={{
                          color: theme.text,
                          fontSize: 15,
                          fontWeight: 600
                        }}
                      >
                        {item.title}
                      </span>
                    </Action>
                  }
                </div>
              )
            })}
          </div>
        </div>
      </RefreshRegion>
    </div>
  )
}
function ReminderInbox({
  title,
  reminders,
  open
}: {
  title: string
  reminders: Array<{
    key: string
    title: string
    subtitle: string
    acknowledge(): void
  }>
  open(): void
}): React.JSX.Element | null {
  const theme = useTheme()
  if (reminders.length === 0) return null
  return (
    <div
      className="ui-stack"
      style={{
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface
      }}
    >
      <div
        className="ui-stack"
        style={{
          minHeight: 52,
          paddingInline: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.border
        }}
      >
        <AppIcon name="info" size={16} color={theme.accent} />
        <span
          className="ui-text"
          style={{
            flex: '1 1 0%',
            color: theme.text,
            fontSize: 14,
            fontWeight: 700
          }}
        >
          {title}
        </span>
        <span
          className="ui-text"
          style={{
            color: theme.muted,
            fontSize: 12,
            fontWeight: 600
          }}
        >
          {reminders.length}
        </span>
      </div>

      <div
        className="ui-stack"
        style={{
          padding: 10,
          gap: 8
        }}
      >
        {reminders.slice(0, 3).map((reminder) => (
          <div
            className="ui-stack"
            key={reminder.key}
            style={{
              minHeight: 58,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              paddingInline: 10,
              paddingBlock: 8,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              backgroundColor: theme.background
            }}
          >
            <Action
              role={'button'}
              aria-label={reminder.title}
              onClick={open}
              style={{
                flex: '1 1 0%',
                minWidth: 0,
                opacity: 1
              }}
              pressedStyle={{
                opacity: 0.68
              }}
            >
              <span
                className="ui-text"
                data-lines={1}
                style={{
                  color: theme.text,
                  fontSize: 13,
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 1
                }}
              >
                {reminder.title}
              </span>
              <span
                className="ui-text"
                data-lines={1}
                style={{
                  marginTop: 2,
                  color: theme.muted,
                  fontSize: 11,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 1
                }}
              >
                {reminder.subtitle}
              </span>
            </Action>
            <IconButton
              label="Прочитано"
              icon="check"
              compact
              selected
              onClick={reminder.acknowledge}
            />
          </div>
        ))}
        {reminders.length > 3 ? (
          <span
            className="ui-text"
            style={{
              color: theme.muted,
              fontSize: 11
            }}
          >
            Ещё {reminders.length - 3} непрочитанных
          </span>
        ) : null}
      </div>
    </div>
  )
}
