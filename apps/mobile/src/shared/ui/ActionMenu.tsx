import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { AppDialog } from './AppDialog'
import { AppIcon, type AppIconName } from './icons'
import { IconButton } from './primitives'
import { useTheme } from './theme'

export type ActionMenuItem = {
  key?: string
  label: string
  icon: AppIconName
  danger?: boolean
  disabled?: boolean
  onPress(): void
}

type IdleGlobal = typeof globalThis & {
  requestIdleCallback?: (callback: () => void) => number
}

function runWhenIdle(callback: () => void): void {
  const requestIdle = (globalThis as IdleGlobal).requestIdleCallback
  if (typeof requestIdle === 'function') {
    requestIdle(callback)
    return
  }
  setTimeout(callback, 0)
}

export function ActionMenuDialog({
  open,
  onOpenChange,
  items,
  title = 'Действия',
  description = 'Выберите действие'
}: {
  open: boolean
  onOpenChange(open: boolean): void
  items: ActionMenuItem[]
  title?: string
  description?: string
}): React.JSX.Element {
  const theme = useTheme()

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      icon="more"
      presentation="sheet"
    >
      <View style={{ padding: 12, paddingBottom: 18, gap: 6 }}>
        {items.map((item) => {
          const color = item.danger ? theme.error : theme.text
          return (
            <Pressable
              key={item.key ?? item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              disabled={item.disabled}
              onPress={() => {
                if (item.disabled) return
                onOpenChange(false)
                runWhenIdle(() => item.onPress())
              }}
              style={({ pressed }) => ({
                minHeight: 52,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingHorizontal: 13,
                paddingVertical: 10,
                borderRadius: 14,
                backgroundColor: pressed
                  ? item.danger
                    ? theme.error + '0E'
                    : theme.surface
                  : 'transparent',
                opacity: item.disabled ? 0.4 : pressed ? 0.76 : 1
              })}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 11,
                  backgroundColor: item.danger ? theme.error + '12' : theme.accent + '10'
                }}
              >
                <AppIcon
                  name={item.icon}
                  size={17}
                  color={item.danger ? theme.error : theme.accent}
                />
              </View>
              <Text style={{ flex: 1, color, fontSize: 15, fontWeight: '600' }}>{item.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </AppDialog>
  )
}

export function ActionMenu({
  items,
  title = 'Действия',
  description = 'Выберите действие',
  triggerLabel = 'Дополнительные действия',
  compact = true,
  disabled = false
}: {
  items: ActionMenuItem[]
  title?: string
  description?: string
  triggerLabel?: string
  compact?: boolean
  disabled?: boolean
}): React.JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <>
      <IconButton
        label={triggerLabel}
        icon="more"
        compact={compact}
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
      <ActionMenuDialog
        open={open}
        onOpenChange={setOpen}
        items={items}
        title={title}
        description={description}
      />
    </>
  )
}
