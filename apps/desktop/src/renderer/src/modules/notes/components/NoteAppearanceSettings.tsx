import * as ToggleGroup from '@radix-ui/react-toggle-group'
import { Grid2X2, RotateCcw, Square } from 'lucide-react'
import type { ReactNode } from 'react'

import type { NoteAppearance } from '../../../../../shared/contracts/notes'
import { Tooltip } from '../../../shared/ui/tooltip'
import { getReadableNoteTextColor } from '../lib/note-color-contrast'

const colors = [
  { name: 'Тема', value: 'theme' },
  { name: 'Без заливки', value: null },
  { name: 'Белый', value: '#ffffff' },
  { name: 'Кремовый', value: '#efe9dd' },
  { name: 'Тёмный', value: '#0d0f12' },
  { name: 'Графит', value: '#171a20' },
  { name: 'Серый', value: '#21252e' },
  { name: 'Хвойный', value: '#182620' },
  { name: 'Синий', value: '#1d2238' },
  { name: 'Розовый', value: '#302329' }
]
const presets = [
  { name: 'Полотно', value: 'canvas' },
  { name: 'Лист', value: 'sheet' },
  { name: 'Карточка', value: 'card' }
] satisfies { name: string; value: NoteAppearance['variant'] }[]

const controlClass = 'note-appearance-control'

export function NoteAppearanceSettings({
  value,
  onChange
}: {
  value: NoteAppearance
  onChange: (value: NoteAppearance | undefined) => void
}): React.JSX.Element {
  function update(patch: Partial<NoteAppearance>): void {
    onChange({ ...value, ...patch })
  }

  return (
    <div data-rich-text-settings data-compact="true" data-note-appearance-settings>
      <Section title="Варианты">
        <div className="note-appearance-presets">
          {presets.map((preset, index) => (
            <button
              key={preset.name}
              type="button"
              aria-label={`Вид заметки: ${preset.name}`}
              aria-pressed={value.variant === preset.value}
              className="note-appearance-preset"
              onClick={() =>
                update({
                  variant: preset.value,
                  paperColor:
                    value.paperColor && value.paperColor !== 'theme'
                      ? value.paperColor
                      : preset.value === 'canvas'
                        ? null
                        : 'theme'
                })
              }
            >
              <span
                aria-hidden="true"
                className="note-appearance-preset__preview"
                data-variant={index}
              >
                <span>
                  <i />
                  <i />
                  <i />
                </span>
              </span>
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title={value.variant === 'canvas' ? 'Полотно' : 'Лист'}>
        <Choices<NoteAppearance['paperPattern']>
          label={value.variant === 'canvas' ? 'Узор полотна' : 'Узор листа'}
          value={value.paperPattern}
          options={[
            { value: 'none', label: 'Без узора', icon: <Square /> },
            {
              value: 'dots',
              label: 'Точки',
              icon: <span className="note-appearance-dot-preview" />
            },
            { value: 'grid', label: 'Сетка', icon: <Grid2X2 /> }
          ]}
          onChange={(paperPattern) => update({ paperPattern })}
        />
        <Field label={value.variant === 'canvas' ? 'Цвет полотна' : 'Цвет листа'}>
          <ToggleGroup.Root
            type="single"
            value={value.paperColor ?? 'transparent'}
            aria-label={value.variant === 'canvas' ? 'Цвет полотна' : 'Цвет листа'}
            className="note-paper-color-options"
            onValueChange={(next) => {
              const option = colors.find((option) => (option.value ?? 'transparent') === next)
              if (option) update({ paperColor: option.value })
            }}
          >
            {colors.map((option) => (
              <ToggleGroup.Item
                key={option.name}
                value={option.value ?? 'transparent'}
                aria-label={`${value.variant === 'canvas' ? 'Цвет полотна' : 'Цвет листа'}: ${option.name}`}
                className="note-paper-color-card"
              >
                <span
                  className="note-paper-color-card__preview"
                  aria-hidden="true"
                  data-transparent={option.value === null ? 'true' : undefined}
                  style={{
                    backgroundColor:
                      option.value === 'theme'
                        ? 'var(--app-surface)'
                        : (option.value ?? 'transparent'),
                    color:
                      option.value && option.value !== 'theme'
                        ? getReadableNoteTextColor(option.value)
                        : 'var(--app-text)'
                  }}
                >
                  <i />
                  <i />
                  <i />
                </span>
                <span>{option.name}</span>
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </Field>
      </Section>

      <button type="button" className="note-appearance-reset" onClick={() => onChange(undefined)}>
        <RotateCcw aria-hidden="true" className="size-3.5" />
        Сбросить вид
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }): React.JSX.Element {
  return (
    <section data-rich-text-settings-section className="note-appearance-section">
      <h3>{title}</h3>
      <div className="note-appearance-fields">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }): React.JSX.Element {
  return (
    <div data-rich-text-settings-field className="grid gap-1">
      <span className="note-appearance-label">{label}</span>
      {children}
    </div>
  )
}

function Choices<Value extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: Value
  options: { value: Value; label: string; icon: ReactNode }[]
  onChange: (value: Value) => void
}): React.JSX.Element {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      aria-label={label}
      className="note-appearance-actions"
      onValueChange={(next) => {
        const option = options.find((option) => option.value === next)
        if (option) onChange(option.value)
      }}
    >
      {options.map((option) => (
        <Tooltip key={option.value} content={option.label} side="top">
          <ToggleGroup.Item
            value={option.value}
            aria-label={option.label}
            data-rich-text-formatting-control
            data-active={value === option.value ? 'true' : 'false'}
            className={controlClass}
          >
            {option.icon}
          </ToggleGroup.Item>
        </Tooltip>
      ))}
    </ToggleGroup.Root>
  )
}
