import { Extension } from '@tiptap/core'
import type { Node } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'

import { isNoteAttachmentNodeName } from './NoteAttachment'

export const noteAttachmentDeletionKey = new PluginKey('noteAttachmentDeletion')

function countAttachments(document: Node): Map<string, number> {
  const counts = new Map<string, number>()
  document.descendants((node) => {
    if (!isNoteAttachmentNodeName(node.type.name)) return
    const id = node.attrs.attachment?.id as string | undefined
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
  })
  return counts
}

export const NoteAttachmentDeletionGuard = Extension.create({
  name: 'noteAttachmentDeletionGuard',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: noteAttachmentDeletionKey,
        filterTransaction(transaction, state) {
          if (!transaction.docChanged) return true
          const before = countAttachments(state.doc)
          const after = countAttachments(transaction.doc)
          const allowedId = transaction.getMeta(noteAttachmentDeletionKey) as string | undefined

          // Only the explicit sidebar action may remove an attachment. This also
          // protects attachments inside a text selection from cut or replacement.
          for (const [id, count] of before) {
            if ((after.get(id) ?? 0) < count && id !== allowedId) return false
          }
          return true
        }
      })
    ]
  }
})
