import type { PropsWithChildren, ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { AppIcon, type AppIconName } from './icons'
import { useTheme } from './theme'

export function WorkspacePanel({
  title,
  description,
  icon,
  action,
  children
}: PropsWithChildren<{
  title?: string
  description?: string
  icon?: AppIconName
  action?: ReactNode
}>): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface,
        overflow: 'hidden'
      }}
    >
      {title || description || icon || action ? (
        <View
          style={{
            minHeight: 64,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border
          }}
        >
          {icon ? (
            <View
              style={{
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.accent + '26',
                backgroundColor: theme.accent + '12'
              }}
            >
              <AppIcon name={icon} size={17} color={theme.accent} />
            </View>
          ) : null}
          <View style={{ flex: 1, minWidth: 0 }}>
            {title ? (
              <Text style={{ color: theme.text, fontSize: 15, lineHeight: 20, fontWeight: '700' }}>
                {title}
              </Text>
            ) : null}
            {description ? (
              <Text style={{ marginTop: 2, color: theme.muted, fontSize: 12, lineHeight: 17 }}>
                {description}
              </Text>
            ) : null}
          </View>
          {action}
        </View>
      ) : null}
      <View style={{ padding: 16 }}>{children}</View>
    </View>
  )
}

export function WorkspaceStatCard({
  label,
  value,
  detail,
  icon
}: {
  label: string
  value: string
  detail?: string
  icon?: AppIconName
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      accessibilityLabel={detail ? `${label}: ${value}. ${detail}` : `${label}: ${value}`}
      style={{
        minWidth: 145,
        flex: 1,
        minHeight: 68,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface
      }}
    >
      {icon ? (
        <View
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.accent + '26',
            borderRadius: 12,
            backgroundColor: theme.accent + '12'
          }}
        >
          <AppIcon name={icon} size={17} color={theme.accent} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={{ color: theme.text, fontSize: 20, lineHeight: 25, fontWeight: '600' }}>
            {value}
          </Text>
          <Text
            numberOfLines={1}
            style={{ flex: 1, color: theme.text, fontSize: 12, lineHeight: 17, fontWeight: '500' }}
          >
            {label}
          </Text>
        </View>
        {detail ? (
          <Text numberOfLines={1} style={{ marginTop: 2, color: theme.muted, fontSize: 11 }}>
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

export function WorkspaceNodeCard({
  title,
  subtitle,
  leadingIcon,
  leading,
  onPress,
  onLongPress,
  action,
  selected = false
}: {
  title: string
  subtitle?: string
  leadingIcon?: AppIconName
  leading?: ReactNode
  onPress?(): void
  onLongPress?(): void
  action?: ReactNode
  selected?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        minHeight: 64,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'stretch',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: selected ? theme.accent + '66' : theme.border,
        borderRadius: 16,
        backgroundColor: selected ? theme.accent + '0C' : theme.surface
      }}
    >
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={title}
        accessibilityHint={onLongPress ? 'Удерживайте для дополнительных действий' : undefined}
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 0,
          minHeight: 62,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingLeft: 14,
          paddingRight: action ? 6 : 14,
          paddingVertical: 12,
          backgroundColor: pressed && onPress ? theme.raised : 'transparent'
        })}
      >
        {leading ? (
          leading
        ) : leadingIcon ? (
          <View
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.accent + '28',
              backgroundColor: theme.accent + '12'
            }}
          >
            <AppIcon name={leadingIcon} size={17} color={theme.accent} />
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={2}
            style={{ color: theme.text, fontSize: 14.5, lineHeight: 20, fontWeight: '600' }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={3}
              style={{ marginTop: 3, color: theme.muted, fontSize: 12, lineHeight: 17 }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {!action && onPress ? <AppIcon name="forward" size={18} color={theme.muted} /> : null}
      </Pressable>
      {action ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingRight: 8 }}>
          {action}
        </View>
      ) : null}
    </View>
  )
}
