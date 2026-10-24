import { useViewport, Action, DialogLayer } from '../../../ui/browser'
import { useMemo, useState } from 'react'
import type { StudyBlock, StudyLocalAsset } from '@mymind/contracts/study'
import {
  ExternalLink,
  File,
  FileAudio,
  FileImage,
  FileVideo,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { normalizeStudyRemoteImageUrl, parseStudyYouTubeUrl } from '@mymind/core/study-remote-media'
import StudyYouTubeDom from './StudyYouTubeDom'
import { AudioAssetPlayer } from '../../../platform/VoiceRecorder'
import { useTheme } from './theme'
type AttachmentBlock = Extract<
  StudyBlock,
  {
    type: 'image' | 'video' | 'audio' | 'file'
  }
>
interface StudyAttachmentBlockProps {
  block: AttachmentBlock
  resolveAssetUri?: (asset: StudyLocalAsset) => string | null
  openAsset?: (asset: StudyLocalAsset) => Promise<void>
  onError?: (reason: unknown) => void
}
function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Неизвестный размер'
  if (bytes < 1024) return `${bytes} Б`
  const units = ['КБ', 'МБ', 'ГБ', 'ТБ']
  let value = bytes / 1024
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`
}
function kindLabel(type: AttachmentBlock['type']): string {
  if (type === 'image') return 'Фото'
  if (type === 'video') return 'Видео'
  if (type === 'audio') return 'Аудио'
  return 'Файл'
}
function KindIcon({
  type,
  size = 20,
  color
}: {
  type: AttachmentBlock['type']
  size?: number
  color: string
}): React.JSX.Element {
  if (type === 'image') return <FileImage size={size} color={color} />
  if (type === 'video') return <FileVideo size={size} color={color} />
  if (type === 'audio') return <FileAudio size={size} color={color} />
  return <File size={size} color={color} />
}
function EmptyAttachment({ block }: { block: AttachmentBlock }): React.JSX.Element {
  const theme = useTheme()
  const message =
    block.type === 'image'
      ? 'Выберите фотографию в настройках блока'
      : block.type === 'video'
        ? 'Выберите видео или добавьте ссылку YouTube в настройках блока'
        : block.type === 'audio'
          ? 'Выберите аудиофайл в настройках блока'
          : 'Выберите файл в настройках блока'
  return (
    <div
      className="ui-stack"
      style={{
        minHeight: 150,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 22,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme.border,
        borderRadius: 12,
        backgroundColor: theme.surface
      }}
    >
      <KindIcon type={block.type} size={28} color={theme.muted} />
      <span
        className="ui-text"
        style={{
          color: theme.text,
          fontSize: 14,
          fontWeight: 600
        }}
      >
        {kindLabel(block.type)}
      </span>
      <span
        className="ui-text"
        style={{
          maxWidth: 300,
          color: theme.muted,
          fontSize: 12,
          lineHeight: '18px',
          textAlign: 'center'
        }}
      >
        {message}
      </span>
    </div>
  )
}
function ErrorAttachment({ message }: { message: string }): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        minHeight: 110,
        justifyContent: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: theme.error + '40',
        borderRadius: 12,
        backgroundColor: theme.error + '0D'
      }}
    >
      <span
        className="ui-text"
        style={{
          color: theme.error,
          fontSize: 14,
          fontWeight: 600
        }}
      >
        Содержимое недоступно
      </span>
      <span
        className="ui-text"
        style={{
          marginTop: 5,
          color: theme.muted,
          fontSize: 12,
          lineHeight: '18px'
        }}
      >
        {message}
      </span>
    </div>
  )
}
function TitleBar({ title }: { title: string }): React.JSX.Element | null {
  const theme = useTheme()
  if (!title) return null
  return (
    <div
      className="ui-stack"
      style={{
        paddingInline: 14,
        paddingBlock: 11,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        backgroundColor: theme.surface
      }}
    >
      <span
        className="ui-text"
        data-lines={1}
        style={{
          color: theme.text,
          fontSize: 14,
          fontWeight: 600,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 1
        }}
      >
        {title}
      </span>
    </div>
  )
}
function ImageAttachment({
  block,
  uri
}: {
  block: Extract<
    AttachmentBlock,
    {
      type: 'image'
    }
  >
  uri: string
}): React.JSX.Element {
  const theme = useTheme()
  const window = useViewport()
  const [fullscreen, setFullscreen] = useState(false)
  const title =
    block.title?.trim() ||
    (block.source.type === 'local' ? block.source.asset?.name : '') ||
    'Изображение'
  return (
    <>
      <div
        className="ui-stack"
        style={{
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          backgroundColor: theme.surface
        }}
      >
        <TitleBar title={block.title?.trim() ?? ''} />
        <div
          className="ui-stack"
          style={{
            position: 'relative',
            width: '100%',
            height: block.imageHeight ?? 360,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#00000022'
          }}
        >
          <img
            aria-label={title}
            src={uri}
            style={{
              width: '100%',
              height: '100%',
              objectFit: block.imageFit ?? 'contain'
            }}
            alt=""
            draggable="false"
          ></img>
          <Action
            hitPadding={4}
            role={'button'}
            aria-label={`Развернуть фотографию «${title}»`}
            onClick={() => setFullscreen(true)}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 36,
              height: 36,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#ffffff1A',
              borderRadius: 9,
              backgroundColor: '#00000099',
              opacity: 1
            }}
            pressedStyle={{
              backgroundColor: '#000000C0',
              opacity: 0.82
            }}
          >
            <Maximize2 size={17} color="#ffffff" />
          </Action>
        </div>
      </div>

      <DialogLayer open={fullscreen} transition={'fade'} onClose={() => setFullscreen(false)}>
        <div
          className="ui-stack"
          style={{
            flex: '1 1 0%',
            backgroundColor: '#07080a'
          }}
        >
          <div
            className="ui-stack"
            style={{
              height: 52,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingInline: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#ffffff1A',
              backgroundColor: '#00000055'
            }}
          >
            <span
              className="ui-text"
              data-lines={1}
              style={{
                flex: '1 1 0%',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1
              }}
            >
              {title}
            </span>
            <Action
              hitPadding={6}
              role={'button'}
              aria-label={`Свернуть фотографию «${title}»`}
              onClick={() => setFullscreen(false)}
              style={{
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 9,
                backgroundColor: 'transparent'
              }}
              pressedStyle={{
                backgroundColor: '#ffffff14'
              }}
            >
              <Minimize2 size={18} color="#ffffffCC" />
            </Action>
          </div>
          <div
            className="ui-stack"
            style={{
              flex: '1 1 0%',
              padding: 14
            }}
          >
            <img
              aria-label={title}
              src={uri}
              style={{
                width: window.width - 28,
                flex: '1 1 0%',
                objectFit: 'contain'
              }}
              alt=""
              draggable="false"
            ></img>
          </div>
        </div>
      </DialogLayer>
    </>
  )
}
function FileCard({
  block,
  asset,
  uri,
  openAsset,
  onError
}: {
  block: AttachmentBlock
  asset: StudyLocalAsset
  uri: string | null
  openAsset?: (asset: StudyLocalAsset) => Promise<void>
  onError?: (reason: unknown) => void
}): React.JSX.Element {
  const theme = useTheme()
  const [opening, setOpening] = useState(false)
  const title = block.title?.trim() || asset.name
  const open = (): void => {
    if (!openAsset || opening || !uri) return
    setOpening(true)
    void openAsset(asset)
      .catch((reason) => onError?.(reason))
      .finally(() => setOpening(false))
  }
  return (
    <Action
      role={openAsset ? 'button' : undefined}
      aria-label={openAsset ? `Открыть «${title}»` : undefined}
      aria-disabled={!uri || opening}
      disabled={!openAsset || !uri || opening}
      onClick={open}
      style={{
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 12,
        backgroundColor: theme.surface,
        opacity: opening ? 0.65 : 1
      }}
      pressedStyle={{
        backgroundColor: theme.raised
      }}
    >
      <div
        className="ui-stack"
        style={{
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          backgroundColor: theme.accent + '1A'
        }}
      >
        <KindIcon type={block.type} color={theme.accent} />
      </div>

      <div
        className="ui-stack"
        style={{
          minWidth: 0,
          flex: '1 1 0%'
        }}
      >
        <span
          className="ui-text"
          data-lines={2}
          style={{
            color: theme.text,
            fontSize: 14,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2
          }}
        >
          {title}
        </span>
        {block.title?.trim() ? (
          <span
            className="ui-text"
            data-lines={1}
            style={{
              marginTop: 3,
              color: theme.muted,
              fontSize: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 1
            }}
          >
            {asset.name}
          </span>
        ) : null}
        <span
          className="ui-text"
          style={{
            marginTop: 3,
            color: theme.muted,
            fontSize: 12
          }}
        >
          {formatFileSize(asset.size)} · {asset.mimeType}
        </span>
        {!uri ? (
          <span
            className="ui-text"
            style={{
              marginTop: 3,
              color: theme.error,
              fontSize: 11.5
            }}
          >
            Файл не найден на этом устройстве
          </span>
        ) : null}
      </div>

      {openAsset ? <ExternalLink size={17} color={theme.muted} /> : null}
    </Action>
  )
}
export function StudyAttachmentBlock({
  block,
  resolveAssetUri,
  openAsset,
  onError
}: StudyAttachmentBlockProps): React.JSX.Element {
  const theme = useTheme()
  const remoteImage = useMemo(
    () =>
      block.type === 'image' && block.source.type === 'url'
        ? normalizeStudyRemoteImageUrl(block.source.url)
        : null,
    [block]
  )
  const youtube = useMemo(
    () =>
      block.type === 'video' && block.source.type === 'url'
        ? parseStudyYouTubeUrl(block.source.url)
        : null,
    [block]
  )
  if (block.source.type === 'url') {
    if (!block.source.url.trim()) return <EmptyAttachment block={block} />
    if (block.type === 'image') {
      if (!remoteImage)
        return <ErrorAttachment message="Нужна прямая HTTPS-ссылка на изображение" />
      return <ImageAttachment block={block} uri={remoteImage} />
    }
    if (block.type === 'video') {
      if (!youtube) return <ErrorAttachment message="Нужна корректная ссылка на видео YouTube" />
      const title = block.title?.trim() || 'Видео YouTube'
      return (
        <div
          className="ui-stack"
          style={{
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            backgroundColor: '#000'
          }}
        >
          <TitleBar title={block.title?.trim() ?? ''} />
          <StudyYouTubeDom embedUrl={youtube.embedUrl} title={title} />
        </div>
      )
    }
    return <EmptyAttachment block={block} />
  }
  const asset = block.source.asset
  if (!asset) return <EmptyAttachment block={block} />
  const uri = resolveAssetUri?.(asset) ?? null
  if (block.type === 'image') {
    if (!uri)
      return <ErrorAttachment message="Локальная фотография не найдена на этом устройстве" />
    return <ImageAttachment block={block} uri={uri} />
  }
  if (block.type === 'audio' && uri) {
    return (
      <div
        className="ui-stack"
        style={{
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          backgroundColor: theme.surface
        }}
      >
        <TitleBar title={block.title?.trim() ?? ''} />
        <div
          className="ui-stack"
          style={{
            padding: 14
          }}
        >
          <AudioAssetPlayer uri={uri} onError={onError} />
        </div>
      </div>
    )
  }
  return <FileCard block={block} asset={asset} uri={uri} openAsset={openAsset} onError={onError} />
}
