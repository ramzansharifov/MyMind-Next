import { Action } from '../../../ui/browser'
import { useMemo, useState } from 'react'
import { calendarMonthKey } from '@mymind/core/calendar-month'
import { localDateKey } from '@mymind/core/habits'
import { AppDialog } from './AppDialog'
import { AppIcon } from './icons'
import {
  MOBILE_DATE_WEEKDAYS,
  datePickerReference,
  datePickerSameMonth,
  datePickerShiftMonth,
  datePickerWeeks,
  dateWithinBounds,
  formatMobileAccessibleDate,
  formatMobileDate,
  formatMobileMonth,
  isValidDateKey
} from './mobile-date'
import { useTheme } from './theme'
function DateCalendar({
  value,
  reference,
  min,
  max,
  optional,
  onChoose,
  onClear
}: {
  value: string
  reference: string
  min?: string
  max?: string
  optional: boolean
  onChoose(value: string): void
  onClear(): void
}): React.JSX.Element {
  const theme = useTheme()
  const today = localDateKey()
  const [visibleMonth, setVisibleMonth] = useState(() => calendarMonthKey(reference))
  const weeks = useMemo(() => datePickerWeeks(visibleMonth), [visibleMonth])
  const previousMonth = datePickerShiftMonth(visibleMonth, -1)
  const nextMonth = datePickerShiftMonth(visibleMonth, 1)
  const previousMonthDisabled = isValidDateKey(min) && previousMonth < calendarMonthKey(min)
  const nextMonthDisabled = isValidDateKey(max) && nextMonth > calendarMonthKey(max)
  const todayAllowed = dateWithinBounds(today, min, max)
  return (
    <div
      className="ui-stack"
      style={{
        paddingInline: 10,
        paddingTop: 8,
        paddingBottom: 12
      }}
    >
      <div
        className="ui-stack"
        style={{
          minHeight: 38,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8
        }}
      >
        <Action
          role={'button'}
          aria-label={'Предыдущий месяц'}
          disabled={previousMonthDisabled}
          onClick={() => setVisibleMonth(previousMonth)}
          style={{
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 11,
            backgroundColor: 'transparent',
            opacity: previousMonthDisabled ? 0.28 : 1
          }}
          pressedStyle={{
            backgroundColor: theme.surface,
            opacity: previousMonthDisabled ? 0.28 : 0.72
          }}
        >
          <AppIcon name="back" size={17} color={theme.muted} />
        </Action>

        <span
          className="ui-text"
          data-lines={1}
          style={{
            flex: '1 1 0%',
            textAlign: 'center',
            color: theme.text,
            fontSize: 14,
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 1
          }}
        >
          {formatMobileMonth(visibleMonth)}
        </span>

        <Action
          role={'button'}
          aria-label={'Следующий месяц'}
          disabled={nextMonthDisabled}
          onClick={() => setVisibleMonth(nextMonth)}
          style={{
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 11,
            backgroundColor: 'transparent',
            opacity: nextMonthDisabled ? 0.28 : 1
          }}
          pressedStyle={{
            backgroundColor: theme.surface,
            opacity: nextMonthDisabled ? 0.28 : 0.72
          }}
        >
          <AppIcon name="forward" size={17} color={theme.muted} />
        </Action>
      </div>

      <div
        className="ui-stack"
        style={{
          marginTop: 6,
          flexDirection: 'row'
        }}
      >
        {MOBILE_DATE_WEEKDAYS.map((weekday) => (
          <div
            className="ui-stack"
            key={weekday}
            style={{
              flex: '1 1 0%',
              minWidth: 0,
              height: 24,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span
              className="ui-text"
              style={{
                color: theme.muted,
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: 0.5
              }}
            >
              {weekday}
            </span>
          </div>
        ))}
      </div>

      <div className="ui-stack">
        {weeks.map((week, weekIndex) => (
          <div
            className="ui-stack"
            key={weekIndex}
            style={{
              flexDirection: 'row'
            }}
          >
            {week.map((day) => {
              const selected = day === value
              const isToday = day === today
              const outsideMonth = !datePickerSameMonth(day, visibleMonth)
              const dayDisabled = !dateWithinBounds(day, min, max)
              const dayNumber = Number(day.slice(8, 10))
              return (
                <div
                  className="ui-stack"
                  key={day}
                  style={{
                    flex: '1 1 0%',
                    minWidth: 0,
                    height: 38,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Action
                    role={'button'}
                    aria-label={`Выбрать ${formatMobileAccessibleDate(day)}`}
                    aria-selected={selected}
                    aria-disabled={dayDisabled}
                    disabled={dayDisabled}
                    onClick={() => onChoose(day)}
                    style={{
                      position: 'relative',
                      width: 34,
                      height: 34,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 11,
                      borderWidth: isToday && !selected ? 1 : 0,
                      borderColor: isToday && !selected ? theme.accent + '66' : 'transparent',
                      backgroundColor: selected ? theme.accent : 'transparent',
                      opacity:
                        dayDisabled && outsideMonth
                          ? 0.4
                          : dayDisabled
                            ? 0.62
                            : outsideMonth && !selected
                              ? 0.48
                              : 1
                    }}
                    pressedStyle={{
                      backgroundColor: selected ? theme.accent : theme.surface
                    }}
                  >
                    <span
                      className="ui-text"
                      style={{
                        color: selected
                          ? '#ffffff'
                          : isToday
                            ? theme.accent
                            : dayDisabled
                              ? theme.muted
                              : theme.text,
                        fontSize: 12,
                        fontWeight: selected || isToday ? '700' : '500'
                      }}
                    >
                      {dayNumber}
                    </span>
                    {isToday && !selected ? (
                      <div
                        className="ui-stack"
                        style={{
                          position: 'absolute',
                          bottom: 3,
                          width: 3.5,
                          height: 3.5,
                          borderRadius: 2,
                          backgroundColor: theme.accent,
                          pointerEvents: 'none'
                        }}
                      ></div>
                    ) : null}
                  </Action>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div
        className="ui-stack"
        style={{
          marginTop: 8,
          paddingTop: 10,
          flexDirection: 'row',
          gap: 8,
          borderTopWidth: 1,
          borderTopColor: theme.border
        }}
      >
        {optional ? (
          <Action
            role={'button'}
            aria-label={'Очистить дату'}
            onClick={onClear}
            style={{
              minHeight: 38,
              paddingInline: 14,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 11,
              backgroundColor: 'transparent',
              opacity: 1
            }}
            pressedStyle={{
              backgroundColor: theme.surface,
              opacity: 0.74
            }}
          >
            <span
              className="ui-text"
              style={{
                color: theme.muted,
                fontSize: 12.5,
                fontWeight: 600
              }}
            >
              Очистить
            </span>
          </Action>
        ) : null}

        <Action
          role={'button'}
          aria-label={'Выбрать сегодня'}
          disabled={!todayAllowed}
          onClick={() => onChoose(today)}
          style={{
            minHeight: 38,
            flex: '1 1 0%',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 11,
            backgroundColor: theme.accent + '14',
            opacity: todayAllowed ? 1 : 0.35
          }}
          pressedStyle={{
            backgroundColor: theme.accent + '22',
            opacity: todayAllowed ? 0.78 : 0.35
          }}
        >
          <span
            className="ui-text"
            style={{
              color: theme.accent,
              fontSize: 12.5,
              fontWeight: 700
            }}
          >
            Сегодня
          </span>
        </Action>
      </div>
    </div>
  )
}
export function AppDatePickerDialog({
  open,
  onOpenChange,
  value,
  onValueChange,
  label,
  optional = false,
  min,
  max
}: {
  open: boolean
  onOpenChange(open: boolean): void
  value: string
  onValueChange(value: string): void
  label: string
  optional?: boolean
  min?: string
  max?: string
}): React.JSX.Element {
  const today = localDateKey()
  const reference = datePickerReference(value, min, max, today)
  const choose = (next: string): void => {
    if (!dateWithinBounds(next, min, max)) return
    onValueChange(next)
    onOpenChange(false)
  }
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={label}
      description={isValidDateKey(value) ? formatMobileAccessibleDate(value) : 'Выберите дату'}
      icon="calendar"
      presentation="card"
    >
      {open ? (
        <DateCalendar
          value={value}
          reference={reference}
          min={min}
          max={max}
          optional={optional}
          onChoose={choose}
          onClear={() => {
            onValueChange('')
            onOpenChange(false)
          }}
        />
      ) : null}
    </AppDialog>
  )
}
export function AppDateField({
  value,
  onValueChange,
  label,
  disabled = false,
  optional = false,
  min,
  max,
  compact = false
}: {
  value: string
  onValueChange(value: string): void
  label: string
  disabled?: boolean
  optional?: boolean
  min?: string
  max?: string
  compact?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const display = isValidDateKey(value)
    ? formatMobileDate(value)
    : optional
      ? 'Не выбрано'
      : 'Выберите дату'
  return (
    <>
      <Action
        role={'button'}
        aria-label={label}
        aria-disabled={disabled}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(true)}
        style={{
          minHeight: compact ? 40 : 50,
          flex: compact ? 1 : undefined,
          minWidth: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: compact ? 'center' : 'flex-start',
          gap: 9,
          paddingInline: compact ? 8 : 12,
          borderWidth: compact ? 0 : 1,
          borderColor: open ? theme.accent + '8A' : theme.border,
          borderRadius: compact ? 10 : 14,
          backgroundColor: compact ? 'transparent' : theme.surface,
          opacity: disabled ? 0.45 : 1
        }}
        pressedStyle={{
          backgroundColor: compact ? theme.raised : theme.raised,
          opacity: disabled ? 0.45 : 0.76
        }}
      >
        <AppIcon
          name="calendar"
          size={compact ? 17 : 18}
          color={open ? theme.accent : theme.muted}
        />
        <span
          className="ui-text"
          data-lines={1}
          style={{
            flex: compact ? undefined : 1,
            color: isValidDateKey(value) ? theme.text : theme.muted,
            fontSize: compact ? 12.5 : 15,
            fontWeight: compact ? '700' : '500',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 1
          }}
        >
          {display}
        </span>
      </Action>

      <AppDatePickerDialog
        open={open}
        onOpenChange={setOpen}
        value={value}
        onValueChange={onValueChange}
        label={label}
        optional={optional}
        min={min}
        max={max}
      />
    </>
  )
}
