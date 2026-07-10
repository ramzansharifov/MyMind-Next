import type { Editor } from '@tiptap/core'
import * as Separator from '@radix-ui/react-separator'
import * as Slider from '@radix-ui/react-slider'
import { Code2, FileCode2, Heading, Minus, Settings2, Sigma, Type } from 'lucide-react'

import type { StudyBlock } from '../../../../../shared/contracts/study'
import {
  DEFAULT_DIVIDER_COLOR,
  DEFAULT_DIVIDER_THICKNESS,
  DEFAULT_HEADING_BACKGROUND_COLOR,
  DEFAULT_HEADING_COLOR
} from '../lib/study-document'
import { RichTextSettings } from './rich-text/RichTextSettings'
import { STUDY_CODE_LANGUAGE_OPTIONS } from './code/code-languages'
import { ColorPicker } from './settings/ColorPicker'
import { SegmentedChoice } from './settings/SegmentedChoice'
import { StudySelect } from './settings/StudySelect'

interface BlockSettingsPanelProps {
  block: StudyBlock | null
  textEditor: Editor | null
  onChange: (block: StudyBlock) => void
}

const headingLevels = [
  {
    value: '1',
    label: 'H1',
    ariaLabel: 'Заголовок первого уровня'
  },
  {
    value: '2',
    label: 'H2',
    ariaLabel: 'Заголовок второго уровня'
  },
  {
    value: '3',
    label: 'H3',
    ariaLabel: 'Заголовок третьего уровня'
  }
]

const headingBackgroundColors = [
  '#181a20',
  '#27272a',
  '#4c1d95',
  '#1e3a8a',
  '#164e63',
  '#064e3b',
  '#713f12',
  '#7f1d1d'
]
const markdownViewModes = [
  {
    value: 'write',
    label: 'Код',
    ariaLabel: 'Только Markdown'
  },
  {
    value: 'split',
    label: '2 окна',
    ariaLabel: 'Markdown и просмотр'
  },
  {
    value: 'preview',
    label: 'Вид',
    ariaLabel: 'Только просмотр'
  }
]
const latexViewModes = [
  {
    value: 'write',
    label: 'Код',
    ariaLabel: 'Только исходный LaTeX'
  },
  {
    value: 'split',
    label: '2 окна',
    ariaLabel: 'LaTeX и формула'
  },
  {
    value: 'preview',
    label: 'Вид',
    ariaLabel: 'Только формула'
  }
]

const latexDisplayModes = [
  {
    value: 'display',
    label: 'Блочная',
    ariaLabel: 'Блочная формула'
  },
  {
    value: 'inline',
    label: 'Строчная',
    ariaLabel: 'Строчная формула'
  }
]

const latexAlignments = [
  {
    value: 'left',
    label: 'Слева'
  },
  {
    value: 'center',
    label: 'Центр'
  },
  {
    value: 'right',
    label: 'Справа'
  }
]

export function BlockSettingsPanel({
  block,
  textEditor,
  onChange
}: BlockSettingsPanelProps): React.JSX.Element {
  if (!block) {
    return (
      <aside className="rounded-xl border border-(--app-border) bg-(--app-surface) p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-(--app-text)">
          <Settings2 aria-hidden="true" className="size-4 text-violet-300" />
          Настройки
        </div>

        <p className="mt-3 text-sm text-(--app-muted)">Выбери блок</p>
      </aside>
    )
  }

  return (
    <aside className="overflow-hidden rounded-xl border border-(--app-border) bg-(--app-surface)">
      <header className="flex items-center gap-3 border-b border-(--app-border) px-4 py-3.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
          <BlockTypeIcon type={block.type} />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-(--app-text)">{getBlockTitle(block)}</p>
        </div>
      </header>

      <div className="p-4">
        {block.type === 'text' && <RichTextSettings key={block.id} editor={textEditor} />}

        {block.type === 'heading' && <HeadingSettings block={block} onChange={onChange} />}

        {block.type === 'code' && <CodeSettings block={block} onChange={onChange} />}

        {block.type === 'markdown' && <MarkdownSettings block={block} onChange={onChange} />}

        {block.type === 'latex' && <LatexSettings block={block} onChange={onChange} />}

        {block.type === 'divider' && <DividerSettings block={block} onChange={onChange} />}
      </div>
    </aside>
  )
}

