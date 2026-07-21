import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { ReactElement } from 'react'

import type { StudyFolderIconName } from '../../../../shared/contracts/study'
import { cn } from '../lib/cn'
import { FolderIcon, FOLDER_ICON_SIDEBAR_CLASS_NAME } from './FolderIcon'
import { FOLDER_ICON_OPTIONS } from './folder-icon-options'
import { Tooltip } from './tooltip'

interface FolderIconPickerProps {
  value: StudyFolderIconName
  onChange: (icon: StudyFolderIconName) => void
  trigger: ReactElement
  align?: 'start' | 'center' | 'end'
}

export function FolderIconPicker({
  value,
  onChange,
  trigger,
  align = 'end'
}: FolderIconPickerProps): React.JSX.Element {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          align={align}
          collisionPadding={12}
          className="z-50 w-72 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-2 shadow-2xl shadow-black/35"
        >
          <DropdownMenu.Label className="px-2 py-2 text-xs font-medium text-[var(--app-muted)]">
            Иконка папки
          </DropdownMenu.Label>

          <div className="grid max-h-[28rem] grid-cols-5 gap-1 overflow-y-auto pr-1">
            {FOLDER_ICON_OPTIONS.map((option) => (
              <Tooltip key={option.value} content={option.label} side="top">
                <DropdownMenu.Item
                  aria-label={option.label}
                  data-folder-icon-option={option.value}
                  className={cn(
                    'flex aspect-square cursor-default items-center justify-center rounded-xl border outline-none',
                    'border-transparent text-[var(--app-muted)] transition-colors',
                    'hover:bg-white/[0.06] hover:text-[var(--app-text)]',
                    'focus:bg-white/[0.06] focus:text-[var(--app-text)]',
                    option.value === value &&
                      'border-violet-500/25 bg-violet-500/15 text-violet-200'
                  )}
                  onSelect={() => onChange(option.value)}
                >
                  <FolderIcon name={option.value} className={FOLDER_ICON_SIDEBAR_CLASS_NAME} />
                </DropdownMenu.Item>
              </Tooltip>
            ))}
          </div>

          <DropdownMenu.Arrow className="fill-[var(--app-surface-raised)]" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
