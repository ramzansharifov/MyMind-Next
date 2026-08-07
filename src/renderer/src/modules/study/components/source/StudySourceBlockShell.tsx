import { Check, Copy, Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '../../../../shared/lib/cn'
import { writeClipboard } from '../../../../shared/lib/write-clipboard'
import { AppDialog } from '../../../../shared/ui/AppDialog'
import { Tooltip, TooltipProvider } from '../../../../shared/ui/tooltip'

type CopyState = 'idle' | 'copied' | 'error'

interface StudySourceBlockRenderContext {
  fullscreen: boolean
  actions: ReactNode
}

interface StudySourceBlockShellProps {
  source: string
  copyDisabled?: boolean
  copyLabel: string
  copiedLabel?: string
  copyErrorLabel?: string
  copiedAnnouncement: string
  copyErrorAnnouncement: string
  expandLabel: string
  collapseLabel: string
  dialogTitle: string
  dialogDescription: string
  children: (context: StudySourceBlockRenderContext) => ReactNode
}

const actionButtonClassName = [
  'flex size-7 shrink-0 items-center justify-center rounded-md',
  'text-[var(--app-muted)] outline-none',
  'transition-colors',
  'hover:bg-white/[0.06] hover:text-[var(--app-text)]',
  'focus-visible:ring-2 focus-visible:ring-violet-500/35'
].join(' ')

export function StudySourceBlockShell({
  source,
  copyDisabled = !source,
  copyLabel,
  copiedLabel = 'Скопировано',
  copyErrorLabel = 'Не удалось скопировать',
  copiedAnnouncement,
  copyErrorAnnouncement,
  expandLabel,
  collapseLabel,
  dialogTitle,
  dialogDescription,
  children
}: StudySourceBlockShellProps): React.JSX.Element {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const resetTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
      }
    }
  }, [])

  async function handleCopy(): Promise<void> {
    try {
      await writeClipboard(source)
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current)
    }

    resetTimerRef.current = window.setTimeout(() => {
      setCopyState('idle')
    }, 1600)
  }

  const currentCopyLabel =
    copyState === 'copied' ? copiedLabel : copyState === 'error' ? copyErrorLabel : copyLabel

  const announcement =
    copyState === 'copied' ? copiedAnnouncement : copyState === 'error' ? copyErrorAnnouncement : ''

  function renderActions(fullscreen: boolean): React.JSX.Element {
    const fullscreenLabel = fullscreen ? collapseLabel : expandLabel

    return (
      <>
        <Tooltip content={currentCopyLabel} side="top">
          <button
            type="button"
            aria-label={currentCopyLabel}
            disabled={copyDisabled}
            className={cn(
              actionButtonClassName,
              'disabled:cursor-not-allowed disabled:opacity-30',
              copyState === 'copied' && 'text-emerald-300',
              copyState === 'error' && 'text-red-300'
            )}
            onClick={() => {
              void handleCopy()
            }}
          >
            {copyState === 'copied' ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
          </button>
        </Tooltip>

        <Tooltip content={fullscreenLabel} side="top">
          <button
            type="button"
            aria-label={fullscreenLabel}
            aria-keyshortcuts={fullscreen ? 'Escape' : undefined}
            className={actionButtonClassName}
            onClick={() => {
              setFullscreenOpen(!fullscreen)
            }}
          >
            {fullscreen ? (
              <Minimize2 aria-hidden="true" className="size-4" />
            ) : (
              <Maximize2 aria-hidden="true" className="size-4" />
            )}
          </button>
        </Tooltip>
      </>
    )
  }

  return (
    <TooltipProvider delayDuration={250}>
      {children({
        fullscreen: false,
        actions: renderActions(false)
      })}

      <AppDialog
        open={fullscreenOpen}
        onOpenChange={setFullscreenOpen}
        title={dialogTitle}
        description={dialogDescription}
        size="fullscreen"
        showHeader={false}
        showClose={false}
        bodyClassName="h-full min-h-0 overflow-hidden"
      >
        {children({
          fullscreen: true,
          actions: renderActions(true)
        })}
      </AppDialog>

      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </TooltipProvider>
  )
}
