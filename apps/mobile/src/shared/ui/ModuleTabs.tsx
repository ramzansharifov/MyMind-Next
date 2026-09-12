import { Pressable, ScrollView, Text, View } from 'react-native'
import type { LucideIcon } from 'lucide-react-native'

import { useTheme } from './theme'

export interface ModuleTabItem<T extends string = string> {
  id: T
  label: string
  icon?: LucideIcon
  disabled?: boolean
}

export function ModuleTabs<T extends string>({
  items,
  value,
  onChange,
  compact = false
}: {
  items: readonly ModuleTabItem<T>[]
  value: T
  onChange(value: T): void
  compact?: boolean
}): React.JSX.Element {
  const theme = useTheme()

  return (
    <View
      style={{
        minHeight: compact ? 44 : 52,
        padding: compact ? 4 : 6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: compact ? 12 : 16,
        backgroundColor: theme.background
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ alignItems: 'center', gap: 4 }}
      >
        {items.map((item) => {
          const selected = item.id === value
          const Icon = item.icon
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected, disabled: item.disabled }}
              disabled={item.disabled}
              onPress={() => onChange(item.id)}
              style={({ pressed }) => ({
                height: compact ? 34 : 40,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                paddingHorizontal: compact ? 12 : 14,
                borderRadius: compact ? 8 : 12,
                backgroundColor: selected
                  ? theme.accent
                  : pressed
                    ? theme.raised
                    : 'transparent',
                opacity: item.disabled ? 0.38 : pressed ? 0.78 : 1
              })}
            >
              {Icon ? (
                <Icon
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  size={16}
                  color={selected ? '#ffffff' : theme.muted}
                />
              ) : null}
              <Text
                numberOfLines={1}
                style={{
                  color: selected ? '#ffffff' : theme.muted,
                  fontSize: compact ? 12.5 : 13.5,
                  lineHeight: compact ? 17 : 19,
                  fontWeight: selected ? '700' : '500'
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}
