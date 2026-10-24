import { Action } from '../../../ui/browser'
import { runAfterInteraction } from './run-after-interaction'
import { useState } from 'react'
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
  onClick(): void
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
      <div
        className="ui-stack"
        style={{
          padding: 12,
          paddingBottom: 18,
          gap: 6
        }}
      >
        {items.map((item) => {
          const color = item.danger ? theme.error : theme.text
          return (
            <Action
              key={item.key ?? item.label}
              role={'button'}
              aria-label={item.label}
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return
                onOpenChange(false)
                runAfterInteraction(() => item.onClick())
              }}
              style={{
                minHeight: 52,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingInline: 13,
                paddingBlock: 10,
                borderRadius: 14,
                backgroundColor: 'transparent',
                opacity: item.disabled ? 0.4 : 1
              }}
              pressedStyle={{
                backgroundColor: item.danger ? theme.error + '0E' : theme.surface,
                opacity: item.disabled ? 0.4 : 0.76
              }}
            >
              <div
                className="ui-stack"
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
              </div>
              <span
                className="ui-text"
                style={{
                  flex: '1 1 0%',
                  color: color,
                  fontSize: 15,
                  fontWeight: 600
                }}
              >
                {item.label}
              </span>
            </Action>
          )
        })}
      </div>
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
        onClick={() => setOpen(true)}
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
