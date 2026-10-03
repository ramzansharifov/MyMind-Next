import { Node } from '@tiptap/core'

import type { StudyDividerVariant } from '../../../../../shared/contracts/study'
import { getStudyDividerStyle } from '../../study/lib/study-divider-style'

export const DEFAULT_NOTE_DIVIDER_THICKNESS = 3

export function normalizeDividerVariant(value: unknown): StudyDividerVariant {
  return value === 'tapered' || value === 'dashed' || value === 'dotted' ? value : 'solid'
}

export function normalizeDividerThickness(value: unknown): number {
  if (value == null || value === '') return DEFAULT_NOTE_DIVIDER_THICKNESS
  const thickness = Number(value)
  return Number.isFinite(thickness)
    ? Math.max(1, Math.min(12, Math.round(thickness)))
    : DEFAULT_NOTE_DIVIDER_THICKNESS
}

export const NoteDivider = Node.create({
  name: 'noteDivider',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      variant: {
        default: 'solid',
        parseHTML: (element) =>
          normalizeDividerVariant(element.getAttribute('data-divider-variant')),
        rendered: false
      },
      thickness: {
        default: DEFAULT_NOTE_DIVIDER_THICKNESS,
        parseHTML: (element) =>
          normalizeDividerThickness(element.getAttribute('data-divider-thickness')),
        rendered: false
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-note-divider]' }, { tag: 'hr' }]
  },

  renderHTML({ node }) {
    const variant = normalizeDividerVariant(node.attrs.variant)
    const thickness = normalizeDividerThickness(node.attrs.thickness)
    const style = Object.entries(getStudyDividerStyle(variant, thickness, 'var(--app-accent-500)'))
      .map(
        ([property, value]) =>
          `${property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:${typeof value === 'number' && value !== 0 ? `${value}px` : value}`
      )
      .join(';')

    return [
      'div',
      {
        'data-note-divider': '',
        'data-divider-variant': variant,
        'data-divider-thickness': thickness,
        class: 'note-divider',
        role: 'separator',
        'aria-orientation': 'horizontal',
        contenteditable: 'false'
      },
      ['span', { 'aria-hidden': 'true', style }]
    ]
  }
})
