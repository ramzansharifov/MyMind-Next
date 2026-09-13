import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import type { StudyAssetKind, StudyBlock, StudyLocalAsset } from '@mymind/contracts/study'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  Minus,
  Plus,
  type LucideIcon
} from 'lucide-react-native'

import { AppDialog } from './AppDialog'
import { Button, Label } from './primitives'
import { STUDY_CODE_LANGUAGE_OPTIONS } from './studySourceLanguages'
import { useTheme } from './theme'

const HEADING_TEXT_COLORS = [
  '#f2f3f5',
  '#a1a1aa',
  '#a78bfa',
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#f87171'
] as const

const HEADING_BACKGROUND_COLORS = [
  '#181a20',
  '#27272a',
  '#4c1d95',
  '#1e3a8a',
  '#164e63',
  '#064e3b',
  '#713f12',
  '#7f1d1d'
] as const

const DIVIDER_COLORS = [
  '#6d5dfc',
  '#a1a1aa',
  '#a78bfa',
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#f87171'
] as const

const MERMAID_TEMPLATES = [
  {
    id: 'flowchart',
    label: 'Блок-схема',
    source: `flowchart LR
  A[Начало] --> B{Решение}
  B -->|Да| C[Продолжить]
  B -->|Нет| D[Завершить]`
  },
  {
    id: 'sequence',
    label: 'Последовательность',
    source: `sequenceDiagram
  participant U as Пользователь
  participant A as Приложение
  participant D as База данных

  U->>A: Открывает материал
  A->>D: Запрашивает данные
  D-->>A: Возвращает материал
  A-->>U: Показывает содержимое`
  },
  {
    id: 'class',
    label: 'Классы',
    source: `classDiagram
  class Material {
    +String id
    +String title
    +save()
  }

  class Block {
    +String id
    +String type
  }

  Material "1" *-- "many" Block`
  },
  {
    id: 'state',
    label: 'Состояния',
    source: `stateDiagram-v2
  [*] --> Черновик
  Черновик --> Сохранение
  Сохранение --> Сохранено
  Сохранение --> Ошибка
  Ошибка --> Сохранение`
  }
] as const

function Section({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <View style={{ gap: 8 }}>
      <Label muted>{title}</Label>
      {children}
    </View>
  )
}

function Choice({
  label,
  selected,
  onPress
}: {
  label: string
  selected: boolean
  onPress(): void
}): React.JSX.Element {
  return <Button label={label} compact selected={selected} onPress={onPress} />
}

function ChoiceRow({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{children}</View>
}

function ColorSwatch({
  color,
  selected,
  onPress
}: {
  color: string
  selected: boolean
  onPress(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Цвет ${color}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 13,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? theme.accent : theme.border,
        backgroundColor: theme.surface,
        opacity: pressed ? 0.72 : 1
      })}
    >
      <View
        style={{
          width: 25,
          height: 25,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: color
        }}
      >
        {selected ? <Check size={14} color="#ffffff" strokeWidth={3} /> : null}
      </View>
    </Pressable>
  )
}

function Stepper({
  value,
  min,
  max,
  step,
  suffix = '',
  onChange
}: {
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  onChange(value: number): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        minHeight: 46,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 13,
        backgroundColor: theme.surface,
        overflow: 'hidden'
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Уменьшить"
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - step))}
        style={({ pressed }) => ({
          width: 48,
          height: 46,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: value <= min ? 0.3 : pressed ? 0.65 : 1
        })}
      >
        <Minus size={18} color={theme.muted} />
      </Pressable>
      <Text
        style={{
          flex: 1,
          textAlign: 'center',
          color: theme.text,
          fontSize: 14,
          fontWeight: '700'
        }}
      >
        {value}
        {suffix}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Увеличить"
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + step))}
        style={({ pressed }) => ({
          width: 48,
          height: 46,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: value >= max ? 0.3 : pressed ? 0.65 : 1
        })}
      >
        <Plus size={18} color={theme.muted} />
      </Pressable>
    </View>
  )
}

