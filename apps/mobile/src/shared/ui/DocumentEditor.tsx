import { useEffect, useRef, useState } from 'react'
import {
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native'
import type {
  StudyAssetKind,
  StudyBlock,
  StudyBlockType,
  StudyBoardBlock,
  StudyDocument,
  ResolveStudyInternalLinkTargetInput,
  StudyInternalLinkTarget,
  StudyLocalAsset
} from '@mymind/contracts/study'
import { appearanceTokens, designTokens } from '@mymind/design'
import {
  ArrowDown,
  ArrowUp,
  AudioLines,
  ChevronRight,
  Code2,
  CopyPlus,
  FileText,
  GripVertical,
  Heading2,
  Image as ImageIcon,
  Minus,
  Plus,
  Paperclip,
  Presentation,
  Settings2,
  Sigma,
  Trash2,
  Type,
  Video,
  Workflow,
  type LucideIcon
} from 'lucide-react-native'
import BoardCanvasDom from '../../modules/boards/BoardCanvasDom'
import { AppDialog } from './AppDialog'
import {
  DocumentBoardEditor,
  DocumentBoardReader,
  type OpenDocumentBoard
} from './DocumentBoardBlock'
import { AppIcon } from './icons'
import { NotesRichTextBlock } from './NotesRichTextBlock'
import { NotesBlockSettingsSheet } from './NotesBlockSettings'
import {
  DEFAULT_NOTES_RICH_TEXT_STATE,
  NotesQuickLinkDialog,
  NotesRichTextInlineControls,
  NotesRichTextSettingsSheet
} from './NotesRichTextControls'
import type { NotesRichTextDomRef, NotesRichTextFormattingState } from './NotesRichTextDom'
import { useConfirmation } from './ConfirmationProvider'
import { Button, Label } from './primitives'
import { useTheme } from './theme'
import { AudioAssetPlayer, VoiceRecorder, type VoiceRecordingInput } from './VoiceRecorder'

const INSERTABLE_BLOCKS: ReadonlyArray<{
  type: StudyBlockType
  label: string
  description: string
  icon: LucideIcon
}> = [
  { type: 'text', label: 'Текст', description: 'Обычный текстовый блок', icon: Type },
  { type: 'heading', label: 'Заголовок', description: 'Заголовок H1–H3', icon: Heading2 },
  { type: 'code', label: 'Код', description: 'Фрагмент кода', icon: Code2 },
  { type: 'markdown', label: 'Markdown', description: 'Markdown-разметка', icon: FileText },
  { type: 'latex', label: 'LaTeX', description: 'Математическая формула', icon: Sigma },
  { type: 'mermaid', label: 'Mermaid', description: 'Диаграмма Mermaid', icon: Workflow },
  { type: 'board', label: 'Доска', description: 'Связанная доска', icon: Presentation },
  { type: 'divider', label: 'Разделитель', description: 'Визуальная линия', icon: Minus }
]

const ASSET_BLOCKS: ReadonlyArray<{
  type: StudyAssetKind
  label: string
  description: string
  icon: LucideIcon
}> = [
  { type: 'image', label: 'Изображение', description: 'Локальное изображение', icon: ImageIcon },
  { type: 'video', label: 'Видео', description: 'Локальное видео', icon: Video },
  { type: 'audio', label: 'Аудио', description: 'Аудиофайл', icon: AudioLines },
  { type: 'file', label: 'Файл', description: 'Любой локальный файл', icon: Paperclip }
]

type DocumentEditorPresentation = 'default' | 'notes-clean'

interface DocumentAssetActions {
  importAsset?: (kind: StudyAssetKind) => Promise<StudyLocalAsset | null>
  openAsset?: (asset: StudyLocalAsset) => Promise<void>
  resolveAssetUri?: (asset: StudyLocalAsset) => string | null
  onAssetError?: (reason: unknown) => void
}

interface DocumentEditorProps {
  document: StudyDocument
  onChange(document: StudyDocument): void
  createId(): string
  header?: React.ReactElement | null
  presentation?: DocumentEditorPresentation
  mode?: 'edit' | 'read'
  importAsset?: (kind: StudyAssetKind) => Promise<StudyLocalAsset | null>
  openAsset?: (asset: StudyLocalAsset) => Promise<void>
  resolveAssetUri?: (asset: StudyLocalAsset) => string | null
  saveRecordedAudio?: (input: VoiceRecordingInput) => Promise<StudyLocalAsset>
  openBoard?: OpenDocumentBoard
  searchInternalLinkTargets?: (query: string) => StudyInternalLinkTarget[]
  resolveInternalLinkTarget?: (
    input: ResolveStudyInternalLinkTargetInput
  ) => StudyInternalLinkTarget | null
  onOpenInternalLink?: (target: ResolveStudyInternalLinkTargetInput) => void
  onAssetError?: (reason: unknown) => void
}

function newBlock(type: StudyBlockType, id: string): StudyBlock | null {
  switch (type) {
    case 'text':
      return { id, type, text: '' }
    case 'heading':
      return { id, type, text: '', level: 2 }
    case 'code':
      return { id, type, source: '', language: 'text' }
    case 'markdown':
      return { id, type, source: '', viewMode: 'write' }
    case 'latex':
      return { id, type, source: '', viewMode: 'write', displayMode: 'display' }
    case 'mermaid':
      return { id, type, source: '', viewMode: 'write' }
    case 'board':
      return { id, type }
    case 'divider':
      return { id, type, variant: 'solid' }
    default:
      return null
  }
}

function newAssetBlock(type: StudyAssetKind, id: string, asset: StudyLocalAsset): StudyBlock {
  const source = { type: 'local' as const, asset }
  if (type === 'image') return { id, type, source, imageFit: 'contain' }
  if (type === 'video') return { id, type, source }
  if (type === 'audio') return { id, type, source }
  return { id, type: 'file', source }
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} Б`
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} КБ`
  return `${(value / (1024 * 1024)).toFixed(1)} МБ`
}

function blockLabel(block: StudyBlock): string {
  switch (block.type) {
    case 'text':
      return 'Текст'
    case 'heading':
      return `Заголовок H${block.level}`
    case 'code':
      return 'Код'
    case 'markdown':
      return 'Markdown'
    case 'latex':
      return 'LaTeX'
    case 'mermaid':
      return 'Mermaid'
    case 'image':
      return 'Изображение'
    case 'video':
      return 'Видео'
    case 'audio':
      return 'Аудио'
    case 'file':
      return 'Файл'
    case 'divider':
      return 'Разделитель'
    case 'board':
      return 'Доска'
  }
}

