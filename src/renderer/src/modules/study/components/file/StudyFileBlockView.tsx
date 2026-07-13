import * as Dialog from '@radix-ui/react-dialog'
import {
  CircleAlert,
  ExternalLink,
  File,
  FileAudio,
  FileImage,
  FileVideo,
  LoaderCircle,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { useState } from 'react'

import type {
  OpenStudyAssetInput,
  StudyAssetKind,
  StudyBlock
} from '../../../../../../shared/contracts/study'
import { cn } from '../../../../shared/lib/cn'
import { studyClient } from '../../api/study-client'
import {
  formatStudyFileSize,
  normalizeStudyRemoteMediaUrl,
  parseStudyYouTubeUrl
} from './file-utils'
import { StudyAudioPlayer } from './StudyAudioPlayer'
import { StudyVideoPlayer } from './StudyVideoPlayer'
import { StudyYouTubePlayer } from './StudyYouTubePlayer'

type AttachmentBlock = Extract<
  StudyBlock,
  {
    type: StudyAssetKind
  }
>

interface StudyFileBlockViewProps {
  block: AttachmentBlock
  onOpenFile?: (input: OpenStudyAssetInput) => Promise<void>
}

export function StudyFileBlockView({
  block,
  onOpenFile = studyClient.openAsset
}: StudyFileBlockViewProps): React.JSX.Element {
  const asset = block.source.type === 'local' ? block.source.asset : undefined

  const sourceUrl = getStudyAttachmentSourceUrl(block)

  const youtubeVideo =
    block.type === 'video' && block.source.type === 'url'
      ? parseStudyYouTubeUrl(block.source.url)
      : null

  const sourceKey = `${block.type}:${sourceUrl ?? ''}`

  const [failedSourceKey, setFailedSourceKey] = useState<string | null>(null)
  const [isOpeningFile, setIsOpeningFile] = useState(false)
  const [openFileError, setOpenFileError] = useState<string | null>(null)

  const loadError = failedSourceKey === sourceKey

  const customTitle = block.title?.trim() ?? ''

  const accessibleTitle = customTitle || asset?.name || getStudyAssetKindLabel(block.type)

  async function openFile(input: OpenStudyAssetInput): Promise<void> {
    setIsOpeningFile(true)
    setOpenFileError(null)

    try {
      await onOpenFile(input)
    } catch (reason: unknown) {
      setOpenFileError(reason instanceof Error ? reason.message : 'Не удалось открыть файл')
    } finally {
      setIsOpeningFile(false)
    }
  }

  if (block.type === 'file') {
    if (!asset) {
      return <EmptyAttachmentBlock kind={block.type} message="Выбери файл в настройках блока" />
    }

    return (
      <section className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)]">
        <button
          type="button"
          disabled={isOpeningFile}
          aria-label={`Открыть файл «${customTitle || asset.name}»`}
          className="group flex w-full items-center gap-3 p-4 text-left transition-colors outline-none hover:bg-white/[0.035] focus-visible:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-violet-500/35 focus-visible:ring-inset disabled:cursor-wait"
          onClick={() => {
            void openFile({
              id: asset.id,
              materialId: asset.materialId,
              name: asset.name
            })
          }}
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
            <File aria-hidden="true" className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium break-words text-[var(--app-text)]">
              {customTitle || asset.name}
            </p>

            {customTitle && (
              <p className="mt-1 text-xs break-all text-[var(--app-muted)]">{asset.name}</p>
            )}

            <p className="mt-1 text-xs text-[var(--app-muted)]">
              {formatStudyFileSize(asset.size)}
              {' · '}
              {asset.mimeType}
            </p>
          </div>

          <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-[var(--app-muted)] transition-colors group-hover:text-violet-300">
            {isOpeningFile ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <ExternalLink aria-hidden="true" className="size-4" />
            )}

            <span className="max-[620px]:hidden">Открыть</span>
          </span>
        </button>

        {openFileError && (
          <p
            role="alert"
            className="border-t border-red-500/15 bg-red-500/[0.05] px-4 py-2.5 text-xs text-red-300"
          >
            {openFileError}
          </p>
        )}
      </section>
    )
  }

  const invalidRemoteUrl =
    block.source.type === 'url' &&
    Boolean(block.source.url.trim()) &&
    (block.type === 'video' ? !youtubeVideo : !sourceUrl)

  if (invalidRemoteUrl) {
    return (
      <AttachmentBlockError
        message={
          block.type === 'video'
            ? 'Нужна корректная ссылка на видео YouTube'
            : 'Нужна прямая HTTPS-ссылка на изображение'
        }
      />
    )
  }

  if (block.type === 'video' && youtubeVideo) {
    return (
      <figure className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)]">
        <MediaTitleBar title={customTitle} />

        <StudyYouTubePlayer embedUrl={youtubeVideo.embedUrl} title={accessibleTitle} />
      </figure>
    )
  }

  if (!sourceUrl) {
    return (
      <EmptyAttachmentBlock kind={block.type} message={getEmptyAttachmentMessage(block.type)} />
    )
  }

  if (loadError) {
    return <AttachmentBlockError message="Не удалось загрузить содержимое" />
  }

  if (block.type === 'image') {
    const imageHeight = block.imageHeight ?? 360

    const expandImageLabel = `Развернуть фотографию «${accessibleTitle}»`
    const collapseImageLabel = `Свернуть фотографию «${accessibleTitle}»`

    const imageFitClassName =
      (block.imageFit ?? 'contain') === 'cover' ? 'object-cover' : 'object-contain'

    function handleImageLoad(): void {
      setFailedSourceKey(null)
    }

    function handleImageError(): void {
      setFailedSourceKey(sourceKey)
    }

    return (
      <Dialog.Root>
        <figure className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)]">
          <MediaTitleBar title={customTitle} />

          <div
            className="group relative flex w-full items-center justify-center overflow-hidden bg-black/20"
            style={{
              height: `${imageHeight}px`
            }}
          >
            <img
              data-study-image-preview
              src={sourceUrl}
              alt={accessibleTitle}
              loading="lazy"
              referrerPolicy="no-referrer"
              className={cn('size-full', imageFitClassName)}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />

            <Dialog.Trigger asChild>
              <button
                type="button"
                aria-label={expandImageLabel}
                title={expandImageLabel}
                className={cn(
                  'absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-lg',
                  'border border-white/10 bg-black/60 text-white shadow-lg backdrop-blur-sm',
                  'opacity-80 transition-all',
                  'hover:scale-[1.03] hover:bg-black/75 hover:opacity-100',
                  'focus-visible:scale-[1.03] focus-visible:opacity-100',
                  'outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70'
                )}
              >
                <Maximize2 aria-hidden="true" className="size-4" />
              </button>
            </Dialog.Trigger>
          </div>
        </figure>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[69] bg-black/80 backdrop-blur-[3px]" />

          <Dialog.Content
            data-study-image-fullscreen-dialog
            className="fixed inset-0 z-[70] grid min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden bg-[#07080a] outline-none"
          >
            <header className="flex h-12 min-w-0 items-center justify-between gap-4 border-b border-white/10 bg-black/30 px-4">
              <Dialog.Title className="min-w-0 truncate text-sm font-medium text-white">
                {accessibleTitle}
              </Dialog.Title>

              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label={collapseImageLabel}
                  aria-keyshortcuts="Escape"
                  title={collapseImageLabel}
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg',
                    'text-white/70 transition-colors outline-none',
                    'hover:bg-white/10 hover:text-white',
                    'focus-visible:ring-2 focus-visible:ring-violet-400/70'
                  )}
                >
                  <Minimize2 aria-hidden="true" className="size-4" />
                </button>
              </Dialog.Close>
            </header>

            <Dialog.Description className="sr-only">
              Полноэкранный просмотр фотографии. Нажмите Escape или кнопку сворачивания, чтобы
              вернуться к материалу.
            </Dialog.Description>

            <div className="min-h-0 overflow-hidden p-4">
              <img
                data-study-image-fullscreen
                src={sourceUrl}
                alt={accessibleTitle}
                loading="eager"
                draggable={false}
                referrerPolicy="no-referrer"
                className="block size-full object-contain select-none"
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  if (block.type === 'video') {
    return (
      <figure className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)]">
        <MediaTitleBar title={customTitle} />

        <StudyVideoPlayer
          key={sourceUrl}
          src={sourceUrl}
          title={accessibleTitle}
          onReady={() => {
            setFailedSourceKey(null)
          }}
          onError={() => {
            setFailedSourceKey(sourceKey)
          }}
        />
      </figure>
    )
  }

  return (
    <figure className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)]">
      <MediaTitleBar title={customTitle} />

      <StudyAudioPlayer
        key={sourceUrl}
        src={sourceUrl}
        title={accessibleTitle}
        onReady={() => {
          setFailedSourceKey(null)
        }}
        onError={() => {
          setFailedSourceKey(sourceKey)
        }}
      />
    </figure>
  )
}

