import { useEffect, useRef, useState } from 'react'
import {
  FlatList,
  Image,
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
  StudyInternalLinkTarget,
  StudyLocalAsset
} from '@mymind/contracts/study'
import { designTokens } from '@mymind/design'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AudioLines,
  Code2,
  FileText,
  Heading2,
  Image as ImageIcon,
  Minus,
  Paperclip,
  Presentation,
  Sigma,
  SlidersHorizontal,
  Type,
  Video,
  Workflow,
  type LucideIcon
} from 'lucide-react-native'
import { AppDialog } from './AppDialog'
import { DocumentBoardEditor, type OpenDocumentBoard } from './DocumentBoardBlock'
import { AppIcon } from './icons'
import { StudyRichTextEditor } from './StudyRichTextEditor'
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
  importAsset?: (kind: StudyAssetKind) => Promise<StudyLocalAsset | null>
  openAsset?: (asset: StudyLocalAsset) => Promise<void>
  resolveAssetUri?: (asset: StudyLocalAsset) => string | null
  saveRecordedAudio?: (input: VoiceRecordingInput) => Promise<StudyLocalAsset>
  openBoard?: OpenDocumentBoard
  searchInternalLinkTargets?: (query: string) => StudyInternalLinkTarget[]
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

  switch (block.type) {
    case 'text':
      return searchInternalLinkTargets ? (
        <StudyRichTextEditor
          block={block}
          update={(next) => update(next)}
          searchTargets={searchInternalLinkTargets}
        />
      ) : (
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
              fontWeight: '700',
              fontSize: block.level === 1 ? 26 : block.level === 2 ? 22 : 19,
              textAlign: block.alignment ?? 'left'
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
    case 'markdown':
    case 'latex':
    case 'mermaid':
      return (
        <TextInput
          accessibilityLabel={`${block.type} блок`}
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
      )
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
        <LocalAssetEditor
          block={block}
          update={update}
          assetActions={assetActions}
          clean={clean}
        />
      )
    case 'audio':
    case 'file':
      return (
        <LocalAssetEditor
          block={block}
          update={update}
          assetActions={assetActions}
          clean={clean}
        />
      )
    case 'divider':
      return (
        <View style={{ gap: 10, paddingVertical: clean ? 16 : 0 }}>
          <View
            style={{ height: block.thickness ?? 1, backgroundColor: block.color ?? theme.border }}
          />
          {!clean ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['solid', 'tapered', 'dashed', 'dotted'] as const).map((variant) => (
                <Button
                  key={variant}
                  label={variant}
                  selected={(block.variant ?? 'solid') === variant}
                  onPress={() => update({ ...block, variant })}
                />
              ))}
            </View>
          ) : null}
        </View>
      )
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
  icon?: 'back' | 'forward' | 'settings' | 'delete'
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
        backgroundColor: selected
          ? theme.accent + '16'
          : pressed
            ? theme.raised
            : 'transparent',
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

function NotesBlockToolbar({
  block,
  index,
  count,
  update,
  move,
  remove,
  openSettings
}: {
  block: StudyBlock
  index: number
  count: number
  update(next: StudyBlock): void
  move(direction: -1 | 1): void
  remove(): void
  openSettings(): void
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

        <ToolbarButton
          label="Выше"
          icon="back"
          disabled={index === 0}
          onPress={() => move(-1)}
        />
        <ToolbarButton
          label="Ниже"
          icon="forward"
          disabled={index === count - 1}
          onPress={() => move(1)}
        />
        <ToolbarButton label="Настройки блока" icon="settings" onPress={openSettings} />
        <ToolbarButton label="Удалить блок" icon="delete" danger onPress={remove} />
      </ScrollView>
    </View>
  )
}

