import type { Editor } from '@tiptap/core'
import * as Separator from '@radix-ui/react-separator'
import * as Slider from '@radix-ui/react-slider'
import { Link2, LoaderCircle, Settings2, SquarePlay, Trash2, Upload } from 'lucide-react'
import { useState } from 'react'

import type { StudyAssetKind, StudyBlock } from '../../../../../shared/contracts/study'
import { studyClient } from '../api/study-client'
import {
  getStudyBlockDefinition,
  type StudyBlockSettingsStrategy
} from '../lib/study-block-registry'
import {
  DEFAULT_DIVIDER_COLOR,
  DEFAULT_DIVIDER_CSS_COLOR,
  DEFAULT_DIVIDER_THICKNESS,
  DEFAULT_DIVIDER_VARIANT,
  DEFAULT_HEADING_BACKGROUND_COLOR,
  DEFAULT_HEADING_COLOR
} from '../lib/study-document'
import { STUDY_CODE_LANGUAGE_OPTIONS } from './code/code-languages'
import {
  formatStudyFileSize,
  isValidStudyRemoteMediaUrl,
  isValidStudyYouTubeUrl
} from './file/file-utils'
import { STUDY_MERMAID_TEMPLATES } from './mermaid/mermaid-templates'
import { RichTextSettings } from './rich-text/RichTextSettings'
import { ColorPicker } from './settings/ColorPicker'
import { SegmentedChoice } from './settings/SegmentedChoice'
import { StudySelect } from './settings/StudySelect'
import { StudyDivider } from './StudyDivider'

interface BlockSettingsPanelProps {
  materialId: string
  block: StudyBlock | null
  textEditor: Editor | null
  onChange: (block: StudyBlock) => void
}

type SettingsRendererProps = Omit<BlockSettingsPanelProps, 'block'> & {
  block: StudyBlock
}

type SettingsRenderer = (props: SettingsRendererProps) => React.JSX.Element

const settingsRenderers = {
  text: TextBlockSettings,
  heading: HeadingBlockSettings,
  code: CodeBlockSettings,
  markdown: MarkdownBlockSettings,
  latex: LatexBlockSettings,
  mermaid: MermaidBlockSettings,
  image: AttachmentBlockSettings,
  video: AttachmentBlockSettings,
  audio: AttachmentBlockSettings,
  file: AttachmentBlockSettings,
  divider: DividerBlockSettings
} satisfies Record<StudyBlockSettingsStrategy, SettingsRenderer>

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

const mermaidViewModes = [
  {
    value: 'write',
    label: 'Код',
    ariaLabel: 'Только Mermaid-код'
  },
  {
    value: 'split',
    label: '2 окна',
    ariaLabel: 'Код и диаграмма'
  },
  {
    value: 'preview',
    label: 'Вид',
    ariaLabel: 'Только диаграмма'
  }
]

const mermaidThemes = [
  {
    value: 'dark',
    label: 'Тёмная'
  },
  {
    value: 'default',
    label: 'Светлая'
  },
  {
    value: 'neutral',
    label: 'Нейтр.'
  },
  {
    value: 'forest',
    label: 'Лес'
  }
]

const studyFileSources = [
  {
    value: 'local',
    label: 'Компьютер'
  },
  {
    value: 'url',
    label: 'Ссылка'
  }
]

const studyVideoSources = [
  {
    value: 'local',
    label: 'Компьютер'
  },
  {
    value: 'url',
    label: 'YouTube'
  }
]

const studyImageFits = [
  {
    value: 'contain',
    label: 'Целиком'
  },
  {
    value: 'cover',
    label: 'Заполнить'
  }
]

const studyDividerVariants = [
  {
    value: 'solid',
    label: 'Сплошной',
    ariaLabel: 'Сплошной разделитель'
  },
  {
    value: 'tapered',
    label: 'Акцентный',
    ariaLabel: 'Разделитель с утолщением в центре'
  },
  {
    value: 'dashed',
    label: 'Пунктир',
    ariaLabel: 'Пунктирный разделитель'
  },
  {
    value: 'dotted',
    label: 'Точки',
    ariaLabel: 'Точечный разделитель'
  }
]

