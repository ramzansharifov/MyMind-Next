import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { KeyboardEventHandler, ReactNode } from 'react'

import { cn } from '../lib/cn'

export type AppDialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'
export type AppDialogTone = 'default' | 'danger' | 'warning'

const sizeClassNames: Record<AppDialogSize, string> = {
  sm: 'w-[min(94vw,28rem)]',
  md: 'w-[min(94vw,34rem)]',
  lg: 'w-[min(94vw,38rem)]',
  xl: 'w-[min(94vw,48rem)]',
  fullscreen: 'inset-0 h-full w-full p-3'
}

const iconClassNames: Record<AppDialogTone, string> = {
  default:
    'border-[color-mix(in_srgb,var(--app-accent-500)_18%,transparent)] bg-[color-mix(in_srgb,var(--app-accent-500)_10%,transparent)] text-[var(--app-accent-300)]',
  danger: 'border-red-500/15 bg-red-500/10 text-red-300',
  warning: 'border-amber-500/15 bg-amber-500/10 text-amber-300'
}

interface AppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description: ReactNode
  children: ReactNode
  icon?: ReactNode
  footer?: ReactNode
  size?: AppDialogSize
  tone?: AppDialogTone
  busy?: boolean
  dismissible?: boolean
  showClose?: boolean
  showHeader?: boolean
  closeLabel?: string
  role?: 'dialog' | 'alertdialog'
  contentClassName?: string
  bodyClassName?: string
  headerClassName?: string
  footerClassName?: string
  overlayClassName?: string
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>
}

export function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  icon,
  footer,
  size = 'md',
  tone = 'default',
  busy = false,
  dismissible = true,
  showClose = size !== 'fullscreen',
  showHeader = size !== 'fullscreen',
  closeLabel = 'Закрыть диалог',
  role = 'dialog',
  contentClassName,
  bodyClassName,
  headerClassName,
  footerClassName,
  overlayClassName,
  onKeyDown
}: AppDialogProps): React.JSX.Element {
  const fullscreen = size === 'fullscreen'
  const blockDismiss = busy || !dismissible

  function requestOpenChange(nextOpen: boolean): void {
    if (!nextOpen && blockDismiss) return
    onOpenChange(nextOpen)
  }

  return (
    <Dialog.Root open={open} onOpenChange={requestOpenChange}>
      {open && (
        <Dialog.Portal>
          <Dialog.Overlay
            data-app-dialog-overlay
            className={cn(
              'fixed inset-0 z-[80] bg-black/65 backdrop-blur-[2px]',
              fullscreen && 'bg-black/75 backdrop-blur-[3px]',
              overlayClassName
            )}
          />
          <Dialog.Content
            data-app-dialog-content
            role={role}
            aria-busy={busy || undefined}
            className={cn(
              'fixed z-[81] min-h-0 min-w-0 overflow-hidden border border-[var(--app-border)] bg-[var(--app-surface-raised)] shadow-2xl outline-none',
              fullscreen
                ? 'rounded-none border-0 bg-[var(--app-workspace)]'
                : 'top-1/2 left-1/2 flex max-h-[calc(100vh-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl',
              sizeClassNames[size],
              tone === 'danger' && !fullscreen && 'border-red-500/20',
              contentClassName
            )}
            onEscapeKeyDown={(event) => {
              if (blockDismiss) event.preventDefault()
            }}
            onPointerDownOutside={(event) => {
              if (blockDismiss) event.preventDefault()
            }}
            onKeyDown={onKeyDown}
          >
            {showHeader ? (
              <header
                data-app-dialog-header
                className={cn(
                  'flex shrink-0 items-start gap-3 border-b border-[var(--app-border)] p-5',
                  headerClassName
                )}
              >
                {icon && (
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl border',
                      iconClassNames[tone],
                      '[&>svg]:size-5'
                    )}
                  >
                    {icon}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <Dialog.Title className="text-lg font-semibold text-[var(--app-text)]">
                    {title}
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm leading-5 text-[var(--app-muted)]">
                    {description}
                  </Dialog.Description>
                </div>
                {showClose && (
                  <Dialog.Close asChild disabled={busy}>
                    <button
                      type="button"
                      aria-label={closeLabel}
                      disabled={busy}
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] outline-none transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)]/35 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </Dialog.Close>
                )}
              </header>
            ) : (
              <>
                <Dialog.Title className="sr-only">{title}</Dialog.Title>
                <Dialog.Description className="sr-only">{description}</Dialog.Description>
              </>
            )}

            <div
              data-app-dialog-body
              className={cn(
                fullscreen ? 'h-full min-h-0 overflow-hidden' : 'min-h-0 flex-1 overflow-y-auto p-5',
                bodyClassName
              )}
            >
              {children}
            </div>

            {footer && !fullscreen && (
              <footer
                data-app-dialog-footer
                className={cn(
                  'flex shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--app-border)] p-4',
                  footerClassName
                )}
              >
                {footer}
              </footer>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  )
}
