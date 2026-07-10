import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import {
  type PropsWithChildren,
  type ReactElement
} from 'react'

import { cn } from '../lib/cn'

type TooltipSide = 'top' | 'right' | 'bottom' | 'left'
type TooltipAlign = 'start' | 'center' | 'end'

interface TooltipProviderProps extends PropsWithChildren {
  delayDuration?: number
}

interface TooltipProps {
  children: ReactElement
  content: string
  side?: TooltipSide
  align?: TooltipAlign
  disabled?: boolean
}

export function TooltipProvider({
  children,
  delayDuration = 250
}: TooltipProviderProps): React.JSX.Element {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      skipDelayDuration={100}
    >
      {children}
    </TooltipPrimitive.Provider>
  )
}

export function Tooltip({
  children,
  content,
  side = 'right',
  align = 'center',
  disabled = false
}: TooltipProps): React.JSX.Element {
  if (disabled) {
    return children
  }

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>

      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={9}
          collisionPadding={12}
          className={cn(
            'z-50 max-w-64 select-none rounded-lg border',
            'border-[var(--app-tooltip-border)] bg-[var(--app-tooltip)]',
            'px-2.5 py-1.5 text-xs font-medium text-[var(--app-text)]',
            'will-change-transform'
          )}
        >
          {content}

          <TooltipPrimitive.Arrow
            width={8}
            height={4}
            className="fill-[var(--app-tooltip)]"
          />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}