function getStudyAttachmentSourceUrl(block: AttachmentBlock): string | null {
  if (block.source.type === 'local') {
    return block.source.asset?.url ?? null
  }

  if (block.type !== 'image') {
    return null
  }

  return normalizeStudyRemoteMediaUrl(block.source.url)
}

function MediaTitleBar({ title }: { title: string }): React.JSX.Element | null {
  if (!title) {
    return null
  }

  return (
    <figcaption className="border-b border-[var(--app-border)] bg-white/[0.025] px-4 py-3">
      <p className="truncate text-sm font-medium text-[var(--app-text)]">{title}</p>
    </figcaption>
  )
}

function EmptyAttachmentBlock({
  kind,
  message
}: {
  kind: StudyAssetKind
  message: string
}): React.JSX.Element {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-workspace)] px-6 py-8 text-center">
      <StudyAssetKindIcon kind={kind} className="size-7 text-[var(--app-muted)]" />

      <p className="mt-3 text-sm font-medium text-[var(--app-text)]">
        {getStudyAssetKindLabel(kind)}
      </p>

      <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--app-muted)]">{message}</p>
    </div>
  )
}

function AttachmentBlockError({ message }: { message: string }): React.JSX.Element {
  return (
    <div
      role="alert"
      className="flex min-h-32 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/[0.05] p-5"
    >
      <div className="flex max-w-md items-start gap-3">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-red-300" />

        <div>
          <p className="text-sm font-medium text-red-200">Содержимое недоступно</p>

          <p className="mt-1 text-xs leading-5 text-red-300/80">{message}</p>
        </div>
      </div>
    </div>
  )
}

function StudyAssetKindIcon({
  kind,
  className
}: {
  kind: StudyAssetKind
  className?: string
}): React.JSX.Element {
  if (kind === 'image') {
    return <FileImage aria-hidden="true" className={className} />
  }

  if (kind === 'video') {
    return <FileVideo aria-hidden="true" className={className} />
  }

  if (kind === 'audio') {
    return <FileAudio aria-hidden="true" className={className} />
  }

  return <File aria-hidden="true" className={className} />
}

function getStudyAssetKindLabel(kind: StudyAssetKind): string {
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

function getEmptyAttachmentMessage(kind: StudyAssetKind): string {
  if (kind === 'image') {
    return 'Выбери фотографию с компьютера или добавь прямую HTTPS-ссылку'
  }

  if (kind === 'video') {
    return 'Выбери видео с компьютера или добавь ссылку на YouTube'
  }

  if (kind === 'audio') {
    return 'Выбери аудиофайл с компьютера'
  }

  return 'Выбери файл с компьютера'
}
