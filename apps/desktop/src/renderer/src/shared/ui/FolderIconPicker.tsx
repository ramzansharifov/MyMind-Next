import type { ReactElement, ReactNode } from 'react'

import type { StudyFolderIconName } from '../../../../shared/contracts/study'
import { FolderIcon, FOLDER_ICON_SIDEBAR_CLASS_NAME } from './FolderIcon'
import { FOLDER_ICON_OPTIONS } from './folder-icon-options'
import { IconPicker } from './IconPicker'

interface FolderIconPickerProps {
  value: StudyFolderIconName
  onChange: (icon: StudyFolderIconName) => void
  trigger: ReactElement
  triggerTooltip?: ReactNode
  align?: 'start' | 'center' | 'end'
  label?: string
}

export function FolderIconPicker({
  value,
  onChange,
  trigger,
  triggerTooltip,
  align = 'end',
  label = 'Иконка папки'
}: FolderIconPickerProps): React.JSX.Element {
  return (
    <IconPicker
      value={value}
      onChange={onChange}
      trigger={trigger}
      triggerTooltip={triggerTooltip}
      options={FOLDER_ICON_OPTIONS}
      align={align}
      label={label}
      optionDataAttribute="data-folder-icon-option"
      renderIcon={(icon) => <FolderIcon name={icon} className={FOLDER_ICON_SIDEBAR_CLASS_NAME} />}
    />
  )
}
