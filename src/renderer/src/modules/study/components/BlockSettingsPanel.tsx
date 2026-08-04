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

type SettingsRendererProps = Omit<BlockSettingsPanelProps, 'block' | 'importAsset'> & {
  block: StudyBlock
  importAsset: NonNullable<BlockSettingsPanelProps['importAsset']>
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
  divider: DividerBlockSettings,
  board: BoardBlockSettings
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
  block: Extract<StudyBlock, { type: 'code' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  return (
    <div className="grid gap-4">
      <SettingsField label="Язык">
        <StudySelect
          value={block.language}
          options={STUDY_CODE_LANGUAGE_OPTIONS}
          ariaLabel="Язык кода"
          onValueChange={(language) => {
            onChange({
              ...block,
              language
            })
          }}
        />
      </SettingsField>
    </div>
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
          value={block.viewMode}
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
  return (
    <div className="grid gap-4">
      <SettingsField label="Режим">
        <SegmentedChoice
          value={block.viewMode}
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

      <SettingsField label="Формула">
        <SegmentedChoice
          value={block.displayMode}
          options={latexDisplayModes}
          ariaLabel="Тип отображения формулы"
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
          value={block.alignment}
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
    </div>
  )
}

function MermaidSettings({
  block,
  onChange
}: {
  block: Extract<StudyBlock, { type: 'mermaid' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  const [template, setTemplate] = useState('')

  return (
    <div className="grid gap-4">
      <SettingsField label="Режим">
        <SegmentedChoice
          value={block.viewMode}
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
        <StudySelect
          value={block.theme}
          options={mermaidThemes}
          ariaLabel="Тема Mermaid-диаграммы"
          onValueChange={(theme) => {
            if (theme !== 'dark' && theme !== 'default' && theme !== 'neutral' && theme !== 'forest') {
              return
            }

            onChange({
              ...block,
              theme
            })
          }}
        />
      </SettingsField>

      <SettingsField label="Шаблон">
        <div className="grid gap-2">
          <StudySelect
            value={template}
            options={STUDY_MERMAID_TEMPLATES.map(({ id, label }) => ({
              value: id,
              label
            }))}
            placeholder="Выберите шаблон"
            ariaLabel="Шаблон Mermaid-диаграммы"
            onValueChange={(templateId) => {
              const nextTemplate = STUDY_MERMAID_TEMPLATES.find(({ id }) => id === templateId)
              setTemplate(templateId)

              if (!nextTemplate) {
                return
              }

              onChange({
                ...block,
                source: nextTemplate.source
              })
            }}
          />

          <p className="text-xs leading-5 text-(--app-muted)">
            Шаблон заменит текущий код диаграммы.
          </p>
        </div>
      </SettingsField>
    </div>
  )
}

type StudyAttachmentBlock = Extract<
  StudyBlock,
  {
    type: 'image' | 'video' | 'audio' | 'file'
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
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const isVideo = block.type === 'video'
  const isImage = block.type === 'image'
  const sourceOptions = isVideo ? studyVideoSources : studyFileSources

  function updateSourceType(type: 'local' | 'url'): void {
    onChange({
      ...block,
      source: {
        type,
        asset: type === 'local' ? block.source.asset : undefined,
        url: type === 'url' ? block.source.url : undefined
      }
    })
    setImportError(null)
  }

  async function chooseLocalFile(): Promise<void> {
    setIsImporting(true)
    setImportError(null)

    try {
      const asset = await studyClient.importAsset({
        nodeId: materialId,
        kind: getStudyAssetKind(block.type)
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
    } catch (reason: unknown) {
      setImportError(reason instanceof Error ? reason.message : 'Не удалось импортировать файл')
    } finally {
      setIsImporting(false)
    }
  }

  function updateRemoteUrl(url: string): void {
    onChange({
      ...block,
      source: {
        type: 'url',
        url
      }
    })
  }

  return (
    <div className="grid gap-5">
      <SettingsField label="Источник">
        <SegmentedChoice
          value={block.source.type}
          options={sourceOptions}
          ariaLabel="Источник файла"
          columns={2}
          onValueChange={(value) => {
            if (value !== 'local' && value !== 'url') {
              return
            }

            updateSourceType(value)
          }}
        />
      </SettingsField>

      {block.source.type === 'local' ? (
        <div className="grid gap-3">
          {block.source.asset && (
            <div className="rounded-xl border border-(--app-border) bg-(--app-workspace) p-3">
              <p className="truncate text-sm font-medium text-(--app-text)">
                {block.source.asset.name}
              </p>

              <p className="mt-1 text-xs text-(--app-muted)">
                {formatStudyFileSize(block.source.asset.size)}
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={isImporting}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-2.5 text-sm font-medium text-violet-200 transition-colors outline-none hover:border-violet-400/35 hover:bg-violet-500/15 focus-visible:ring-2 focus-visible:ring-violet-500/35 disabled:cursor-wait disabled:opacity-60"
            onClick={() => {
              void chooseLocalFile()
            }}
          >
            {isImporting ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Upload aria-hidden="true" className="size-4" />
            )}

            {block.source.asset ? 'Заменить файл' : 'Выбрать файл'}
          </button>
        </div>
      ) : (
        <div className="grid gap-2">
          <label className="grid gap-2">
            <span className="text-xs font-medium text-(--app-muted)">
              {isVideo ? 'YouTube-ссылка' : 'URL файла'}
            </span>

            <div className="relative">
              {isVideo ? (
                <SquarePlay
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-red-300"
                />
              ) : (
                <Link2
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--app-muted)"
                />
              )}

              <input
                type="url"
                value={block.source.url ?? ''}
                placeholder={
                  isVideo ? 'https://www.youtube.com/watch?v=...' : 'https://example.com/file'
                }
                spellCheck={false}
                aria-label={isVideo ? 'YouTube-ссылка' : 'URL файла'}
                className="h-10 w-full rounded-lg border border-(--app-border) bg-(--app-workspace) pr-3 pl-9 text-sm text-(--app-text) outline-none transition-colors placeholder:text-(--app-muted) focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
                onChange={(event) => updateRemoteUrl(event.target.value)}
              />
            </div>
          </label>

          {block.source.url && !isValidStudyRemoteMediaUrl(block.source.url) && (
            <p className="text-xs text-amber-300">Укажите корректную http/https-ссылку.</p>
          )}

          {isVideo &&
            block.source.url &&
            isValidStudyRemoteMediaUrl(block.source.url) &&
            !isValidStudyYouTubeUrl(block.source.url) && (
              <p className="text-xs text-amber-300">Для видео поддерживаются ссылки YouTube.</p>
            )}
        </div>
      )}

      {importError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-300">
          {importError}
        </div>
      )}

      {isImage && (
        <SettingsField label="Вписывание">
          <SegmentedChoice
            value={block.fit}
            options={studyImageFits}
            ariaLabel="Вписывание изображения"
            columns={2}
            onValueChange={(fit) => {
              if (fit !== 'contain' && fit !== 'cover') {
                return
              }

              onChange({
                ...block,
                fit
              })
            }}
          />
        </SettingsField>
      )}
    </div>
  )
}

function DividerBlockSettings({ block, onChange }: SettingsRendererProps): React.JSX.Element {
  if (block.type !== 'divider') {
    throw new Error('Divider settings received an incompatible block')
  }

  return <DividerSettings block={block} onChange={onChange} />
}

function DividerSettings({
  block,
  onChange
}: {
  block: Extract<StudyBlock, { type: 'divider' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  const color = block.color ?? DEFAULT_DIVIDER_COLOR
  const thickness = block.thickness ?? DEFAULT_DIVIDER_THICKNESS
  const variant = block.variant ?? DEFAULT_DIVIDER_VARIANT

  return (
    <div className="grid gap-5">
      <SettingsField label="Вид">
        <SegmentedChoice
          value={variant}
          options={studyDividerVariants}
          ariaLabel="Вид разделителя"
          columns={2}
          onValueChange={(value) => {
            if (value !== 'solid' && value !== 'tapered' && value !== 'dashed' && value !== 'dotted') {
              return
            }

            onChange({
              ...block,
              variant: value
            })
          }}
        />
      </SettingsField>

      <SettingsField label="Цвет">
        <ColorPicker
          value={color}
          ariaLabel="Цвет разделителя"
          clearLabel="Сбросить"
          onChange={(nextColor) => {
            onChange({
              ...block,
              color: nextColor
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

      <SettingsField label="Толщина">
        <div className="grid gap-3">
          <Slider.Root
            min={1}
            max={12}
            step={1}
            value={[thickness]}
            aria-label="Толщина разделителя"
            className="relative flex h-5 touch-none items-center select-none"
            onValueChange={([nextThickness]) => {
              if (nextThickness === undefined) {
                return
              }

              onChange({
                ...block,
                thickness: nextThickness
              })
            }}
          >
            <Slider.Track className="relative h-1.5 grow rounded-full bg-(--app-border)">
              <Slider.Range className="absolute h-full rounded-full bg-violet-500" />
            </Slider.Track>

            <Slider.Thumb className="block size-4 rounded-full border border-violet-300/50 bg-violet-400 shadow outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40" />
          </Slider.Root>

          <div className="flex items-center justify-between gap-3 text-xs text-(--app-muted)">
            <span>{thickness}px</span>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-(--app-muted) transition-colors outline-none hover:bg-white/5 hover:text-(--app-text) focus-visible:ring-2 focus-visible:ring-violet-500/30"
              onClick={() => {
                onChange({
                  ...block,
                  color: undefined,
                  thickness: undefined,
                  variant: undefined
                })
              }}
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
              Сбросить оформление
            </button>
          </div>
        </div>
      </SettingsField>

      <SettingsField label="Предпросмотр">
        <div className="rounded-xl border border-(--app-border) bg-(--app-workspace) p-4">
          <StudyDivider
            color={block.color ?? DEFAULT_DIVIDER_CSS_COLOR}
            thickness={thickness}
            variant={variant}
          />
        </div>
      </SettingsField>
    </div>
  )
}

function BoardBlockSettings({ block }: SettingsRendererProps): React.JSX.Element {
  if (block.type !== 'board') {
    throw new Error('Board settings received an incompatible block')
  }

  return (
    <div className="grid gap-3 rounded-xl border border-(--app-border) bg-(--app-workspace) p-3">
      <p className="text-sm font-medium text-(--app-text)">Доска</p>
      <p className="text-xs leading-5 text-(--app-muted)">
        Доска хранится в общей ветке «Обучение» модуля досок и доступна только из этого
        материала.
      </p>
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

function getStudyAssetKind(type: StudyAttachmentBlock['type']): StudyAssetKind {
  if (type === 'image' || type === 'video' || type === 'audio') {
    return type
  }

  return 'file'
}

function SettingsField({
  label,
  children
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="grid min-w-0 gap-2.5">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-[11px] font-semibold tracking-[0.08em] text-(--app-muted) uppercase">
          {label}
        </span>

        <Separator.Root
          decorative
          orientation="horizontal"
          className="h-px flex-1 bg-(--app-border)"
        />
      </div>

      <div className="min-w-0">{children}</div>
    </div>
  )
}
