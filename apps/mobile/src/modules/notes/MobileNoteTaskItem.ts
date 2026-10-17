import { TaskItem } from '@tiptap/extension-list'

export const NoteTaskItem = TaskItem.extend({
  addNodeView() {
    const createNodeView = this.parent?.()
    if (!createNodeView) return null

    return (props) => {
      const nodeView = createNodeView(props)
      const checkbox = (nodeView.dom as HTMLElement).querySelector<HTMLInputElement>(
        'input[type="checkbox"]'
      )

      function handleReadOnlyChange(event: Event): void {
        if (props.editor.isEditable || !checkbox) return
        // Use the node view's current position: its original node may be stale after a check.
        event.stopImmediatePropagation()
        const position = props.getPos()
        const currentNode =
          typeof position === 'number' ? props.editor.state.doc.nodeAt(position) : null
        if (typeof position !== 'number' || !currentNode || props.editor.isDestroyed) {
          checkbox.checked = !checkbox.checked
          return
        }
        const checked = checkbox.checked
        props.editor.commands.command(({ tr }) => {
          tr.setNodeMarkup(position, undefined, { ...currentNode.attrs, checked })
          return true
        })
      }

      checkbox?.addEventListener('change', handleReadOnlyChange, true)
      return {
        ...nodeView,
        destroy() {
          checkbox?.removeEventListener('change', handleReadOnlyChange, true)
          nodeView.destroy?.()
        }
      }
    }
  }
})
