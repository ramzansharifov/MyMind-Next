import { useSafeArea, useViewport, DialogLayer, Action, Spinner } from '../../../ui/browser'
import type { ReactNode } from 'react'
import { AppIcon, type AppIconName } from './icons'
import { useTheme } from './theme'
export type AppDialogTone = 'default' | 'danger' | 'warning'
export type AppDialogPresentation = 'card' | 'sheet' | 'fullscreen'
function toneColor(tone: AppDialogTone, accent: string, error: string): string {
  if (tone === 'danger') return error
  if (tone === 'warning') return '#f59e0b'
  return accent
}
export function AppDialog({
  open,
  onOpenChange,
  onAfterClose,
  title,
  description,
  children,
  icon,
  footer,
  tone = 'default',
  presentation = 'card',
  busy = false,
  dismissible = true,
  showClose = presentation !== 'fullscreen'
}: {
  open: boolean
  onOpenChange(open: boolean): void
  onAfterClose?(): void
  title: string
  description?: string
  children: ReactNode
  icon?: AppIconName
  footer?: ReactNode
  tone?: AppDialogTone
  presentation?: AppDialogPresentation
  busy?: boolean
  dismissible?: boolean
  showClose?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  const insets = useSafeArea()
  const { width, height } = useViewport()
  const fullscreen = presentation === 'fullscreen'
  const sheet = presentation === 'sheet'
  const blockDismiss = busy || !dismissible
  const accent = toneColor(tone, theme.accent, theme.error)
  const requestClose = (): void => {
    if (blockDismiss) return
    onOpenChange(false)
  }
  return (
    <DialogLayer
      label={title}
      open={open}
      transition={fullscreen ? 'slide' : 'fade'}
      onClose={requestClose}
      onAfterClose={() => {
        // Run after the modal's focus-trap cleanup has restored its trigger.
        if (onAfterClose) queueMicrotask(onAfterClose)
      }}
    >
      <div
        className="ui-stack"
        style={{
          flex: '1 1 0%',
          justifyContent: fullscreen ? 'flex-start' : sheet ? 'flex-end' : 'center'
        }}
      >
        {!fullscreen ? (
          <Action
            role={'button'}
            aria-label={'Закрыть диалог'}
            onClick={requestClose}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.64)'
            }}
          ></Action>
        ) : null}

        <div
          className="ui-stack"
          aria-label={title}
          style={{
            width: fullscreen ? '100%' : sheet ? '100%' : Math.max(280, Math.min(width - 32, 540)),
            height: fullscreen ? '100%' : sheet ? Math.min(height * 0.92, 820) : undefined,
            maxHeight: fullscreen ? undefined : Math.max(320, height * (sheet ? 0.92 : 0.85)),
            alignSelf: 'center',
            overflow: 'hidden',
            borderWidth: fullscreen ? 0 : 1,
            borderColor: tone === 'default' ? theme.border : accent + '38',
            borderTopLeftRadius: fullscreen ? 0 : 16,
            borderTopRightRadius: fullscreen ? 0 : 16,
            borderBottomLeftRadius: fullscreen || sheet ? 0 : 16,
            borderBottomRightRadius: fullscreen || sheet ? 0 : 16,
            backgroundColor: fullscreen ? theme.background : theme.raised
          }}
        >
          <div
            className="ui-stack"
            style={{
              minHeight: 68,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingInline: 16,
              paddingTop: fullscreen ? 14 + insets.top : 14,
              paddingBottom: 14,
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
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: accent + '2E',
                  backgroundColor: accent + '14'
                }}
              >
                <AppIcon name={icon} size={20} color={accent} />
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
                  fontSize: 18,
                  lineHeight: '24px',
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2
                }}
              >
                {title}
              </span>
              {description ? (
                <span
                  className="ui-text"
                  style={{
                    marginTop: 2,
                    color: theme.muted,
                    fontSize: 12.5,
                    lineHeight: '18px'
                  }}
                >
                  {description}
                </span>
              ) : null}
            </div>

            {busy ? <Spinner color={accent}></Spinner> : null}
            {showClose ? (
              <Action
                role={'button'}
                aria-label={'Закрыть'}
                disabled={busy}
                onClick={requestClose}
                style={{
                  width: 36,
                  height: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 11,
                  backgroundColor: 'transparent',
                  opacity: busy ? 0.4 : 1
                }}
                pressedStyle={{
                  backgroundColor: theme.surface,
                  opacity: busy ? 0.4 : 0.72
                }}
              >
                <AppIcon name="close" size={18} color={theme.muted} />
              </Action>
            ) : null}
          </div>

          <div
            className="ui-stack"
            style={{
              minHeight: 0,
              flex: fullscreen || sheet ? 1 : undefined,
              paddingBottom: !footer && (fullscreen || sheet) ? insets.bottom : 0
            }}
          >
            {children}
          </div>

          {footer && !fullscreen ? (
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
                gap: 8,
                paddingInline: 14,
                paddingTop: 14,
                paddingBottom: 14 + (fullscreen || sheet ? insets.bottom : 0),
                borderTopWidth: 1,
                borderTopColor: theme.border
              }}
            >
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </DialogLayer>
  )
}
