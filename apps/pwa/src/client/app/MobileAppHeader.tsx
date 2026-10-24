import { Action } from '../../ui/browser'
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
    <div
      className="ui-stack"
      style={{
        paddingInline: 16,
        paddingTop: 10,
        paddingBottom: 12
      }}
    >
      <div
        className="ui-stack"
        style={{
          minHeight: 80,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingInline: 12,
          paddingBlock: 12,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 28,
          backgroundColor: theme.surface
        }}
      >
        <div
          className="ui-stack"
          style={{
            position: 'absolute',
            top: -82,
            right: 18,
            width: 190,
            height: 190,
            borderRadius: 95,
            backgroundColor: theme.accent + '12',
            pointerEvents: 'none'
          }}
        ></div>
        <div
          className="ui-stack"
          style={{
            position: 'absolute',
            bottom: -100,
            left: -54,
            width: 176,
            height: 176,
            borderRadius: 88,
            backgroundColor: theme.accent + '08',
            pointerEvents: 'none'
          }}
        ></div>

        <div
          className="ui-stack"
          style={{
            flex: '1 1 0%',
            minWidth: 0,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div
            className="ui-stack"
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
          </div>

          <span
            className="ui-text"
            data-lines={1}
            style={{
              flex: '1 1 0%',
              color: theme.text,
              fontSize: 25,
              lineHeight: '31px',
              fontWeight: 600,
              letterSpacing: -0.8,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 1
            }}
          >
            {title}
          </span>
        </div>

        <Action
          role={'button'}
          aria-label={'Открыть меню навигации'}
          disabled={disabled}
          onClick={onMenuPress}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            backgroundColor: theme.background + '99',
            opacity: disabled ? 0.45 : 1
          }}
          pressedStyle={{
            backgroundColor: theme.raised,
            opacity: disabled ? 0.45 : 0.76
          }}
        >
          <AppIcon name="menu" size={21} strokeWidth={2} color={theme.muted} />
        </Action>
      </div>
    </div>
  )
}
