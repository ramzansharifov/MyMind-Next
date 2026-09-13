import { useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Image, Linking, Pressable, Text, View } from 'react-native'
import type {
  ResolveStudyInternalLinkTargetInput,
  StudyBlock,
  StudyDocument,
  StudyInternalLinkTarget,
  StudyLocalAsset
} from '@mymind/contracts/study'
import { designTokens } from '@mymind/design'
import { ChevronRight } from 'lucide-react-native'
import { DocumentBoardReader, type OpenDocumentBoard } from './DocumentBoardBlock'
import { AudioAssetPlayer } from './VoiceRecorder'
import { Button, Label } from './primitives'
import { DocumentRichTextViewer } from './NotesRichTextBlock'
import { resolveStudyRichTextHtml } from './richTextHtml'
import { StudySourceBlock } from './StudySourceBlock'
import { StudyDividerBlock } from './StudyDividerBlock'
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
      return <StudyDividerBlock block={block} spacing="read" />
    case 'board':
      return <DocumentBoardReader block={block} openBoard={openBoard} onError={onAssetError} />
  }
}

type ReaderNode =
  | { kind: 'block'; block: StudyBlock }
  | {
      kind: 'section'
      heading: Extract<StudyBlock, { type: 'heading' }>
      children: ReaderNode[]
    }

interface VisibleReaderItem {
  block: StudyBlock
  depth: number
  section: boolean
  hasChildren: boolean
}

function buildReaderOutline(blocks: StudyBlock[]): ReaderNode[] {
  const root: ReaderNode[] = []
  const stack: Array<Extract<ReaderNode, { kind: 'section' }>> = []

  const closeSections = (nextLevel?: 1 | 2 | 3): void => {
    while (stack.length > 0) {
      const section = stack[stack.length - 1]
      if (!section || (nextLevel !== undefined && section.heading.level < nextLevel)) return

      const trailing = section.children[section.children.length - 1]
      if (trailing?.kind === 'block' && trailing.block.type === 'divider') {
        section.children.pop()
        const parent = stack[stack.length - 2]
        if (parent) parent.children.push(trailing)
        else root.push(trailing)
      }

      stack.pop()
    }
  }

  blocks.forEach((block) => {
    if (block.type === 'heading') {
      const section: Extract<ReaderNode, { kind: 'section' }> = {
        kind: 'section',
        heading: block,
        children: []
      }

      closeSections(block.level)
      const parent = stack[stack.length - 1]
      if (parent) parent.children.push(section)
      else root.push(section)
      stack.push(section)
      return
    }

    const node: ReaderNode = { kind: 'block', block }
    const parent = stack[stack.length - 1]
    if (parent) parent.children.push(node)
    else root.push(node)
  })

  closeSections()
  return root
}

function flattenReaderOutline(
  nodes: ReaderNode[],
  collapsedHeadingIds: ReadonlySet<string>,
  depth = 0
): VisibleReaderItem[] {
  const visible: VisibleReaderItem[] = []

  nodes.forEach((node) => {
    if (node.kind === 'block') {
      visible.push({
        block: node.block,
        depth,
        section: false,
        hasChildren: false
      })
      return
    }

    visible.push({
      block: node.heading,
      depth,
      section: true,
      hasChildren: node.children.length > 0
    })

    if (!collapsedHeadingIds.has(node.heading.id)) {
      visible.push(...flattenReaderOutline(node.children, collapsedHeadingIds, depth + 1))
    }
  })

  return visible
}

