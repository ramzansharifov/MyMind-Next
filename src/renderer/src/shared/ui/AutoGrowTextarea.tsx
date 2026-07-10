import {
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes
} from 'react'

import { cn } from '../lib/cn'

interface AutoGrowTextareaProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    'value'
  > {
  value: string
  resizeKey?: string | number
}

export function AutoGrowTextarea({
  value,
  resizeKey,
  className,
  onInput,
  ...props
}: AutoGrowTextareaProps): React.JSX.Element {
  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null)

  useLayoutEffect(() => {
    resizeTextarea(
      textareaRef.current
    )
  }, [resizeKey, value])

  return (
    <textarea
      {...props}
      ref={textareaRef}
      rows={1}
      value={value}
      className={cn(
        'block resize-none overflow-hidden',
        className
      )}
      onInput={(event) => {
        resizeTextarea(
          event.currentTarget
        )

        onInput?.(event)
      }}
    />
  )
}

function resizeTextarea(
  textarea: HTMLTextAreaElement | null
): void {
  if (!textarea) {
    return
  }

  textarea.style.height = 'auto'
  textarea.style.height =
    `${textarea.scrollHeight}px`
}