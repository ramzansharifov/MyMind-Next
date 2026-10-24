import { Action, TextControl, Spinner } from '../../../ui/browser'
import type { PropsWithChildren } from 'react'
import { designTokens } from '@mymind/design'
import { AppIcon, type AppIconName } from './icons'
import { useTheme } from './theme'
export function Label({
  children,
  muted = false,
  title = false
}: PropsWithChildren<{
  muted?: boolean
  title?: boolean
}>): React.JSX.Element {
  const theme = useTheme()
  return (
    <span
      className="ui-text"
      style={{
        color: muted ? theme.muted : theme.text,
        fontSize: title ? designTokens.typography.title : designTokens.typography.body,
        fontWeight: title ? '700' : '400',
        lineHeight: title ? '30px' : '23px',
        letterSpacing: title ? -0.45 : 0
      }}
    >
      {children}
    </span>
  )
}
export function Button({
  label,
  accessibilityLabel,
  onClick,
  disabled = false,
  danger = false,
  selected = false,
  primary = false,
  ghost = false,
  icon,
  iconOnly = false,
  compact = false
}: {
  label: string
  accessibilityLabel?: string
  onClick(): void
  disabled?: boolean
  danger?: boolean
  selected?: boolean
  primary?: boolean
  ghost?: boolean
  icon?: AppIconName
  iconOnly?: boolean
  compact?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  const foreground = primary
    ? '#ffffff'
    : danger
      ? theme.error
      : selected
        ? theme.accent
        : theme.text
  return (
    <Action
      role={'button'}
      aria-label={accessibilityLabel ?? label}
      aria-disabled={disabled}
      aria-selected={selected}
      disabled={disabled}
      onClick={onClick}
      style={{
        minWidth: iconOnly ? 40 : undefined,
        minHeight: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: iconOnly ? 0 : 8,
        paddingInline: iconOnly ? 0 : compact ? 12 : 16,
        paddingBlock: iconOnly ? 0 : 8,
        borderRadius: 12,
        borderWidth: ghost || primary ? 0 : 1,
        borderColor: danger ? theme.error + '35' : selected ? theme.accent + '66' : theme.border,
        backgroundColor: primary
          ? theme.accent
          : ghost
            ? 'transparent'
            : danger
              ? theme.surface
              : selected
                ? theme.accent + '14'
                : theme.surface,
        opacity: disabled ? 0.42 : 1
      }}
      pressedStyle={{
        backgroundColor: primary
          ? theme.accent + 'E8'
          : ghost
            ? theme.raised
            : danger
              ? theme.error + '14'
              : selected
                ? theme.accent + '14'
                : theme.raised,
        opacity: disabled ? 0.42 : 0.72
      }}
    >
      {icon ? <AppIcon name={icon} size={compact ? 16 : 18} color={foreground} /> : null}
      {!iconOnly ? (
        <span
          className="ui-text"
          data-lines={1}
          style={{
            color: foreground,
            fontSize: 14,
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
      ) : null}
    </Action>
  )
}
export function IconButton({
  label,
  icon,
  onClick,
  disabled = false,
  danger = false,
  selected = false,
  primary = false,
  ghost = false,
  compact = false
}: {
  label: string
  icon: AppIconName
  onClick(): void
  disabled?: boolean
  danger?: boolean
  selected?: boolean
  primary?: boolean
  ghost?: boolean
  compact?: boolean
}): React.JSX.Element {
  return (
    <Button
      label={label}
      icon={icon}
      iconOnly
      compact={compact}
      disabled={disabled}
      danger={danger}
      selected={selected}
      primary={primary}
      ghost={ghost}
      onClick={onClick}
    />
  )
}
export function Row({
  title,
  subtitle,
  onClick,
  onHold,
  leadingIcon,
  children
}: PropsWithChildren<{
  title: string
  subtitle?: string
  onClick?(): void
  onHold?(): void
  leadingIcon?: AppIconName
}>): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        backgroundColor: theme.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: 8,
        overflow: 'hidden'
      }}
    >
      <Action
        onClick={onClick}
        onHold={onHold}
        role={onClick ? 'button' : undefined}
        aria-label={title}
        title={onHold ? 'Удерживайте для дополнительных действий' : undefined}
        style={{
          minHeight: 64,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingInline: 14,
          paddingBlock: 12,
          backgroundColor: theme.surface
        }}
        pressedStyle={{
          backgroundColor: onClick ? theme.raised : theme.surface
        }}
      >
        {leadingIcon ? (
          <div
            className="ui-stack"
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.accent + '28',
              backgroundColor: theme.accent + '12'
            }}
          >
            <AppIcon name={leadingIcon} size={18} color={theme.accent} />
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
              fontSize: 15,
              lineHeight: '21px',
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
                color: theme.muted,
                fontSize: 12.5,
                marginTop: 4,
                lineHeight: '18px',
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

        {onClick ? <AppIcon name="forward" size={20} color={theme.muted} /> : null}
      </Action>

      {children ? (
        <div
          className="ui-stack"
          style={{
            minHeight: 52,
            paddingInline: 10,
            paddingBlock: 8,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            gap: 7
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}
export function SearchField({
  value,
  onValueChange
}: {
  value: string
  onValueChange(value: string): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        paddingInline: 16,
        borderRadius: 16,
        marginBottom: 12
      }}
    >
      <AppIcon name="search" size={17} color={theme.muted} />
      <TextControl
        aria-label={'Поиск'}
        placeholder={'Поиск…'}
        placeholderColor={theme.muted}
        value={value}
        onValueChange={onValueChange}
        style={{
          flex: '1 1 0%',
          minHeight: 46,
          color: theme.text,
          paddingBlock: 8,
          fontSize: 15
        }}
      ></TextControl>
    </div>
  )
}
export function EmptyState({
  text = 'Здесь пока пусто. Добавьте первую запись.'
}: {
  text?: string
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        minHeight: 128,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingBlock: 32,
        paddingInline: 20,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface
      }}
    >
      <div
        className="ui-stack"
        style={{
          width: 48,
          height: 48,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.accent + '24',
          backgroundColor: theme.accent + '10'
        }}
      >
        <AppIcon name="add" size={23} color={theme.accent} />
      </div>
      <span
        className="ui-text"
        style={{
          color: theme.muted,
          maxWidth: 280,
          textAlign: 'center',
          lineHeight: '20px'
        }}
      >
        {text}
      </span>
    </div>
  )
}
export function ErrorState({
  message,
  retry
}: {
  message: string
  retry?(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      role={'alert'}
      style={{
        marginBottom: 12,
        padding: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: theme.error + '32',
        backgroundColor: theme.error + '0F',
        borderRadius: 16
      }}
    >
      <div
        className="ui-stack"
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10
        }}
      >
        <div
          className="ui-stack"
          style={{
            width: 28,
            height: 28,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 9,
            backgroundColor: theme.error + '14'
          }}
        >
          <AppIcon name="info" size={15} color={theme.error} />
        </div>
        <span
          className="ui-text"
          style={{
            flex: '1 1 0%',
            color: theme.error,
            fontSize: 14,
            lineHeight: '20px'
          }}
        >
          {message}
        </span>
      </div>
      {retry ? <Button label="Повторить" icon="reset" compact onClick={retry} /> : null}
    </div>
  )
}
export function LoadingState(): React.JSX.Element {
  const theme = useTheme()
  {
    return (
      <div
        className="ui-stack"
        style={{
          flex: '1 1 0%',
          minHeight: 190,
          padding: 22,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12
        }}
      >
        <div
          className="ui-stack"
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.accent + '30',
            backgroundColor: theme.accent + '10'
          }}
        >
          <Spinner aria-label={'Загрузка'} color={theme.accent}></Spinner>
        </div>
        <span
          className="ui-text"
          style={{
            color: theme.muted,
            fontSize: 13,
            textAlign: 'center'
          }}
        >
          Загружаем содержимое…
        </span>
        <div
          className="ui-stack"
          style={{
            width: '100%',
            maxWidth: 320,
            gap: 9,
            marginTop: 14
          }}
        >
          <div
            className="ui-stack"
            style={{
              width: 118,
              height: 12,
              borderRadius: 8,
              backgroundColor: theme.border
            }}
          ></div>
          <div
            className="ui-stack"
            style={{
              height: 54,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface
            }}
          ></div>
          <div
            className="ui-stack"
            style={{
              height: 54,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              opacity: 0.55
            }}
          ></div>
        </div>
      </div>
    )
  }
  return (
    <div
      className="ui-stack"
      style={{
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10
      }}
    >
      <Spinner aria-label={'Загрузка'} color={theme.accent}></Spinner>
      <span
        className="ui-text"
        style={{
          color: theme.muted,
          fontSize: 12
        }}
      >
        Загрузка…
      </span>
    </div>
  )
}
