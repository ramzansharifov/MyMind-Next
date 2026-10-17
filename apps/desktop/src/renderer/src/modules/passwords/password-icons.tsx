import { Folder } from 'lucide-react'
import type { PasswordGroupIcon } from '../../../../shared/contracts/passwords'

import { PASSWORD_GROUP_ICON_OPTIONS } from './password-options'
export function PasswordGroupIconGlyph({
  icon,
  className
}: {
  icon: PasswordGroupIcon
  className?: string
}): React.JSX.Element {
  const Icon = PASSWORD_GROUP_ICON_OPTIONS.find((option) => option.value === icon)?.icon ?? Folder
  return <Icon aria-hidden="true" className={className} />
}