function NotesBlockSettings({
  block,
  update,
  close
}: {
  block: StudyBlock
  update(next: StudyBlock): void
  close(): void
}): React.JSX.Element {
  const theme = useTheme()

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
      title="Настройки блока"
      description={blockLabel(block)}
      icon="settings"
      presentation="sheet"
    >
      <View style={{ gap: 14, padding: 14, paddingBottom: 22 }}>
        {block.type === 'heading' ? (
          <>
            <View style={{ gap: 8 }}>
              <Label muted>Размер заголовка</Label>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([1, 2, 3] as const).map((level) => (
                  <Button
                    key={level}
                    label={`H${level}`}
                    compact
                    selected={block.level === level}
                    onPress={() => update({ ...block, level })}
                  />
                ))}
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <Label muted>Выравнивание</Label>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { value: 'left' as const, label: 'Слева', icon: AlignLeft },
                  { value: 'center' as const, label: 'Центр', icon: AlignCenter },
                  { value: 'right' as const, label: 'Справа', icon: AlignRight }
                ].map((item) => {
                  const Icon = item.icon
                  const selected = (block.alignment ?? 'left') === item.value
                  return (
                    <Pressable
                      key={item.value}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                      accessibilityState={{ selected }}
                      onPress={() => update({ ...block, alignment: item.value })}
                      style={({ pressed }) => ({
                        width: 48,
                        height: 44,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: selected ? theme.accent + '66' : theme.border,
                        backgroundColor: selected
                          ? theme.accent + '16'
                          : pressed
                            ? theme.raised
                            : theme.surface,
                        opacity: pressed ? 0.72 : 1
                      })}
                    >
                      <Icon size={19} color={selected ? theme.accent : theme.muted} />
                    </Pressable>
                  )
                })}
              </View>
            </View>
          </>
        ) : null}

        {block.type === 'divider' ? (
          <View style={{ gap: 8 }}>
            <Label muted>Стиль разделителя</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['solid', 'tapered', 'dashed', 'dotted'] as const).map((variant) => (
                <Button
                  key={variant}
                  label={
                    variant === 'solid'
                      ? 'Линия'
                      : variant === 'tapered'
                        ? 'Плавный'
                        : variant === 'dashed'
                          ? 'Штрихи'
                          : 'Точки'
                  }
                  compact
                  selected={(block.variant ?? 'solid') === variant}
                  onPress={() => update({ ...block, variant })}
                />
              ))}
            </View>
          </View>
        ) : null}

        {block.type === 'image' ? (
          <View style={{ gap: 8 }}>
            <Label muted>Отображение изображения</Label>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button
                label="Вписать"
                compact
                selected={(block.imageFit ?? 'contain') === 'contain'}
                onPress={() => update({ ...block, imageFit: 'contain' })}
              />
              <Button
                label="Обрезать"
                compact
                selected={block.imageFit === 'cover'}
                onPress={() => update({ ...block, imageFit: 'cover' })}
              />
            </View>
          </View>
        ) : null}

        {!['heading', 'divider', 'image'].includes(block.type) ? (
          <View
            style={{
              flexDirection: 'row',
              gap: 10,
              alignItems: 'center',
              padding: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface
            }}
          >
            <SlidersHorizontal size={18} color={theme.accent} />
            <Text style={{ flex: 1, color: theme.muted, fontSize: 12.5, lineHeight: 18 }}>
              Для этого типа блока основные параметры находятся прямо в его содержимом.
            </Text>
          </View>
        ) : null}
      </View>
    </AppDialog>
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
                  onPress={() => insertAsset(item.type)}
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

