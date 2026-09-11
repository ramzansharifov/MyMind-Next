import { useState } from 'react'
import { Pressable, Text, TextInput, type TextInputProps, View } from 'react-native'
import { AppDialog } from './AppDialog'
import { AppIcon } from './icons'
import { useTheme } from './theme'

export type SelectChoice = {
  value: string | null
  label: string
}

export function AppTextField({
  value,
  onChangeText,
  disabled = false,
  multiline = false,
  ...props
}: Omit<TextInputProps, 'value' | 'onChangeText' | 'editable' | 'multiline'> & {
  value: string
  onChangeText(value: string): void
  disabled?: boolean
  multiline?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  const [focused, setFocused] = useState(false)

  return (
    <TextInput
      {...props}
      value={value}
      onChangeText={onChangeText}
      editable={!disabled}
      multiline={multiline}
      placeholderTextColor={theme.muted}
      onFocus={(event) => {
        setFocused(true)
        props.onFocus?.(event)
      }}
      onBlur={(event) => {
        setFocused(false)
        props.onBlur?.(event)
      }}
      style={[
        {
          color: theme.text,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: focused ? theme.accent + '8A' : theme.border,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          minHeight: multiline ? 140 : 50,
          textAlignVertical: multiline ? 'top' : 'center',
          fontSize: 16,
          opacity: disabled ? 0.5 : 1
        },
        props.style
      ]}
    />
  )
}

function TemporalField({
  value,
  onChangeText,
  label,
  kind,
  disabled = false,
  optional = false
}: {
  value: string
  onChangeText(value: string): void
  label: string
  kind: 'date' | 'time'
  disabled?: boolean
  optional?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  const [focused, setFocused] = useState(false)
  const date = kind === 'date'
  return (
    <View
      style={{
        minHeight: 50,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: focused ? theme.accent + '8A' : theme.border,
        borderRadius: 14,
        backgroundColor: theme.surface,
        opacity: disabled ? 0.5 : 1
      }}
    >
      <AppIcon
        name={date ? 'calendar' : 'clock'}
        size={18}
        color={focused ? theme.accent : theme.muted}
      />
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        editable={!disabled}
        maxLength={date ? 10 : 5}
        placeholder={date ? 'ГГГГ-ММ-ДД' : optional ? 'ЧЧ:ММ (необязательно)' : 'ЧЧ:ММ'}
        placeholderTextColor={theme.muted}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{ flex: 1, minHeight: 48, color: theme.text, fontSize: 16, paddingVertical: 10 }}
      />
    </View>
  )
}

export function AppDateField(props: {
  value: string
  onChangeText(value: string): void
  label: string
  disabled?: boolean
  optional?: boolean
}): React.JSX.Element {
  return <TemporalField {...props} kind="date" />
}

export function AppTimeField(props: {
  value: string
  onChangeText(value: string): void
  label: string
  disabled?: boolean
  optional?: boolean
}): React.JSX.Element {
  return <TemporalField {...props} kind="time" />
}

export function AppCheckbox({
  value,
  onChange,
  label,
  disabled = false
}: {
  value: boolean
  onChange(value: boolean): void
  label?: string
  disabled?: boolean
}): React.JSX.Element {
  const theme = useTheme()

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={({ pressed }) => ({
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: label ? 11 : 0,
        paddingVertical: label ? 8 : 0,
        borderWidth: label ? 1 : 0,
        borderColor: value ? theme.accent + '56' : theme.border,
        borderRadius: label ? 13 : 0,
        backgroundColor: label
          ? value
            ? theme.accent + '0F'
            : pressed
              ? theme.raised
              : theme.surface
          : 'transparent',
        opacity: disabled ? 0.45 : pressed ? 0.76 : 1
      })}
    >
      <View
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
      </View>
      {label ? (
        <Text style={{ flex: 1, color: theme.text, fontSize: 14, lineHeight: 20 }}>{label}</Text>
      ) : null}
    </Pressable>
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          minHeight: 50,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: open ? theme.accent + '8A' : theme.border,
          borderRadius: 14,
          backgroundColor: pressed ? theme.raised : theme.surface,
          opacity: disabled ? 0.45 : pressed ? 0.76 : 1
        })}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: selected ? theme.text : theme.muted,
            fontSize: 15
          }}
        >
          {selected?.label ?? placeholder}
        </Text>
        <AppIcon name="down" size={18} color={theme.muted} />
      </Pressable>

      <AppDialog
        open={open}
        onOpenChange={setOpen}
        title={label}
        description="Выберите один вариант"
        presentation="sheet"
      >
        <View style={{ padding: 12, paddingBottom: 18, gap: 5 }}>
          {choices.map((choice) => {
            const active = choice.value === value
            return (
              <Pressable
                key={String(choice.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  onChange(choice.value)
                  setOpen(false)
                }}
                style={({ pressed }) => ({
                  minHeight: 50,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 13,
                  paddingVertical: 9,
                  borderRadius: 13,
                  backgroundColor: active
                    ? theme.accent + '12'
                    : pressed
                      ? theme.surface
                      : 'transparent',
                  opacity: pressed ? 0.76 : 1
                })}
              >
                <Text
                  style={{
                    flex: 1,
                    color: active ? theme.accent : theme.text,
                    fontSize: 15,
                    fontWeight: active ? '700' : '500'
                  }}
                >
                  {choice.label}
                </Text>
                {active ? <AppIcon name="check" size={17} color={theme.accent} /> : null}
              </Pressable>
            )
          })}
        </View>
      </AppDialog>
    </>
  )
}
