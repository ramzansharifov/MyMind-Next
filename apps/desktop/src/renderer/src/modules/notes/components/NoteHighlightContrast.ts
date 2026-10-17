import { Extension } from '@tiptap/core'
import type { Node } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

import { getReadableNoteTextColor } from '../lib/note-color-contrast'

function highlightDecorations(document: Node): DecorationSet {
  const decorations: Decoration[] = []
  document.descendants((node, position) => {
    if (
      !node.isText ||
      node.marks.some((mark) => mark.type.name === 'textStyle' && mark.attrs.color)
    )
      return
    const highlight = node.marks.find((mark) => mark.type.name === 'highlight')
    if (!highlight) return
    const foreground = getReadableNoteTextColor(highlight.attrs.color ?? '#ffff00')
    if (!foreground) return
    decorations.push(
      Decoration.inline(position, position + node.nodeSize, {
        class: 'note-highlight-contrast',
        style: `--note-highlight-foreground: ${foreground}`
      })
    )
  })
  return DecorationSet.create(document, decorations)
}

/** Visual contrast only: automatic foreground colors never become saved text formatting. */
export const NoteHighlightContrast = Extension.create({
  name: 'noteHighlightContrast',
  addProseMirrorPlugins() {
    const key = new PluginKey<DecorationSet>('noteHighlightContrast')
    return [
      new Plugin<DecorationSet>({
        key,
        state: {
          init: (_, state) => highlightDecorations(state.doc),
          apply: (transaction, previous) =>
            transaction.docChanged ? highlightDecorations(transaction.doc) : previous
        },
        props: { decorations: (state) => key.getState(state) }
      })
    ]
  }
})
