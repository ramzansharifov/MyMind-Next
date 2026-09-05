import type { PropsWithChildren } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { designTokens } from '@mymind/design'
import { useTheme } from './theme'

export function Label({
  children,
  muted = false,
  title = false
}: PropsWithChildren<{ muted?: boolean; title?: boolean }>): React.JSX.Element {
  const theme = useTheme()
  return (
    <Text
      style={{
        color: muted ? theme.muted : theme.text,
        fontSize: title ? designTokens.typography.title : designTokens.typography.body,
        fontWeight: title ? '700' : '400',
        lineHeight: title ? 32 : 24
      }}
    >
      {children}
    </Text>
  )
}
export function Button({
  label,
  onPress,
  disabled = false,
  danger = false,
  selected = false
}: {
  label: string
  onPress(): void
  disabled?: boolean
  danger?: boolean
  selected?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        justifyContent: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: designTokens.radius.md,
        borderWidth: 1,
        borderColor: selected ? theme.accent : theme.border,
        backgroundColor: selected ? theme.accent + '22' : theme.raised,
        opacity: disabled ? 0.45 : pressed ? 0.65 : 1
      })}
    >
      <Text style={{ color: danger ? theme.error : theme.text, fontSize: 15, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  )
}
export function Row({
  title,
  subtitle,
  onPress,
  onLongPress,
  children
}: PropsWithChildren<{
  title: string
  subtitle?: string
  onPress?(): void
  onLongPress?(): void
}>): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderRadius: designTokens.radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: 10,
        overflow: 'hidden'
      }}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={title}
        accessibilityHint={onLongPress ? 'Удерживайте для дополнительных действий' : undefined}
        style={{ padding: 16, minHeight: 64 }}
      >
        <Label>{title}</Label>
        {subtitle ? (
          <Text
            numberOfLines={3}
            style={{ color: theme.muted, fontSize: 14, marginTop: 4, lineHeight: 20 }}
          >
            {subtitle}
          </Text>
        ) : null}
      </Pressable>
      {children ? (
        <View
          style={{
            paddingHorizontal: 12,
            paddingBottom: 12,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  )
}
export function SearchField({
  value,
  onChangeText
}: {
  value: string
  onChangeText(value: string): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <TextInput
      accessibilityLabel="Поиск"
      placeholder="Поиск…"
      placeholderTextColor={theme.muted}
      value={value}
      onChangeText={onChangeText}
      clearButtonMode="while-editing"
      style={{
        minHeight: 48,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        color: theme.text,
        paddingHorizontal: 14,
        borderRadius: 12,
        marginBottom: 12,
        fontSize: 16
      }}
    />
  )
}
export function EmptyState({
  text = 'Здесь пока пусто. Добавьте первую запись.'
}: {
  text?: string
}): React.JSX.Element {
  return (
    <View style={{ paddingVertical: 36, paddingHorizontal: 16 }}>
      <Label muted>{text}</Label>
    </View>
  )
}
export function ErrorState({
  message,
  retry
}: {
  message: string
  retry?(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View accessibilityRole="alert" style={{ padding: 16, gap: 12 }}>
      <Text selectable style={{ color: theme.error, fontSize: 16 }}>
        {message}
      </Text>
      {retry && <Button label="Повторить" onPress={retry} />}
    </View>
  )
}
export function LoadingState(): React.JSX.Element {
  const theme = useTheme()
  return (
    <ActivityIndicator accessibilityLabel="Загрузка" color={theme.accent} style={{ padding: 32 }} />
  )
}