function LocalAssetEditor({
  block,
  update,
  assetActions,
  clean = false
}: {
  block: Extract<StudyBlock, { type: 'image' | 'video' | 'audio' | 'file' }>
  update(next: StudyBlock): void
  assetActions: DocumentAssetActions
  clean?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  if (block.source.type !== 'local') return <View />
  const asset = block.source.asset
  const uri = asset ? assetActions.resolveAssetUri?.(asset) : null
  const inputStyle = {
    color: theme.text,
    backgroundColor: clean ? 'transparent' : theme.raised,
    borderWidth: clean ? 0 : 1,
    borderColor: theme.border,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: clean ? 2 : 12,
    paddingVertical: clean ? 8 : 12,
    minHeight: 44,
    fontSize: 16
  } as const

  return (
    <View style={{ gap: 8 }}>
      {block.type === 'audio' && uri ? (
        <AudioAssetPlayer uri={uri} onError={assetActions.onAssetError} />
      ) : null}
      {block.type === 'image' && uri ? (
        <Image
          accessibilityLabel={block.title || asset?.name || 'Изображение'}
          source={{ uri }}
          resizeMode={block.imageFit ?? 'contain'}
          style={{
            width: '100%',
            height: block.imageHeight ?? 220,
            borderRadius: clean ? 14 : designTokens.radius.md,
            backgroundColor: theme.raised
          }}
        />
      ) : null}
      <TextInput
        accessibilityLabel="Подпись вложения"
        placeholder="Подпись"
        placeholderTextColor={theme.muted}
        value={block.title ?? ''}
        onChangeText={(title) => update({ ...block, title: title || undefined })}
        style={inputStyle}
      />
      {asset ? (
        <Label muted>
          {asset.name} · {formatBytes(asset.size)}
        </Label>
      ) : (
        <Label muted>Вложение ещё не выбрано.</Label>
      )}
      {asset && !uri ? <Label muted>Локальный файл не найден на этом устройстве.</Label> : null}
      {asset && assetActions.openAsset ? (
        <Button
          label="Открыть / поделиться"
          compact={clean}
          disabled={!uri}
          onPress={() => {
            void assetActions.openAsset?.(asset).catch((reason: unknown) => {
              assetActions.onAssetError?.(reason)
            })
          }}
        />
      ) : null}
    </View>
  )
}

function BlockInput({
  block,
  update,
  assetActions,
  openBoard,
  searchInternalLinkTargets,
  clean = false
}: {
  block: StudyBlock
  update(next: StudyBlock): void
  assetActions: DocumentAssetActions
  openBoard?: OpenDocumentBoard
  searchInternalLinkTargets?: (query: string) => StudyInternalLinkTarget[]
  clean?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  const inputStyle = {
    color: theme.text,
    backgroundColor: clean ? 'transparent' : theme.raised,
    borderWidth: clean ? 0 : 1,
    borderColor: theme.border,
    borderRadius: clean ? 0 : designTokens.radius.md,
    paddingHorizontal: clean ? 2 : 12,
    paddingVertical: clean ? 8 : 12,
    minHeight: 48,
    fontSize: 16
  } as const
  const sourceStyle = { ...inputStyle, minHeight: 120, textAlignVertical: 'top' as const }
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
        <TextInput
          accessibilityLabel="Текстовый блок"
          multiline
          placeholder="Начните писать…"
          placeholderTextColor={theme.muted}
          value={block.text}
          onChangeText={(text) => update({ ...block, text, html: undefined })}
          style={{
            ...sourceStyle,
            minHeight: clean ? 112 : 96,
            fontSize: clean ? 17 : 16,
            lineHeight: clean ? 25 : undefined
          }}
        />
      )
    case 'heading':
      return (
        <View style={{ gap: 8 }}>
          <TextInput
            accessibilityLabel="Заголовок"
            placeholder="Заголовок"
            placeholderTextColor={theme.muted}
            value={block.text}
            onChangeText={(text) => update({ ...block, text })}
            style={{
              ...inputStyle,
              color: block.color ?? theme.text,
              backgroundColor:
                block.backgroundColor ??
                (clean && block.backgroundScope === 'container'
                  ? theme.raised
                  : inputStyle.backgroundColor),
              fontWeight: '700',
              fontSize: block.level === 1 ? 26 : block.level === 2 ? 22 : 19,
              textAlign: block.alignment ?? 'left',
              borderRadius:
                clean && block.backgroundScope === 'container' ? 10 : inputStyle.borderRadius
            }}
          />
          {!clean ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([1, 2, 3] as const).map((level) => (
                <Button
                  key={level}
                  label={`H${level}`}
                  selected={block.level === level}
                  onPress={() => update({ ...block, level })}
                />
              ))}
            </View>
          ) : null}
        </View>
      )
    case 'code':
      return (
        <View style={{ gap: 6 }}>
          <TextInput
            accessibilityLabel="Язык кода"
            placeholder="Язык"
            placeholderTextColor={theme.muted}
            value={block.language}
            autoCapitalize="none"
            onChangeText={(language) => update({ ...block, language })}
            style={inputStyle}
          />
          <TextInput
            accessibilityLabel="Код"
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            value={block.source}
            onChangeText={(source) => update({ ...block, source })}
            style={{
              ...sourceStyle,
              fontFamily: 'monospace',
              backgroundColor: clean ? theme.surface : theme.raised,
              borderRadius: clean ? 12 : designTokens.radius.md,
              paddingHorizontal: 12
            }}
          />
        </View>
      )
    case 'markdown': {
      const viewMode = clean ? (block.viewMode ?? 'split') : 'write'
      return (
        <View style={{ gap: 10 }}>
          {viewMode !== 'preview' ? (
            <TextInput
              accessibilityLabel="Markdown блок"
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              value={block.source}
              onChangeText={(source) => update({ ...block, source })}
              style={{
                ...sourceStyle,
                fontFamily: 'monospace',
                backgroundColor: clean ? theme.surface : theme.raised,
                borderRadius: clean ? 12 : designTokens.radius.md,
                paddingHorizontal: 12
              }}
            />
          ) : null}
          {clean && viewMode !== 'write' ? (
            <View
              style={{
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                backgroundColor: theme.surface
              }}
            >
              <BoardCanvasDom {...richProps} kind={'markdown' as const} source={block.source} />
            </View>
          ) : null}
        </View>
      )
    }
    case 'latex': {
      const viewMode = clean ? (block.viewMode ?? 'split') : 'write'
      return (
        <View style={{ gap: 10 }}>
          {viewMode !== 'preview' ? (
            <TextInput
              accessibilityLabel="LaTeX блок"
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              value={block.source}
              onChangeText={(source) => update({ ...block, source })}
              style={{
                ...sourceStyle,
                fontFamily: 'monospace',
                backgroundColor: clean ? theme.surface : theme.raised,
                borderRadius: clean ? 12 : designTokens.radius.md,
                paddingHorizontal: 12
              }}
            />
          ) : null}
          {clean && viewMode !== 'write' ? (
            <View
              style={{
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                backgroundColor: theme.surface
              }}
            >
              <BoardCanvasDom
                {...richProps}
                kind={'latex' as const}
                source={block.source}
                latexDisplayMode={block.displayMode ?? 'display'}
                latexAlignment={block.alignment ?? 'center'}
                latexScale={(block.scale ?? 100) / 100}
              />
            </View>
          ) : null}
        </View>
      )
    }
    case 'mermaid': {
      const viewMode = clean ? (block.viewMode ?? 'split') : 'write'
      return (
        <View style={{ gap: 10 }}>
          {viewMode !== 'preview' ? (
            <TextInput
              accessibilityLabel="Mermaid блок"
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              value={block.source}
              onChangeText={(source) => update({ ...block, source })}
              style={{
                ...sourceStyle,
                fontFamily: 'monospace',
                backgroundColor: clean ? theme.surface : theme.raised,
                borderRadius: clean ? 12 : designTokens.radius.md,
                paddingHorizontal: 12
              }}
            />
          ) : null}
          {clean && viewMode !== 'write' ? (
            <View
              style={{
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                backgroundColor: theme.surface
              }}
            >
              <BoardCanvasDom
                {...richProps}
                kind={'mermaid' as const}
                source={block.source}
                mermaidTheme={block.theme ?? (colorScheme === 'dark' ? 'dark' : 'default')}
                mermaidScale={(block.scale ?? 100) / 100}
              />
            </View>
          ) : null}
        </View>
      )
    }
    case 'image':
    case 'video':
      return block.source.type === 'url' ? (
        <View style={{ gap: 8 }}>
          <TextInput
            accessibilityLabel="Подпись вложения"
            placeholder="Подпись"
            placeholderTextColor={theme.muted}
            value={block.title ?? ''}
            onChangeText={(title) => update({ ...block, title: title || undefined })}
            style={inputStyle}
          />
          <TextInput
            accessibilityLabel="Ссылка вложения"
            autoCapitalize="none"
            autoCorrect={false}
            value={block.source.url}
            onChangeText={(url) => update({ ...block, source: { type: 'url', url } })}
            style={inputStyle}
          />
        </View>
      ) : (
        <LocalAssetEditor block={block} update={update} assetActions={assetActions} clean={clean} />
      )
    case 'audio':
    case 'file':
      return (
        <LocalAssetEditor block={block} update={update} assetActions={assetActions} clean={clean} />
      )
    case 'divider': {
      const variant = block.variant ?? 'solid'
      const thickness = block.thickness ?? 1
      const color =
        !block.color || block.color.toLowerCase() === '#6d5dfc' ? theme.accent : block.color
      return (
        <View style={{ gap: 10, paddingVertical: clean ? 16 : 0 }}>
          {variant === 'dashed' || variant === 'dotted' ? (
            <View
              style={{
                height: Math.max(2, thickness),
                borderTopWidth: thickness,
                borderStyle: variant === 'dotted' ? 'dotted' : 'dashed',
                borderColor: color
              }}
            />
          ) : (
            <View
              style={{
                alignSelf: variant === 'tapered' ? 'center' : 'stretch',
                width: variant === 'tapered' ? '68%' : undefined,
                height: thickness,
                borderRadius: thickness,
                backgroundColor: color
              }}
            />
          )}
          {!clean ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['solid', 'tapered', 'dashed', 'dotted'] as const).map((nextVariant) => (
                <Button
                  key={nextVariant}
                  label={nextVariant}
                  selected={variant === nextVariant}
                  onPress={() => update({ ...block, variant: nextVariant })}
                />
              ))}
            </View>
          ) : null}
        </View>
      )
    }
    case 'board':
      return (
        <DocumentBoardEditor
          block={block as StudyBoardBlock}
          update={(next) => update(next)}
          openBoard={openBoard}
          onError={assetActions.onAssetError}
        />
      )
  }
}

