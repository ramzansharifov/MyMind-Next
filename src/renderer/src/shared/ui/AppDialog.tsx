import { Tooltip } from './tooltip'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { KeyboardEventHandler, ReactNode } from 'react'

import { cn } from '../lib/cn'

export type AppDialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'
export type AppDialogTone = 'default' | 'danger' | 'warning'
export type AppDialogLayer = 'base' | 'nested'

const sizeClassNames: Record<AppDialogSize, string> = {
  sm: 'w-[min(94vw,28rem)]',
  md: 'w-[min(94vw,34rem)]',
  lg: 'w-[min(94vw,38rem)]',
  xl: 'w-[min(94vw,48rem)]',
  fullscreen: 'app-fullscreen-bounds w-full p-3'
}

const iconClassNames: Record<AppDialogTone, string> = {
  default: 'border-accent-500/15 bg-accent-500/10 text-accent-300',
  danger: 'border-red-500/15 bg-red-500/10 text-red-300',
  warning: 'border-amber-500/15 bg-amber-500/10 text-amber-300'
}

const layerClassNames: Record<AppDialogLayer, { overlay: string; content: string }> = {
  base: { overlay: 'z-[80]', content: 'z-[81]' },
  nested: { overlay: 'z-[90]', content: 'z-[91]' }
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
  layer?: AppDialogLayer
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
  layer = 'base',
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
  const layerClasses = layerClassNames[layer]

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
              'fixed bg-black/65 backdrop-blur-[2px]',
              fullscreen ? 'app-fullscreen-bounds' : 'inset-0',
              layerClasses.overlay,
              fullscreen && 'bg-black/75 backdrop-blur-[3px]',
              overlayClassName
            )}
          />
          <Dialog.Content
            data-app-dialog-content
            role={role}
            aria-busy={busy || undefined}
            className={cn(
              'fixed min-h-0 min-w-0 overflow-hidden border border-[var(--app-border)] bg-[var(--app-surface-raised)] shadow-2xl outline-none',
              layerClasses.content,
              fullscreen
                ? 'rounded-none border-0 bg-[var(--app-workspace)]'
                : 'top-1/2 left-1/2 flex max-h-[85vh] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl',
              sizeClassNames[size],
              tone === 'danger' && !fullscreen && 'border-red-500/20',
              tone === 'warning' && !fullscreen && 'border-amber-500/20',
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
                  'flex shrink-0 items-center gap-3 border-b border-[var(--app-border)] px-5 py-4',
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
                  <Dialog.Description className="sr-only">{description}</Dialog.Description>
                </div>
                {showClose && (
                  <Tooltip content={closeLabel} side="top">
                    <Dialog.Close asChild disabled={busy}>
                      <button
                        type="button"
                        aria-label={closeLabel}
                        disabled={busy}
                        className="focus-visible:ring-accent-500/35 flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors outline-none hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <X aria-hidden="true" className="size-4" />
                      </button>
                    </Dialog.Close>
                  </Tooltip>
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
                fullscreen
                  ? 'h-full min-h-0 overflow-hidden'
                  : 'min-h-0 flex-1 overflow-y-auto p-5',
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
