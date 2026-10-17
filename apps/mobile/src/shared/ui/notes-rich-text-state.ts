import type { NotesRichTextFormattingState } from './NotesRichTextDom'

export const DEFAULT_NOTES_RICH_TEXT_STATE: NotesRichTextFormattingState = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  code: false,
  blockquote: false,
  bulletList: false,
  orderedList: false,
  alignment: 'left',
  linkActive: false,
  href: '',
  fontSize: 'default',
  color: '',
  backgroundColor: '',
  canUndo: false,
  canRedo: false
}