function ToolbarButton({
  label,
  icon,
  selected = false,
  disabled = false,
  danger = false,
  onPress
}: {
  label: string
  icon?: 'back' | 'forward' | 'settings' | 'delete' | 'copy'
  selected?: boolean
  disabled?: boolean
  danger?: boolean
  onPress(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: icon ? 40 : 42,
        height: 36,
        paddingHorizontal: icon ? 0 : 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        borderWidth: selected ? 1 : 0,
        borderColor: selected ? theme.accent + '55' : 'transparent',
        backgroundColor: selected ? theme.accent + '16' : pressed ? theme.raised : 'transparent',
        opacity: disabled ? 0.32 : pressed ? 0.72 : 1
      })}
    >
      {icon ? (
        <AppIcon
          name={icon}
          size={17}
          color={danger ? theme.error : selected ? theme.accent : theme.muted}
        />
      ) : (
        <Text
          style={{
            color: danger ? theme.error : selected ? theme.accent : theme.text,
            fontSize: 12.5,
            fontWeight: '700'
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  )
}

function BlockHeaderIcon({
  label,
  icon: Icon,
  disabled = false,
  danger = false,
  onPress
}: {
  label: string
  icon: LucideIcon
  disabled?: boolean
  danger?: boolean
  onPress(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={5}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 7,
        backgroundColor: pressed ? (danger ? '#ef44441A' : theme.raised) : 'transparent',
        opacity: disabled ? 0.25 : pressed ? 0.72 : 1
      })}
    >
      <Icon size={16} color={danger ? theme.error : theme.muted} />
    </Pressable>
  )
}