function AlignmentChoices({
  value,
  onChange
}: {
  value: 'left' | 'center' | 'right'
  onChange(value: 'left' | 'center' | 'right'): void
}): React.JSX.Element {
  const theme = useTheme()
  const options: Array<{
    value: 'left' | 'center' | 'right'
    label: string
    icon: LucideIcon
  }> = [
    { value: 'left', label: 'Слева', icon: AlignLeft },
    { value: 'center', label: 'Центр', icon: AlignCenter },
    { value: 'right', label: 'Справа', icon: AlignRight }
  ]
  return (
    <ChoiceRow>
      {options.map((option) => {
        const Icon = option.icon
        const selected = value === option.value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              width: 48,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: selected ? theme.accent + '77' : theme.border,
              borderRadius: 12,
              backgroundColor: selected
                ? theme.accent + '18'
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
    </ChoiceRow>
  )
}

function isValidRemoteImageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && Boolean(url.hostname)
  } catch {
    return false
  }
}

function isValidYoutubeUrl(value: string): boolean {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    return (
      url.protocol === 'https:' &&
      (host === 'youtube.com' ||
        host.endsWith('.youtube.com') ||
        host === 'youtu.be' ||
        host === 'youtube-nocookie.com' ||
        host.endsWith('.youtube-nocookie.com'))
    )
  } catch {
    return false
  }
}

