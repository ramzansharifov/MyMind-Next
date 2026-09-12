import { useEffect, useRef } from 'react'
import { FlatList, Image, Linking, Text, View } from 'react-native'
import type {
  ResolveStudyInternalLinkTargetInput,
  StudyBlock,
  StudyDocument,
  StudyInternalLinkTarget,
  StudyLocalAsset
} from '@mymind/contracts/study'
import { designTokens } from '@mymind/design'
import { DocumentBoardReader, type OpenDocumentBoard } from './DocumentBoardBlock'
import { AudioAssetPlayer } from './VoiceRecorder'
import { Button, Label } from './primitives'
import { DocumentRichTextViewer } from './NotesRichTextBlock'
import { resolveStudyRichTextHtml } from './richTextHtml'
import { StudySourceBlock } from './StudySourceBlock'
import type { StudyRichTextInternalLink } from './studyRichText'
import { useTheme } from './theme'

export interface DocumentRevealRequest {
  blockId: string | null
  requestId: number
}

interface DocumentReaderProps {
  document: StudyDocument
  resolveAssetUri?: (asset: StudyLocalAsset) => string | null
  openAsset?: (asset: StudyLocalAsset) => Promise<void>
  onAssetError?: (reason: unknown) => void
  openBoard?: OpenDocumentBoard
  resolveInternalLinkTarget?: (
    input: ResolveStudyInternalLinkTargetInput
  ) => StudyInternalLinkTarget | null
  onOpenInternalLink?: (link: StudyRichTextInternalLink, sourceBlockId: string) => void
  reveal?: DocumentRevealRequest | null
  header?: React.ReactElement | null
}

function alignment(value: 'left' | 'center' | 'right' | undefined): 'left' | 'center' | 'right' {
  return value ?? 'left'
}

function headingTypography(level: 1 | 2 | 3): {
  fontSize: number
  lineHeight: number
  letterSpacing: number
} {
  if (level === 1) return { fontSize: 48, lineHeight: 50.4, letterSpacing: -1.68 }
  if (level === 2) return { fontSize: 36, lineHeight: 41.4, letterSpacing: -0.9 }
  return { fontSize: 30, lineHeight: 36, letterSpacing: -0.6 }
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
            height: block.imageHeight ?? 360,
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

function RichTextBlock({
  block,
  resolveInternalLinkTarget,
  onOpenInternalLink,
  onAssetError
}: {
  block: Extract<StudyBlock, { type: 'text' }>
  resolveInternalLinkTarget?: (
    input: ResolveStudyInternalLinkTargetInput
  ) => StudyInternalLinkTarget | null
  onOpenInternalLink?: (link: StudyRichTextInternalLink, sourceBlockId: string) => void
  onAssetError?: (reason: unknown) => void
}): React.JSX.Element {
  const html = resolveStudyRichTextHtml(block, resolveInternalLinkTarget)

  return (
    <DocumentRichTextViewer
      html={html}
      onOpenInternalLink={(input) => {
        const target = resolveInternalLinkTarget?.(input)
        if (!target || !onOpenInternalLink) return
        onOpenInternalLink(
          {
            kind: target.kind,
            materialId: target.materialId,
            headingId: target.headingId,
            headingLevel: target.headingLevel,
            labelMode: 'auto',
            label: target.title,
            materialTitle: target.materialTitle,
            folderPath: [...target.folderPath]
          },
          block.id
        )
      }}
      onOpenExternalLink={(href) => {
        void Linking.openURL(href).catch((reason) => onAssetError?.(reason))
      }}
    />
  )
}

function ReadBlock({
  block,
  resolveAssetUri,
  openAsset,
  onAssetError,
  openBoard,
  resolveInternalLinkTarget,
  onOpenInternalLink
}: {
  block: StudyBlock
  resolveAssetUri?: (asset: StudyLocalAsset) => string | null
  openAsset?: (asset: StudyLocalAsset) => Promise<void>
  onAssetError?: (reason: unknown) => void
  openBoard?: OpenDocumentBoard
  resolveInternalLinkTarget?: (
    input: ResolveStudyInternalLinkTargetInput
  ) => StudyInternalLinkTarget | null
  onOpenInternalLink?: (link: StudyRichTextInternalLink, sourceBlockId: string) => void
}): React.JSX.Element {
  const theme = useTheme()

  switch (block.type) {
    case 'text':
      return (
        <RichTextBlock
          block={block}
          resolveInternalLinkTarget={resolveInternalLinkTarget}
          onOpenInternalLink={onOpenInternalLink}
          onAssetError={onAssetError}
        />
      )
    case 'heading': {
      const typography = headingTypography(block.level)
      const backgroundScope = block.backgroundScope ?? 'container'
      return (
        <View
          style={{
            paddingHorizontal: 4,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor:
              backgroundScope === 'container'
                ? (block.backgroundColor ?? 'transparent')
                : 'transparent'
          }}
        >
          <Text
            selectable
            style={{
              color: block.color ?? theme.text,
              fontSize: typography.fontSize,
              lineHeight: typography.lineHeight,
              letterSpacing: typography.letterSpacing,
              fontWeight: '600',
              textAlign: alignment(block.alignment)
            }}
          >
            <Text
              style={{
                backgroundColor:
                  backgroundScope === 'text'
                    ? (block.backgroundColor ?? 'transparent')
                    : 'transparent'
              }}
            >
              {block.text || 'Без заголовка'}
            </Text>
          </Text>
        </View>
      )
    }
    case 'code':
    case 'markdown':
    case 'latex':
    case 'mermaid':
      return <StudySourceBlock block={block} editable={false} />
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
                  height: block.imageHeight ?? 360,
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
  resolveInternalLinkTarget,
  onOpenInternalLink,
  reveal,
  header
}: DocumentReaderProps): React.JSX.Element {
  const listRef = useRef<FlatList<StudyBlock>>(null)

  useEffect(() => {
    if (!reveal) return undefined
    const frame = requestAnimationFrame(() => {
      if (reveal.blockId === null) {
        listRef.current?.scrollToOffset({ offset: 0, animated: true })
        return
      }
      const index = document.blocks.findIndex((block) => block.id === reveal.blockId)
      if (index < 0) return
      listRef.current?.scrollToIndex({ index, viewOffset: 24, animated: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [document.blocks, reveal])

  return (
    <FlatList
      ref={listRef}
      data={document.blocks}
      keyExtractor={(block) => block.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 64 }}
      ListHeaderComponent={header ?? null}
      ListEmptyComponent={
        <View style={{ paddingVertical: 28 }}>
          <Label muted>Документ пуст.</Label>
        </View>
      }
      onScrollToIndexFailed={({ index, averageItemLength }) => {
        listRef.current?.scrollToOffset({
          offset: Math.max(0, averageItemLength * index),
          animated: true
        })
        setTimeout(() => {
          listRef.current?.scrollToIndex({ index, viewOffset: 24, animated: true })
        }, 120)
      }}
      renderItem={({ item }) => (
        <View style={{ marginBottom: 20 }}>
          <ReadBlock
            block={item}
            resolveAssetUri={resolveAssetUri}
            openAsset={openAsset}
            onAssetError={onAssetError}
            openBoard={openBoard}
            resolveInternalLinkTarget={resolveInternalLinkTarget}
            onOpenInternalLink={onOpenInternalLink}
          />
        </View>
      )}
    />
  )
}
