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
    if (disabled) return
    if (actions.length === 1) {
      action.onPress()
      return
    }
    setOpen(false)
    InteractionManager.runAfterInteractions(() => action.onPress())
  }

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
          accessibilityState={{ disabled, expanded: actions.length > 1 ? open : undefined }}
          disabled={disabled}
          onPress={() => {
            if (actions.length === 1) launch(actions[0])
            else setOpen(true)
          }}
          style={({ pressed }) => ({
            width: 58,
            height: 58,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: theme.accent + '80',
            backgroundColor: theme.accent,
            opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
            elevation: 8,
            shadowColor: '#000000',
            shadowOpacity: 0.24,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 7 }
          })}
        >
          <AppIcon name="add" size={25} strokeWidth={2.4} color="#ffffff" />
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
                onPress={() => launch(action)}
                style={({ pressed }) => ({
                  minHeight: 64,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 13,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 16,
                  backgroundColor: pressed ? theme.raised : theme.surface,
                  opacity: pressed ? 0.78 : 1
                })}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
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
