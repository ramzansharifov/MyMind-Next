import type { PropsWithChildren } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { designTokens } from '@mymind/design'
import { AppIcon, type AppIconName } from './icons'
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
        lineHeight: title ? 30 : 23,
        letterSpacing: title ? -0.45 : 0
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
  selected = false,
  primary = false,
  ghost = false,
  icon,
  iconOnly = false,
  compact = false
}: {
  label: string
  onPress(): void
  disabled?: boolean
  danger?: boolean
  selected?: boolean
  primary?: boolean
  ghost?: boolean
  icon?: AppIconName
  iconOnly?: boolean
  compact?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  const foreground = primary ? '#ffffff' : danger ? theme.error : selected ? theme.accent : theme.text

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      hitSlop={iconOnly ? 4 : undefined}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: iconOnly ? (compact ? 38 : 44) : undefined,
        minHeight: compact ? 38 : 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: iconOnly ? 0 : 8,
        paddingHorizontal: iconOnly ? 0 : compact ? 11 : 14,
        paddingVertical: iconOnly ? 0 : compact ? 7 : 9,
        borderRadius: compact ? 11 : designTokens.radius.md,
        borderWidth: ghost || primary ? 0 : 1,
        borderColor: danger ? theme.error + '35' : selected ? theme.accent + '66' : theme.border,
        backgroundColor: primary
          ? pressed
            ? theme.accent + 'D9'
            : theme.accent
          : ghost
            ? pressed
              ? theme.raised
              : 'transparent'
            : danger
              ? theme.error + '0E'
              : selected
                ? theme.accent + '18'
                : pressed
                  ? theme.raised
                  : theme.surface,
        opacity: disabled ? 0.42 : pressed ? 0.72 : 1
      })}
    >
      {icon ? <AppIcon name={icon} size={compact ? 16 : 18} color={foreground} /> : null}
      {!iconOnly ? (
        <Text
          numberOfLines={1}
          style={{
            color: foreground,
            fontSize: compact ? 13 : 14,
            fontWeight: '600'
          }}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  )
}

export function IconButton({
  label,
  icon,
  onPress,
  disabled = false,
  danger = false,
  selected = false,
  primary = false,
  ghost = false,
  compact = false
}: {
  label: string
  icon: AppIconName
  onPress(): void
  disabled?: boolean
  danger?: boolean
  selected?: boolean
  primary?: boolean
  ghost?: boolean
  compact?: boolean
}): React.JSX.Element {
  return (
    <Button
      label={label}
      icon={icon}
      iconOnly
      compact={compact}
      disabled={disabled}
      danger={danger}
      selected={selected}
      primary={primary}
      ghost={ghost}
      onPress={onPress}
    />
  )
}

export function Row({
  title,
  subtitle,
  onPress,
  onLongPress,
  leadingIcon,
  children
}: PropsWithChildren<{
  title: string
  subtitle?: string
  onPress?(): void
  onLongPress?(): void
  leadingIcon?: AppIconName
}>): React.JSX.Element {
  const theme = useTheme()

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: 10,
        overflow: 'hidden',
        elevation: 1
      }}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={title}
        accessibilityHint={onLongPress ? 'Удерживайте для дополнительных действий' : undefined}
        style={({ pressed }) => ({
          minHeight: 68,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 14,
          paddingVertical: 13,
          backgroundColor: pressed && onPress ? theme.raised : theme.surface
        })}
      >
        {leadingIcon ? (
          <View
            style={{
              width: 38,
              height: 38,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.accent + '28',
              backgroundColor: theme.accent + '12'
            }}
          >
            <AppIcon name={leadingIcon} size={18} color={theme.accent} />
          </View>
        ) : null}

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={2}
            style={{ color: theme.text, fontSize: 15, lineHeight: 21, fontWeight: '600' }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={3}
              style={{ color: theme.muted, fontSize: 12.5, marginTop: 4, lineHeight: 18 }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {onPress ? <AppIcon name="forward" size={20} color={theme.muted} /> : null}
      </Pressable>

      {children ? (
        <View
          style={{
            minHeight: 52,
            paddingHorizontal: 10,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            gap: 7
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
    <View
      style={{
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        paddingHorizontal: 12,
        borderRadius: 14,
        marginBottom: 12
      }}
    >
      <AppIcon name="search" size={17} color={theme.muted} />
      <TextInput
        accessibilityLabel="Поиск"
        placeholder="Поиск…"
        placeholderTextColor={theme.muted}
        value={value}
        onChangeText={onChangeText}
        clearButtonMode="while-editing"
        style={{
          flex: 1,
          minHeight: 44,
          color: theme.text,
          paddingVertical: 8,
          fontSize: 15
        }}
      />
    </View>
  )
}

export function EmptyState({
  text = 'Здесь пока пусто. Добавьте первую запись.'
}: {
  text?: string
}): React.JSX.Element {
  const theme = useTheme()

  return (
    <View
      style={{
        minHeight: 180,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 32,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme.border,
        borderRadius: 20,
        backgroundColor: theme.surface
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.accent + '24',
          backgroundColor: theme.accent + '10'
        }}
      >
        <AppIcon name="add" size={23} color={theme.accent} />
      </View>
      <Text style={{ color: theme.muted, maxWidth: 280, textAlign: 'center', lineHeight: 20 }}>
        {text}
      </Text>
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
    <View
      accessibilityRole="alert"
      style={{
        marginBottom: 12,
        padding: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: theme.error + '32',
        backgroundColor: theme.error + '0F',
        borderRadius: 16
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View
          style={{
            width: 28,
            height: 28,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 9,
            backgroundColor: theme.error + '14'
          }}
        >
          <AppIcon name="info" size={15} color={theme.error} />
        </View>
        <Text selectable style={{ flex: 1, color: theme.error, fontSize: 14, lineHeight: 20 }}>
          {message}
        </Text>
      </View>
      {retry ? <Button label="Повторить" icon="reset" compact onPress={retry} /> : null}
    </View>
  )
}

export function LoadingState(): React.JSX.Element {
  const theme = useTheme()
  return (
    <View style={{ padding: 32, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <ActivityIndicator accessibilityLabel="Загрузка" color={theme.accent} />
      <Text style={{ color: theme.muted, fontSize: 12 }}>Загрузка…</Text>
    </View>
  )
}
