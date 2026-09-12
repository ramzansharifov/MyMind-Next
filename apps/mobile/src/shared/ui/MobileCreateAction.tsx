import { InteractionManager, Pressable, Text, View } from 'react-native'
import { useState } from 'react'

import { AppDialog } from './AppDialog'
import { AppIcon, type AppIconName } from './icons'
import { useTheme } from './theme'

export interface MobileCreateActionItem {
  key: string
  label: string
  description?: string
  icon?: AppIconName
  disabled?: boolean
  onPress(): void
}

export function MobileCreateAction({
  actions,
  disabled = false,
  label = 'Создать'
}: {
  actions: readonly MobileCreateActionItem[]
  disabled?: boolean
  label?: string
}): React.JSX.Element | null {
  const theme = useTheme()
  const [open, setOpen] = useState(false)

  if (!actions.length) return null

  const launch = (action: MobileCreateActionItem): void => {
    if (disabled || action.disabled) return
    if (actions.length === 1) {
      action.onPress()
      return
    }
    setOpen(false)
    InteractionManager.runAfterInteractions(() => action.onPress())
  }

  const triggerDisabled = disabled || (actions.length === 1 && Boolean(actions[0].disabled))

  return (
    <>
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          right: 2,
          bottom: 12,
          zIndex: 30
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actions.length === 1 ? actions[0].label : label}
          accessibilityState={{
            disabled: triggerDisabled,
            expanded: actions.length > 1 ? open : undefined
          }}
          disabled={triggerDisabled}
          onPress={() => {
            if (actions.length === 1) launch(actions[0])
            else setOpen(true)
          }}
          style={({ pressed }) => ({
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingHorizontal: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.accent + '33',
            backgroundColor: theme.accent,
            opacity: triggerDisabled ? 0.4 : pressed ? 0.8 : 1,
            elevation: 8,
            shadowColor: '#000000',
            shadowOpacity: 0.24,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 7 }
          })}
        >
          <AppIcon name="add" size={17} strokeWidth={2.2} color="#ffffff" />
          <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '600' }}>
            {actions.length === 1 ? actions[0].label : label}
          </Text>
        </Pressable>
      </View>

      {actions.length > 1 ? (
        <AppDialog
          open={open}
          onOpenChange={setOpen}
          title={label}
          description="Выберите, что хотите добавить"
          icon="add"
          presentation="sheet"
        >
          <View style={{ gap: 8, padding: 12, paddingBottom: 18 }}>
            {actions.map((action) => (
              <Pressable
                key={action.key}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                accessibilityState={{ disabled: disabled || action.disabled }}
                disabled={disabled || action.disabled}
                onPress={() => launch(action)}
                style={({ pressed }) => ({
                  minHeight: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 13,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 12,
                  backgroundColor: pressed ? theme.raised : theme.surface,
                  opacity: disabled || action.disabled ? 0.42 : pressed ? 0.78 : 1
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.accent + '2F',
                    backgroundColor: theme.accent + '12'
                  }}
                >
                  <AppIcon name={action.icon ?? 'add'} size={18} color={theme.accent} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 14.5,
                      lineHeight: 20,
                      fontWeight: '700'
                    }}
                  >
                    {action.label}
                  </Text>
                  {action.description ? (
                    <Text
                      style={{
                        marginTop: 2,
                        color: theme.muted,
                        fontSize: 12,
                        lineHeight: 17
                      }}
                    >
                      {action.description}
                    </Text>
                  ) : null}
                </View>
                <AppIcon name="forward" size={17} color={theme.muted} />
              </Pressable>
            ))}
          </View>
        </AppDialog>
      ) : null}
    </>
  )
}
