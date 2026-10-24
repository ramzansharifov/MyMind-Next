import { TaskList } from '@tiptap/extension-list'

export const NoteTaskList = TaskList.extend({
  addCommands() {
    return {
      ...this.parent?.(),
      toggleTaskList:
        () =>
        ({ commands }) =>
          commands.toggleList(this.name, this.options.itemTypeName, true)
    }
  }
})
