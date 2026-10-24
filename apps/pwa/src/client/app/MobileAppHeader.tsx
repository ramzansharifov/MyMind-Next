import { Pressable, Text, View } from 'react-native'
import { AppIcon, type AppIconName } from '../shared/ui/icons'
import { useTheme } from '../shared/ui/theme'

export function MobileAppHeader({
  title,
  icon,
  disabled = false,
  onMenuPress
}: {
  title: string
  icon: AppIconName
  disabled?: boolean
  onMenuPress(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }}>
      <View
        style={{
          minHeight: 80,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 12,
          paddingVertical: 12,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 28,
          backgroundColor: theme.surface,
          elevation: 2
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -82,
            right: 18,
            width: 190,
            height: 190,
            borderRadius: 95,
            backgroundColor: theme.accent + '12'
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: -100,
            left: -54,
            width: 176,
            height: 176,
            borderRadius: 88,
            backgroundColor: theme.accent + '08'
          }}
        />

        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: theme.accent + '33',
              borderRadius: 16,
              backgroundColor: theme.accent + '14'
            }}
          >
            <AppIcon name={icon} size={23} strokeWidth={2} color={theme.accent} />
          </View>

          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              color: theme.text,
              fontSize: 25,
              lineHeight: 31,
              fontWeight: '600',
              letterSpacing: -0.8
            }}
          >
            {title}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Открыть меню навигации"
          disabled={disabled}
          hitSlop={6}
          onPress={onMenuPress}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            backgroundColor: pressed ? theme.raised : theme.background + '99',
            opacity: disabled ? 0.45 : pressed ? 0.76 : 1
          })}
        >
          <AppIcon name="menu" size={21} strokeWidth={2} color={theme.muted} />
        </Pressable>
      </View>
    </View>
  )
}