function findReaderAncestors(
  nodes: ReaderNode[],
  blockId: string,
  ancestors: string[] = []
): string[] | null {
  for (const node of nodes) {
    if (node.kind === 'block') {
      if (node.block.id === blockId) return ancestors
      continue
    }

    if (node.heading.id === blockId) return ancestors

    const nested = findReaderAncestors(node.children, blockId, [...ancestors, node.heading.id])
    if (nested) return nested
  }

  return null
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
  const theme = useTheme()
  const listRef = useRef<FlatList<VisibleReaderItem>>(null)
  const [collapsedHeadingIds, setCollapsedHeadingIds] = useState<Set<string>>(() => new Set())
  const [pendingReveal, setPendingReveal] = useState<DocumentRevealRequest | null>(null)

  const outline = useMemo(() => buildReaderOutline(document.blocks), [document.blocks])
  const visibleItems = useMemo(
    () => flattenReaderOutline(outline, collapsedHeadingIds),
    [collapsedHeadingIds, outline]
  )

  useEffect(() => {
    setCollapsedHeadingIds((current) => {
      const headingIds = new Set(
        document.blocks.filter((block) => block.type === 'heading').map((block) => block.id)
      )
      const next = new Set([...current].filter((id) => headingIds.has(id)))
      return next.size === current.size ? current : next
    })
  }, [document.blocks])

  useEffect(() => {
    if (!reveal) return

    if (reveal.blockId === null) {
      setPendingReveal(reveal)
      return
    }

    const ancestors = findReaderAncestors(outline, reveal.blockId)
    if (!ancestors) return

    setCollapsedHeadingIds((current) => {
      if (!ancestors.some((id) => current.has(id))) return current
      const next = new Set(current)
      ancestors.forEach((id) => next.delete(id))
      return next
    })
    setPendingReveal(reveal)
  }, [outline, reveal])

  useEffect(() => {
    if (!pendingReveal) return undefined

    const frame = requestAnimationFrame(() => {
      if (pendingReveal.blockId === null) {
        listRef.current?.scrollToOffset({ offset: 0, animated: true })
        setPendingReveal(null)
        return
      }

      const index = visibleItems.findIndex((item) => item.block.id === pendingReveal.blockId)
      if (index < 0) return
      listRef.current?.scrollToIndex({ index, viewOffset: 24, animated: true })
      setPendingReveal(null)
    })

    return () => cancelAnimationFrame(frame)
  }, [pendingReveal, visibleItems])

  const toggleHeading = (headingId: string): void => {
    setCollapsedHeadingIds((current) => {
      const next = new Set(current)
      if (next.has(headingId)) next.delete(headingId)
      else next.add(headingId)
      return next
    })
  }

  return (
    <FlatList
      ref={listRef}
      data={visibleItems}
      keyExtractor={(item) => item.block.id}
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
      renderItem={({ item }) => {
        const collapsed = item.section && collapsedHeadingIds.has(item.block.id)
        const sectionTitle =
          item.block.type === 'heading' ? item.block.text || 'Без заголовка' : 'Раздел'

        return (
          <View
            style={{
              marginBottom: item.section ? 12 : 20,
              marginLeft: item.depth > 0 ? Math.min(item.depth, 3) * 14 : 0,
              paddingLeft: item.depth > 0 ? 12 : 0,
              borderLeftWidth: item.depth > 0 ? 1 : 0,
              borderLeftColor: theme.border
            }}
          >
            {item.section ? (
              <Pressable
                accessibilityRole={item.hasChildren ? 'button' : undefined}
                accessibilityLabel={
                  item.hasChildren
                    ? `${collapsed ? 'Развернуть' : 'Свернуть'} раздел «${sectionTitle}»`
                    : undefined
                }
                disabled={!item.hasChildren}
                onPress={() => toggleHeading(item.block.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 4,
                  paddingVertical: 2,
                  paddingRight: 4,
                  borderRadius: 12,
                  opacity: pressed ? 0.72 : 1
                })}
              >
                <View
                  style={{
                    width: 20,
                    minHeight: 28,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <ChevronRight
                    size={16}
                    color={theme.muted}
                    style={{
                      opacity: item.hasChildren ? 1 : 0,
                      transform: [{ rotate: collapsed ? '0deg' : '90deg' }]
                    }}
                  />
                </View>
                <View style={{ minWidth: 0, flex: 1 }}>
                  <ReadBlock
                    block={item.block}
                    resolveAssetUri={resolveAssetUri}
                    openAsset={openAsset}
                    onAssetError={onAssetError}
                    openBoard={openBoard}
                    resolveInternalLinkTarget={resolveInternalLinkTarget}
                    onOpenInternalLink={onOpenInternalLink}
                  />
                </View>
              </Pressable>
            ) : (
              <ReadBlock
                block={item.block}
                resolveAssetUri={resolveAssetUri}
                openAsset={openAsset}
                onAssetError={onAssetError}
                openBoard={openBoard}
                resolveInternalLinkTarget={resolveInternalLinkTarget}
                onOpenInternalLink={onOpenInternalLink}
              />
            )}
          </View>
        )
      }}
    />
  )
}
