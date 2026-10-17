import type { CSSProperties } from 'react'

import {
  DEFAULT_NOTE_APPEARANCE,
  getNoteAppearanceVariant,
  type NoteAppearance,
  type NoteDocument
} from '../../../../../shared/contracts/notes'
import { getReadableNoteTextColor } from './note-color-contrast'

export const NOTE_PAGE_HEIGHT = 1120

export function getNoteAppearance(document: NoteDocument): NoteAppearance {
  const saved = document.appearance as
    (Partial<NoteAppearance> & { backgroundPattern?: NoteAppearance['paperPattern'] }) | undefined
  return {
    variant: getNoteAppearanceVariant(saved),
    paperColor:
      saved?.paperColor === undefined ? DEFAULT_NOTE_APPEARANCE.paperColor : saved.paperColor,
    paperPattern:
      saved?.paperPattern ?? saved?.backgroundPattern ?? DEFAULT_NOTE_APPEARANCE.paperPattern
  }
}

function getPaperBackground(appearance: NoteAppearance): string | null {
  return appearance.paperColor === 'theme' ? null : appearance.paperColor
}

export function getNotePaperTone(appearance: NoteAppearance): 'light' | 'dark' | 'theme' {
  const background = getPaperBackground(appearance)
  const textColor = background ? getReadableNoteTextColor(background) : undefined
  return textColor ? (textColor === '#202127' ? 'light' : 'dark') : 'theme'
}

/** Scope the content palette to the paper, so the sidebar keeps the app theme. */
export function getNotePaperStyle(appearance: NoteAppearance): CSSProperties {
  const background = getPaperBackground(appearance)
  if (!background) return {}
  const text = getReadableNoteTextColor(background)
  if (!text) return {}
  const mix = (amount: number): string => `color-mix(in srgb, ${text} ${amount}%, ${background})`
  return {
    '--app-text': text,
    '--app-muted': mix(68),
    '--app-workspace': mix(4),
    '--app-surface': mix(2),
    '--app-surface-raised': mix(6),
    '--app-border': mix(16),
    '--app-border-strong': mix(26),
    '--app-code-surface': mix(7),
    '--app-control': mix(5),
    '--app-control-hover': mix(10),
    '--app-control-active': mix(14),
    '--app-overlay-soft': mix(4),
    '--app-overlay-faint': mix(2.5),
    // Tailwind's color aliases are resolved at their definition site. Rebind
    // them on the paper too, rather than inheriting the app's resolved colors.
    '--color-accent-200': 'var(--app-accent-300)',
    '--color-accent-300': 'var(--app-accent-300)',
    '--color-accent-400': 'var(--app-accent-400)',
    '--color-accent-500': 'var(--app-accent-500)',
    '--color-accent-600': 'var(--app-accent-600)',
    ...(text === '#202127'
      ? {
          '--app-accent-300': 'var(--app-accent-700)',
          '--app-accent-400': 'var(--app-accent-600)'
        }
      : {})
  } as CSSProperties
}

export function getNoteAppearanceStyle(appearance: NoteAppearance): CSSProperties {
  const background = getPaperBackground(appearance)
  const textColor = (background && getReadableNoteTextColor(background)) || 'var(--app-text)'

  return {
    '--note-background-color': 'var(--app-workspace)',
    '--note-paper-color':
      appearance.paperColor === 'theme'
        ? 'var(--app-surface)'
        : (appearance.paperColor ?? 'transparent'),
    '--note-paper-text': textColor,
    '--note-video-accent': 'var(--app-accent-300)',
    '--note-video-range-accent': 'var(--app-accent-400)'
  } as CSSProperties
}
