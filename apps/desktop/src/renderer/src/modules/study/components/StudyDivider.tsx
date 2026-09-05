import * as Separator from '@radix-ui/react-separator'
import type { CSSProperties } from 'react'

import type { StudyDividerBlock, StudyDividerVariant } from '../../../../../shared/contracts/study'
import { cn } from '../../../shared/lib/cn'
import {
  DEFAULT_DIVIDER_COLOR,
  DEFAULT_DIVIDER_THICKNESS,
  DEFAULT_DIVIDER_VARIANT,
  resolveStudyDividerColor
} from '../lib/study-document'

type StudyDividerSpacing = 'none' | 'read' | 'edit'

interface StudyDividerProps {
  block: StudyDividerBlock
  spacing?: StudyDividerSpacing
}

export function StudyDivider({ block, spacing = 'read' }: StudyDividerProps): React.JSX.Element {
  const variant = block.variant ?? DEFAULT_DIVIDER_VARIANT

  const thickness = block.thickness ?? DEFAULT_DIVIDER_THICKNESS

  const color = resolveStudyDividerColor(block.color ?? DEFAULT_DIVIDER_COLOR)

  return (
    <div className={cn(spacing === 'edit' && 'py-8', spacing === 'read' && 'py-4')}>
      <Separator.Root
        decorative
        orientation="horizontal"
        data-study-divider-id={block.id}
        data-study-divider-variant={variant}
        className="flex w-full items-center"
        style={{
          minHeight: `${thickness}px`
        }}
      >
        <span
          aria-hidden="true"
          className="block w-full"
          style={getStudyDividerStyle(variant, thickness, color)}
        />
      </Separator.Root>
    </div>
  )
}

function getStudyDividerStyle(
  variant: StudyDividerVariant,
  thickness: number,
  color: string
): CSSProperties {
  if (variant === 'tapered') {
    return {
      height: `${thickness}px`,
      backgroundColor: color,
      clipPath:
        'polygon(0 50%, 18% 40%, 38% 16%, 50% 0, 62% 16%, 82% 40%, 100% 50%, 82% 60%, 62% 84%, 50% 100%, 38% 84%, 18% 60%)'
    }
  }

  if (variant === 'dashed' || variant === 'dotted') {
    return {
      height: 0,
      boxSizing: 'border-box',
      borderTopWidth: `${thickness}px`,
      borderTopStyle: variant === 'dashed' ? 'dashed' : 'dotted',
      borderTopColor: color
    }
  }

  return {
    height: `${thickness}px`,
    backgroundColor: color,
    borderRadius: '9999px'
  }
}
