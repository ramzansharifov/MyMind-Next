import {
  cva,
  type VariantProps
} from 'class-variance-authority'
import {
  forwardRef,
  type ButtonHTMLAttributes
} from 'react'

import { cn } from '../../../shared/lib/cn'

const studyActionButtonVariants =
  cva(
    [
      'inline-flex h-10 w-full min-w-0 items-center justify-center gap-2',
      'rounded-xl border px-4',
      'text-sm font-medium whitespace-nowrap',
      'outline-none',
      'transition-[background-color,border-color,color,box-shadow]',
      'focus-visible:ring-2 focus-visible:ring-violet-500/35',
      'disabled:cursor-not-allowed disabled:opacity-40',
      '[&>svg]:size-4 [&>svg]:shrink-0'
    ],
    {
      variants: {
        variant: {
          secondary: [
            'border-[var(--app-border-strong)]',
            'bg-black/[0.08]',
            'text-[var(--app-text)]',
            'hover:border-violet-500/35',
            'hover:bg-white/[0.045]'
          ],
          primary: [
            'border-violet-400/20',
            'bg-violet-500',
            'text-white',
            'shadow-lg shadow-violet-950/20',
            'hover:border-violet-300/30',
            'hover:bg-violet-400'
          ]
        }
      },
      defaultVariants: {
        variant: 'secondary'
      }
    }
  )

interface StudyActionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<
      typeof studyActionButtonVariants
    > {}

export const StudyActionButton =
  forwardRef<
    HTMLButtonElement,
    StudyActionButtonProps
  >(function StudyActionButton(
    {
      variant,
      className,
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={cn(
          studyActionButtonVariants({
            variant
          }),
          className
        )}
        {...props}
      />
    )
  })