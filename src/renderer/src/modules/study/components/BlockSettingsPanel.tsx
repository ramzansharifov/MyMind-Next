import type { Editor } from '@tiptap/core'
import * as Separator from '@radix-ui/react-separator'
import * as Slider from '@radix-ui/react-slider'
import {
  Code2,
  FileAudio,
  FileCode2,
  FileImage,
  Files,
  FileVideo,
  Heading,
  Link2,
  LoaderCircle,
  Minus,
  Settings2,
  Sigma,
  Trash2,
  Type,
  Upload,
  Workflow
} from 'lucide-react'
import { useState } from 'react'

import type { StudyAssetKind, StudyBlock } from '../../../../../shared/contracts/study'
import {
  DEFAULT_DIVIDER_COLOR,
  DEFAULT_DIVIDER_THICKNESS,
  DEFAULT_HEADING_BACKGROUND_COLOR,
  DEFAULT_HEADING_COLOR
} from '../lib/study-document'
import { studyClient } from '../api/study-client'
import { RichTextSettings } from './rich-text/RichTextSettings'
import { STUDY_CODE_LANGUAGE_OPTIONS } from './code/code-languages'
import { formatStudyFileSize, isValidStudyRemoteMediaUrl } from './file/file-utils'
import { STUDY_MERMAID_TEMPLATES } from './mermaid/mermaid-templates'
import { ColorPicker } from './settings/ColorPicker'
import { SegmentedChoice } from './settings/SegmentedChoice'
import { StudySelect } from './settings/StudySelect'

