import { useMemo, useState } from 'react'
import {
  Image,
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions
} from 'react-native'
import type { StudyBlock, StudyLocalAsset } from '@mymind/contracts/study'
import {
  ExternalLink,
  File,
  FileAudio,
  FileImage,
  FileVideo,
  Maximize2,
  Minimize2
} from 'lucide-react-native'
import {
  normalizeStudyRemoteImageUrl,
  parseStudyYouTubeUrl
} from '@mymind/core/study-remote-media'

import StudyYouTubeDom from './StudyYouTubeDom'
import { AudioAssetPlayer } from './VoiceRecorder'
import { useTheme } from './theme'

type AttachmentBlock = Extract<
  StudyBlock,
  { type: 'image' | 'video' | 'audio' | 'file' }
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
    <View
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
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
        {kindLabel(block.type)}
      </Text>
      <Text style={{ maxWidth: 300, color: theme.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>
        {message}
      </Text>
    </View>
  )
}

function ErrorAttachment({ message }: { message: string }): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
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
      <Text style={{ color: theme.error, fontSize: 14, fontWeight: '600' }}>
        Содержимое недоступно
      </Text>
      <Text style={{ marginTop: 5, color: theme.muted, fontSize: 12, lineHeight: 18 }}>
        {message}
      </Text>
    </View>
  )
}

function TitleBar({ title }: { title: string }): React.JSX.Element | null {
  const theme = useTheme()
  if (!title) return null

  return (
    <View
      style={{
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        backgroundColor: theme.surface
      }}
    >
      <Text numberOfLines={1} style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
        {title}
      </Text>
    </View>
  )
}

function ImageAttachment({
  block,
  uri
}: {
  block: Extract<AttachmentBlock, { type: 'image' }>
  uri: string
}): React.JSX.Element {
  const theme = useTheme()
  const window = useWindowDimensions()
  const [fullscreen, setFullscreen] = useState(false)
  const title =
    block.title?.trim() ||
    (block.source.type === 'local' ? block.source.asset?.name : '') ||
    'Изображение'

  return (
    <>
      <View
        style={{
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          backgroundColor: theme.surface
        }}
      >
        <TitleBar title={block.title?.trim() ?? ''} />
        <View
          style={{
            position: 'relative',
            width: '100%',
            height: block.imageHeight ?? 360,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#00000022'
          }}
        >
          <Image
            accessibilityLabel={title}
            source={{ uri }}
            resizeMode={block.imageFit ?? 'contain'}
            style={{ width: '100%', height: '100%' }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Развернуть фотографию «${title}»`}
            hitSlop={4}
            onPress={() => setFullscreen(true)}
            style={({ pressed }) => ({
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
              backgroundColor: pressed ? '#000000C0' : '#00000099',
              opacity: pressed ? 0.82 : 1
            })}
          >
            <Maximize2 size={17} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <Modal
        visible={fullscreen}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setFullscreen(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#07080a' }}>
          <View
            style={{
              height: 52,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#ffffff1A',
              backgroundColor: '#00000055'
            }}
          >
            <Text numberOfLines={1} style={{ flex: 1, color: '#ffffff', fontSize: 14, fontWeight: '600' }}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Свернуть фотографию «${title}»`}
              hitSlop={6}
              onPress={() => setFullscreen(false)}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 9,
                backgroundColor: pressed ? '#ffffff14' : 'transparent'
              })}
            >
              <Minimize2 size={18} color="#ffffffCC" />
            </Pressable>
          </View>
          <View style={{ flex: 1, padding: 14 }}>
            <Image
              accessibilityLabel={title}
              source={{ uri }}
              resizeMode="contain"
              style={{ width: window.width - 28, flex: 1 }}
            />
          </View>
        </View>
      </Modal>
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
    <Pressable
      accessibilityRole={openAsset ? 'button' : undefined}
      accessibilityLabel={openAsset ? `Открыть «${title}»` : undefined}
      accessibilityState={{ disabled: !uri || opening }}
      disabled={!openAsset || !uri || opening}
      onPress={open}
      style={({ pressed }) => ({
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 12,
        backgroundColor: pressed ? theme.raised : theme.surface,
        opacity: opening ? 0.65 : 1
      })}
    >
      <View
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
      </View>

      <View style={{ minWidth: 0, flex: 1 }}>
        <Text numberOfLines={2} style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
          {title}
        </Text>
        {block.title?.trim() ? (
          <Text numberOfLines={1} style={{ marginTop: 3, color: theme.muted, fontSize: 12 }}>
            {asset.name}
          </Text>
        ) : null}
        <Text style={{ marginTop: 3, color: theme.muted, fontSize: 12 }}>
          {formatFileSize(asset.size)} · {asset.mimeType}
        </Text>
        {!uri ? (
          <Text style={{ marginTop: 3, color: theme.error, fontSize: 11.5 }}>
            Файл не найден на этом устройстве
          </Text>
        ) : null}
      </View>

      {openAsset ? (
        <ExternalLink size={17} color={theme.muted} />
      ) : null}
    </Pressable>
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
      if (!remoteImage) return <ErrorAttachment message="Нужна прямая HTTPS-ссылка на изображение" />
      return <ImageAttachment block={block} uri={remoteImage} />
    }

    if (block.type === 'video') {
      if (!youtube) return <ErrorAttachment message="Нужна корректная ссылка на видео YouTube" />
      const title = block.title?.trim() || 'Видео YouTube'
      return (
        <View
          style={{
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            backgroundColor: '#000'
          }}
        >
          <TitleBar title={block.title?.trim() ?? ''} />
          <StudyYouTubeDom
            embedUrl={youtube.embedUrl}
            title={title}
            dom={{
              scrollEnabled: false,
              style: {
                width: '100%',
                height: 220,
                backgroundColor: '#000'
              }
            }}
          />
        </View>
      )
    }

    return <EmptyAttachment block={block} />
  }

  const asset = block.source.asset
  if (!asset) return <EmptyAttachment block={block} />

  const uri = resolveAssetUri?.(asset) ?? null

  if (block.type === 'image') {
    if (!uri) return <ErrorAttachment message="Локальная фотография не найдена на этом устройстве" />
    return <ImageAttachment block={block} uri={uri} />
  }

  if (block.type === 'audio' && uri) {
    return (
      <View
        style={{
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          backgroundColor: theme.surface
        }}
      >
        <TitleBar title={block.title?.trim() ?? ''} />
        <View style={{ padding: 14 }}>
          <AudioAssetPlayer uri={uri} onError={onError} />
        </View>
      </View>
    )
  }

  return (
    <FileCard
      block={block}
      asset={asset}
      uri={uri}
      openAsset={openAsset}
      onError={onError}
    />
  )
}