function DesktopParityBlockCard({
  block,
  active,
  collapsed,
  first,
  last,
  activate,
  toggleCollapsed,
  move,
  duplicate,
  settings,
  remove,
  children
}: {
  block: StudyBlock
  active: boolean
  collapsed: boolean
  first: boolean
  last: boolean
  activate(): void
  toggleCollapsed(): void
  move(direction: -1 | 1): void
  duplicate(): void
  settings(): void
  remove(): void
  children: React.ReactNode
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="none"
      onPress={activate}
      style={{
        padding: active ? 11 : 12,
        borderWidth: active ? 2 : 1,
        borderColor: active ? theme.accent + '66' : theme.border,
        borderRadius: 12,
        backgroundColor: theme.surface
      }}
    >
      <View
        style={{
          minHeight: 30,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          marginBottom: collapsed ? 0 : 8
        }}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 30,
            height: 30,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.55
          }}
        >
          <GripVertical size={16} color={theme.muted} />
        </View>
        <BlockHeaderIcon
          label={collapsed ? `Развернуть блок «${blockLabel(block)}»` : `Свернуть блок «${blockLabel(block)}»`}
          icon={ChevronRight}
          onPress={toggleCollapsed}
        />
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            marginLeft: 4,
            color: theme.muted,
            fontSize: 11,
            lineHeight: 15,
            fontWeight: '700',
            letterSpacing: 0.8,
            textTransform: 'uppercase'
          }}
        >
          {blockLabel(block)}
        </Text>
        <BlockHeaderIcon
          label="Переместить блок вверх"
          icon={ArrowUp}
          disabled={first}
          onPress={() => move(-1)}
        />
        <BlockHeaderIcon
          label="Переместить блок вниз"
          icon={ArrowDown}
          disabled={last}
          onPress={() => move(1)}
        />
        <BlockHeaderIcon label="Дублировать блок" icon={CopyPlus} onPress={duplicate} />
        <BlockHeaderIcon label="Настройки блока" icon={Settings2} onPress={settings} />
        <BlockHeaderIcon label="Удалить блок" icon={Trash2} danger onPress={remove} />
      </View>
      {collapsed ? null : children}
    </Pressable>
  )
}

function DesktopParityInsertControl({ onPress }: { onPress(): void }): React.JSX.Element {
  const theme = useTheme()
  return (
    <View style={{ height: 32, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ height: 1, flex: 1, backgroundColor: theme.border }} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Добавить блок здесь"
        hitSlop={8}
        onPress={onPress}
        style={({ pressed }) => ({
          width: 26,
          height: 26,
          marginHorizontal: 8,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: pressed ? theme.accent + '88' : theme.border,
          borderRadius: 13,
          backgroundColor: pressed ? theme.accent + '14' : theme.surface,
          opacity: pressed ? 0.75 : 1
        })}
      >
        <Plus size={14} color={theme.muted} />
      </Pressable>
      <View style={{ height: 1, flex: 1, backgroundColor: theme.border }} />
    </View>
  )
}

function RichTextFormattingDock({
  editor,
  state,
  openSettings,
  openLink
}: {
  editor: NotesRichTextDomRef | null
  state: NotesRichTextFormattingState
  openSettings(): void
  openLink(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        minHeight: 52,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        backgroundColor: theme.surface
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          minHeight: 52,
          alignItems: 'center',
          gap: 3,
          paddingHorizontal: 10,
          paddingVertical: 8
        }}
      >
        <NotesRichTextInlineControls
          editor={editor}
          state={state}
          openSettings={openSettings}
          openLink={openLink}
        />
      </ScrollView>
    </View>
  )
}

function NotesBlockToolbar({
  block,
  index,
  count,
  update,
  move,
  remove,
  duplicate,
  openSettings,
  richEditor,
  richState,
  openRichSettings,
  openQuickLink
}: {
  block: StudyBlock
  index: number
  count: number
  update(next: StudyBlock): void
  move(direction: -1 | 1): void
  remove(): void
  duplicate(): void
  openSettings(): void
  richEditor: NotesRichTextDomRef | null
  richState: NotesRichTextFormattingState
  openRichSettings(): void
  openQuickLink(): void
}): React.JSX.Element {
  const theme = useTheme()

  return (
    <View
      style={{
        minHeight: 52,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        backgroundColor: theme.surface
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          minHeight: 52,
          alignItems: 'center',
          gap: 3,
          paddingHorizontal: 8,
          paddingVertical: 8
        }}
      >
        <View
          style={{
            minHeight: 32,
            justifyContent: 'center',
            paddingHorizontal: 9,
            marginRight: 2,
            borderRadius: 9,
            backgroundColor: theme.accent + '10'
          }}
        >
          <Text style={{ color: theme.accent, fontSize: 11.5, fontWeight: '700' }}>
            {blockLabel(block)}
          </Text>
        </View>

        {block.type === 'text' ? (
          <NotesRichTextInlineControls
            editor={richEditor}
            state={richState}
            openSettings={openRichSettings}
            openLink={openQuickLink}
          />
        ) : null}

        {block.type === 'heading'
          ? ([1, 2, 3] as const).map((level) => (
              <ToolbarButton
                key={level}
                label={`H${level}`}
                selected={block.level === level}
                onPress={() => update({ ...block, level })}
              />
            ))
          : null}

        {block.type === 'image' ? (
          <>
            <ToolbarButton
              label="Вписать"
              selected={(block.imageFit ?? 'contain') === 'contain'}
              onPress={() => update({ ...block, imageFit: 'contain' })}
            />
            <ToolbarButton
              label="Обрезать"
              selected={block.imageFit === 'cover'}
              onPress={() => update({ ...block, imageFit: 'cover' })}
            />
          </>
        ) : null}

        <ToolbarButton label="↑" disabled={index === 0} onPress={() => move(-1)} />
        <ToolbarButton label="↓" disabled={index === count - 1} onPress={() => move(1)} />
        <ToolbarButton label="Дублировать блок" icon="copy" onPress={duplicate} />
        {block.type !== 'text' ? (
          <ToolbarButton label="Настройки блока" icon="settings" onPress={openSettings} />
        ) : null}
        <ToolbarButton label="Удалить блок" icon="delete" danger onPress={remove} />
      </ScrollView>
    </View>
  )
}

