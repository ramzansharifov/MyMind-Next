import type { ReactNode } from 'react'

import type { StudyBlock, StudyHeadingBlock } from '../../../../../shared/contracts/study'
import { SegmentedChoice } from './settings/SegmentedChoice'

const headingAlignments = [
  { value: 'left', label: 'Слева' },
  { value: 'center', label: 'Центр' },
  { value: 'right', label: 'Справа' }
]

const headingBackgroundScopes = [
  { value: 'text', label: 'Текст' },
  { value: 'container', label: 'Весь блок' }
]

export function StudyHeadingLayoutSettings({
  block,
  onChange
}: {
  block: StudyHeadingBlock
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  return (
    <aside
      data-study-heading-layout-settings
      className="mt-3 grid gap-4 rounded-xl border border-(--app-border) bg-(--app-surface) p-4"
    >
      <SettingsField label="Выравнивание">
        <SegmentedChoice
          value={block.alignment ?? 'left'}
          options={headingAlignments}
          ariaLabel="Выравнивание заголовка"
          columns={3}
          onValueChange={(alignment) => {
            if (alignment !== 'left' && alignment !== 'center' && alignment !== 'right') return
            onChange({ ...block, alignment })
          }}
        />
      </SettingsField>

      <SettingsField label="Область фона">
        <SegmentedChoice
          value={block.backgroundScope ?? 'container'}
          options={headingBackgroundScopes}
          ariaLabel="Область фона заголовка"
          columns={2}
          onValueChange={(backgroundScope) => {
            if (backgroundScope !== 'text' && backgroundScope !== 'container') return
            onChange({ ...block, backgroundScope })
          }}
        />
      </SettingsField>

      <p className="text-xs leading-5 text-(--app-muted)">
        «Текст» окрашивает только строки заголовка, «Весь блок» сохраняет текущее заполнение по
        всей ширине.
      </p>
    </aside>
  )
}

function SettingsField({ label, children }: { label: string; children: ReactNode }): React.JSX.Element {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium text-(--app-muted)">{label}</span>
      {children}
    </label>
  )
}
