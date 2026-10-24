import { Action } from '../../../ui/browser'
import type { LucideIcon } from 'lucide-react'
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
    <div
      className="ui-stack"
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
      <div className="ui-scroll" data-horizontal={true}>
        <div
          className="ui-stack ui-scroll-content"
          style={{
            alignItems: 'center',
            gap: 4,
            flexDirection: 'row'
          }}
        >
          {items.map((item) => {
            const selected = item.id === value
            const Icon = item.icon
            return (
              <Action
                key={item.id}
                role={'tab'}
                aria-label={item.label}
                aria-selected={selected}
                aria-disabled={item.disabled}
                disabled={item.disabled}
                onClick={() => onChange(item.id)}
                style={{
                  height: compact ? 34 : 40,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  paddingInline: compact ? 12 : 14,
                  borderRadius: compact ? 8 : 12,
                  backgroundColor: selected ? theme.accent : 'transparent',
                  opacity: item.disabled ? 0.38 : 1
                }}
                pressedStyle={{
                  backgroundColor: selected ? theme.accent : theme.raised,
                  opacity: item.disabled ? 0.38 : 0.78
                }}
              >
                {Icon ? <Icon size={16} color={selected ? '#ffffff' : theme.muted} /> : null}
                <span
                  className="ui-text"
                  data-lines={1}
                  style={{
                    color: selected ? '#ffffff' : theme.muted,
                    fontSize: compact ? 12.5 : 13.5,
                    lineHeight: compact ? '17px' : '19px',
                    fontWeight: selected ? '700' : '500',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 1
                  }}
                >
                  {item.label}
                </span>
              </Action>
            )
          })}
        </div>
      </div>
    </div>
  )
}
