import * as Separator from '@radix-ui/react-separator'

import type { StudyDividerBlock } from '../../../../../shared/contracts/study'
import { cn } from '../../../shared/lib/cn'
import { getStudyDividerStyle } from '../lib/study-divider-style'
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
