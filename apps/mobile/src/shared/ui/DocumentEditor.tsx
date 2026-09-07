import { useEffect, useRef, useState } from 'react'
import { FlatList, Image, Text, TextInput, View } from 'react-native'
import type {
  StudyAssetKind,
  StudyBlock,
  StudyBlockType,
  StudyDocument,
  StudyLocalAsset
} from '@mymind/contracts/study'
import { designTokens } from '@mymind/design'
import { Button, Label } from './primitives'
import { useTheme } from './theme'
import { AudioAssetPlayer, VoiceRecorder, type VoiceRecordingInput } from './VoiceRecorder'

const INSERTABLE_BLOCKS: ReadonlyArray<{ type: StudyBlockType; label: string }> = [
  { type: 'text', label: 'Текст' },
  { type: 'heading', label: 'Заголовок' },
  { type: 'code', label: 'Код' },
  { type: 'markdown', label: 'Markdown' },
  { type: 'latex', label: 'LaTeX' },
  { type: 'mermaid', label: 'Mermaid' },
  { type: 'divider', label: 'Разделитель' }
]

const ASSET_BLOCKS: ReadonlyArray<{ type: StudyAssetKind; label: string }> = [
  { type: 'image', label: 'Изображение' },
  { type: 'video', label: 'Видео' },
  { type: 'audio', label: 'Аудио' },
  { type: 'file', label: 'Файл' }
]

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
  importAsset?: (kind: StudyAssetKind) => Promise<StudyLocalAsset | null>
  openAsset?: (asset: StudyLocalAsset) => Promise<void>
  resolveAssetUri?: (asset: StudyLocalAsset) => string | null
  saveRecordedAudio?: (input: VoiceRecordingInput) => Promise<StudyLocalAsset>
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

function LocalAssetEditor({
  block,
  update,
  assetActions
}: {
  block: Extract<StudyBlock, { type: 'image' | 'video' | 'audio' | 'file' }>
  update(next: StudyBlock): void
  assetActions: DocumentAssetActions
}): React.JSX.Element {
  const theme = useTheme()
  if (block.source.type !== 'local') return <View />
  const asset = block.source.asset
  const uri = asset ? assetActions.resolveAssetUri?.(asset) : null
  const inputStyle = {
    color: theme.text,
    backgroundColor: theme.raised,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: designTokens.radius.md,
    padding: 12,
    minHeight: 48,
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
            borderRadius: designTokens.radius.md,
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
          {asset.name} · {formatBytes(asset.size)} · {asset.mimeType}
        </Label>
      ) : (
        <Label muted>Вложение ещё не выбрано.</Label>
      )}
      {asset && !uri ? <Label muted>Локальный файл не найден на этом устройстве.</Label> : null}
      {asset && assetActions.openAsset ? (
        <Button
          label="Открыть / поделиться"
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
  assetActions
}: {
  block: StudyBlock
  update(next: StudyBlock): void
  assetActions: DocumentAssetActions
}): React.JSX.Element {
  const theme = useTheme()
  const inputStyle = {
    color: theme.text,
    backgroundColor: theme.raised,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: designTokens.radius.md,
    padding: 12,
    minHeight: 48,
    fontSize: 16
  } as const
  const sourceStyle = { ...inputStyle, minHeight: 120, textAlignVertical: 'top' as const }

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
          style={{ ...sourceStyle, minHeight: 96 }}
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
            style={{ ...inputStyle, fontWeight: '700', fontSize: block.level === 1 ? 24 : 20 }}
          />
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
        </View>
      )
    case 'code':
      return (
        <View style={{ gap: 8 }}>
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
            style={{ ...sourceStyle, fontFamily: 'monospace' }}
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
          style={{ ...sourceStyle, fontFamily: 'monospace' }}
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
        <LocalAssetEditor block={block} update={update} assetActions={assetActions} />
      )
    case 'audio':
    case 'file':
      return <LocalAssetEditor block={block} update={update} assetActions={assetActions} />
    case 'divider':
      return (
        <View style={{ gap: 10 }}>
          <View
            style={{ height: block.thickness ?? 1, backgroundColor: block.color ?? theme.border }}
          />
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
        </View>
      )
    case 'board':
      return (
        <View style={{ gap: 6 }}>
          <TextInput
            accessibilityLabel="Название доски"
            placeholder="Доска"
            placeholderTextColor={theme.muted}
            value={block.title ?? ''}
            onChangeText={(title) => update({ ...block, title: title || undefined })}
            style={inputStyle}
          />
          <Label muted>
            {block.boardId
              ? 'Связанная доска сохранена в документе.'
              : 'Блок доски без созданного canvas.'}
          </Label>
        </View>
      )
  }
}

export function DocumentEditor({
  document,
  onChange,
  createId,
  header,
  importAsset,
  openAsset,
  resolveAssetUri,
  saveRecordedAudio,
  onAssetError
}: DocumentEditorProps): React.JSX.Element {
  const theme = useTheme()
  const documentRef = useRef(document)
  const [pendingAsset, setPendingAsset] = useState<StudyAssetKind | null>(null)
  const assetActions = { importAsset, openAsset, resolveAssetUri, onAssetError }

  useEffect(() => {
    documentRef.current = document
  }, [document])

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
    emit({
      ...currentDocument,
      blocks: currentDocument.blocks.filter((_, current) => current !== index)
    })
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
    } catch (reason) {
      onAssetError?.(reason)
    } finally {
      setPendingAsset(null)
    }
  }

  return (
    <FlatList
      data={document.blocks}
      keyExtractor={(block) => block.id}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 48 }}
      ListHeaderComponent={header ?? null}
      ListEmptyComponent={
        <View style={{ paddingVertical: 28 }}>
          <Label muted>Документ пуст. Добавьте первый блок.</Label>
        </View>
      }
      renderItem={({ item, index }) => (
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
          />
        </View>
      )}
      ListFooterComponent={
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
      }
    />
  )
}
