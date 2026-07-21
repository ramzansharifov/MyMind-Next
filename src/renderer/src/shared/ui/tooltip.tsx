import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { type PropsWithChildren, type ReactElement, type ReactNode } from 'react'

import { cn } from '../lib/cn'

type TooltipSide = 'top' | 'right' | 'bottom' | 'left'
type TooltipAlign = 'start' | 'center' | 'end'

interface TooltipProviderProps extends PropsWithChildren {
  delayDuration?: number
}

interface TooltipProps {
  children: ReactElement
  content: ReactNode
  side?: TooltipSide
  align?: TooltipAlign
  disabled?: boolean
  delayDuration?: number
  contentClassName?: string
}

export function TooltipProvider({
  children,
  delayDuration = 250
}: TooltipProviderProps): React.JSX.Element {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={100}>
      {children}
    </TooltipPrimitive.Provider>
  )
}

export function Tooltip({
  children,
  content,
  side = 'right',
  align = 'center',
  disabled = false,
  delayDuration,
  contentClassName
}: TooltipProps): React.JSX.Element {
  if (disabled) {
    return children
  }

  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>

      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          data-mymind-tooltip="true"
          side={side}
          align={align}
          sideOffset={9}
          collisionPadding={12}
          className={cn(
            'z-[160] max-w-72 select-none rounded-xl border',
            'border-[var(--app-tooltip-border)] bg-[var(--app-tooltip)]',
            'px-3 py-2 text-xs leading-4 font-semibold text-white',
            'shadow-[0_14px_36px_rgb(0_0_0/0.42)] backdrop-blur-xl',
            'will-change-transform',
            contentClassName
          )}
        >
          {content}

          <TooltipPrimitive.Arrow
            width={10}
            height={5}
            className="fill-[var(--app-tooltip)]"
          />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
