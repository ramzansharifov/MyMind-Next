import { CircleAlert, File, FileAudio, FileImage, FileVideo, ImageOff } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { StudyBlock, StudyFileKind } from '../../../../../../shared/contracts/study'
import { cn } from '../../../../shared/lib/cn'

type FileBlock = Extract<StudyBlock, { type: 'file' }>

interface StudyFileBlockViewProps {
  block: FileBlock
}

export function StudyFileBlockView({ block }: StudyFileBlockViewProps): React.JSX.Element {
  const asset = block.source.type === 'local' ? block.source.asset : undefined

  const sourceUrl = getStudyFileSourceUrl(block)

  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    setLoadError(false)
  }, [sourceUrl, block.kind])

  const title = block.title?.trim() || asset?.name || getStudyFileKindLabel(block.kind)

  if (block.kind === 'file') {
    if (!asset) {
      return <EmptyFileBlock kind={block.kind} message="Выбери файл в настройках блока" />
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
    return <FileBlockError message="Нужна прямая HTTPS-ссылка на изображение или видео" />
  }

  if (!sourceUrl) {
    return <EmptyFileBlock kind={block.kind} message={getEmptyFileMessage(block.kind)} />
  }

  if (loadError) {
    return <FileBlockError message="Не удалось загрузить содержимое файла" />
  }

  if (block.kind === 'image') {
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
              setLoadError(false)
            }}
            onError={() => {
              setLoadError(true)
            }}
          />
        </div>

        <FileMediaCaption
          title={title}
          caption={block.caption}
          assetName={asset?.name}
          assetSize={asset?.size}
        />
      </figure>
    )
  }

  if (block.kind === 'video') {
    return (
      <figure className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)]">
        <video
          key={sourceUrl}
          src={sourceUrl}
          controls
          preload="metadata"
          className="max-h-[36rem] w-full bg-black object-contain"
          onLoadedMetadata={() => {
            setLoadError(false)
          }}
          onError={() => {
            setLoadError(true)
          }}
        />

        <FileMediaCaption
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

      <audio
        key={sourceUrl}
        src={sourceUrl}
        controls
        preload="metadata"
        className="mt-4 w-full"
        onLoadedMetadata={() => {
          setLoadError(false)
        }}
        onError={() => {
          setLoadError(true)
        }}
      />

      {block.caption?.trim() && (
        <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">{block.caption.trim()}</p>
      )}
    </section>
  )
}

export function normalizeStudyRemoteMediaUrl(value: string): string | null {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  try {
    const parsedUrl = new URL(trimmedValue)

    if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) {
      return null
    }

    return parsedUrl.href
  } catch {
    return null
  }
}

export function isValidStudyRemoteMediaUrl(value: string): boolean {
  return normalizeStudyRemoteMediaUrl(value) !== null
}

export function formatStudyFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return 'Неизвестный размер'
  }

  if (bytes < 1024) {
    return `${bytes} Б`
  }

  const units = ['КБ', 'МБ', 'ГБ', 'ТБ']

  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const precision = value >= 10 ? 0 : 1

  return `${value.toFixed(precision)} ${units[unitIndex]}`
}

function getStudyFileSourceUrl(block: FileBlock): string | null {
  if (block.source.type === 'local') {
    return block.source.asset?.url ?? null
  }

  if (block.kind !== 'image' && block.kind !== 'video') {
    return null
  }

  return normalizeStudyRemoteMediaUrl(block.source.url)
}

function FileMediaCaption({
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

function EmptyFileBlock({
  kind,
  message
}: {
  kind: StudyFileKind
  message: string
}): React.JSX.Element {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-workspace)] px-6 py-8 text-center">
      <StudyFileKindIcon kind={kind} className="size-7 text-[var(--app-muted)]" />

      <p className="mt-3 text-sm font-medium text-[var(--app-text)]">
        {getStudyFileKindLabel(kind)}
      </p>

      <p className="mt-1 max-w-sm text-xs leading-5 text-[var(--app-muted)]">{message}</p>
    </div>
  )
}

function FileBlockError({ message }: { message: string }): React.JSX.Element {
  return (
    <div
      role="alert"
      className="flex min-h-32 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/[0.05] p-5"
    >
      <div className="flex max-w-md items-start gap-3">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-red-300" />

        <div>
          <p className="text-sm font-medium text-red-200">Файл недоступен</p>

          <p className="mt-1 text-xs leading-5 text-red-300/80">{message}</p>
        </div>
      </div>
    </div>
  )
}

function StudyFileKindIcon({
  kind,
  className
}: {
  kind: StudyFileKind
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

function getStudyFileKindLabel(kind: StudyFileKind): string {
  if (kind === 'image') {
    return 'Изображение'
  }

  if (kind === 'video') {
    return 'Видео'
  }

  if (kind === 'audio') {
    return 'Аудио'
  }

  return 'Файл'
}

function getEmptyFileMessage(kind: StudyFileKind): string {
  if (kind === 'image') {
    return 'Выбери изображение с компьютера или добавь прямую HTTPS-ссылку'
  }

  if (kind === 'video') {
    return 'Выбери видео с компьютера или добавь прямую HTTPS-ссылку'
  }

  if (kind === 'audio') {
    return 'Выбери аудиофайл с компьютера'
  }

  return 'Выбери файл с компьютера'
}
