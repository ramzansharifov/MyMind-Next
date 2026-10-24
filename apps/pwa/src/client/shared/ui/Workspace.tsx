import { Action } from '../../../ui/browser'
import type { PropsWithChildren, ReactNode } from 'react'
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
    <div
      className="ui-stack"
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface,
        overflow: 'hidden'
      }}
    >
      {title || description || icon || action ? (
        <div
          className="ui-stack"
          style={{
            minHeight: 64,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingInline: 20,
            paddingBlock: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.border
          }}
        >
          {icon ? (
            <div
              className="ui-stack"
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
            </div>
          ) : null}
          <div
            className="ui-stack"
            style={{
              flex: '1 1 0%',
              minWidth: 0
            }}
          >
            {title ? (
              <span
                className="ui-text"
                style={{
                  color: theme.text,
                  fontSize: 15,
                  lineHeight: '20px',
                  fontWeight: 700
                }}
              >
                {title}
              </span>
            ) : null}
            {description ? (
              <span
                className="ui-text"
                style={{
                  marginTop: 2,
                  color: theme.muted,
                  fontSize: 12,
                  lineHeight: '17px'
                }}
              >
                {description}
              </span>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      <div
        className="ui-stack"
        style={{
          padding: 16
        }}
      >
        {children}
      </div>
    </div>
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
    <div
      className="ui-stack"
      aria-label={detail ? `${label}: ${value}. ${detail}` : `${label}: ${value}`}
      style={{
        minWidth: 145,
        flex: '1 1 0%',
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
        <div
          className="ui-stack"
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
        </div>
      ) : null}
      <div
        className="ui-stack"
        style={{
          flex: '1 1 0%',
          minWidth: 0
        }}
      >
        <div
          className="ui-stack"
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 8
          }}
        >
          <span
            className="ui-text"
            style={{
              color: theme.text,
              fontSize: 20,
              lineHeight: '25px',
              fontWeight: 600
            }}
          >
            {value}
          </span>
          <span
            className="ui-text"
            data-lines={1}
            style={{
              flex: '1 1 0%',
              color: theme.text,
              fontSize: 12,
              lineHeight: '17px',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 1
            }}
          >
            {label}
          </span>
        </div>
        {detail ? (
          <span
            className="ui-text"
            data-lines={1}
            style={{
              marginTop: 2,
              color: theme.muted,
              fontSize: 11,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 1
            }}
          >
            {detail}
          </span>
        ) : null}
      </div>
    </div>
  )
}
export function WorkspaceNodeCard({
  title,
  subtitle,
  leadingIcon,
  leading,
  onClick,
  onHold,
  action,
  selected = false,
  subtitleColor
}: {
  title: string
  subtitle?: string
  leadingIcon?: AppIconName
  leading?: ReactNode
  onClick?(): void
  onHold?(): void
  action?: ReactNode
  selected?: boolean
  subtitleColor?: string
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
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
      <Action
        role={onClick ? 'button' : undefined}
        aria-label={title}
        title={onHold ? 'Удерживайте для дополнительных действий' : undefined}
        onClick={onClick}
        onHold={onHold}
        style={{
          flex: '1 1 0%',
          minWidth: 0,
          minHeight: 62,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingLeft: 14,
          paddingRight: action ? 6 : 14,
          paddingBlock: 12,
          backgroundColor: 'transparent'
        }}
        pressedStyle={{
          backgroundColor: onClick ? theme.raised : 'transparent'
        }}
      >
        {leading ? (
          leading
        ) : leadingIcon ? (
          <div
            className="ui-stack"
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
          </div>
        ) : null}
        <div
          className="ui-stack"
          style={{
            flex: '1 1 0%',
            minWidth: 0
          }}
        >
          <span
            className="ui-text"
            data-lines={2}
            style={{
              color: theme.text,
              fontSize: 14.5,
              lineHeight: '20px',
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2
            }}
          >
            {title}
          </span>
          {subtitle ? (
            <span
              className="ui-text"
              data-lines={3}
              style={{
                marginTop: 3,
                color: subtitleColor ?? theme.muted,
                fontSize: 12,
                lineHeight: '17px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 3
              }}
            >
              {subtitle}
            </span>
          ) : null}
        </div>
        {!action && onClick ? <AppIcon name="forward" size={18} color={theme.muted} /> : null}
      </Action>
      {action ? (
        <div
          className="ui-stack"
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingRight: 8
          }}
        >
          {action}
        </div>
      ) : null}
    </div>
  )
}
