import { useLayoutEffect, useRef, type CSSProperties, type TextareaHTMLAttributes } from 'react'

import { cn } from '../lib/cn'
import './AutoGrowTextarea.css'

interface AutoGrowTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value'> {
  value: string
  resizeKey?: string | number
  backgroundMode?: 'inline' | 'container'
}

export function AutoGrowTextarea({
  value,
  resizeKey,
  backgroundMode = 'container',
  className,
  onInput,
  style,
  ...props
}: AutoGrowTextareaProps): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const inlineBackgroundColor =
    backgroundMode === 'inline' ? resolveInlineBackgroundColor(style) : null

  useLayoutEffect(() => {
    resizeTextarea(textareaRef.current)
  }, [resizeKey, value])

  const textarea = (
    <textarea
      {...props}
      ref={textareaRef}
      rows={1}
      value={value}
      className={cn(
        'block resize-none overflow-hidden',
        inlineBackgroundColor && 'relative z-10',
        className
      )}
      style={
        inlineBackgroundColor
          ? {
              ...style,
              backgroundColor: 'transparent'
            }
          : style
      }
      onInput={(event) => {
        resizeTextarea(event.currentTarget)

        onInput?.(event)
      }}
    />
  )

  if (!inlineBackgroundColor) {
    return textarea
  }

  return (
    <div className="auto-grow-textarea-inline-background relative">
      <div
        aria-hidden="true"
        className={cn('auto-grow-textarea-inline-background__mirror', className)}
        style={createMirrorStyle(style)}
      >
        <span
          className="auto-grow-textarea-inline-background__mark"
          style={{ backgroundColor: inlineBackgroundColor }}
        >
          {value}
        </span>
      </div>

      {textarea}
    </div>
  )
}

function resolveInlineBackgroundColor(style?: CSSProperties): string | null {
  const backgroundColor = style?.backgroundColor

  if (
    typeof backgroundColor !== 'string' ||
    backgroundColor === '' ||
    backgroundColor === 'transparent' ||
    backgroundColor === 'rgba(0, 0, 0, 0)'
  ) {
    return null
  }

  return backgroundColor
}

function createMirrorStyle(style?: CSSProperties): CSSProperties {
  return {
    ...style,
    color: 'transparent',
    backgroundColor: 'transparent'
  }
}

function resizeTextarea(textarea: HTMLTextAreaElement | null): void {
  if (!textarea) {
    return
  }

  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight}px`
}