function NotesInsertSheet({
  open,
  pendingAsset,
  importAsset,
  saveRecordedAudio,
  close,
  insert,
  insertAsset,
  appendRecorded,
  onAssetError
}: {
  open: boolean
  pendingAsset: StudyAssetKind | null
  importAsset?: (kind: StudyAssetKind) => Promise<StudyLocalAsset | null>
  saveRecordedAudio?: (input: VoiceRecordingInput) => Promise<StudyLocalAsset>
  close(): void
  insert(type: StudyBlockType): void
  insertAsset(type: StudyAssetKind): void
  appendRecorded(asset: StudyLocalAsset): void
  onAssetError?: (reason: unknown) => void
}): React.JSX.Element {
  const theme = useTheme()

  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
      title="Добавить блок"
      description="Выберите содержимое для заметки"
      icon="add"
      presentation="sheet"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 16, padding: 14, paddingBottom: 24 }}
      >
        <View style={{ gap: 8 }}>
          <Label muted>Содержимое</Label>
          {INSERTABLE_BLOCKS.map((item) => {
            const Icon = item.icon
            return (
              <Pressable
                key={item.type}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                onPress={() => {
                  insert(item.type)
                  close()
                }}
                style={({ pressed }) => ({
                  minHeight: 58,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 12,
                  borderRadius: 15,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: pressed ? theme.raised : theme.surface,
                  opacity: pressed ? 0.76 : 1
                })}
              >
                <View
                  style={{
                    width: 38,
                    height: 38,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: theme.accent + '12'
                  }}
                >
                  <Icon size={18} color={theme.accent} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
                    {item.label}
                  </Text>
                  <Text
                    style={{ marginTop: 2, color: theme.muted, fontSize: 11.5, lineHeight: 16 }}
                  >
                    {item.description}
                  </Text>
                </View>
                <AppIcon name="forward" size={16} color={theme.muted} />
              </Pressable>
            )
          })}
        </View>

        {importAsset ? (
          <View style={{ gap: 8 }}>
            <Label muted>Файлы и медиа</Label>
            {ASSET_BLOCKS.map((item) => {
              const Icon = item.icon
              return (
                <Pressable
                  key={item.type}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  accessibilityState={{ disabled: pendingAsset !== null }}
                  disabled={pendingAsset !== null}
                  onPress={() => {
                    close()
                    insertAsset(item.type)
                  }}
                  style={({ pressed }) => ({
                    minHeight: 58,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 12,
                    borderRadius: 15,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: pressed ? theme.raised : theme.surface,
                    opacity: pendingAsset !== null ? 0.45 : pressed ? 0.76 : 1
                  })}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                      backgroundColor: theme.accent + '12'
                    }}
                  >
                    <Icon size={18} color={theme.accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
                      {pendingAsset === item.type ? 'Выбор…' : item.label}
                    </Text>
                    <Text
                      style={{ marginTop: 2, color: theme.muted, fontSize: 11.5, lineHeight: 16 }}
                    >
                      {item.description}
                    </Text>
                  </View>
                </Pressable>
              )
            })}
          </View>
        ) : null}

        {saveRecordedAudio ? (
          <View style={{ gap: 8 }}>
            <Label muted>Голосовая запись</Label>
            <VoiceRecorder
              saveRecording={saveRecordedAudio}
              onSaved={(asset) => {
                appendRecorded(asset)
                close()
              }}
              onError={onAssetError}
              disabled={pendingAsset !== null}
            />
          </View>
        ) : null}
      </ScrollView>
    </AppDialog>
  )
}

type NotesReadNode =
  | { kind: 'block'; block: StudyBlock }
  | {
      kind: 'section'
      heading: Extract<StudyBlock, { type: 'heading' }>
      children: NotesReadNode[]
    }

function escapeReaderHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const INTERNAL_LINK_SPAN_PATTERN =
  /<span\b(?=[^>]*\bdata-study-internal-link\s*=\s*(?:"true"|'true'))([^>]*)>([\s\S]*?)<\/span\s*>/gi

