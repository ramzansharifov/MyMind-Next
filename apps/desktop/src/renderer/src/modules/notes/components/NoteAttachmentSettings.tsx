import * as ToggleGroup from '@radix-ui/react-toggle-group'
import {
  Check,
  Crop,
  File,
  Image,
  Link2,
  LoaderCircle,
  Monitor,
  Mic,
  Music2,
  RotateCcw,
  Scan,
  Trash2,
  Upload,
  Video,
  X
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '../../../shared/lib/cn'
import { Tooltip } from '../../../shared/ui/tooltip'
import {
  formatStudyFileSize,
  isValidStudyRemoteMediaUrl,
  isValidStudyYouTubeUrl
} from '../../study/components/file/file-utils'
import { useStudyBlockAssetClient } from '../../study/components/study-block-asset-context'
import type { NoteAttachmentBlock } from '../lib/note-canvas-document'

interface NoteAttachmentSettingsProps {
  noteId: string
  block: NoteAttachmentBlock
  isVoiceRecording?: boolean
  onRecordAgain?: () => Promise<void>
  isRecordingBusy?: boolean
  onChange: (block: NoteAttachmentBlock) => void
  onDelete: () => void
  onClose: () => void
}

const labels = { image: 'Изображение', video: 'Видео', audio: 'Аудио', file: 'Файл' }
const attachmentIcons = { image: Image, video: Video, audio: Music2, file: File }
const controlClass =
  'flex size-9 shrink-0 items-center justify-center rounded-lg border border-(--app-border) bg-(--app-workspace) text-(--app-muted) transition-colors outline-none hover:bg-white/[0.05] hover:text-(--app-text) focus-visible:ring-2 focus-visible:ring-(--app-accent-500)/40 disabled:cursor-not-allowed disabled:opacity-35'
const activeClass =
  'border-[color-mix(in_srgb,var(--app-accent-500)_72%,white_8%)] bg-[color-mix(in_srgb,var(--app-accent-500)_24%,var(--app-workspace))] text-[color-mix(in_srgb,var(--app-accent-400)_88%,white)]'

export function NoteAttachmentSettings({
  noteId,
  block,
  isVoiceRecording = false,
  onRecordAgain,
  isRecordingBusy = false,
  onChange,
  onDelete,
  onClose
}: NoteAttachmentSettingsProps): React.JSX.Element {
  const assetClient = useStudyBlockAssetClient()
  const [sourceType, setSourceType] = useState(block.source.type)
  const [urlDraft, setUrlDraft] = useState(block.source.type === 'url' ? block.source.url : '')
  const [isPicking, setIsPicking] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const latestRef = useRef({ block, onChange })
  const mountedRef = useRef(true)
  const pickingRef = useRef(false)
  const localAsset = block.source.type === 'local' ? block.source.asset : undefined
  const savedUrl = block.source.type === 'url' ? block.source.url : ''
  const url = urlDraft.trim()
  const validUrl =
    block.type === 'video' ? isValidStudyYouTubeUrl(url) : isValidStudyRemoteMediaUrl(url)
  const supportsUrl = block.type === 'image' || block.type === 'video'
  const AttachmentIcon = isVoiceRecording ? Mic : attachmentIcons[block.type]

  useEffect(() => {
    latestRef.current = { block, onChange }
  }, [block, onChange])
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  async function chooseFile(): Promise<void> {
    if (pickingRef.current) return
    pickingRef.current = true
    setIsPicking(true)
    setImportError(null)
    try {
      const asset = await assetClient.importAsset({ nodeId: noteId, kind: block.type })
      if (!asset || !mountedRef.current) return
      const latest = latestRef.current
      latest.onChange({ ...latest.block, source: { type: 'local', asset } })
      setSourceType('local')
    } catch (reason: unknown) {
      if (mountedRef.current)
        setImportError(reason instanceof Error ? reason.message : 'Не удалось добавить файл')
    } finally {
      pickingRef.current = false
      if (mountedRef.current) setIsPicking(false)
    }
  }

  function applyUrl(): void {
    if ((block.type === 'image' || block.type === 'video') && validUrl && url !== savedUrl) {
      onChange({ ...block, source: { type: 'url', url } })
    }
  }

  return (
    <section data-rich-text-settings-section data-note-attachment-settings className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold tracking-[0.08em] text-(--app-muted) uppercase">
          {isVoiceRecording ? 'Голосовое' : labels[block.type]}
        </h3>
        <div className="flex items-center gap-1">
          <AttachmentControl
            label="Удалить блок вложения"
            onClick={onDelete}
            disabled={isPicking}
            danger
          >
            <Trash2 className="size-4 text-red-300" />
          </AttachmentControl>
          <AttachmentControl label="Закрыть настройки вложения" onClick={onClose}>
            <X className="size-4" />
          </AttachmentControl>
        </div>
      </div>
      <div className="note-attachment-fields">
        {supportsUrl && (
          <div className="flex items-center justify-between">
            <span className="note-attachment-label">Источник</span>
            <ToggleGroup.Root
              type="single"
              value={sourceType}
              aria-label="Источник вложения"
              className="flex gap-1"
              onValueChange={(value) => {
                if (value === 'local' || value === 'url') {
                  setSourceType(value)
                  setImportError(null)
                }
              }}
            >
              <AttachmentToggle
                value="local"
                label="Файл с компьютера"
                active={sourceType === 'local'}
              >
                <Monitor className="size-4" />
              </AttachmentToggle>
              <AttachmentToggle
                value="url"
                label={
                  block.type === 'video' ? 'Видео по ссылке YouTube' : 'Изображение по HTTPS-ссылке'
                }
                active={sourceType === 'url'}
              >
                <Link2 className="size-4" />
              </AttachmentToggle>
            </ToggleGroup.Root>
          </div>
        )}
        {sourceType === 'local' ? (
          <div className="note-attachment-source-row">
            <AttachmentIcon
              aria-hidden="true"
              className="size-3.5 shrink-0 text-(--app-accent-500)"
            />
            <Tooltip
              content={
                localAsset
                  ? `${localAsset.name} · ${formatStudyFileSize(localAsset.size)}`
                  : isVoiceRecording
                    ? 'Начните запись в блоке голосового сообщения'
                    : 'Выберите файл с компьютера'
              }
              side="top"
            >
              <span className="min-w-0 flex-1 truncate text-xs text-(--app-muted)" tabIndex={0}>
                {localAsset?.name ??
                  (isVoiceRecording ? 'Запись ещё не добавлена' : 'Выбрать файл')}
              </span>
            </Tooltip>
            {!isVoiceRecording && (
              <AttachmentControl
                label={localAsset ? 'Заменить файл' : 'Выбрать файл'}
                disabled={isPicking}
                onClick={() => {
                  void chooseFile()
                }}
              >
                {isPicking ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4 text-(--app-accent-500)" />
                )}
              </AttachmentControl>
            )}
            {isVoiceRecording && localAsset && (
              <AttachmentControl
                label="Записать заново"
                disabled={isRecordingBusy || !onRecordAgain}
                onClick={() => {
                  void onRecordAgain?.()
                }}
              >
                <RotateCcw className="size-4 text-(--app-accent-500)" />
              </AttachmentControl>
            )}
          </div>
        ) : (
          <div className="note-attachment-source-row">
            <input
              aria-label={
                block.type === 'video' ? 'Ссылка на видео YouTube' : 'HTTPS-ссылка на изображение'
              }
              value={urlDraft}
              placeholder={block.type === 'video' ? 'Ссылка на YouTube' : 'HTTPS-ссылка'}
              className="note-attachment-url-input"
              onChange={(event) => setUrlDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  applyUrl()
                }
              }}
            />
            <AttachmentControl
              label="Применить ссылку"
              disabled={!validUrl || url === savedUrl}
              onClick={applyUrl}
            >
              <Check className="size-4 text-(--app-accent-500)" />
            </AttachmentControl>
          </div>
        )}
        {sourceType === 'url' && url && !validUrl && (
          <p role="status" className="text-[11px] text-amber-300">
            {block.type === 'video' ? 'Нужна ссылка на видео YouTube' : 'Нужна прямая HTTPS-ссылка'}
          </p>
        )}
        {importError && (
          <p role="alert" className="text-[11px] leading-4 break-words text-red-300">
            {importError}
          </p>
        )}
        <input
          aria-label="Название вложения"
          value={block.title ?? ''}
          placeholder="Название (необязательно)"
          className="note-attachment-title-input"
          onChange={(event) => onChange({ ...block, title: event.target.value })}
        />
        {block.type === 'image' && (
          <>
            <div className="flex items-center justify-between">
              <span className="note-attachment-label">Отображение</span>
              <ToggleGroup.Root
                type="single"
                value={block.imageFit ?? 'contain'}
                aria-label="Отображение изображения"
                className="flex gap-1"
                onValueChange={(value) => {
                  if (value === 'contain' || value === 'cover')
                    onChange({ ...block, imageFit: value })
                }}
              >
                <AttachmentToggle
                  value="contain"
                  label="Показать изображение целиком"
                  active={(block.imageFit ?? 'contain') === 'contain'}
                >
                  <Scan className="size-4" />
                </AttachmentToggle>
                <AttachmentToggle
                  value="cover"
                  label="Заполнить рамку изображением"
                  active={block.imageFit === 'cover'}
                >
                  <Crop className="size-4" />
                </AttachmentToggle>
              </ToggleGroup.Root>
            </div>
            <div className="note-attachment-height">
              <span className="note-attachment-label">Высота</span>
              <ImageHeightRuler
                value={block.imageHeight ?? 360}
                onChange={(imageHeight) => onChange({ ...block, imageHeight })}
              />
            </div>
          </>
        )}
      </div>
    </section>
  )
}

