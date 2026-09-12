import { memo, useCallback, useMemo, useState } from 'react'
import { Modal, Pressable, Text, View, useWindowDimensions } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import {
  Check,
  Code2,
  Columns2,
  Copy,
  Eye,
  Maximize2,
  Minimize2,
  PencilLine,
  Workflow
} from 'lucide-react-native'
import { appearanceTokens } from '@mymind/design'
import type {
  StudyBlock,
  StudyLatexViewMode,
  StudyMarkdownViewMode,
  StudyMermaidViewMode
} from '@mymind/contracts/study'

import StudySourceBlockDom, {
  type StudySourceKind,
  type StudySourceViewMode
} from './StudySourceBlockDom'
import { getStudyCodeLanguage } from './studySourceLanguages'
import { useTheme } from './theme'

type TechnicalBlock = Extract<StudyBlock, { type: 'code' | 'markdown' | 'latex' | 'mermaid' }>

const StableStudySourceBlockDom = memo(StudySourceBlockDom)

function sourceKind(block: TechnicalBlock): StudySourceKind {
  return block.type
}

function blockLabel(block: TechnicalBlock): string {
  if (block.type === 'code') return getStudyCodeLanguage(block.language).label
  if (block.type === 'markdown') return 'Markdown'
  if (block.type === 'latex') return 'LaTeX'
  return 'Mermaid'
}

function defaultViewMode(block: TechnicalBlock): StudySourceViewMode {
  if (block.type === 'code') return 'write'
  return block.viewMode ?? 'split'
}

function withViewMode(block: TechnicalBlock, viewMode: StudySourceViewMode): TechnicalBlock {
  if (block.type === 'markdown') {
    return { ...block, viewMode: viewMode as StudyMarkdownViewMode }
  }
  if (block.type === 'latex') {
    return { ...block, viewMode: viewMode as StudyLatexViewMode }
  }
  if (block.type === 'mermaid') {
    return { ...block, viewMode: viewMode as StudyMermaidViewMode }
  }
  return block
}

function withSource(block: TechnicalBlock, source: string): TechnicalBlock {
  return { ...block, source }
}

const modeItems = [
  { value: 'write' as const, label: 'Код', icon: PencilLine },
  { value: 'split' as const, label: 'Разделить', icon: Columns2 },
  { value: 'preview' as const, label: 'Просмотр', icon: Eye }
]

function HeaderIcon({
  label,
  active = false,
  onPress,
  children
}: {
  label: string
  active?: boolean
  onPress(): void
  children: React.ReactNode
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 7,
        backgroundColor: active
          ? theme.accent + '18'
          : pressed
            ? theme.raised
            : 'transparent',
        opacity: pressed ? 0.72 : 1
      })}
    >
      {children}
    </Pressable>
  )
}

