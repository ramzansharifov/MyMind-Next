import type { Command } from '@tiptap/core'
import type { Node } from '@tiptap/pm/model'

export type TextCase = 'lower' | 'upper' | 'title'

/** Change selected text in one undo step, preserving its marks and block structure. */
export function changeSelectedTextCase(mode: TextCase): Command {
  return ({ tr, dispatch, commands }) => {
    const { from, to } = tr.selection
    if (from === to) return false

    const replacements: { from: number; to: number; node: Node; text: string }[] = []
    let previousParent: Node | null = null
    let wordStart = true

    tr.doc.nodesBetween(from, to, (node, position, parent) => {
      if (node.isInline && !node.isText) {
        wordStart = true
        return
      }
      if (!node.isText || !node.text) return

      const start = Math.max(from, position)
      const end = Math.min(to, position + node.nodeSize)
      const text = node.text.slice(start - position, end - position)
      if (!text) return
      if (parent !== previousParent) wordStart = true
      previousParent = parent

      let nextText: string
      if (mode === 'upper') {
        nextText = text.toLocaleUpperCase()
      } else if (mode === 'lower') {
        nextText = text.toLocaleLowerCase()
      } else {
        nextText = ''
        for (const character of text.toLocaleLowerCase()) {
          const isWordCharacter = /[\p{L}\p{M}\p{N}]/u.test(character)
          nextText += wordStart && isWordCharacter ? character.toLocaleUpperCase() : character
          wordStart = !isWordCharacter
        }
      }

      if (nextText !== text) replacements.push({ from: start, to: end, node, text: nextText })
    })

    if (!dispatch || replacements.length === 0) return true

    let lengthChange = 0
    for (const replacement of replacements.reverse()) {
      lengthChange += replacement.text.length - (replacement.to - replacement.from)
      tr.replaceWith(
        replacement.from,
        replacement.to,
        tr.doc.type.schema.text(replacement.text, replacement.node.marks)
      )
    }

    return commands.setTextSelection({ from, to: to + lengthChange })
  }
}