function AttachmentSettings({
  block,
  update,
  importAsset,
  onAssetError
}: {
  block: Extract<StudyBlock, { type: 'image' | 'video' | 'audio' | 'file' }>
  update(block: StudyBlock): void
  importAsset?: (kind: StudyAssetKind) => Promise<StudyLocalAsset | null>
  onAssetError?: (reason: unknown) => void
}): React.JSX.Element {
  const theme = useTheme()
  const [sourceTab, setSourceTab] = useState<'local' | 'url'>(block.source.type)
  const [urlDraft, setUrlDraft] = useState(block.source.type === 'url' ? block.source.url : '')
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState('')

  const canUseUrl = block.type === 'image' || block.type === 'video'
  const normalizedUrl = urlDraft.trim()
  const urlValid =
    block.type === 'image'
      ? isValidRemoteImageUrl(normalizedUrl)
      : block.type === 'video'
        ? isValidYoutubeUrl(normalizedUrl)
        : false

  const chooseLocal = async (): Promise<void> => {
    if (!importAsset || picking) return
    setPicking(true)
    setError('')
    try {
      const asset = await importAsset(block.type)
      if (!asset) return
      update({ ...block, source: { type: 'local', asset } })
      setSourceTab('local')
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Не удалось выбрать файл'
      setError(message)
      onAssetError?.(reason)
    } finally {
      setPicking(false)
    }
  }

  return (
    <View style={{ gap: 16 }}>
      {canUseUrl ? (
        <Section title="Источник">
          <ChoiceRow>
            <Choice
              label="Устройство"
              selected={sourceTab === 'local'}
              onPress={() => {
                setError('')
                setSourceTab('local')
              }}
            />
            <Choice
              label={block.type === 'video' ? 'YouTube' : 'Ссылка'}
              selected={sourceTab === 'url'}
              onPress={() => {
                setError('')
                setSourceTab('url')
              }}
            />
          </ChoiceRow>
        </Section>
      ) : null}

      {sourceTab === 'local' ? (
        <Section title="Локальный файл">
          <View style={{ gap: 8 }}>
            {block.source.type === 'local' && block.source.asset ? (
              <View
                style={{
                  padding: 11,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 12,
                  backgroundColor: theme.surface
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}
                >
                  {block.source.asset.name}
                </Text>
                <Text style={{ marginTop: 3, color: theme.muted, fontSize: 11 }}>
                  {Math.max(1, Math.round(block.source.asset.size / 1024))} КБ
                </Text>
              </View>
            ) : null}
            <ChoiceRow>
              <Button
                label={
                  picking
                    ? 'Выбор…'
                    : block.source.type === 'local' && block.source.asset
                      ? 'Заменить'
                      : 'Выбрать'
                }
                selected
                disabled={!importAsset || picking}
                onPress={() => void chooseLocal()}
              />
              {block.source.type === 'local' && block.source.asset ? (
                <Button
                  label="Убрать"
                  danger
                  onPress={() => update({ ...block, source: { type: 'local' } })}
                />
              ) : null}
            </ChoiceRow>
          </View>
        </Section>
      ) : canUseUrl ? (
        <Section title={block.type === 'video' ? 'Ссылка на YouTube' : 'Прямая HTTPS-ссылка'}>
          <View style={{ gap: 8 }}>
            <TextInput
              accessibilityLabel="Ссылка на медиа"
              placeholder={
                block.type === 'video'
                  ? 'https://youtube.com/watch?v=...'
                  : 'https://site.com/image.jpg'
              }
              placeholderTextColor={theme.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              value={urlDraft}
              onChangeText={(value) => {
                setUrlDraft(value)
                setError('')
              }}
              style={{
                minHeight: 48,
                borderWidth: 1,
                borderColor: normalizedUrl && !urlValid ? '#fbbf24' : theme.border,
                borderRadius: 12,
                backgroundColor: theme.surface,
                color: theme.text,
                paddingHorizontal: 12,
                fontSize: 14
              }}
            />
            {normalizedUrl && !urlValid ? (
              <Text style={{ color: '#fbbf24', fontSize: 11.5, lineHeight: 16 }}>
                {block.type === 'video'
                  ? 'Используйте HTTPS-ссылку youtube.com или youtu.be.'
                  : 'Используйте прямую HTTPS-ссылку на изображение.'}
              </Text>
            ) : null}
            <ChoiceRow>
              <Button
                label="Применить"
                selected
                disabled={!urlValid}
                onPress={() => update({ ...block, source: { type: 'url', url: normalizedUrl } })}
              />
              {block.source.type === 'url' && block.source.url ? (
                <Button
                  label="Убрать"
                  danger
                  onPress={() => {
                    setUrlDraft('')
                    update({ ...block, source: { type: 'url', url: '' } })
                  }}
                />
              ) : null}
            </ChoiceRow>
          </View>
        </Section>
      ) : null}

      <Section title="Название">
        <TextInput
          accessibilityLabel="Название вложения"
          placeholder="Необязательное название"
          placeholderTextColor={theme.muted}
          value={block.title ?? ''}
          onChangeText={(title) => update({ ...block, title: title || undefined })}
          style={{
            minHeight: 48,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            backgroundColor: theme.surface,
            color: theme.text,
            paddingHorizontal: 12,
            fontSize: 14
          }}
        />
      </Section>

      {block.type === 'image' ? (
        <>
          <Section title="Заполнение">
            <ChoiceRow>
              <Choice
                label="Целиком"
                selected={(block.imageFit ?? 'contain') === 'contain'}
                onPress={() => update({ ...block, imageFit: 'contain' })}
              />
              <Choice
                label="Заполнить"
                selected={block.imageFit === 'cover'}
                onPress={() => update({ ...block, imageFit: 'cover' })}
              />
            </ChoiceRow>
          </Section>
          <Section title="Высота">
            <Stepper
              value={block.imageHeight ?? 360}
              min={180}
              max={720}
              step={20}
              suffix="px"
              onChange={(imageHeight) => update({ ...block, imageHeight })}
            />
          </Section>
        </>
      ) : null}

      {error ? <Text style={{ color: theme.error, fontSize: 12 }}>{error}</Text> : null}
    </View>
  )
}

export function NotesBlockSettingsSheet({
  block,
  update,
  close,
  importAsset,
  onAssetError
}: {
  block: StudyBlock
  update(block: StudyBlock): void
  close(): void
  importAsset?: (kind: StudyAssetKind) => Promise<StudyLocalAsset | null>
  onAssetError?: (reason: unknown) => void
}): React.JSX.Element {
  const theme = useTheme()

  const title = useMemo(() => {
    switch (block.type) {
      case 'heading':
        return 'Настройки заголовка'
      case 'code':
        return 'Настройки кода'
      case 'markdown':
        return 'Настройки Markdown'
      case 'latex':
        return 'Настройки LaTeX'
      case 'mermaid':
        return 'Настройки Mermaid'
      case 'image':
        return 'Настройки изображения'
      case 'video':
        return 'Настройки видео'
      case 'audio':
        return 'Настройки аудио'
      case 'file':
        return 'Настройки файла'
      case 'divider':
        return 'Настройки разделителя'
      case 'board':
        return 'Настройки доски'
      case 'text':
        return 'Настройки текста'
    }
  }, [block.type])

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
      title={title}
      icon="settings"
      presentation="sheet"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 17, padding: 14, paddingBottom: 28 }}
      >
        {block.type === 'heading' ? (
          <>
            <Section title="Уровень">
              <ChoiceRow>
                {([1, 2, 3] as const).map((level) => (
                  <Choice
                    key={level}
                    label={`H${level}`}
                    selected={block.level === level}
                    onPress={() => update({ ...block, level })}
                  />
                ))}
              </ChoiceRow>
            </Section>

            <Section title="Выравнивание">
              <AlignmentChoices
                value={block.alignment ?? 'left'}
                onChange={(alignment) => update({ ...block, alignment })}
              />
            </Section>

            <Section title="Область фона">
              <ChoiceRow>
                <Choice
                  label="Только текст"
                  selected={block.backgroundScope === 'text'}
                  onPress={() => update({ ...block, backgroundScope: 'text' })}
                />
                <Choice
                  label="Весь блок"
                  selected={(block.backgroundScope ?? 'container') === 'container'}
                  onPress={() => update({ ...block, backgroundScope: 'container' })}
                />
              </ChoiceRow>
            </Section>

            <Section title="Цвет текста">
              <ChoiceRow>
                {HEADING_TEXT_COLORS.map((color) => (
                  <ColorSwatch
                    key={color}
                    color={color}
                    selected={(block.color ?? '#f2f3f5').toLowerCase() === color.toLowerCase()}
                    onPress={() => update({ ...block, color })}
                  />
                ))}
                <Button
                  label="Сбросить"
                  compact
                  onPress={() => update({ ...block, color: undefined })}
                />
              </ChoiceRow>
            </Section>

            <Section title="Фон">
              <ChoiceRow>
                {HEADING_BACKGROUND_COLORS.map((color) => (
                  <ColorSwatch
                    key={color}
                    color={color}
                    selected={
                      (block.backgroundColor ?? '#181a20').toLowerCase() === color.toLowerCase()
                    }
                    onPress={() => update({ ...block, backgroundColor: color })}
                  />
                ))}
                <Button
                  label="Сбросить"
                  compact
                  onPress={() => update({ ...block, backgroundColor: undefined })}
                />
              </ChoiceRow>
            </Section>
          </>
        ) : null}

        {block.type === 'code' ? (
          <Section title="Язык">
            <ChoiceRow>
              {STUDY_CODE_LANGUAGE_OPTIONS.map((option) => (
                <Choice
                  key={option.value}
                  label={option.label}
                  selected={(block.language || 'text') === option.value}
                  onPress={() => update({ ...block, language: option.value })}
                />
              ))}
            </ChoiceRow>
          </Section>
        ) : null}

        {block.type === 'markdown' ? (
          <Section title="Режим">
            <ChoiceRow>
              <Choice
                label="Код"
                selected={(block.viewMode ?? 'split') === 'write'}
                onPress={() => update({ ...block, viewMode: 'write' })}
              />
              <Choice
                label="2 окна"
                selected={(block.viewMode ?? 'split') === 'split'}
                onPress={() => update({ ...block, viewMode: 'split' })}
              />
              <Choice
                label="Вид"
                selected={block.viewMode === 'preview'}
                onPress={() => update({ ...block, viewMode: 'preview' })}
              />
            </ChoiceRow>
          </Section>
        ) : null}

        {block.type === 'latex' ? (
          <>
            <Section title="Режим редактора">
              <ChoiceRow>
                <Choice
                  label="Код"
                  selected={(block.viewMode ?? 'split') === 'write'}
                  onPress={() => update({ ...block, viewMode: 'write' })}
                />
                <Choice
                  label="2 окна"
                  selected={(block.viewMode ?? 'split') === 'split'}
                  onPress={() => update({ ...block, viewMode: 'split' })}
                />
                <Choice
                  label="Вид"
                  selected={block.viewMode === 'preview'}
                  onPress={() => update({ ...block, viewMode: 'preview' })}
                />
              </ChoiceRow>
            </Section>
            <Section title="Тип формулы">
              <ChoiceRow>
                <Choice
                  label="Блочная"
                  selected={(block.displayMode ?? 'display') === 'display'}
                  onPress={() => update({ ...block, displayMode: 'display' })}
                />
                <Choice
                  label="Строчная"
                  selected={block.displayMode === 'inline'}
                  onPress={() => update({ ...block, displayMode: 'inline' })}
                />
              </ChoiceRow>
            </Section>
            <Section title="Выравнивание">
              <AlignmentChoices
                value={block.alignment ?? 'center'}
                onChange={(alignment) => update({ ...block, alignment })}
              />
            </Section>
            <Section title="Размер">
              <Stepper
                value={block.scale ?? 100}
                min={70}
                max={180}
                step={5}
                suffix="%"
                onChange={(scale) => update({ ...block, scale })}
              />
            </Section>
          </>
        ) : null}

        {block.type === 'mermaid' ? (
          <>
            <Section title="Режим редактора">
              <ChoiceRow>
                <Choice
                  label="Код"
                  selected={(block.viewMode ?? 'split') === 'write'}
                  onPress={() => update({ ...block, viewMode: 'write' })}
                />
                <Choice
                  label="2 окна"
                  selected={(block.viewMode ?? 'split') === 'split'}
                  onPress={() => update({ ...block, viewMode: 'split' })}
                />
                <Choice
                  label="Вид"
                  selected={block.viewMode === 'preview'}
                  onPress={() => update({ ...block, viewMode: 'preview' })}
                />
              </ChoiceRow>
            </Section>
            <Section title="Тема">
              <ChoiceRow>
                {[
                  ['dark', 'Тёмная'],
                  ['default', 'Светлая'],
                  ['neutral', 'Нейтр.'],
                  ['forest', 'Лес']
                ].map(([value, label]) => (
                  <Choice
                    key={value}
                    label={label}
                    selected={(block.theme ?? 'dark') === value}
                    onPress={() =>
                      update({
                        ...block,
                        theme: value as 'dark' | 'default' | 'neutral' | 'forest'
                      })
                    }
                  />
                ))}
              </ChoiceRow>
            </Section>
            <Section title="Размер">
              <Stepper
                value={block.scale ?? 100}
                min={60}
                max={180}
                step={10}
                suffix="%"
                onChange={(scale) => update({ ...block, scale })}
              />
            </Section>
            {!block.source.trim() ? (
              <Section title="Быстрый старт">
                <ChoiceRow>
                  {MERMAID_TEMPLATES.map((template) => (
                    <Button
                      key={template.id}
                      label={template.label}
                      compact
                      onPress={() =>
                        update({ ...block, source: template.source, viewMode: 'split' })
                      }
                    />
                  ))}
                </ChoiceRow>
              </Section>
            ) : null}
          </>
        ) : null}

        {block.type === 'image' ||
        block.type === 'video' ||
        block.type === 'audio' ||
        block.type === 'file' ? (
          <AttachmentSettings
            block={block}
            update={update}
            importAsset={importAsset}
            onAssetError={onAssetError}
          />
        ) : null}

        {block.type === 'divider' ? (
          <>
            <Section title="Стиль">
              <ChoiceRow>
                {[
                  ['solid', 'Сплошной'],
                  ['tapered', 'Акцентный'],
                  ['dashed', 'Пунктир'],
                  ['dotted', 'Точки']
                ].map(([value, label]) => (
                  <Choice
                    key={value}
                    label={label}
                    selected={(block.variant ?? 'solid') === value}
                    onPress={() =>
                      update({
                        ...block,
                        variant: value as 'solid' | 'tapered' | 'dashed' | 'dotted'
                      })
                    }
                  />
                ))}
              </ChoiceRow>
            </Section>
            <Section title="Толщина">
              <Stepper
                value={block.thickness ?? 1}
                min={1}
                max={12}
                step={1}
                suffix="px"
                onChange={(thickness) => update({ ...block, thickness })}
              />
            </Section>
            <Section title="Цвет">
              <ChoiceRow>
                {DIVIDER_COLORS.map((color) => (
                  <ColorSwatch
                    key={color}
                    color={color}
                    selected={(block.color ?? '#6d5dfc').toLowerCase() === color.toLowerCase()}
                    onPress={() => update({ ...block, color })}
                  />
                ))}
                <Button
                  label="Акцент"
                  compact
                  onPress={() => update({ ...block, color: '#6d5dfc' })}
                />
              </ChoiceRow>
            </Section>
          </>
        ) : null}

        {block.type === 'board' ? (
          <View
            style={{
              padding: 13,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 14,
              backgroundColor: theme.surface
            }}
          >
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
              {block.title ?? 'Доска заметки'}
            </Text>
            <Text style={{ marginTop: 4, color: theme.muted, fontSize: 12, lineHeight: 17 }}>
              {block.boardId
                ? 'Связь с доской создана. Содержимое управляется в модуле «Доски».'
                : 'Доска будет создана при первом открытии блока.'}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </AppDialog>
  )
}
