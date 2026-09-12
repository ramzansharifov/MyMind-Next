import { useEffect, useRef } from 'react'
import { FlatList, Image, Linking, Text, View } from 'react-native'
import type {
  ResolveStudyInternalLinkTargetInput,
  StudyBlock,
  StudyDocument,
  StudyInternalLinkTarget,
  StudyLocalAsset
} from '@mymind/contracts/study'
import { appearanceTokens, designTokens } from '@mymind/design'
import BoardCanvasDom from '../../modules/boards/BoardCanvasDom'
import { DocumentBoardReader, type OpenDocumentBoard } from './DocumentBoardBlock'
import { AudioAssetPlayer } from './VoiceRecorder'
import { Button, Label } from './primitives'
import { DocumentRichTextViewer } from './NotesRichTextBlock'
import { resolveStudyRichTextHtml } from './richTextHtml'
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
  const colorScheme = theme.background === appearanceTokens.dark.background ? 'dark' : 'light'
  const richProps = {
    mode: 'rich' as const,
    colorScheme,
    textColor: theme.text,
    mutedColor: theme.muted,
    borderColor: theme.border,
    surfaceColor: theme.raised,
    accentColor: theme.accent,
    dom: {
      matchContents: true,
      scrollEnabled: false,
      style: { width: '100%' }
    }
  } as const

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
      return <BoardCanvasDom {...richProps} kind={'markdown' as const} source={block.source} />
    case 'latex':
      return (
        <BoardCanvasDom
          {...richProps}
          kind={'latex' as const}
          latexDisplayMode={block.displayMode ?? 'display'}
          latexAlignment={block.alignment ?? 'center'}
          latexScale={block.scale ?? 1}
          source={block.source}
        />
      )
    case 'mermaid':
      return (
        <BoardCanvasDom
          {...richProps}
          kind={'mermaid' as const}
          mermaidTheme={block.theme ?? (colorScheme === 'dark' ? 'dark' : 'default')}
          source={block.source}
        />
      )
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