function AttachmentControl({
  label,
  onClick,
  disabled = false,
  danger = false,
  children
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: ReactNode
}): React.JSX.Element {
  return (
    <Tooltip content={label} side="top">
      <button
        type="button"
        aria-label={label}
        data-rich-text-formatting-control
        disabled={disabled}
        className={cn(controlClass, danger && 'hover:bg-red-500/10 hover:text-red-300')}
        onClick={onClick}
      >
        {children}
      </button>
    </Tooltip>
  )
}

function AttachmentToggle({
  value,
  label,
  active,
  children
}: {
  value: string
  label: string
  active: boolean
  children: ReactNode
}): React.JSX.Element {
  return (
    <Tooltip content={label} side="top">
      <ToggleGroup.Item
        value={value}
        aria-label={label}
        data-rich-text-formatting-control
        data-active={active ? 'true' : 'false'}
        className={cn(controlClass, active && activeClass)}
      >
        {children}
      </ToggleGroup.Item>
    </Tooltip>
  )
}

function ImageHeightRuler({
  value,
  onChange
}: {
  value: number
  onChange: (height: number) => void
}): React.JSX.Element {
  const heights = [
    ...new Set([180, 220, 260, 300, 340, 360, 400, 440, 500, 560, 640, 720, value])
  ].sort((a, b) => a - b)
  const selectedIndex = heights.indexOf(value)
  return (
    <div className="rich-text-size-ruler__controls">
      <Tooltip content="Уменьшить высоту изображения" side="top">
        <button
          type="button"
          aria-label="Уменьшить высоту изображения"
          className="rich-text-size-ruler__step"
          disabled={selectedIndex === 0}
          onClick={() => onChange(heights[selectedIndex - 1])}
        >
          <Image aria-hidden="true" className="size-3" />
        </button>
      </Tooltip>
      <ToggleGroup.Root
        type="single"
        value={String(value)}
        aria-label="Высота изображения"
        className="rich-text-size-ruler__ticks"
        onValueChange={(next) => {
          if (next) onChange(Number(next))
        }}
      >
        {heights.map((height, index) => (
          <Tooltip key={height} content={`${height} пикселей`} side="top">
            <ToggleGroup.Item
              value={String(height)}
              aria-label={`Высота изображения ${height} пикселей`}
              className="rich-text-size-ruler__tick"
              data-passed={height <= value ? 'true' : 'false'}
              data-selected={height === value ? 'true' : 'false'}
            >
              <span aria-hidden="true" style={{ height: `${7 + index}px` }} />
            </ToggleGroup.Item>
          </Tooltip>
        ))}
      </ToggleGroup.Root>
      <Tooltip content="Увеличить высоту изображения" side="top">
        <button
          type="button"
          aria-label="Увеличить высоту изображения"
          className="rich-text-size-ruler__step"
          disabled={selectedIndex === heights.length - 1}
          onClick={() => onChange(heights[selectedIndex + 1])}
        >
          <Image aria-hidden="true" className="size-5" />
        </button>
      </Tooltip>
    </div>
  )
}