export function StudySourceBlock({
  block,
  editable,
  update
}: {
  block: TechnicalBlock
  editable: boolean
  update?: (next: TechnicalBlock) => void
}): React.JSX.Element {
  const theme = useTheme()
  const window = useWindowDimensions()
  const [height, setHeight] = useState(block.type === 'code' ? 128 : 180)
  const [fullscreen, setFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const viewMode = defaultViewMode(block)
  const kind = sourceKind(block)
  const showHeader = editable || block.type === 'code' || block.type === 'mermaid'
  const framed = showHeader || block.type === 'latex'

  const handleHeight = useCallback(async (nextHeight: number): Promise<void> => {
    const normalized = Math.max(56, Math.min(1800, Math.ceil(nextHeight)))
    setHeight((current) => (Math.abs(current - normalized) >= 2 ? normalized : current))
  }, [])

  const handleSource = useCallback(
    async (source: string): Promise<void> => {
      update?.(withSource(block, source))
    },
    [block, update]
  )

  const dom = useMemo(
    () => ({
      scrollEnabled: false,
      style: {
        width: '100%',
        height: fullscreen ? Math.max(320, window.height - 118) : height,
        backgroundColor: 'transparent'
      }
    }),
    [fullscreen, height, window.height]
  )

  const editor = (
    <StableStudySourceBlockDom
      kind={kind}
      source={block.source}
      editable={editable}
      viewMode={viewMode}
      language={block.type === 'code' ? block.language : undefined}
      latexDisplayMode={block.type === 'latex' ? (block.displayMode ?? 'display') : undefined}
      latexAlignment={block.type === 'latex' ? (block.alignment ?? 'center') : undefined}
      latexScale={block.type === 'latex' ? (block.scale ?? 100) : undefined}
      mermaidTheme={block.type === 'mermaid' ? (block.theme ?? 'dark') : undefined}
      mermaidScale={block.type === 'mermaid' ? (block.scale ?? 100) : undefined}
      colorScheme={theme.background === appearanceTokens.dark.background ? 'dark' : 'light'}
      textColor={theme.text}
      mutedColor={theme.muted}
      borderColor={theme.border}
      surfaceColor={theme.surface}
      codeSurfaceColor={theme.raised}
      accentColor={theme.accent}
      onSourceChange={handleSource}
      onHeightChange={handleHeight}
      dom={dom}
    />
  )

  const copy = async (): Promise<void> => {
    await Clipboard.setStringAsync(block.source)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const header = showHeader ? (
    <View
      style={{
        minHeight: block.type === 'code' ? 40 : 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        backgroundColor: theme.surface
      }}
    >
      {block.type === 'mermaid' ? (
        <Workflow size={15} color={theme.accent} />
      ) : block.type === 'code' ? (
        <Code2 size={15} color={theme.muted} />
      ) : null}

      <Text
        numberOfLines={1}
        style={{
          minWidth: 0,
          marginRight: 'auto',
          color: theme.muted,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.8,
          textTransform: 'uppercase'
        }}
      >
        {blockLabel(block)}
      </Text>

      {editable && block.type !== 'code'
        ? modeItems.map((item) => {
            const Icon = item.icon
            const active = viewMode === item.value
            return (
              <HeaderIcon
                key={item.value}
                label={item.label}
                active={active}
                onPress={() => update?.(withViewMode(block, item.value))}
              >
                <Icon size={14} color={active ? theme.accent : theme.muted} />
              </HeaderIcon>
            )
          })
        : null}

      <HeaderIcon label={copied ? 'Скопировано' : 'Копировать'} onPress={() => void copy()}>
        {copied ? (
          <Check size={15} color="#6ee7b7" />
        ) : (
          <Copy size={15} color={theme.muted} />
        )}
      </HeaderIcon>
      <HeaderIcon
        label={fullscreen ? 'Свернуть блок' : 'Развернуть блок'}
        onPress={() => setFullscreen((value) => !value)}
      >
        {fullscreen ? (
          <Minimize2 size={15} color={theme.muted} />
        ) : (
          <Maximize2 size={15} color={theme.muted} />
        )}
      </HeaderIcon>
    </View>
  ) : null

  const inline = (
    <View
      style={{
        overflow: 'hidden',
        borderWidth: framed ? 1 : 0,
        borderColor: theme.border,
        borderRadius: framed ? 12 : 0,
        backgroundColor: framed ? theme.raised : 'transparent'
      }}
    >
      {header}
      {editor}
    </View>
  )

  if (!fullscreen) return inline

  return (
    <>
      <View
        style={{
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          backgroundColor: theme.raised
        }}
      >
        {header}
        <View
          style={{
            height: Math.min(Math.max(56, height), 200),
            backgroundColor: theme.raised
          }}
        />
      </View>

      <Modal
        visible
        animationType="fade"
        onRequestClose={() => setFullscreen(false)}
        statusBarTranslucent
      >
        <View style={{ flex: 1, paddingTop: 36, backgroundColor: theme.background }}>
          <View
            style={{
              minHeight: 52,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
              backgroundColor: theme.surface
            }}
          >
            <Text
              numberOfLines={1}
              style={{ flex: 1, color: theme.text, fontSize: 14, fontWeight: '700' }}
            >
              {blockLabel(block)}
            </Text>
            {editable && block.type !== 'code'
              ? modeItems.map((item) => {
                  const Icon = item.icon
                  const active = viewMode === item.value
                  return (
                    <HeaderIcon
                      key={item.value}
                      label={item.label}
                      active={active}
                      onPress={() => update?.(withViewMode(block, item.value))}
                    >
                      <Icon size={14} color={active ? theme.accent : theme.muted} />
                    </HeaderIcon>
                  )
                })
              : null}
            <HeaderIcon label="Копировать" onPress={() => void copy()}>
              <Copy size={15} color={theme.muted} />
            </HeaderIcon>
            <HeaderIcon label="Свернуть блок" onPress={() => setFullscreen(false)}>
              <Minimize2 size={15} color={theme.muted} />
            </HeaderIcon>
          </View>
          <View style={{ flex: 1, minHeight: 0 }}>{editor}</View>
        </View>
      </Modal>
    </>
  )
}