function readerAttribute(attributes: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`(?:^|\\s)${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(
    attributes
  )
  return match?.[1] ?? match?.[2] ?? null
}

function readerHtml(
  block: Extract<StudyBlock, { type: 'text' }>,
  resolveInternalLinkTarget?: (
    input: ResolveStudyInternalLinkTargetInput
  ) => StudyInternalLinkTarget | null
): string {
  const source = block.html?.trim()
    ? block.html
    : `<p>${escapeReaderHtml(block.text).replace(/\n/g, '<br />') || '&nbsp;'}</p>`

  if (!resolveInternalLinkTarget || !/data-study-internal-link\s*=/i.test(source)) return source

  INTERNAL_LINK_SPAN_PATTERN.lastIndex = 0
  return source.replace(
    INTERNAL_LINK_SPAN_PATTERN,
    (_match, attributes: string, innerHtml: string) => {
      const materialId = readerAttribute(attributes, 'data-material-id') ?? ''
      const kind =
        readerAttribute(attributes, 'data-target-kind') === 'heading' ? 'heading' : 'material'
      const headingId = readerAttribute(attributes, 'data-heading-id')
      const labelMode =
        readerAttribute(attributes, 'data-label-mode') === 'custom' ? 'custom' : 'auto'
      const resolved = materialId
        ? resolveInternalLinkTarget({ kind, materialId, headingId })
        : null
      const missing = resolved === null
      const displayLabel = labelMode === 'custom' ? null : resolved?.title
      const missingAttribute = missing ? ' data-missing="true"' : ''

      return `<span${attributes}${missingAttribute}>${
        displayLabel ? escapeReaderHtml(displayLabel) : innerHtml
      }</span>`
    }
  )
}
function buildNotesReadOutline(blocks: StudyBlock[]): NotesReadNode[] {
  const root: NotesReadNode[] = []
  const stack: Array<Extract<NotesReadNode, { kind: 'section' }>> = []

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
      const section: Extract<NotesReadNode, { kind: 'section' }> = {
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

    const node: NotesReadNode = { kind: 'block', block }
    const parent = stack[stack.length - 1]
    if (parent) parent.children.push(node)
    else root.push(node)
  })

  closeSections()
  return root
}

function NotesReadHeading({
  heading
}: {
  heading: Extract<StudyBlock, { type: 'heading' }>
}): React.JSX.Element {
  const theme = useTheme()
  const backgroundScope = heading.backgroundScope ?? 'container'
  const backgroundColor = heading.backgroundColor ?? 'transparent'
  const fontSize = heading.level === 1 ? 29 : heading.level === 2 ? 24 : 20
  const lineHeight = heading.level === 1 ? 36 : heading.level === 2 ? 31 : 27

  return (
    <View
      style={{
        borderRadius: 10,
        backgroundColor: backgroundScope === 'container' ? backgroundColor : 'transparent',
        paddingHorizontal: backgroundScope === 'container' ? 5 : 0,
        paddingVertical: 3
      }}
    >
      <Text
        selectable
        style={{
          color: heading.color ?? theme.text,
          fontSize,
          lineHeight,
          fontWeight: '700',
          textAlign: heading.alignment ?? 'left'
        }}
      >
        <Text
          style={{
            backgroundColor: backgroundScope === 'text' ? backgroundColor : 'transparent'
          }}
        >
          {heading.text || 'Без заголовка'}
        </Text>
      </Text>
    </View>
  )
}

function NotesReadAssetBlock({
  block,
  assetActions
}: {
  block: Extract<StudyBlock, { type: 'image' | 'video' | 'audio' | 'file' }>
  assetActions: DocumentAssetActions
}): React.JSX.Element {
  const theme = useTheme()
  const localAsset = block.source.type === 'local' ? block.source.asset : undefined
  const localUri = localAsset ? assetActions.resolveAssetUri?.(localAsset) : null
  const remoteUri = block.source.type === 'url' ? block.source.url : null
  const displayUri = localUri ?? remoteUri

  return (
    <View
      style={{
        gap: 10,
        padding: block.type === 'image' ? 0 : 13,
        borderWidth: block.type === 'image' ? 0 : 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: block.type === 'image' ? 'transparent' : theme.surface,
        overflow: 'hidden'
      }}
    >
      {block.type === 'image' && displayUri ? (
        <Image
          accessibilityLabel={block.title || localAsset?.name || 'Изображение'}
          source={{ uri: displayUri }}
          resizeMode={block.imageFit ?? 'contain'}
          style={{
            width: '100%',
            height: block.imageHeight ?? 260,
            borderRadius: 16,
            backgroundColor: theme.raised
          }}
        />
      ) : null}

      {block.type === 'audio' && localUri ? (
        <AudioAssetPlayer uri={localUri} onError={assetActions.onAssetError} />
      ) : null}

      {block.title ? (
        <Text
          selectable
          style={{ color: theme.text, fontSize: 14, lineHeight: 20, fontWeight: '600' }}
        >
          {block.title}
        </Text>
      ) : null}

      {localAsset ? (
        <Text selectable style={{ color: theme.muted, fontSize: 12, lineHeight: 17 }}>
          {localAsset.name} · {formatBytes(localAsset.size)}
        </Text>
      ) : null}

      {block.source.type === 'local' && localAsset && !localUri ? (
        <Text style={{ color: theme.muted, fontSize: 12 }}>
          Локальный файл не найден на этом устройстве.
        </Text>
      ) : null}

      {block.source.type === 'local' && localAsset && assetActions.openAsset ? (
        <Button
          label="Открыть / поделиться"
          compact
          disabled={!localUri}
          onPress={() => {
            void assetActions.openAsset?.(localAsset).catch((reason: unknown) => {
              assetActions.onAssetError?.(reason)
            })
          }}
        />
      ) : null}

      {block.type === 'video' && remoteUri ? (
        <Button
          label="Открыть видео"
          compact
          onPress={() => {
            void Linking.openURL(remoteUri).catch((reason: unknown) => {
              assetActions.onAssetError?.(reason)
            })
          }}
        />
      ) : null}
    </View>
  )
}

function NotesReadBlock({
  block,
  assetActions,
  openBoard,
  resolveInternalLinkTarget,
  onOpenInternalLink
}: {
  block: StudyBlock
  assetActions: DocumentAssetActions
  openBoard?: OpenDocumentBoard
  resolveInternalLinkTarget?: (
    input: ResolveStudyInternalLinkTargetInput
  ) => StudyInternalLinkTarget | null
  onOpenInternalLink?: (target: ResolveStudyInternalLinkTargetInput) => void
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
    onOpenInternalLink: async (target: ResolveStudyInternalLinkTargetInput) => {
      onOpenInternalLink?.(target)
    },
    onOpenExternalLink: async (href: string) => {
      try {
        await Linking.openURL(href)
      } catch (reason) {
        assetActions.onAssetError?.(reason)
      }
    },
    dom: {
      matchContents: true,
      scrollEnabled: false,
      style: { width: '100%' }
    }
  } as const

  switch (block.type) {
    case 'text':
      return block.text.trim() ? (
        <BoardCanvasDom
          {...richProps}
          kind={'html' as const}
          source={readerHtml(block, resolveInternalLinkTarget)}
        />
      ) : (
        <Text selectable style={{ color: theme.muted, fontSize: 13, lineHeight: 20 }}>
          Пустой текстовый блок
        </Text>
      )
    case 'heading':
      return <NotesReadHeading heading={block} />
    case 'code':
      return (
        <View
          style={{
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            backgroundColor: theme.surface
          }}
        >
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: theme.border
            }}
          >
            <Text style={{ color: theme.muted, fontSize: 11.5, fontWeight: '700' }}>
              {block.language || 'text'}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text
              selectable
              style={{
                minWidth: '100%',
                padding: 13,
                color: theme.text,
                fontFamily: 'monospace',
                fontSize: 13.5,
                lineHeight: 21
              }}
            >
              {block.source || ' '}
            </Text>
          </ScrollView>
        </View>
      )
    case 'markdown':
      return <BoardCanvasDom {...richProps} kind={'markdown' as const} source={block.source} />
    case 'latex':
      return (
        <BoardCanvasDom
          {...richProps}
          kind={'latex' as const}
          source={block.source}
          latexDisplayMode={block.displayMode ?? 'display'}
          latexAlignment={block.alignment ?? 'center'}
          latexScale={(block.scale ?? 100) / 100}
        />
      )
    case 'mermaid':
      return (
        <BoardCanvasDom
          {...richProps}
          kind={'mermaid' as const}
          source={block.source}
          mermaidTheme={block.theme ?? (colorScheme === 'dark' ? 'dark' : 'default')}
          mermaidScale={(block.scale ?? 100) / 100}
        />
      )
    case 'image':
    case 'video':
    case 'audio':
    case 'file':
      return <NotesReadAssetBlock block={block} assetActions={assetActions} />
    case 'divider': {
      const variant = block.variant ?? 'solid'
      const thickness = block.thickness ?? 1
      const color =
        !block.color || block.color.toLowerCase() === '#6d5dfc' ? theme.accent : block.color
      return variant === 'dashed' || variant === 'dotted' ? (
        <View
          style={{
            marginVertical: 10,
            height: Math.max(2, thickness),
            borderTopWidth: thickness,
            borderStyle: variant === 'dotted' ? 'dotted' : 'dashed',
            borderColor: color
          }}
        />
      ) : (
        <View
          style={{
            alignSelf: variant === 'tapered' ? 'center' : 'stretch',
            width: variant === 'tapered' ? '68%' : undefined,
            height: thickness,
            marginVertical: 12,
            borderRadius: thickness,
            backgroundColor: color
          }}
        />
      )
    }
    case 'board':
      return (
        <DocumentBoardReader
          block={block}
          openBoard={openBoard}
          onError={assetActions.onAssetError}
        />
      )
  }
}

function NotesReadSection({
  section,
  assetActions,
  openBoard,
  resolveInternalLinkTarget,
  onOpenInternalLink,
  depth = 0
}: {
  section: Extract<NotesReadNode, { kind: 'section' }>
  assetActions: DocumentAssetActions
  openBoard?: OpenDocumentBoard
  resolveInternalLinkTarget?: (
    input: ResolveStudyInternalLinkTargetInput
  ) => StudyInternalLinkTarget | null
  onOpenInternalLink?: (target: ResolveStudyInternalLinkTargetInput) => void
  depth?: number
}): React.JSX.Element {
  const theme = useTheme()
  const [open, setOpen] = useState(true)
  const hasContent = section.children.length > 0

  return (
    <View style={{ gap: 10 }}>
      <Pressable
        accessibilityRole={hasContent ? 'button' : undefined}
        accessibilityLabel={
          hasContent
            ? `${open ? 'Свернуть' : 'Развернуть'} раздел «${section.heading.text || 'Без заголовка'}»`
            : undefined
        }
        disabled={!hasContent}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginLeft: depth ? -3 : 0,
          paddingVertical: 2,
          opacity: pressed ? 0.72 : 1
        })}
      >
        <ChevronRight
          size={16}
          color={theme.muted}
          style={{
            opacity: hasContent ? 1 : 0,
            transform: [{ rotate: open ? '90deg' : '0deg' }]
          }}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <NotesReadHeading heading={section.heading} />
        </View>
      </Pressable>

      {open && hasContent ? (
        <View
          style={{
            gap: 18,
            marginLeft: 8,
            paddingLeft: 14,
            borderLeftWidth: 1,
            borderLeftColor: theme.border
          }}
        >
          {section.children.map((child) =>
            child.kind === 'section' ? (
              <NotesReadSection
                key={child.heading.id}
                section={child}
                assetActions={assetActions}
                openBoard={openBoard}
                resolveInternalLinkTarget={resolveInternalLinkTarget}
                onOpenInternalLink={onOpenInternalLink}
                depth={depth + 1}
              />
            ) : (
              <NotesReadBlock
                key={child.block.id}
                block={child.block}
                assetActions={assetActions}
                openBoard={openBoard}
                resolveInternalLinkTarget={resolveInternalLinkTarget}
                onOpenInternalLink={onOpenInternalLink}
              />
            )
          )}
        </View>
      ) : null}
    </View>
  )
}

function NotesDocumentReader({
  document,
  assetActions,
  openBoard,
  resolveInternalLinkTarget,
  onOpenInternalLink
}: {
  document: StudyDocument
  assetActions: DocumentAssetActions
  openBoard?: OpenDocumentBoard
  resolveInternalLinkTarget?: (
    input: ResolveStudyInternalLinkTargetInput
  ) => StudyInternalLinkTarget | null
  onOpenInternalLink?: (target: ResolveStudyInternalLinkTargetInput) => void
}): React.JSX.Element {
  const outline = buildNotesReadOutline(document.blocks)

  return (
    <View style={{ gap: 22 }}>
      {outline.map((node) =>
        node.kind === 'section' ? (
          <NotesReadSection
            key={node.heading.id}
            section={node}
            assetActions={assetActions}
            openBoard={openBoard}
            resolveInternalLinkTarget={resolveInternalLinkTarget}
            onOpenInternalLink={onOpenInternalLink}
          />
        ) : (
          <NotesReadBlock
            key={node.block.id}
            block={node.block}
            assetActions={assetActions}
            openBoard={openBoard}
            resolveInternalLinkTarget={resolveInternalLinkTarget}
            onOpenInternalLink={onOpenInternalLink}
          />
        )
      )}
    </View>
  )
}

export function DocumentEditor({
  document,
  onChange,
  createId,
  header,
  presentation = 'default',
  mode = 'edit',
  importAsset,
  openAsset,
  resolveAssetUri,
  saveRecordedAudio,
  openBoard,
  searchInternalLinkTargets,
  resolveInternalLinkTarget,
  onOpenInternalLink,
  onAssetError
}: DocumentEditorProps): React.JSX.Element {
  const theme = useTheme()
  const confirm = useConfirmation()
  const documentRef = useRef(document)
  const clean = presentation === 'notes-clean'
  const [pendingAsset, setPendingAsset] = useState<StudyAssetKind | null>(null)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [insertOpen, setInsertOpen] = useState(false)
  const [insertIndex, setInsertIndex] = useState(document.blocks.length)
  const [collapsedBlockIds, setCollapsedBlockIds] = useState<Set<string>>(() => new Set())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [richSettingsOpen, setRichSettingsOpen] = useState(false)
  const [quickLinkOpen, setQuickLinkOpen] = useState(false)
  const [richTextState, setRichTextState] = useState<NotesRichTextFormattingState>(
    DEFAULT_NOTES_RICH_TEXT_STATE
  )
  const richTextRefs = useRef(new Map<string, NotesRichTextDomRef>())
  const [, setRichEditorEpoch] = useState(0)
  const assetActions = { importAsset, openAsset, resolveAssetUri, onAssetError }

  useEffect(() => {
    documentRef.current = document
    if (activeBlockId && !document.blocks.some((block) => block.id === activeBlockId)) {
      setActiveBlockId(null)
      setSettingsOpen(false)
      setRichSettingsOpen(false)
      setQuickLinkOpen(false)
      setRichTextState(DEFAULT_NOTES_RICH_TEXT_STATE)
    }
  }, [activeBlockId, document])

  if (clean && mode === 'read') {
    return (
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingTop: 4,
          paddingBottom: 48
        }}
      >
        {header}
        <View
          accessibilityLabel="Содержимое заметки"
          style={{
            minHeight: 360,
            paddingHorizontal: 18,
            paddingVertical: 22,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 20,
            backgroundColor: theme.surface
          }}
        >
          <NotesDocumentReader
            document={document}
            assetActions={assetActions}
            openBoard={openBoard}
            resolveInternalLinkTarget={resolveInternalLinkTarget}
            onOpenInternalLink={onOpenInternalLink}
          />
        </View>
      </ScrollView>
    )
  }

  const emit = (next: StudyDocument): void => {
    documentRef.current = next
    onChange(next)
  }

  const replace = (index: number, block: StudyBlock): void => {
    const currentDocument = documentRef.current
    const blocks = currentDocument.blocks.slice()
    blocks[index] = block
    emit({ ...currentDocument, blocks })
  }

  const remove = (index: number): void => {
    const currentDocument = documentRef.current
    const removed = currentDocument.blocks[index]
    const blocks = currentDocument.blocks.filter((_, current) => current !== index)
    emit({ ...currentDocument, blocks })
    if (removed?.id === activeBlockId) {
      setActiveBlockId(blocks[Math.min(index, blocks.length - 1)]?.id ?? null)
      setSettingsOpen(false)
    }
  }

  const move = (index: number, direction: -1 | 1): void => {
    const currentDocument = documentRef.current
    const destination = index + direction
    if (destination < 0 || destination >= currentDocument.blocks.length) return
    const blocks = currentDocument.blocks.slice()
    const current = blocks[index]
    const target = blocks[destination]
    if (!current || !target) return
    blocks[index] = target
    blocks[destination] = current
    emit({ ...currentDocument, blocks })
  }

  const insertBlockAt = (block: StudyBlock, requestedIndex = insertIndex): void => {
    const currentDocument = documentRef.current
    const index = Math.max(0, Math.min(requestedIndex, currentDocument.blocks.length))
    const blocks = currentDocument.blocks.slice()
    blocks.splice(index, 0, block)
    emit({ ...currentDocument, blocks })
    setActiveBlockId(block.id)
    setInsertIndex(index + 1)
  }

  const duplicate = (index: number): void => {
    const currentDocument = documentRef.current
    const source = currentDocument.blocks[index]
    if (!source) return
    const copy: StudyBlock =
      source.type === 'board' ? { id: createId(), type: 'board' } : { ...source, id: createId() }
    const blocks = currentDocument.blocks.slice()
    blocks.splice(index + 1, 0, copy)
    emit({ ...currentDocument, blocks })
    setActiveBlockId(copy.id)
  }

  const openInsertAt = (index: number): void => {
    setInsertIndex(index)
    setSettingsOpen(false)
    setRichSettingsOpen(false)
    setQuickLinkOpen(false)
    setInsertOpen(true)
  }

  const insert = (type: StudyBlockType): void => {
    const block = newBlock(type, createId())
    if (!block) return
    insertBlockAt(block)
    setInsertOpen(false)
  }

  const insertAsset = async (type: StudyAssetKind): Promise<void> => {
    if (!importAsset || pendingAsset) return
    setPendingAsset(type)
    try {
      const asset = await importAsset(type)
      if (!asset) return
      insertBlockAt(newAssetBlock(type, createId(), asset))
      setInsertOpen(false)
    } catch (reason) {
      onAssetError?.(reason)
    } finally {
      setPendingAsset(null)
    }
  }

  const requestRemove = (index: number): void => {
    const target = documentRef.current.blocks[index]
    if (!target) return
    void confirm({
      title: 'Удалить блок?',
      subject: blockLabel(target),
      description: 'Блок и всё его содержимое будут удалены из документа.',
      tone: 'danger',
      onConfirm: () => remove(index)
    })
  }

  const toggleCollapsed = (blockId: string): void => {
    setCollapsedBlockIds((current) => {
      const next = new Set(current)
      if (next.has(blockId)) next.delete(blockId)
      else next.add(blockId)
      return next
    })
  }

  const activeIndex = activeBlockId
    ? document.blocks.findIndex((block) => block.id === activeBlockId)
    : -1
  const activeBlock = activeIndex >= 0 ? (document.blocks[activeIndex] ?? null) : null
  const activeRichEditor =
    activeBlock?.type === 'text' ? (richTextRefs.current.get(activeBlock.id) ?? null) : null

  const list = (
    <FlatList
      style={{ flex: 1 }}
      data={document.blocks}
      keyExtractor={(block) => block.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: 12,
        paddingBottom: activeBlock?.type === 'text' ? 18 : 48
      }}
      ListHeaderComponent={header ?? null}
      ListEmptyComponent={
        <View style={{ paddingVertical: 18 }}>
          <Label muted>Документ пуст. Добавьте первый блок.</Label>
        </View>
      }
      renderItem={({ item, index }) => (
        <View>
          <DesktopParityInsertControl onPress={() => openInsertAt(index)} />
          <DesktopParityBlockCard
            block={item}
            active={activeBlockId === item.id}
            collapsed={collapsedBlockIds.has(item.id)}
            first={index === 0}
            last={index === document.blocks.length - 1}
            activate={() => {
              setActiveBlockId(item.id)
              setSettingsOpen(false)
              if (item.type !== 'text') {
                setRichSettingsOpen(false)
                setQuickLinkOpen(false)
              }
            }}
            toggleCollapsed={() => toggleCollapsed(item.id)}
            move={(direction) => move(index, direction)}
            duplicate={() => duplicate(index)}
            settings={() => {
              setActiveBlockId(item.id)
              if (item.type === 'text') {
                setSettingsOpen(false)
                setRichSettingsOpen(true)
              } else {
                setRichSettingsOpen(false)
                setQuickLinkOpen(false)
                setSettingsOpen(true)
              }
            }}
            remove={() => requestRemove(index)}
          >
            {item.type === 'text' ? (
              <NotesRichTextBlock
                block={item}
                active={activeBlockId === item.id}
                registerRef={(editor) => {
                  if (editor) richTextRefs.current.set(item.id, editor)
                  else richTextRefs.current.delete(item.id)
                  setRichEditorEpoch((value) => value + 1)
                }}
                activate={() => {
                  setActiveBlockId(item.id)
                  setSettingsOpen(false)
                }}
                update={(next) => replace(index, next)}
                formattingChanged={(state) => {
                  setActiveBlockId(item.id)
                  setRichTextState(state)
                }}
              />
            ) : (
              <BlockInput
                block={item}
                update={(next) => replace(index, next)}
                assetActions={assetActions}
                openBoard={openBoard}
                searchInternalLinkTargets={searchInternalLinkTargets}
              />
            )}
          </DesktopParityBlockCard>
        </View>
      )}
      ListFooterComponent={
        <DesktopParityInsertControl onPress={() => openInsertAt(document.blocks.length)} />
      }
    />
  )

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      {list}

      {activeBlock?.type === 'text' ? (
        <RichTextFormattingDock
          editor={activeRichEditor}
          state={richTextState}
          openSettings={() => setRichSettingsOpen(true)}
          openLink={() => setQuickLinkOpen(true)}
        />
      ) : null}

      <NotesInsertSheet
        open={insertOpen}
        pendingAsset={pendingAsset}
        importAsset={importAsset}
        saveRecordedAudio={saveRecordedAudio}
        close={() => setInsertOpen(false)}
        insert={insert}
        insertAsset={(type) => void insertAsset(type)}
        appendRecorded={(asset) => {
          insertBlockAt(newAssetBlock('audio', createId(), asset))
          setInsertOpen(false)
        }}
        onAssetError={onAssetError}
      />

      {activeBlock?.type === 'text' ? (
        <>
          <NotesRichTextSettingsSheet
            open={richSettingsOpen}
            close={() => setRichSettingsOpen(false)}
            editor={activeRichEditor}
            state={richTextState}
            searchTargets={searchInternalLinkTargets}
          />
          <NotesQuickLinkDialog
            key={`${activeBlock.id}:${quickLinkOpen ? 'open' : 'closed'}`}
            open={quickLinkOpen}
            close={() => setQuickLinkOpen(false)}
            editor={activeRichEditor}
            state={richTextState}
          />
        </>
      ) : null}

      {settingsOpen && activeBlock && activeIndex >= 0 && activeBlock.type !== 'text' ? (
        <NotesBlockSettingsSheet
          block={activeBlock}
          update={(next) => replace(activeIndex, next)}
          close={() => setSettingsOpen(false)}
          importAsset={importAsset}
          onAssetError={onAssetError}
        />
      ) : null}
    </View>
  )
}
