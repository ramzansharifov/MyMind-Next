import { FlatList, Image, Text, View } from 'react-native'
import type { StudyBlock, StudyDocument, StudyLocalAsset } from '@mymind/contracts/study'
import { designTokens } from '@mymind/design'
import { DocumentBoardReader, type OpenDocumentBoard } from './DocumentBoardBlock'
import { AudioAssetPlayer } from './VoiceRecorder'
import { Button, Label } from './primitives'
import { useTheme } from './theme'

interface DocumentReaderProps {
  document: StudyDocument
  resolveAssetUri?: (asset: StudyLocalAsset) => string | null
  openAsset?: (asset: StudyLocalAsset) => Promise<void>
  onAssetError?: (reason: unknown) => void
  openBoard?: OpenDocumentBoard
  header?: React.ReactElement | null
}

function alignment(value: 'left' | 'center' | 'right' | undefined): 'left' | 'center' | 'right' {
  return value ?? 'left'
}

function SourceSurface({ label, source }: { label: string; source: string }): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        gap: 8,
        padding: 14,
        borderRadius: designTokens.radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.raised
      }}
    >
      <Label muted>{label}</Label>
      <Text selectable style={{ color: theme.text, fontFamily: 'monospace', lineHeight: 22 }}>
        {source || '—'}
      </Text>
    </View>
  )
}

function localAssetUri(
  block: Extract<StudyBlock, { type: 'image' | 'video' | 'audio' | 'file' }>,
  resolveAssetUri?: (asset: StudyLocalAsset) => string | null
): string | null {
  if (block.source.type !== 'local' || !block.source.asset) return null
  return resolveAssetUri?.(block.source.asset) ?? null
}

function LocalAttachment({
  block,
  resolveAssetUri,
  openAsset,
  onAssetError
}: {
  block: Extract<StudyBlock, { type: 'image' | 'video' | 'audio' | 'file' }>
  resolveAssetUri?: (asset: StudyLocalAsset) => string | null
  openAsset?: (asset: StudyLocalAsset) => Promise<void>
  onAssetError?: (reason: unknown) => void
}): React.JSX.Element {
  const theme = useTheme()
  if (block.source.type !== 'local') return <View />
  const asset = block.source.asset
  if (!asset) return <Label muted>Вложение ещё не выбрано.</Label>
  const uri = localAssetUri(block, resolveAssetUri)

  return (
    <View style={{ gap: 10 }}>
      {block.type === 'image' && uri ? (
        <Image
          accessibilityLabel={block.title || asset.name}
          source={{ uri }}
          resizeMode={block.imageFit ?? 'contain'}
          style={{
            width: '100%',
            height: block.imageHeight ?? 260,
            borderRadius: designTokens.radius.lg,
            backgroundColor: theme.raised
          }}
        />
      ) : null}
      {block.type === 'audio' && uri ? <AudioAssetPlayer uri={uri} onError={onAssetError} /> : null}
      {block.title ? <Label>{block.title}</Label> : null}
      <Label muted>{asset.name}</Label>
      {!uri ? <Label muted>Локальный файл не найден на этом устройстве.</Label> : null}
      {openAsset ? (
        <Button
          label="Открыть / поделиться"
          disabled={!uri}
          onPress={() => {
            void openAsset(asset).catch((reason: unknown) => onAssetError?.(reason))
          }}
        />
      ) : null}
    </View>
  )
}

function ReadBlock({
  block,
  resolveAssetUri,
  openAsset,
  onAssetError,
  openBoard
}: {
  block: StudyBlock
  resolveAssetUri?: (asset: StudyLocalAsset) => string | null
  openAsset?: (asset: StudyLocalAsset) => Promise<void>
  onAssetError?: (reason: unknown) => void
  openBoard?: OpenDocumentBoard
}): React.JSX.Element {
  const theme = useTheme()

  switch (block.type) {
    case 'text':
      return (
        <Text selectable style={{ color: theme.text, fontSize: 17, lineHeight: 26 }}>
          {block.text || ' '}
        </Text>
      )
    case 'heading':
      return (
        <Text
          selectable
          style={{
            color: block.color ?? theme.text,
            backgroundColor: block.backgroundColor,
            fontSize: block.level === 1 ? 30 : block.level === 2 ? 24 : 20,
            lineHeight: block.level === 1 ? 38 : block.level === 2 ? 32 : 28,
            fontWeight: '700',
            textAlign: alignment(block.alignment),
            paddingHorizontal: block.backgroundScope === 'container' ? 10 : 0,
            paddingVertical: block.backgroundScope === 'container' ? 6 : 0,
            borderRadius: block.backgroundScope === 'container' ? designTokens.radius.md : 0
          }}
        >
          {block.text || ' '}
        </Text>
      )
    case 'code':
      return <SourceSurface label={block.language || 'Код'} source={block.source} />
    case 'markdown':
      return <SourceSurface label="Markdown" source={block.source} />
    case 'latex':
      return <SourceSurface label="LaTeX" source={block.source} />
    case 'mermaid':
      return <SourceSurface label="Mermaid" source={block.source} />
    case 'image':
    case 'video':
      if (block.source.type === 'url') {
        if (block.type === 'image' && block.source.url) {
          return (
            <View style={{ gap: 8 }}>
              <Image
                accessibilityLabel={block.title || 'Изображение'}
                source={{ uri: block.source.url }}
                resizeMode={block.imageFit ?? 'contain'}
                style={{
                  width: '100%',
                  height: block.imageHeight ?? 260,
                  borderRadius: designTokens.radius.lg,
                  backgroundColor: theme.raised
                }}
              />
              {block.title ? <Label>{block.title}</Label> : null}
            </View>
          )
        }
        return (
          <View style={{ gap: 6 }}>
            {block.title ? <Label>{block.title}</Label> : null}
            <Text selectable style={{ color: theme.accent }}>
              {block.source.url}
            </Text>
          </View>
        )
      }
      return (
        <LocalAttachment
          block={block}
          resolveAssetUri={resolveAssetUri}
          openAsset={openAsset}
          onAssetError={onAssetError}
        />
      )
    case 'audio':
    case 'file':
      return (
        <LocalAttachment
          block={block}
          resolveAssetUri={resolveAssetUri}
          openAsset={openAsset}
          onAssetError={onAssetError}
        />
      )
    case 'divider':
      return (
        <View
          accessibilityRole="none"
          style={{
            height: Math.max(1, block.thickness ?? 1),
            backgroundColor: block.color ?? theme.border,
            opacity: block.variant === 'dotted' || block.variant === 'dashed' ? 0.7 : 1
          }}
        />
      )
    case 'board':
      return <DocumentBoardReader block={block} openBoard={openBoard} onError={onAssetError} />
  }
}

export function DocumentReader({
  document,
  resolveAssetUri,
  openAsset,
  onAssetError,
  openBoard,
  header
}: DocumentReaderProps): React.JSX.Element {
  return (
    <FlatList
      data={document.blocks}
      keyExtractor={(block) => block.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 64 }}
      ListHeaderComponent={header ?? null}
      ListEmptyComponent={
        <View style={{ paddingVertical: 28 }}>
          <Label muted>Документ пуст.</Label>
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ marginBottom: 20 }}>
          <ReadBlock
            block={item}
            resolveAssetUri={resolveAssetUri}
            openAsset={openAsset}
            onAssetError={onAssetError}
            openBoard={openBoard}
          />
        </View>
      )}
    />
  )
}