export function BlockSettingsPanel({
  materialId,
  block,
  textEditor,
  onChange
}: BlockSettingsPanelProps): React.JSX.Element {
  if (!block) {
    return (
      <aside className="w-full max-w-full min-w-0 rounded-xl border border-(--app-border) bg-(--app-surface) p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-(--app-text)">
          <Settings2 aria-hidden="true" className="size-4 text-violet-300" />
          Настройки
        </div>

        <p className="mt-3 text-sm text-(--app-muted)">Выбери блок</p>
      </aside>
    )
  }

  const definition = getStudyBlockDefinition(block.type)

  const BlockIcon = definition.icon

  const SettingsRenderer = settingsRenderers[definition.settingsStrategy]

  return (
    <aside className="flex max-h-[calc(100vh-150px)] w-full max-w-full min-w-0 flex-col overflow-hidden rounded-xl border border-(--app-border) bg-(--app-surface) max-[1180px]:max-h-none">
      <header className="flex shrink-0 items-center gap-3 border-b border-(--app-border) px-4 py-3.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
          <BlockIcon aria-hidden="true" className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <p title={definition.label} className="truncate text-sm font-medium text-(--app-text)">
            {definition.label}
          </p>

          <p className="mt-0.5 text-[11px] text-(--app-muted)">Настройки блока</p>
        </div>
      </header>

      <div className="min-h-0 min-w-0 [scrollbar-gutter:stable] overflow-x-hidden overflow-y-auto overscroll-contain p-4 max-[1180px]:overflow-visible max-[640px]:p-3">
        <SettingsRenderer
          key={block.id}
          materialId={materialId}
          block={block}
          textEditor={textEditor}
          onChange={onChange}
        />
      </div>
    </aside>
  )
}

function TextBlockSettings({ block, textEditor }: SettingsRendererProps): React.JSX.Element {
  if (block.type !== 'text') {
    throw new Error('Text settings received an incompatible block')
  }

  return <RichTextSettings editor={textEditor} />
}

function HeadingBlockSettings({ block, onChange }: SettingsRendererProps): React.JSX.Element {
  if (block.type !== 'heading') {
    throw new Error('Heading settings received an incompatible block')
  }

  return <HeadingSettings block={block} onChange={onChange} />
}

function CodeBlockSettings({ block, onChange }: SettingsRendererProps): React.JSX.Element {
  if (block.type !== 'code') {
    throw new Error('Code settings received an incompatible block')
  }

  return <CodeSettings block={block} onChange={onChange} />
}

function MarkdownBlockSettings({ block, onChange }: SettingsRendererProps): React.JSX.Element {
  if (block.type !== 'markdown') {
    throw new Error('Markdown settings received an incompatible block')
  }

  return <MarkdownSettings block={block} onChange={onChange} />
}

function LatexBlockSettings({ block, onChange }: SettingsRendererProps): React.JSX.Element {
  if (block.type !== 'latex') {
    throw new Error('LaTeX settings received an incompatible block')
  }

  return <LatexSettings block={block} onChange={onChange} />
}

function MermaidBlockSettings({ block, onChange }: SettingsRendererProps): React.JSX.Element {
  if (block.type !== 'mermaid') {
    throw new Error('Mermaid settings received an incompatible block')
  }

  return <MermaidSettings block={block} onChange={onChange} />
}

function AttachmentBlockSettings({
  block,
  materialId,
  onChange
}: SettingsRendererProps): React.JSX.Element {
  if (!isStudyAttachmentBlock(block)) {
    throw new Error('Attachment settings received an incompatible block')
  }

  return <AttachmentSettings materialId={materialId} block={block} onChange={onChange} />
}

function DividerBlockSettings({ block, onChange }: SettingsRendererProps): React.JSX.Element {
  if (block.type !== 'divider') {
    throw new Error('Divider settings received an incompatible block')
  }

  return <DividerSettings block={block} onChange={onChange} />
}

