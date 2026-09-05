import type { TaskRecord } from '@mymind/contracts/tasks'

export function sortTasks(tasks: TaskRecord[]): TaskRecord[] {
  return [...tasks].sort((left, right) => {
    if (left.status !== right.status) return left.status === 'active' ? -1 : 1

    const leftActivity =
      left.status === 'completed' ? (left.completedAt ?? left.updatedAt) : left.updatedAt
    const rightActivity =
      right.status === 'completed' ? (right.completedAt ?? right.updatedAt) : right.updatedAt

    if (leftActivity !== rightActivity) return rightActivity - leftActivity
    return right.createdAt - left.createdAt
  })
}
