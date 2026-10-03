import type { CSSProperties } from 'react'

import type { StudyDividerVariant } from '../../../../../shared/contracts/study'

export function getStudyDividerStyle(
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
      borderTopStyle: variant,
      borderTopColor: color
    }
  }

  return {
    height: `${thickness}px`,
    backgroundColor: color,
    borderRadius: '9999px'
  }
}