function HeadingSettings({
  block,
  onChange
}: {
  block: Extract<StudyBlock, { type: 'heading' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  return (
    <div className="grid gap-4">
      <SettingsField label="Уровень">
        <SegmentedChoice
          value={String(block.level)}
          options={headingLevels}
          ariaLabel="Уровень заголовка"
          columns={3}
          onValueChange={(value) => {
            const level = Number(value)

            if (level !== 1 && level !== 2 && level !== 3) {
              return
            }

            onChange({
              ...block,
              level
            })
          }}
        />
      </SettingsField>

      <div className="grid grid-cols-2 gap-3">
        <SettingsField label="Текст">
          <ColorPicker
            value={block.color ?? DEFAULT_HEADING_COLOR}
            ariaLabel="Цвет текста заголовка"
            clearLabel="Сбросить"
            onChange={(color) => {
              onChange({
                ...block,
                color
              })
            }}
            onClear={() => {
              onChange({
                ...block,
                color: undefined
              })
            }}
          />
        </SettingsField>

        <SettingsField label="Фон">
          <ColorPicker
            value={block.backgroundColor ?? DEFAULT_HEADING_BACKGROUND_COLOR}
            ariaLabel="Фон заголовка"
            colors={headingBackgroundColors}
            clearLabel="Сбросить"
            onChange={(backgroundColor) => {
              onChange({
                ...block,
                backgroundColor
              })
            }}
            onClear={() => {
              onChange({
                ...block,
                backgroundColor: undefined
              })
            }}
          />
        </SettingsField>
      </div>
    </div>
  )
}

function CodeSettings({
  block,
  onChange
}: {
  block: Extract<StudyBlock, { type: 'code' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  return (
    <SettingsField label="Язык">
      <StudySelect
        value={block.language || 'text'}
        options={STUDY_CODE_LANGUAGE_OPTIONS}
        ariaLabel="Язык блока кода"
        onValueChange={(language) => {
          onChange({
            ...block,
            language
          })
        }}
      />
    </SettingsField>
  )
}

function MarkdownSettings({
  block,
  onChange
}: {
  block: Extract<StudyBlock, { type: 'markdown' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  return (
    <div className="grid gap-4">
      <SettingsField label="Режим">
        <SegmentedChoice
          value={block.viewMode ?? 'split'}
          options={markdownViewModes}
          ariaLabel="Режим Markdown-блока"
          columns={3}
          onValueChange={(viewMode) => {
            if (viewMode !== 'write' && viewMode !== 'split' && viewMode !== 'preview') {
              return
            }

            onChange({
              ...block,
              viewMode
            })
          }}
        />
      </SettingsField>

      <p className="text-xs leading-5 text-[var(--app-muted)]">
        GFM: таблицы, списки задач, ссылки и блоки кода.
      </p>
    </div>
  )
}
function LatexSettings({
  block,
  onChange
}: {
  block: Extract<StudyBlock, { type: 'latex' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  const scale = block.scale ?? 100

  return (
    <div className="grid gap-4">
      <SettingsField label="Режим редактора">
        <SegmentedChoice
          value={block.viewMode ?? 'split'}
          options={latexViewModes}
          ariaLabel="Режим LaTeX-блока"
          columns={3}
          onValueChange={(viewMode) => {
            if (viewMode !== 'write' && viewMode !== 'split' && viewMode !== 'preview') {
              return
            }

            onChange({
              ...block,
              viewMode
            })
          }}
        />
      </SettingsField>

      <SettingsField label="Тип формулы">
        <SegmentedChoice
          value={block.displayMode ?? 'display'}
          options={latexDisplayModes}
          ariaLabel="Тип LaTeX-формулы"
          columns={2}
          onValueChange={(displayMode) => {
            if (displayMode !== 'display' && displayMode !== 'inline') {
              return
            }

            onChange({
              ...block,
              displayMode
            })
          }}
        />
      </SettingsField>

      <SettingsField label="Выравнивание">
        <SegmentedChoice
          value={block.alignment ?? 'center'}
          options={latexAlignments}
          ariaLabel="Выравнивание формулы"
          columns={3}
          onValueChange={(alignment) => {
            if (alignment !== 'left' && alignment !== 'center' && alignment !== 'right') {
              return
            }

            onChange({
              ...block,
              alignment
            })
          }}
        />
      </SettingsField>

      <SettingsField label={`Размер: ${scale}%`}>
        <Slider.Root
          min={70}
          max={180}
          step={5}
          value={[scale]}
          aria-label="Размер LaTeX-формулы"
          className="relative flex h-5 w-full touch-none items-center select-none"
          onValueChange={(values) => {
            const nextScale = values[0]

            if (typeof nextScale !== 'number') {
              return
            }

            onChange({
              ...block,
              scale: nextScale
            })
          }}
        >
          <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-white/[0.08]">
            <Slider.Range className="absolute h-full bg-violet-500" />
          </Slider.Track>

          <Slider.Thumb className="block size-4 rounded-full border-2 border-violet-400 bg-(--app-surface-raised) outline-none hover:scale-110 focus-visible:ring-4 focus-visible:ring-violet-500/20" />
        </Slider.Root>
      </SettingsField>

      <p className="text-xs leading-5 text-[var(--app-muted)]">
        Поддерживаются формулы, матрицы, системы уравнений, суммы и интегралы.
      </p>
    </div>
  )
}
function DividerSettings({
  block,
  onChange
}: {
  block: Extract<StudyBlock, { type: 'divider' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  const thickness = block.thickness ?? DEFAULT_DIVIDER_THICKNESS
  const color = block.color ?? DEFAULT_DIVIDER_COLOR

  return (
    <div className="grid gap-4">
      <SettingsField label={`Толщина: ${thickness}px`}>
        <Slider.Root
          min={1}
          max={12}
          step={1}
          value={[thickness]}
          aria-label="Толщина разделителя"
          className="relative flex h-5 w-full touch-none items-center select-none"
          onValueChange={(values) => {
            const nextThickness = values[0]

            if (typeof nextThickness !== 'number') {
              return
            }

            onChange({
              ...block,
              thickness: nextThickness
            })
          }}
        >
          <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-white/[0.08]">
            <Slider.Range className="absolute h-full bg-violet-500" />
          </Slider.Track>

          <Slider.Thumb className="block size-4 rounded-full border-2 border-violet-400 bg-(--app-surface-raised) outline-none hover:scale-110 focus-visible:ring-4 focus-visible:ring-violet-500/20" />
        </Slider.Root>
      </SettingsField>

      <Separator.Root className="h-px bg-(--app-border)" />

      <SettingsField label="Цвет">
        <ColorPicker
          value={color}
          ariaLabel="Цвет разделителя"
          onChange={(nextColor) => {
            onChange({
              ...block,
              color: nextColor
            })
          }}
        />
      </SettingsField>
    </div>
  )
}

function SettingsField({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-medium text-(--app-muted)">{label}</span>

      {children}
    </label>
  )
}

function BlockTypeIcon({ type }: { type: StudyBlock['type'] }): React.JSX.Element {
  if (type === 'heading') {
    return <Heading aria-hidden="true" className="size-4" />
  }

  if (type === 'code') {
    return <Code2 aria-hidden="true" className="size-4" />
  }
  if (type === 'markdown') {
    return <FileCode2 aria-hidden="true" className="size-4" />
  }
  if (type === 'latex') {
    return <Sigma aria-hidden="true" className="size-4" />
  }

  if (type === 'divider') {
    return <Minus aria-hidden="true" className="size-4" />
  }

  return <Type aria-hidden="true" className="size-4" />
}

function getBlockTitle(block: StudyBlock): string {
  if (block.type === 'heading') {
    return 'Заголовок'
  }

  if (block.type === 'code') {
    return 'Код'
  }
  if (block.type === 'markdown') {
    return 'Markdown'
  }
  if (block.type === 'latex') {
    return 'LaTeX'
  }

  if (block.type === 'divider') {
    return 'Разделитель'
  }

  return 'Форматированный текст'
}
