import { FlatList, Text, TextInput, View } from 'react-native'
import type { StudyBlock, StudyBlockType, StudyDocument } from '@mymind/contracts/study'
import { designTokens } from '@mymind/design'
import { Button, Label } from './primitives'
import { useTheme } from './theme'

const INSERTABLE_BLOCKS: ReadonlyArray<{ type: StudyBlockType; label: string }> = [
  { type: 'text', label: 'Текст' },
  { type: 'heading', label: 'Заголовок' },
  { type: 'code', label: 'Код' },
  { type: 'markdown', label: 'Markdown' },
  { type: 'latex', label: 'LaTeX' },
  { type: 'mermaid', label: 'Mermaid' },
  { type: 'divider', label: 'Разделитель' }
]

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

function BlockInput({
  block,
  update
}: {
  block: StudyBlock
  update(next: StudyBlock): void
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
        <View style={{ gap: 4 }}>
          <Label>{block.title || block.source.asset?.name || 'Локальное вложение'}</Label>
          <Label muted>
            Локальное вложение сохранено без изменений. Импорт и просмотр на телефоне будут подключены отдельным адаптером.
          </Label>
        </View>
      )
    case 'audio':
    case 'file':
      return (
        <View style={{ gap: 4 }}>
          <Label>{block.title || block.source.asset?.name || (block.type === 'audio' ? 'Аудио' : 'Файл')}</Label>
          <Label muted>Локальное вложение сохранено без изменений.</Label>
        </View>
      )
    case 'divider':
      return (
        <View style={{ gap: 10 }}>
          <View style={{ height: block.thickness ?? 1, backgroundColor: block.color ?? theme.border }} />
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
            {block.boardId ? 'Связанная доска сохранена в документе.' : 'Блок доски без созданного canvas.'}
          </Label>
        </View>
      )
  }
}

export function DocumentEditor({
  document,
  onChange,
  createId,
  header
}: {
  document: StudyDocument
  onChange(document: StudyDocument): void
  createId(): string
  header?: React.ReactElement | null
}): React.JSX.Element {
  const theme = useTheme()
  const replace = (index: number, block: StudyBlock): void => {
    const blocks = document.blocks.slice()
    blocks[index] = block
    onChange({ ...document, blocks })
  }
  const remove = (index: number): void => {
    onChange({ ...document, blocks: document.blocks.filter((_, current) => current !== index) })
  }
  const move = (index: number, direction: -1 | 1): void => {
    const destination = index + direction
    if (destination < 0 || destination >= document.blocks.length) return
    const blocks = document.blocks.slice()
    const current = blocks[index]
    const target = blocks[destination]
    if (!current || !target) return
    blocks[index] = target
    blocks[destination] = current
    onChange({ ...document, blocks })
  }
  const insert = (type: StudyBlockType): void => {
    const block = newBlock(type, createId())
    if (block) onChange({ ...document, blocks: [...document.blocks, block] })
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
          <BlockInput block={item} update={(next) => replace(index, next)} />
        </View>
      )}
      ListFooterComponent={
        <View style={{ gap: 10, paddingTop: 8 }}>
          <Label muted>Добавить блок</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {INSERTABLE_BLOCKS.map((item) => (
              <Button key={item.type} label={item.label} onPress={() => insert(item.type)} />
            ))}
          </View>
        </View>
      }
    />
  )
}