export function DocumentEditor({
  document,
  onChange,
  createId,
  header,
  presentation = 'default',
  importAsset,
  openAsset,
  resolveAssetUri,
  saveRecordedAudio,
  openBoard,
  searchInternalLinkTargets,
  onAssetError
}: DocumentEditorProps): React.JSX.Element {
  const theme = useTheme()
  const documentRef = useRef(document)
  const clean = presentation === 'notes-clean'
  const [pendingAsset, setPendingAsset] = useState<StudyAssetKind | null>(null)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [insertOpen, setInsertOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const assetActions = { importAsset, openAsset, resolveAssetUri, onAssetError }

  useEffect(() => {
    documentRef.current = document
    if (activeBlockId && !document.blocks.some((block) => block.id === activeBlockId)) {
      setActiveBlockId(null)
      setSettingsOpen(false)
    }
  }, [activeBlockId, document])

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

  const append = (block: StudyBlock): void => {
    const currentDocument = documentRef.current
    emit({ ...currentDocument, blocks: [...currentDocument.blocks, block] })
    if (clean) setActiveBlockId(block.id)
  }

  const insert = (type: StudyBlockType): void => {
    const block = newBlock(type, createId())
    if (block) append(block)
  }

  const insertAsset = async (type: StudyAssetKind): Promise<void> => {
    if (!importAsset || pendingAsset) return
    setPendingAsset(type)
    try {
      const asset = await importAsset(type)
      if (!asset) return
      append(newAssetBlock(type, createId(), asset))
      if (clean) setInsertOpen(false)
    } catch (reason) {
      onAssetError?.(reason)
    } finally {
      setPendingAsset(null)
    }
  }

  const activeIndex = activeBlockId
    ? document.blocks.findIndex((block) => block.id === activeBlockId)
    : -1
  const activeBlock = activeIndex >= 0 ? document.blocks[activeIndex] ?? null : null

  const list = (
    <FlatList
      style={{ flex: 1 }}
      data={document.blocks}
      keyExtractor={(block) => block.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: clean ? 12 : 0,
        paddingBottom: clean ? 18 : 48
      }}
      ListHeaderComponent={header ?? null}
      ListEmptyComponent={
        clean ? null : (
          <View style={{ paddingVertical: 28 }}>
            <Label muted>Документ пуст. Добавьте первый блок.</Label>
          </View>
        )
      }
      renderItem={({ item, index }) =>
        clean ? (
          <View
            onTouchStart={() => setActiveBlockId(item.id)}
            style={{
              marginBottom: 4,
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: activeBlockId === item.id ? theme.accent + '42' : 'transparent',
              backgroundColor: activeBlockId === item.id ? theme.accent + '08' : 'transparent'
            }}
          >
            <BlockInput
              block={item}
              update={(next) => replace(index, next)}
              assetActions={assetActions}
              openBoard={openBoard}
              searchInternalLinkTargets={searchInternalLinkTargets}
              clean
            />
          </View>
        ) : (
          <View
            style={{
              marginBottom: 12,
              padding: 12,
              gap: 10,
              borderRadius: designTokens.radius.lg,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ color: theme.muted, fontSize: 12, textTransform: 'uppercase' }}>
                {item.type}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <Button label="↑" disabled={index === 0} onPress={() => move(index, -1)} />
                <Button
                  label="↓"
                  disabled={index === document.blocks.length - 1}
                  onPress={() => move(index, 1)}
                />
                <Button label="Удалить" danger onPress={() => remove(index)} />
              </View>
            </View>
            <BlockInput
              block={item}
              update={(next) => replace(index, next)}
              assetActions={assetActions}
              openBoard={openBoard}
              searchInternalLinkTargets={searchInternalLinkTargets}
            />
          </View>
        )
      }
      ListFooterComponent={
        clean ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Добавить новый блок"
            onPress={() => {
              setActiveBlockId(null)
              setSettingsOpen(false)
              setInsertOpen(true)
            }}
            style={({ pressed }) => ({
              minHeight: 58,
              marginTop: 8,
              marginHorizontal: 8,
              marginBottom: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: pressed ? theme.accent + '70' : theme.border,
              borderRadius: 15,
              backgroundColor: pressed ? theme.accent + '08' : 'transparent',
              opacity: pressed ? 0.76 : 1
            })}
          >
            <AppIcon name="add" size={18} color={theme.muted} />
            <Text style={{ color: theme.muted, fontSize: 13, fontWeight: '600' }}>
              Добавить новый блок
            </Text>
          </Pressable>
        ) : (
          <View style={{ gap: 10, paddingTop: 8 }}>
            <Label muted>Добавить блок</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {INSERTABLE_BLOCKS.map((item) => (
                <Button key={item.type} label={item.label} onPress={() => insert(item.type)} />
              ))}
              {importAsset
                ? ASSET_BLOCKS.map((item) => (
                    <Button
                      key={item.type}
                      label={pendingAsset === item.type ? 'Выбор…' : item.label}
                      disabled={pendingAsset !== null}
                      onPress={() => void insertAsset(item.type)}
                    />
                  ))
                : null}
            </View>
            {saveRecordedAudio ? (
              <VoiceRecorder
                saveRecording={saveRecordedAudio}
                onSaved={(asset) => append(newAssetBlock('audio', createId(), asset))}
                onError={onAssetError}
                disabled={pendingAsset !== null}
              />
            ) : null}
          </View>
        )
      }
    />
  )

  if (!clean) return list

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      {list}

      {activeBlock && activeIndex >= 0 ? (
        <NotesBlockToolbar
          block={activeBlock}
          index={activeIndex}
          count={document.blocks.length}
          update={(next) => replace(activeIndex, next)}
          move={(direction) => move(activeIndex, direction)}
          remove={() => remove(activeIndex)}
          openSettings={() => setSettingsOpen(true)}
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
        appendRecorded={(asset) => append(newAssetBlock('audio', createId(), asset))}
        onAssetError={onAssetError}
      />

      {settingsOpen && activeBlock && activeIndex >= 0 ? (
        <NotesBlockSettings
          block={activeBlock}
          update={(next) => replace(activeIndex, next)}
          close={() => setSettingsOpen(false)}
        />
      ) : null}
    </View>
  )
}
