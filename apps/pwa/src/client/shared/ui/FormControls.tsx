import { TextControlProps, TextControl, Action } from '../../../ui/browser'
import { useState } from 'react'
import { AppDialog } from './AppDialog'
import { AppIcon } from './icons'
import { useTheme } from './theme'
export type SelectChoice = {
  value: string | null
  label: string
}
export function AppTextField({
  value,
  onValueChange,
  disabled = false,
  multiline = false,
  ...props
}: Omit<TextControlProps, 'value' | 'onValueChange' | 'editable' | 'multiline'> & {
  value: string
  onValueChange(value: string): void
  disabled?: boolean
  multiline?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  const [focused, setFocused] = useState(false)
  return (
    <TextControl
      {...props}
      value={value}
      onValueChange={onValueChange}
      disabled={!!disabled}
      multiline={multiline}
      placeholderColor={theme.muted}
      onFocus={(event) => {
        setFocused(true)
        props.onFocus?.(event)
      }}
      onBlur={(event) => {
        setFocused(false)
        props.onBlur?.(event)
      }}
      style={{
        color: theme.text,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: focused ? theme.accent + '8A' : theme.border,
        borderRadius: 14,
        paddingInline: 14,
        paddingBlock: 12,
        minHeight: multiline ? 140 : 50,
        fontSize: 16,
        opacity: disabled ? 0.5 : 1,
        ...props.style
      }}
    ></TextControl>
  )
}
function TemporalField({
  value,
  onValueChange,
  label,
  disabled = false,
  optional = false
}: {
  value: string
  onValueChange(value: string): void
  label: string
  disabled?: boolean
  optional?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  const [focused, setFocused] = useState(false)
  return (
    <div
      className="ui-stack"
      style={{
        minHeight: 50,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingInline: 12,
        borderWidth: 1,
        borderColor: focused ? theme.accent + '8A' : theme.border,
        borderRadius: 14,
        backgroundColor: theme.surface,
        opacity: disabled ? 0.5 : 1
      }}
    >
      <AppIcon name="clock" size={18} color={focused ? theme.accent : theme.muted} />
      <TextControl
        aria-label={label}
        value={value}
        onValueChange={onValueChange}
        disabled={!!disabled}
        maxLength={5}
        placeholder={optional ? 'ЧЧ:ММ (необязательно)' : 'ЧЧ:ММ'}
        placeholderColor={theme.muted}
        autoCapitalize={'none'}
        autoCorrect={'off'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: '1 1 0%',
          minHeight: 48,
          color: theme.text,
          fontSize: 16,
          paddingBlock: 10
        }}
      ></TextControl>
    </div>
  )
}
export { AppDateField, AppDatePickerDialog } from './AppDateField'
export function AppTimeField(props: {
  value: string
  onValueChange(value: string): void
  label: string
  disabled?: boolean
  optional?: boolean
}): React.JSX.Element {
  return <TemporalField {...props} />
}
export function AppCheckbox({
  value,
  onChange,
  label,
  accessibilityLabel,
  disabled = false
}: {
  value: boolean
  onChange(value: boolean): void
  label?: string
  accessibilityLabel?: string
  disabled?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Action
      role={'checkbox'}
      aria-label={accessibilityLabel ?? label}
      aria-checked={value}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => onChange(!value)}
      style={{
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingInline: label ? 11 : 0,
        paddingBlock: label ? 8 : 0,
        borderWidth: label ? 1 : 0,
        borderColor: value ? theme.accent + '56' : theme.border,
        borderRadius: label ? 13 : 0,
        backgroundColor: label ? (value ? theme.accent + '0F' : theme.surface) : 'transparent',
        opacity: disabled ? 0.45 : 1
      }}
      pressedStyle={{
        backgroundColor: label ? (value ? theme.accent + '0F' : theme.raised) : 'transparent',
        opacity: disabled ? 0.45 : 0.76
      }}
    >
      <div
        className="ui-stack"
        style={{
          width: 24,
          height: 24,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: value ? theme.accent : theme.muted,
          borderRadius: 8,
          backgroundColor: value ? theme.accent + '1C' : 'transparent'
        }}
      >
        {value ? <AppIcon name="check" size={15} strokeWidth={3} color={theme.accent} /> : null}
      </div>
      {label ? (
        <span
          className="ui-text"
          style={{
            flex: '1 1 0%',
            color: theme.text,
            fontSize: 14,
            lineHeight: '20px'
          }}
        >
          {label}
        </span>
      ) : null}
    </Action>
  )
}
export function AppSelect({
  label,
  value,
  choices,
  onChange,
  disabled = false,
  placeholder = 'Выберите значение'
}: {
  label: string
  value: string | null
  choices: readonly SelectChoice[]
  onChange(value: string | null): void
  disabled?: boolean
  placeholder?: string
}): React.JSX.Element {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const selected = choices.find((choice) => choice.value === value)
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
          minHeight: 50,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingInline: 14,
          borderWidth: 1,
          borderColor: open ? theme.accent + '8A' : theme.border,
          borderRadius: 14,
          backgroundColor: theme.surface,
          opacity: disabled ? 0.45 : 1
        }}
        pressedStyle={{
          backgroundColor: theme.raised,
          opacity: disabled ? 0.45 : 0.76
        }}
      >
        <span
          className="ui-text"
          data-lines={1}
          style={{
            flex: '1 1 0%',
            color: selected ? theme.text : theme.muted,
            fontSize: 15,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 1
          }}
        >
          {selected?.label ?? placeholder}
        </span>
        <AppIcon name="down" size={18} color={theme.muted} />
      </Action>

      <AppDialog
        open={open}
        onOpenChange={setOpen}
        title={label}
        description="Выберите один вариант"
        presentation="sheet"
      >
        <div
          className="ui-stack"
          style={{
            padding: 12,
            paddingBottom: 18,
            gap: 5
          }}
        >
          {choices.map((choice) => {
            const active = choice.value === value
            return (
              <Action
                key={String(choice.value)}
                role={'button'}
                aria-selected={active}
                onClick={() => {
                  onChange(choice.value)
                  setOpen(false)
                }}
                style={{
                  minHeight: 50,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingInline: 13,
                  paddingBlock: 9,
                  borderRadius: 13,
                  backgroundColor: active ? theme.accent + '12' : 'transparent',
                  opacity: 1
                }}
                pressedStyle={{
                  backgroundColor: active ? theme.accent + '12' : theme.surface,
                  opacity: 0.76
                }}
              >
                <span
                  className="ui-text"
                  style={{
                    flex: '1 1 0%',
                    color: active ? theme.accent : theme.text,
                    fontSize: 15,
                    fontWeight: active ? '700' : '500'
                  }}
                >
                  {choice.label}
                </span>
                {active ? <AppIcon name="check" size={17} color={theme.accent} /> : null}
              </Action>
            )
          })}
        </div>
      </AppDialog>
    </>
  )
}
