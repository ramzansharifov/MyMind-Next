import { type LucideIcon } from 'lucide-react'
import type { TaskGroupIcon } from '../../../../shared/contracts/tasks'

import { TASK_GROUP_ICON_OPTIONS } from './task-options'
const groupIconMap = Object.fromEntries(
  TASK_GROUP_ICON_OPTIONS.map((option) => [option.value, option.icon])
) as Record<TaskGroupIcon, LucideIcon>

export function TaskGroupIconGlyph({
  icon,
  className
}: {
  icon: TaskGroupIcon
  className?: string
}): React.JSX.Element {
  const Icon = groupIconMap[icon]
  return <Icon aria-hidden="true" className={className} />
}