interface BlockSettingsPanelProps {
  materialId: string
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

export function BlockSettingsPanel({
  materialId,
  block,
  textEditor,
  onChange
}: BlockSettingsPanelProps): React.JSX.Element {
  if (!block) {
    return (
      <aside className="w-full min-w-0 max-w-full rounded-xl border border-(--app-border) bg-(--app-surface) p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-(--app-text)">
          <Settings2 aria-hidden="true" className="size-4 text-violet-300" />
          Настройки
        </div>

        <p className="mt-3 text-sm text-(--app-muted)">Выбери блок</p>
      </aside>
    )
  }

  return (
    <aside className="flex max-h-[calc(100vh-150px)] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-(--app-border) bg-(--app-surface) max-[1180px]:max-h-none">
      <header className="flex shrink-0 items-center gap-3 border-b border-(--app-border) px-4 py-3.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
          <BlockTypeIcon type={block.type} />
        </div>

        <div className="min-w-0 flex-1">
          <p
            title={getBlockTitle(block)}
            className="truncate text-sm font-medium text-(--app-text)"
          >
            {getBlockTitle(block)}
          </p>

          <p className="mt-0.5 text-[11px] text-(--app-muted)">
            Настройки блока
          </p>
        </div>
      </header>

      <div className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain p-4 [scrollbar-gutter:stable] max-[1180px]:overflow-visible max-[640px]:p-3">
        {block.type === 'text' && <RichTextSettings key={block.id} editor={textEditor} />}

        {block.type === 'heading' && <HeadingSettings block={block} onChange={onChange} />}

        {block.type === 'code' && <CodeSettings block={block} onChange={onChange} />}

        {block.type === 'markdown' && <MarkdownSettings block={block} onChange={onChange} />}

        {block.type === 'latex' && <LatexSettings block={block} onChange={onChange} />}

        {block.type === 'mermaid' && <MermaidSettings block={block} onChange={onChange} />}

        {isStudyAttachmentBlock(block) && (
          <AttachmentSettings materialId={materialId} block={block} onChange={onChange} />
        )}

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
function MermaidSettings({
  block,
  onChange
}: {
  block: Extract<StudyBlock, { type: 'mermaid' }>
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

  const localAsset = block.source.type === 'local' ? block.source.asset : undefined

  const remoteUrl = block.source.type === 'url' ? block.source.url : ''

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
            value={block.source.type}
            options={studyFileSources}
            ariaLabel={`Источник блока «${getAssetKindLabel(block.type)}»`}
            columns={2}
            onValueChange={(value) => {
              setImportError(null)

              if (value === 'local') {
                onChange({
                  ...block,
                  source: {
                    type: 'local'
                  }
                })

                return
              }

              if (value === 'url' && (block.type === 'image' || block.type === 'video')) {
                onChange({
                  ...block,
                  source: {
                    type: 'url',
                    url: ''
                  }
                })
              }
            }}
          />
        </SettingsField>
      )}

      {block.source.type === 'local' && (
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

      {(block.type === 'image' || block.type === 'video') && block.source.type === 'url' && (
        <div className="grid min-w-0 gap-2">
          <span className="text-[11px] font-medium text-(--app-muted)">Прямая HTTPS-ссылка</span>

          <label className="flex min-h-10 w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-lg border border-(--app-border) bg-(--app-workspace) px-3 focus-within:border-violet-500/45">
            <Link2 aria-hidden="true" className="size-4 shrink-0 text-(--app-muted)" />

            <input
              value={remoteUrl}
              placeholder={
                block.type === 'image' ? 'https://site.com/photo.jpg' : 'https://site.com/video.mp4'
              }
              className="w-0 min-w-0 flex-1 bg-transparent py-2 text-sm text-(--app-text) outline-none placeholder:text-(--app-muted)/60"
              onChange={(event) => {
                onChange({
                  ...block,
                  source: {
                    type: 'url',
                    url: event.target.value
                  }
                })
              }}
            />
          </label>

          {remoteUrl.trim() && !isValidStudyRemoteMediaUrl(remoteUrl) && (
            <p className="text-xs leading-5 text-amber-300">
              Используй прямую HTTPS-ссылку без логина и пароля.
            </p>
          )}

          <p className="text-[11px] leading-5 text-(--app-muted)">
            Нужна ссылка непосредственно на файл, а не на страницу YouTube или другого сайта.
          </p>
        </div>
      )}

      <SettingsField label="Название">
        <input
          value={block.title ?? ''}
          placeholder="Необязательное название"
          className="w-full min-w-0 max-w-full rounded-lg border border-(--app-border) bg-(--app-workspace) px-3 py-2 text-sm text-(--app-text) outline-none placeholder:text-(--app-muted)/60 focus:border-violet-500/45"
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
          <SettingsField label="Описание изображения">
            <input
              value={block.altText ?? ''}
              placeholder="Что изображено на фотографии"
              className="w-full min-w-0 max-w-full rounded-lg border border-(--app-border) bg-(--app-workspace) px-3 py-2 text-sm text-(--app-text) outline-none placeholder:text-(--app-muted)/60 focus:border-violet-500/45"
              onChange={(event) => {
                onChange({
                  ...block,
                  altText: event.target.value
                })
              }}
            />
          </SettingsField>

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

      <SettingsField label="Подпись">
        <textarea
          value={block.caption ?? ''}
          rows={3}
          placeholder="Необязательная подпись или пояснение"
          className="w-full min-w-0 max-w-full resize-y rounded-lg border border-(--app-border) bg-(--app-workspace) px-3 py-2 text-sm leading-6 text-(--app-text) outline-none placeholder:text-(--app-muted)/60 focus:border-violet-500/45"
          onChange={(event) => {
            onChange({
              ...block,
              caption: event.target.value
            })
          }}
        />
      </SettingsField>
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
  const className = 'mt-0.5 size-4 shrink-0 text-violet-300'

  if (kind === 'image') {
    return <FileImage aria-hidden="true" className={className} />
  }

  if (kind === 'video') {
    return <FileVideo aria-hidden="true" className={className} />
  }

  if (kind === 'audio') {
    return <FileAudio aria-hidden="true" className={className} />
  }

  return <Files aria-hidden="true" className={className} />
}

function getAssetKindLabel(kind: StudyAssetKind): string {
  if (kind === 'image') {
    return 'Фото'
  }

  if (kind === 'video') {
    return 'Видео'
  }

  if (kind === 'audio') {
    return 'Аудио'
  }

  return 'Файл'
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
    <label className="grid min-w-0 gap-2">
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
  if (type === 'mermaid') {
    return <Workflow aria-hidden="true" className="size-4" />
  }

  if (type === 'image') {
    return <FileImage aria-hidden="true" className="size-4" />
  }

  if (type === 'video') {
    return <FileVideo aria-hidden="true" className="size-4" />
  }

  if (type === 'audio') {
    return <FileAudio aria-hidden="true" className="size-4" />
  }

  if (type === 'file') {
    return <Files aria-hidden="true" className="size-4" />
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
  if (block.type === 'mermaid') {
    return 'Mermaid'
  }

  if (block.type === 'image') {
    return 'Фото'
  }

  if (block.type === 'video') {
    return 'Видео'
  }

  if (block.type === 'audio') {
    return 'Аудио'
  }

  if (block.type === 'file') {
    return 'Файл'
  }

  if (block.type === 'divider') {
    return 'Разделитель'
  }

  return 'Форматированный текст'
}
