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
        borderRadius: 20,
        backgroundColor: theme.surface,
        overflow: 'hidden'
      }}
    >
      {title || description || icon || action ? (
        <View
          style={{
            minHeight: 58,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border
          }}
        >
          {icon ? (
            <View
              style={{
                width: 34,
                height: 34,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 11,
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
      <View style={{ padding: 12 }}>{children}</View>
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
      style={{
        minWidth: 145,
        flex: 1,
        minHeight: 112,
        justifyContent: 'space-between',
        gap: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 18,
        backgroundColor: theme.surface
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon ? <AppIcon name={icon} size={16} color={theme.accent} /> : null}
        <Text style={{ flex: 1, color: theme.muted, fontSize: 12.5, lineHeight: 17 }}>{label}</Text>
      </View>
      <Text
        numberOfLines={2}
        style={{ color: theme.text, fontSize: 20, lineHeight: 26, fontWeight: '700' }}
      >
        {value}
      </Text>
      {detail ? (
        <Text numberOfLines={2} style={{ color: theme.muted, fontSize: 11.5, lineHeight: 16 }}>
          {detail}
        </Text>
      ) : null}
    </View>
  )
}

export function WorkspaceNodeCard({
  title,
  subtitle,
  leadingIcon,
  onPress,
  onLongPress,
  action,
  selected = false
}: {
  title: string
  subtitle?: string
  leadingIcon?: AppIconName
  onPress?(): void
  onLongPress?(): void
  action?: ReactNode
  selected?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        minHeight: 68,
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
          minHeight: 66,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 11,
          paddingLeft: 13,
          paddingRight: action ? 6 : 13,
          paddingVertical: 11,
          backgroundColor: pressed && onPress ? theme.raised : 'transparent'
        })}
      >
        {leadingIcon ? (
          <View
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 11,
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
