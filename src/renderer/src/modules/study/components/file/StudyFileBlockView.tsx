import { CircleAlert, File, FileAudio, FileImage, FileVideo } from 'lucide-react'
import { useState } from 'react'

import type { StudyAssetKind, StudyBlock } from '../../../../../../shared/contracts/study'
import { cn } from '../../../../shared/lib/cn'
import { formatStudyFileSize, normalizeStudyRemoteMediaUrl } from './file-utils'
import { StudyAudioPlayer } from './StudyAudioPlayer'

type AttachmentBlock = Extract<
  StudyBlock,
  {
    type: StudyAssetKind
  }
>

interface StudyFileBlockViewProps {
  block: AttachmentBlock
}

export function StudyFileBlockView({ block }: StudyFileBlockViewProps): React.JSX.Element {
  const asset = block.source.type === 'local' ? block.source.asset : undefined

  const sourceUrl = getStudyAttachmentSourceUrl(block)

  const sourceKey = `${block.type}:${sourceUrl ?? ''}`

  const [failedSourceKey, setFailedSourceKey] = useState<string | null>(null)

  const loadError = failedSourceKey === sourceKey

  const title = block.title?.trim() || asset?.name || getStudyAssetKindLabel(block.type)

  if (block.type === 'file') {
    if (!asset) {
      return <EmptyAttachmentBlock kind={block.type} message="Выбери файл в настройках блока" />
    }

    return (
      <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
            <File aria-hidden="true" className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium break-words text-[var(--app-text)]">{title}</p>

            <p className="mt-1 text-xs break-all text-[var(--app-muted)]">{asset.name}</p>

            <p className="mt-1 text-xs text-[var(--app-muted)]">
              {formatStudyFileSize(asset.size)}
              {' · '}
              {asset.mimeType}
            </p>
          </div>
        </div>

        {block.caption?.trim() && (
          <p className="mt-3 border-t border-[var(--app-border)] pt-3 text-sm leading-6 text-[var(--app-muted)]">
            {block.caption.trim()}
          </p>
        )}

        <p className="mt-3 text-xs text-[var(--app-muted)]/70">
          Открытие файла будет добавлено отдельным действием.
        </p>
      </section>
    )
  }

  const invalidRemoteUrl =
    block.source.type === 'url' && Boolean(block.source.url.trim()) && !sourceUrl

  if (invalidRemoteUrl) {
    return <AttachmentBlockError message="Нужна прямая HTTPS-ссылка на изображение или видео" />
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

    return (
      <figure className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)]">
        <div
          className="flex w-full items-center justify-center overflow-hidden bg-black/20"
          style={{
            height: `${imageHeight}px`
          }}
        >
          <img
            src={sourceUrl}
            alt={block.altText?.trim() || title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className={cn(
              'size-full',
              (block.imageFit ?? 'contain') === 'cover' ? 'object-cover' : 'object-contain'
            )}
            onLoad={() => {
              setFailedSourceKey(null)
            }}
            onError={() => {
              setFailedSourceKey(sourceKey)
            }}
          />
        </div>

        <MediaCaption
          title={title}
          caption={block.caption}
          assetName={asset?.name}
          assetSize={asset?.size}
        />
      </figure>
    )
  }

  if (block.type === 'video') {
    return (
      <figure className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)]">
        <video
          key={sourceUrl}
          src={sourceUrl}
          controls
          preload="metadata"
          className="max-h-[36rem] w-full bg-black object-contain"
          onLoadedMetadata={() => {
            setFailedSourceKey(null)
          }}
          onError={() => {
            setFailedSourceKey(sourceKey)
          }}
        />

        <MediaCaption
          title={title}
          caption={block.caption}
          assetName={asset?.name}
          assetSize={asset?.size}
        />
      </figure>
    )
  }

  return (
    <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
          <FileAudio aria-hidden="true" className="size-5" />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-[var(--app-text)]">{title}</p>

          {asset && (
            <p className="mt-1 truncate text-xs text-[var(--app-muted)]">
              {asset.name}
              {' · '}
              {formatStudyFileSize(asset.size)}
            </p>
          )}
        </div>
      </div>

      <StudyAudioPlayer
        key={sourceUrl}
        src={sourceUrl}
        title={title}
        onReady={() => {
          setFailedSourceKey(null)
        }}
        onError={() => {
          setFailedSourceKey(sourceKey)
        }}
      />

      {block.caption?.trim() && (
        <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">{block.caption.trim()}</p>
      )}
    </section>
  )
}

function getStudyAttachmentSourceUrl(block: AttachmentBlock): string | null {
  if (block.source.type === 'local') {
    return block.source.asset?.url ?? null
  }

  if (block.type !== 'image' && block.type !== 'video') {
    return null
  }

  return normalizeStudyRemoteMediaUrl(block.source.url)
}

function MediaCaption({
  title,
  caption,
  assetName,
  assetSize
}: {
  title: string
  caption?: string
  assetName?: string
  assetSize?: number
}): React.JSX.Element {
  return (
    <figcaption className="border-t border-[var(--app-border)] px-4 py-3">
      <p className="text-sm font-medium text-[var(--app-text)]">{title}</p>

      {assetName && (
        <p className="mt-1 truncate text-xs text-[var(--app-muted)]">
          {assetName}

          {typeof assetSize === 'number' && ` · ${formatStudyFileSize(assetSize)}`}
        </p>
      )}

      {caption?.trim() && (
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">{caption.trim()}</p>
      )}
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
    return 'Выбери видео с компьютера или добавь прямую HTTPS-ссылку'
  }

  if (kind === 'audio') {
    return 'Выбери аудиофайл с компьютера'
  }

  return 'Выбери файл с компьютера'
}
