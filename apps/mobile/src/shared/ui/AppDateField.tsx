import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { calendarMonthKey } from '@mymind/core/calendar-month'
import { localDateKey } from '@mymind/core/habits'

import { AppDialog } from './AppDialog'
import { AppIcon } from './icons'
import {
  MOBILE_DATE_WEEKDAYS,
  datePickerDays,
  datePickerReference,
  datePickerSameMonth,
  datePickerShiftMonth,
  dateWithinBounds,
  formatMobileAccessibleDate,
  formatMobileDate,
  formatMobileMonth,
  isValidDateKey
} from './mobile-date'
import { useTheme } from './theme'

export function AppDateField({
  value,
  onChangeText,
  label,
  disabled = false,
  optional = false,
  min,
  max,
  compact = false
}: {
  value: string
  onChangeText(value: string): void
  label: string
  disabled?: boolean
  optional?: boolean
  min?: string
  max?: string
  compact?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  const today = localDateKey()
  const reference = datePickerReference(value, min, max, today)
  const [open, setOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => calendarMonthKey(reference))
  const days = useMemo(() => datePickerDays(visibleMonth), [visibleMonth])
  const previousMonth = datePickerShiftMonth(visibleMonth, -1)
  const nextMonth = datePickerShiftMonth(visibleMonth, 1)
  const previousMonthDisabled = isValidDateKey(min) && previousMonth < calendarMonthKey(min)
  const nextMonthDisabled = isValidDateKey(max) && nextMonth > calendarMonthKey(max)
  const todayAllowed = dateWithinBounds(today, min, max)
  const display = isValidDateKey(value)
    ? formatMobileDate(value)
    : optional
      ? 'Не выбрано'
      : 'Выберите дату'

  const changeOpen = (nextOpen: boolean): void => {
    setOpen(nextOpen)
    if (nextOpen) {
      setVisibleMonth(calendarMonthKey(datePickerReference(value, min, max, today)))
    }
  }

  const choose = (next: string): void => {
    if (!dateWithinBounds(next, min, max)) return
    onChangeText(next)
    setOpen(false)
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => changeOpen(true)}
        style={({ pressed }) => ({
          minHeight: compact ? 40 : 50,
          flex: compact ? 1 : undefined,
          minWidth: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: compact ? 'center' : 'flex-start',
          gap: 9,
          paddingHorizontal: compact ? 8 : 12,
          borderWidth: compact ? 0 : 1,
          borderColor: open ? theme.accent + '8A' : theme.border,
          borderRadius: compact ? 10 : 14,
          backgroundColor: compact
            ? pressed
              ? theme.raised
              : 'transparent'
            : pressed
              ? theme.raised
              : theme.surface,
          opacity: disabled ? 0.45 : pressed ? 0.76 : 1
        })}
      >
        <AppIcon
          name="calendar"
          size={compact ? 17 : 18}
          color={open ? theme.accent : theme.muted}
        />
        <Text
          numberOfLines={1}
          style={{
            flex: compact ? undefined : 1,
            color: isValidDateKey(value) ? theme.text : theme.muted,
            fontSize: compact ? 12.5 : 15,
            fontWeight: compact ? '700' : '500'
          }}
        >
          {display}
        </Text>
      </Pressable>

      <AppDialog
        open={open}
        onOpenChange={changeOpen}
        title={label}
        description="Выберите дату"
        icon="calendar"
        presentation="card"
      >
        <View style={{ padding: 12, paddingBottom: 14 }}>
          <View
            style={{
              minHeight: 42,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Предыдущий месяц"
              disabled={previousMonthDisabled}
              onPress={() => setVisibleMonth(previousMonth)}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: pressed ? theme.surface : 'transparent',
                opacity: previousMonthDisabled ? 0.28 : pressed ? 0.72 : 1
              })}
            >
              <AppIcon name="back" size={18} color={theme.muted} />
            </Pressable>

            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                textAlign: 'center',
                color: theme.text,
                fontSize: 14,
                fontWeight: '700'
              }}
            >
              {formatMobileMonth(visibleMonth)}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Следующий месяц"
              disabled={nextMonthDisabled}
              onPress={() => setVisibleMonth(nextMonth)}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: pressed ? theme.surface : 'transparent',
                opacity: nextMonthDisabled ? 0.28 : pressed ? 0.72 : 1
              })}
            >
              <AppIcon name="forward" size={18} color={theme.muted} />
            </Pressable>
          </View>

          <View
            style={{
              marginTop: 8,
              flexDirection: 'row'
            }}
          >
            {MOBILE_DATE_WEEKDAYS.map((weekday) => (
              <View
                key={weekday}
                style={{
                  width: '14.285714%',
                  height: 28,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text
                  style={{
                    color: theme.muted,
                    fontSize: 10,
                    fontWeight: '700',
                    letterSpacing: 0.6
                  }}
                >
                  {weekday}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {days.map((day) => {
              const selected = day === value
              const isToday = day === today
              const outsideMonth = !datePickerSameMonth(day, visibleMonth)
              const dayDisabled = !dateWithinBounds(day, min, max)
              const dayNumber = Number(day.slice(8, 10))

              return (
                <View
                  key={day}
                  style={{
                    width: '14.285714%',
                    height: 42,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Выбрать ${formatMobileAccessibleDate(day)}`}
                    accessibilityState={{ selected, disabled: dayDisabled }}
                    disabled={dayDisabled}
                    onPress={() => choose(day)}
                    style={({ pressed }) => ({
                      position: 'relative',
                      width: 36,
                      height: 36,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      backgroundColor: selected
                        ? theme.accent
                        : pressed
                          ? theme.surface
                          : 'transparent',
                      opacity: dayDisabled ? 0.22 : outsideMonth && !selected ? 0.42 : 1
                    })}
                  >
                    <Text
                      style={{
                        color: selected ? '#ffffff' : isToday ? theme.accent : theme.text,
                        fontSize: 12.5,
                        fontWeight: selected || isToday ? '700' : '500'
                      }}
                    >
                      {dayNumber}
                    </Text>
                    {isToday && !selected ? (
                      <View
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: theme.accent
                        }}
                      />
                    ) : null}
                  </Pressable>
                </View>
              )
            })}
          </View>

          <View
            style={{
              marginTop: 10,
              paddingTop: 10,
              flexDirection: 'row',
              gap: 8,
              borderTopWidth: 1,
              borderTopColor: theme.border
            }}
          >
            {optional ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Очистить дату"
                onPress={() => {
                  onChangeText('')
                  setOpen(false)
                }}
                style={({ pressed }) => ({
                  minHeight: 40,
                  paddingHorizontal: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor: pressed ? theme.surface : 'transparent',
                  opacity: pressed ? 0.74 : 1
                })}
              >
                <Text style={{ color: theme.muted, fontSize: 12.5, fontWeight: '600' }}>
                  Очистить
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Выбрать сегодня"
              disabled={!todayAllowed}
              onPress={() => choose(today)}
              style={({ pressed }) => ({
                minHeight: 40,
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: pressed ? theme.accent + '22' : theme.accent + '14',
                opacity: todayAllowed ? (pressed ? 0.78 : 1) : 0.35
              })}
            >
              <Text style={{ color: theme.accent, fontSize: 12.5, fontWeight: '700' }}>
                Сегодня
              </Text>
            </Pressable>
          </View>
        </View>
      </AppDialog>
    </>
  )
}
