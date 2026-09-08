import type { CreateTaskInput, TaskRecord, TaskStatus } from '@mymind/contracts/tasks'

export function taskEditorInput(
  title: string,
  groupId: string | null,
  status: TaskStatus,
  previous?: TaskRecord
): CreateTaskInput {
  return {
    title: title.trim(),
    description: previous?.description ?? '',
    groupId,
    status,
    priority: previous?.priority ?? 'normal',
    dueDate: previous?.dueDate ?? null,
    dueTime: previous?.dueTime ?? null
  }
}

export function quickTaskInput(title: string, selectedGroup: string | null): CreateTaskInput {
  return {
    title: title.trim(),
    description: '',
    groupId: selectedGroup,
    status: 'active',
    priority: 'normal',
    dueDate: null,
    dueTime: null
  }
}

export function taskSearchText(task: TaskRecord, groupName: string): string {
  return `${task.title} ${groupName}`.toLocaleLowerCase('ru')
}