function HeadingSettings({
  block,
  onChange
}: {
  block: Extract<
    StudyBlock,
    {
      type: 'heading'
    }
  >
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
  block: Extract<
    StudyBlock,
    {
      type: 'code'
    }
  >
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
  block: Extract<
    StudyBlock,
    {
      type: 'markdown'
    }
  >
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
  block: Extract<
    StudyBlock,
    {
      type: 'latex'
    }
  >
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

function MermaidSettings({
  block,
  onChange
}: {
  block: Extract<
    StudyBlock,
    {
      type: 'mermaid'
    }
  >
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  const scale = block.scale ?? 100

  return (
    <div className="grid gap-4">
      <SettingsField label="Режим редактора">
        <SegmentedChoice
          value={block.viewMode ?? 'split'}
          options={mermaidViewModes}
          ariaLabel="Режим Mermaid-блока"
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

      <SettingsField label="Тема">
        <SegmentedChoice
          value={block.theme ?? 'dark'}
          options={mermaidThemes}
          ariaLabel="Тема Mermaid-диаграммы"
          columns={2}
          onValueChange={(theme) => {
            if (
              theme !== 'dark' &&
              theme !== 'default' &&
              theme !== 'neutral' &&
              theme !== 'forest'
            ) {
              return
            }

            onChange({
              ...block,
              theme
            })
          }}
        />
      </SettingsField>

      <SettingsField label={`Размер: ${scale}%`}>
        <Slider.Root
          min={60}
          max={180}
          step={10}
          value={[scale]}
          aria-label="Размер Mermaid-диаграммы"
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

      {!block.source.trim() && (
        <div className="grid gap-2">
          <span className="text-[11px] font-medium text-(--app-muted)">Быстрый старт</span>

          <div className="grid grid-cols-2 gap-2">
            {STUDY_MERMAID_TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                className="rounded-lg border border-(--app-border) bg-(--app-workspace) px-2.5 py-2 text-xs font-medium text-(--app-muted) transition-colors outline-none hover:border-(--app-border-strong) hover:text-(--app-text) focus-visible:ring-2 focus-visible:ring-violet-500/35"
                onClick={() => {
                  onChange({
                    ...block,
                    source: template.source,
                    viewMode: 'split'
                  })
                }}
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs leading-5 text-[var(--app-muted)]">
        Поддерживаются блок-схемы, последовательности, классы, состояния, ER, Gantt, mindmap и
        другие диаграммы.
      </p>
    </div>
  )
}

type StudyAttachmentBlock = Extract<
  StudyBlock,
  {
    type: StudyAssetKind
  }
>

function AttachmentSettings({
  materialId,
  block,
  onChange
}: {
  materialId: string
  block: StudyAttachmentBlock
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  const [isPicking, setIsPicking] = useState(false)

  const [importError, setImportError] = useState<string | null>(null)

  const [selectedSourceType, setSelectedSourceType] = useState<'local' | 'url'>(block.source.type)

  const [remoteUrlDraft, setRemoteUrlDraft] = useState(
    block.source.type === 'url' ? block.source.url : ''
  )

  const localAsset = block.source.type === 'local' ? block.source.asset : undefined

  const savedRemoteUrl = block.source.type === 'url' ? block.source.url : ''

  const normalizedRemoteUrlDraft = remoteUrlDraft.trim()

  const isRemoteUrlValid =
    block.type === 'video'
      ? isValidStudyYouTubeUrl(normalizedRemoteUrlDraft)
      : block.type === 'image'
        ? isValidStudyRemoteMediaUrl(normalizedRemoteUrlDraft)
        : false

  const canApplyRemoteUrl = isRemoteUrlValid && normalizedRemoteUrlDraft !== savedRemoteUrl.trim()

  async function chooseLocalFile(): Promise<void> {
    setIsPicking(true)
    setImportError(null)

    try {
      const asset = await studyClient.importAsset({
        nodeId: materialId,
        kind: block.type
      })

      if (!asset) {
        return
      }

      onChange({
        ...block,
        source: {
          type: 'local',
          asset
        }
      })

      setSelectedSourceType('local')
    } catch (reason: unknown) {
      setImportError(getFileImportErrorMessage(reason))
    } finally {
      setIsPicking(false)
    }
  }

  return (
    <div className="grid min-w-0 gap-5">
      {(block.type === 'image' || block.type === 'video') && (
        <SettingsField label="Источник">
          <SegmentedChoice
            value={selectedSourceType}
            options={block.type === 'video' ? studyVideoSources : studyFileSources}
            ariaLabel={`Источник блока «${getStudyBlockDefinition(block.type).label}»`}
            columns={2}
            onValueChange={(value) => {
              setImportError(null)

              if (value === 'local' || value === 'url') {
                setSelectedSourceType(value)
              }
            }}
          />

          <p className="text-[11px] leading-5 text-(--app-muted)">
            Текущий источник: {block.source.type === 'local' ? 'компьютер' : 'ссылка'}. Переключение
            вкладки не заменяет сохранённое медиа.
          </p>
        </SettingsField>
      )}

      {selectedSourceType === 'local' && (
        <div className="grid min-w-0 gap-2">
          <span className="text-[11px] font-medium text-(--app-muted)">
            {getLocalSourceLabel(block.type)}
          </span>

          <button
            type="button"
            disabled={isPicking}
            className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-(--app-border) bg-(--app-workspace) px-3 py-2 text-sm font-medium text-(--app-text) transition-colors outline-none hover:border-violet-500/35 hover:bg-violet-500/[0.06] focus-visible:ring-2 focus-visible:ring-violet-500/35 disabled:cursor-wait disabled:opacity-60"
            onClick={() => {
              void chooseLocalFile()
            }}
          >
            {isPicking ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Upload aria-hidden="true" className="size-4 text-violet-300" />
            )}

            {localAsset ? 'Заменить' : 'Выбрать'}
          </button>

          {localAsset && (
            <div className="flex w-full min-w-0 items-start gap-2 overflow-hidden rounded-lg border border-(--app-border) bg-white/[0.025] p-3">
              <StudyFileSettingsIcon kind={block.type} />

              <div className="min-w-0 flex-1 overflow-hidden">
                <p
                  title={localAsset.name}
                  className="block w-full truncate text-xs font-medium text-(--app-text)"
                >
                  {localAsset.name}
                </p>

                <p className="mt-1 truncate text-[11px] text-(--app-muted)">
                  {formatStudyFileSize(localAsset.size)}
                </p>
              </div>

              <button
                type="button"
                aria-label="Удалить выбранное вложение"
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-(--app-muted) outline-none hover:bg-red-500/10 hover:text-red-300 focus-visible:ring-2 focus-visible:ring-red-500/30"
                onClick={() => {
                  onChange({
                    ...block,
                    source: {
                      type: 'local'
                    }
                  })
                }}
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          )}

          {importError && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs leading-5 text-red-300">
              {importError}
            </p>
          )}
        </div>
      )}

      {(block.type === 'image' || block.type === 'video') && selectedSourceType === 'url' && (
        <div className="grid min-w-0 gap-2">
          <span className="text-[11px] font-medium text-(--app-muted)">
            {block.type === 'video' ? 'Ссылка на YouTube' : 'Прямая HTTPS-ссылка'}
          </span>

          <label className="flex min-h-10 w-full max-w-full min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-(--app-border) bg-(--app-workspace) px-3 focus-within:border-violet-500/45">
            {block.type === 'video' ? (
              <SquarePlay aria-hidden="true" className="size-4 shrink-0 text-violet-300" />
            ) : (
              <Link2 aria-hidden="true" className="size-4 shrink-0 text-(--app-muted)" />
            )}

            <input
              value={remoteUrlDraft}
              placeholder={
                block.type === 'image'
                  ? 'https://site.com/photo.jpg'
                  : 'https://www.youtube.com/watch?v=...'
              }
              className="w-0 min-w-0 flex-1 bg-transparent py-2 text-sm text-(--app-text) outline-none placeholder:text-(--app-muted)/60"
              onChange={(event) => {
                setRemoteUrlDraft(event.target.value)
              }}
            />
          </label>

          {normalizedRemoteUrlDraft &&
            (block.type === 'video'
              ? !isValidStudyYouTubeUrl(normalizedRemoteUrlDraft)
              : !isValidStudyRemoteMediaUrl(normalizedRemoteUrlDraft)) && (
              <p className="text-xs leading-5 text-amber-300">
                {block.type === 'video'
                  ? 'Используй ссылку на видео с youtube.com или youtu.be.'
                  : 'Используй прямую HTTPS-ссылку без логина и пароля.'}
              </p>
            )}

          <div className="flex min-w-0 gap-2">
            <button
              type="button"
              disabled={!canApplyRemoteUrl}
              className="min-h-9 min-w-0 flex-1 rounded-lg bg-violet-500/15 px-3 text-xs font-semibold text-violet-200 transition-colors outline-none hover:bg-violet-500/25 focus-visible:ring-2 focus-visible:ring-violet-500/35 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => {
                if (!canApplyRemoteUrl) {
                  return
                }

                onChange({
                  ...block,
                  source: {
                    type: 'url',
                    url: normalizedRemoteUrlDraft
                  }
                })
              }}
            >
              {block.source.type === 'url' ? 'Применить изменения' : 'Использовать ссылку'}
            </button>

            {block.source.type === 'url' && savedRemoteUrl && (
              <button
                type="button"
                aria-label="Удалить сохранённую ссылку"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-(--app-border) text-(--app-muted) transition-colors outline-none hover:border-red-500/30 hover:text-red-300 focus-visible:ring-2 focus-visible:ring-red-500/30"
                onClick={() => {
                  setRemoteUrlDraft('')

                  onChange({
                    ...block,
                    source: {
                      type: 'url',
                      url: ''
                    }
                  })
                }}
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <SettingsField label="Название">
        <input
          value={block.title ?? ''}
          placeholder="Необязательное название"
          className="w-full max-w-full min-w-0 rounded-lg border border-(--app-border) bg-(--app-workspace) px-3 py-2 text-sm text-(--app-text) outline-none placeholder:text-(--app-muted)/60 focus:border-violet-500/45"
          onChange={(event) => {
            onChange({
              ...block,
              title: event.target.value
            })
          }}
        />
      </SettingsField>

      {block.type === 'image' && (
        <>
          <SettingsField label="Заполнение">
            <SegmentedChoice
              value={block.imageFit ?? 'contain'}
              options={studyImageFits}
              ariaLabel="Способ отображения фотографии"
              columns={2}
              onValueChange={(imageFit) => {
                if (imageFit !== 'contain' && imageFit !== 'cover') {
                  return
                }

                onChange({
                  ...block,
                  imageFit
                })
              }}
            />
          </SettingsField>

          <SettingsField label={`Высота: ${block.imageHeight ?? 360}px`}>
            <Slider.Root
              min={180}
              max={720}
              step={20}
              value={[block.imageHeight ?? 360]}
              aria-label="Высота фотографии"
              className="relative flex h-5 w-full touch-none items-center select-none"
              onValueChange={(values) => {
                const imageHeight = values[0]

                if (typeof imageHeight !== 'number') {
                  return
                }

                onChange({
                  ...block,
                  imageHeight
                })
              }}
            >
              <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-white/[0.08]">
                <Slider.Range className="absolute h-full bg-violet-500" />
              </Slider.Track>

              <Slider.Thumb className="block size-4 rounded-full border-2 border-violet-400 bg-(--app-surface-raised) outline-none hover:scale-110 focus-visible:ring-4 focus-visible:ring-violet-500/20" />
            </Slider.Root>
          </SettingsField>
        </>
      )}
    </div>
  )
}

function isStudyAttachmentBlock(block: StudyBlock): block is StudyAttachmentBlock {
  return (
    block.type === 'image' ||
    block.type === 'video' ||
    block.type === 'audio' ||
    block.type === 'file'
  )
}

function StudyFileSettingsIcon({ kind }: { kind: StudyAssetKind }): React.JSX.Element {
  const Icon = getStudyBlockDefinition(kind).icon

  return <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-violet-300" />
}

function getLocalSourceLabel(kind: StudyAssetKind): string {
  if (kind === 'image') {
    return 'Фотография с компьютера'
  }

  if (kind === 'video') {
    return 'Видео с компьютера'
  }

  if (kind === 'audio') {
    return 'Аудио с компьютера'
  }

  return 'Файл с компьютера'
}

function getFileImportErrorMessage(reason: unknown): string {
  if (reason instanceof Error && reason.message) {
    return reason.message
  }

  return 'Не удалось импортировать вложение'
}

function DividerSettings({
  block,
  onChange
}: {
  block: Extract<
    StudyBlock,
    {
      type: 'divider'
    }
  >
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  const variant = block.variant ?? DEFAULT_DIVIDER_VARIANT

  const thickness = block.thickness ?? DEFAULT_DIVIDER_THICKNESS

  const color = block.color ?? DEFAULT_DIVIDER_COLOR

  const usesAccentColor = color.toLowerCase() === DEFAULT_DIVIDER_COLOR

  return (
    <div className="grid gap-4">
      <SettingsField label="Стиль">
        <SegmentedChoice
          value={variant}
          options={studyDividerVariants}
          ariaLabel="Стиль разделителя"
          columns={2}
          onValueChange={(nextVariant) => {
            if (
              nextVariant !== 'solid' &&
              nextVariant !== 'tapered' &&
              nextVariant !== 'dashed' &&
              nextVariant !== 'dotted'
            ) {
              return
            }

            onChange({
              ...block,
              variant: nextVariant
            })
          }}
        />
      </SettingsField>

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

      <SettingsField label="Цвет">
        <ColorPicker
          value={color}
          displayColor={usesAccentColor ? DEFAULT_DIVIDER_CSS_COLOR : color}
          displayLabel={usesAccentColor ? 'Акцент приложения' : color.toUpperCase()}
          ariaLabel="Цвет разделителя"
          onChange={(nextColor) => {
            onChange({
              ...block,
              color: nextColor
            })
          }}
          clearLabel="Использовать акцент приложения"
          onClear={() => {
            onChange({
              ...block,
              color: DEFAULT_DIVIDER_COLOR
            })
          }}
        />
      </SettingsField>

      <Separator.Root className="h-px bg-(--app-border)" />

      <SettingsField label="Предпросмотр">
        <div className="rounded-xl border border-(--app-border) bg-(--app-workspace) px-4 py-6">
          <StudyDivider block={block} spacing="none" />
        </div>
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
    <label className="grid min-w-0 gap-2">
      <span className="text-[11px] font-medium text-(--app-muted)">{label}</span>

      {children}
    </label>
  )
}
