import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { Plus } from 'lucide-react'
import { useState } from 'react'

import type { StudyDividerVariant } from '../../../../../shared/contracts/study'
import { cn } from '../../../shared/lib/cn'
import { Tooltip } from '../../../shared/ui/tooltip'
import { getStudyDividerStyle } from '../../study/lib/study-divider-style'
import {
  DEFAULT_NOTE_DIVIDER_THICKNESS,
  normalizeDividerThickness,
  normalizeDividerVariant
} from './NoteDivider'

const variants: { value: StudyDividerVariant; label: string }[] = [
  { value: 'solid', label: 'Сплошная черта' },
  { value: 'tapered', label: 'Черта с утолщением в центре' },
  { value: 'dashed', label: 'Пунктирная черта' },
  { value: 'dotted', label: 'Точечная черта' }
]
const thicknesses = Array.from({ length: 12 }, (_, index) => index + 1)
const controlClassName =
  'flex size-9 items-center justify-center rounded-lg border border-(--app-border) bg-(--app-workspace) text-(--app-muted) transition-colors outline-none hover:bg-white/[0.05] hover:text-(--app-text) focus-visible:ring-2 focus-visible:ring-(--app-accent-500)/40'
const activeClassName =
  'border-[color-mix(in_srgb,var(--app-accent-500)_72%,white_8%)] bg-[color-mix(in_srgb,var(--app-accent-500)_24%,var(--app-workspace))] text-[color-mix(in_srgb,var(--app-accent-400)_88%,white)]'

export function NoteDividerSettings({ editor }: { editor: Editor }): React.JSX.Element {
  const [pendingVariant, setPendingVariant] = useState<StudyDividerVariant>('solid')
  const [pendingThickness, setPendingThickness] = useState(DEFAULT_NOTE_DIVIDER_THICKNESS)
  const selected = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor || currentEditor.isDestroyed || !currentEditor.isActive('noteDivider')) {
        return null
      }
      const attrs = currentEditor.getAttributes('noteDivider')
      return {
        variant: normalizeDividerVariant(attrs.variant),
        thickness: normalizeDividerThickness(attrs.thickness)
      }
    }
  })
  const variant = selected?.variant ?? pendingVariant
  const thickness = selected?.thickness ?? pendingThickness

  function applyVariant(next: StudyDividerVariant): void {
    setPendingVariant(next)
    if (selected) editor.chain().focus().updateAttributes('noteDivider', { variant: next }).run()
  }

  function applyThickness(next: number): void {
    setPendingThickness(next)
    if (selected) editor.chain().focus().updateAttributes('noteDivider', { thickness: next }).run()
  }

  function insertDivider(): void {
    const content = [{ type: 'noteDivider', attrs: { variant, thickness } }, { type: 'paragraph' }]
    const chain = editor.chain().focus()
    if (selected) chain.insertContentAt(editor.state.selection.to, content).run()
    else chain.insertContent(content).run()
  }

  return (
    <section
      data-rich-text-settings-section
      className="space-y-2 border-b border-(--app-border) last:border-b-0"
    >
      <h3 className="text-[11px] font-semibold tracking-[0.08em] text-(--app-muted) uppercase">
        Разделитель
      </h3>
      <div className="flex flex-wrap gap-2">
        <ToggleGroup.Root
          type="single"
          value={variant}
          aria-label="Стиль разделительной черты"
          className="flex gap-2"
          onValueChange={(value) => {
            if (value) applyVariant(normalizeDividerVariant(value))
          }}
        >
          {variants.map((option) => (
            <Tooltip key={option.value} content={option.label} side="top">
              <ToggleGroup.Item
                value={option.value}
                aria-label={option.label}
                data-rich-text-formatting-control
                data-active={variant === option.value ? 'true' : 'false'}
                className={cn(controlClassName, variant === option.value && activeClassName)}
                onMouseDown={(event) => event.preventDefault()}
              >
                {option.value === 'dotted' ? (
                  <span aria-hidden="true" className="flex w-4 items-center justify-between">
                    {[0, 1, 2].map((dot) => (
                      <span key={dot} className="size-[3px] rounded-full bg-current" />
                    ))}
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="block w-4"
                    style={getStudyDividerStyle(
                      option.value,
                      option.value === 'tapered' ? 4 : 2,
                      'currentColor'
                    )}
                  />
                )}
              </ToggleGroup.Item>
            </Tooltip>
          ))}
        </ToggleGroup.Root>
        <Tooltip content="Вставить разделительную черту" side="top">
          <button
            type="button"
            aria-label="Вставить разделительную черту"
            data-rich-text-formatting-control
            className={cn(controlClassName, 'ml-auto')}
            onMouseDown={(event) => event.preventDefault()}
            onClick={insertDivider}
          >
            <Plus aria-hidden="true" className="size-4 text-(--app-accent-500)" />
          </button>
        </Tooltip>
      </div>
      <div className="rich-text-size-ruler__controls">
        <Tooltip content="Уменьшить толщину черты" side="top">
          <button
            type="button"
            aria-label="Уменьшить толщину черты"
            className="rich-text-size-ruler__step"
            disabled={thickness === 1}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyThickness(thickness - 1)}
          >
            <span aria-hidden="true" className="h-px w-3 rounded-full bg-current" />
          </button>
        </Tooltip>
        <ToggleGroup.Root
          type="single"
          value={String(thickness)}
          aria-label="Толщина разделительной черты"
          className="rich-text-size-ruler__ticks"
          onValueChange={(value) => {
            if (value) applyThickness(normalizeDividerThickness(value))
          }}
        >
          {thicknesses.map((size) => (
            <Tooltip key={size} content={`Толщина ${size} пикселей`} side="top">
              <ToggleGroup.Item
                value={String(size)}
                aria-label={`Толщина черты ${size} пикселей`}
                data-passed={size <= thickness ? 'true' : 'false'}
                data-selected={size === thickness ? 'true' : 'false'}
                className="rich-text-size-ruler__tick"
                onMouseDown={(event) => event.preventDefault()}
              >
                <span aria-hidden="true" style={{ height: `${6 + size}px` }} />
              </ToggleGroup.Item>
            </Tooltip>
          ))}
        </ToggleGroup.Root>
        <Tooltip content="Увеличить толщину черты" side="top">
          <button
            type="button"
            aria-label="Увеличить толщину черты"
            className="rich-text-size-ruler__step"
            disabled={thickness === 12}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyThickness(thickness + 1)}
          >
            <span aria-hidden="true" className="h-1.5 w-3 rounded-full bg-current" />
          </button>
        </Tooltip>
      </div>
    </section>
  )
}
