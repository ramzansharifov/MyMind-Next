import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useState } from 'react'
import type { StudyInternalLinkTarget } from '@mymind/contracts/study'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
  type LucideIcon
} from 'lucide-react-native'

import { AppDialog } from './AppDialog'
import type {
  NotesRichTextDomRef,
  NotesRichTextFormattingState,
  NotesRichTextCommand
} from './NotesRichTextDom'
import { StudyInternalLinkPicker } from './StudyRichTextEditor'
import { Button, Label } from './primitives'
import { useTheme } from './theme'

export const DEFAULT_NOTES_RICH_TEXT_STATE: NotesRichTextFormattingState = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  code: false,
  blockquote: false,
  bulletList: false,
  orderedList: false,
  alignment: 'left',
  linkActive: false,
  href: '',
  fontSize: 'default',
  color: '',
  backgroundColor: '',
  canUndo: false,
  canRedo: false
}

const FONT_SIZES = [
  { value: 'default', label: 'Авто' },
  { value: '0.75rem', label: '12' },
  { value: '0.875rem', label: '14' },
  { value: '1rem', label: '16' },
  { value: '1.125rem', label: '18' },
  { value: '1.35rem', label: '22' },
  { value: '1.65rem', label: '26' },
  { value: '2rem', label: '32' }
] as const

const TEXT_COLORS = [
  '#f2f3f5',
  '#a1a1aa',
  '#a78bfa',
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#f87171'
] as const

const HIGHLIGHT_COLORS = [
  '#3f3f46',
  '#4c1d95',
  '#1e3a8a',
  '#164e63',
  '#064e3b',
  '#713f12',
  '#7f1d1d',
  '#701a75'
] as const

function run(editor: NotesRichTextDomRef | null, command: NotesRichTextCommand): void {
  void editor?.command(command)
}

function ToolIcon({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  onPress
}: {
  label: string
  icon: LucideIcon
  active?: boolean
  disabled?: boolean
  onPress(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 38,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        borderWidth: active ? 1 : 0,
        borderColor: active ? theme.accent + '66' : 'transparent',
        backgroundColor: active ? theme.accent + '18' : pressed ? theme.raised : 'transparent',
        opacity: disabled ? 0.3 : pressed ? 0.7 : 1
      })}
    >
      <Icon size={17} color={active ? theme.accent : theme.muted} />
    </Pressable>
  )
}

export function NotesRichTextInlineControls({
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
  return (
    <>
      <ToolIcon
        label="Жирный"
        icon={Bold}
        active={state.bold}
        onPress={() => run(editor, 'bold')}
      />
      <ToolIcon
        label="Курсив"
        icon={Italic}
        active={state.italic}
        onPress={() => run(editor, 'italic')}
      />
      <ToolIcon
        label="Подчёркивание"
        icon={Underline}
        active={state.underline}
        onPress={() => run(editor, 'underline')}
      />
      <ToolIcon
        label="Зачёркивание"
        icon={Strikethrough}
        active={state.strike}
        onPress={() => run(editor, 'strike')}
      />
      <ToolIcon
        label="Код"
        icon={Code2}
        active={state.code}
        onPress={() => run(editor, 'code')}
      />
      <ToolIcon
        label="Маркированный список"
        icon={List}
        active={state.bulletList}
        onPress={() => run(editor, 'bulletList')}
      />
      <ToolIcon
        label="Нумерованный список"
        icon={ListOrdered}
        active={state.orderedList}
        onPress={() => run(editor, 'orderedList')}
      />
      <ToolIcon
        label="Цитата"
        icon={Quote}
        active={state.blockquote}
        onPress={() => run(editor, 'blockquote')}
      />
      <ToolIcon label="Ссылка" icon={Link2} active={state.linkActive} onPress={openLink} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Все настройки текста"
        onPress={openSettings}
        style={({ pressed }) => ({
          minWidth: 42,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          opacity: pressed ? 0.7 : 1
        })}
      >
        <Text style={{ fontSize: 13, fontWeight: '800' }}>Aa</Text>
      </Pressable>
    </>
  )
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function internalLinkHtml(target: StudyInternalLinkTarget, label: string): string {
  const effectiveLabel = label.trim() || target.title
  const attrs = [
    'data-study-internal-link="true"',
    `data-target-kind="${target.kind}"`,
    `data-material-id="${escapeHtmlAttribute(target.materialId)}"`,
    target.headingId ? `data-heading-id="${escapeHtmlAttribute(target.headingId)}"` : '',
    target.headingLevel ? `data-heading-level="${target.headingLevel}"` : '',
    `data-label-mode="${label.trim() ? 'custom' : 'auto'}"`,
    `data-label="${escapeHtmlAttribute(effectiveLabel)}"`,
    `data-material-title="${escapeHtmlAttribute(target.materialTitle)}"`,
    `data-folder-path="${escapeHtmlAttribute(JSON.stringify(target.folderPath))}"`
  ]
    .filter(Boolean)
    .join(' ')
  return `<span ${attrs}>${escapeHtmlText(effectiveLabel)}</span>`
}

function Swatch({
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
        width: 42,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? theme.accent : theme.border,
        backgroundColor: theme.surface,
        opacity: pressed ? 0.72 : 1
      })}
    >
      <View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: color }} />
    </Pressable>
  )
}

export function NotesRichTextSettingsSheet({
  open,
  close,
  editor,
  state,
  searchTargets
}: {
  open: boolean
  close(): void
  editor: NotesRichTextDomRef | null
  state: NotesRichTextFormattingState
  searchTargets?: (query: string) => StudyInternalLinkTarget[]
}): React.JSX.Element {
  const theme = useTheme()
  const [linkOpen, setLinkOpen] = useState(false)
  const [href, setHref] = useState('')
  const [internalOpen, setInternalOpen] = useState(false)
  const [selectedText, setSelectedText] = useState('')

  const openLink = (): void => {
    setHref(state.href)
    setLinkOpen(true)
  }

  const openInternal = (): void => {
    void editor?.getSelectedText().then((text) => {
      setSelectedText(text)
      setInternalOpen(true)
    })
  }

  return (
    <>
      <AppDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close()
        }}
        title="Форматирование текста"
        description="Те же параметры, что и в desktop-редакторе"
        icon="settings"
        presentation="sheet"
      >
        <ScrollView contentContainerStyle={{ gap: 18, padding: 14, paddingBottom: 28 }}>
          <View style={{ gap: 8 }}>
            <Label muted>Быстро</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <ToolIcon
                label="Отменить"
                icon={Undo2}
                disabled={!state.canUndo}
                onPress={() => run(editor, 'undo')}
              />
              <ToolIcon
                label="Повторить"
                icon={Redo2}
                disabled={!state.canRedo}
                onPress={() => run(editor, 'redo')}
              />
              <ToolIcon
                label="Очистить форматирование"
                icon={RemoveFormatting}
                onPress={() => run(editor, 'clearFormatting')}
              />
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Label muted>Текст</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <ToolIcon label="Жирный" icon={Bold} active={state.bold} onPress={() => run(editor, 'bold')} />
              <ToolIcon label="Курсив" icon={Italic} active={state.italic} onPress={() => run(editor, 'italic')} />
              <ToolIcon label="Подчёркивание" icon={Underline} active={state.underline} onPress={() => run(editor, 'underline')} />
              <ToolIcon label="Зачёркивание" icon={Strikethrough} active={state.strike} onPress={() => run(editor, 'strike')} />
              <ToolIcon label="Код" icon={Code2} active={state.code} onPress={() => run(editor, 'code')} />
              <ToolIcon label="Цитата" icon={Quote} active={state.blockquote} onPress={() => run(editor, 'blockquote')} />
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Label muted>Списки</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <ToolIcon label="Маркированный список" icon={List} active={state.bulletList} onPress={() => run(editor, 'bulletList')} />
              <ToolIcon label="Нумерованный список" icon={ListOrdered} active={state.orderedList} onPress={() => run(editor, 'orderedList')} />
              <ToolIcon label="Увеличить отступ" icon={IndentIncrease} onPress={() => run(editor, 'indent')} />
              <ToolIcon label="Уменьшить отступ" icon={IndentDecrease} onPress={() => run(editor, 'outdent')} />
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Label muted>Выравнивание</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <ToolIcon label="Слева" icon={AlignLeft} active={state.alignment === 'left'} onPress={() => run(editor, 'alignLeft')} />
              <ToolIcon label="По центру" icon={AlignCenter} active={state.alignment === 'center'} onPress={() => run(editor, 'alignCenter')} />
              <ToolIcon label="Справа" icon={AlignRight} active={state.alignment === 'right'} onPress={() => run(editor, 'alignRight')} />
              <ToolIcon label="По ширине" icon={AlignJustify} active={state.alignment === 'justify'} onPress={() => run(editor, 'alignJustify')} />
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Label muted>Размер текста</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {FONT_SIZES.map((size) => (
                <Button
                  key={size.value}
                  label={size.label}
                  compact
                  selected={state.fontSize === size.value}
                  onPress={() => void editor?.setFontSize(size.value)}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Label muted>Цвет текста</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {TEXT_COLORS.map((color) => (
                <Swatch
                  key={color}
                  color={color}
                  selected={state.color.toLowerCase() === color.toLowerCase()}
                  onPress={() => void editor?.setTextColor(color)}
                />
              ))}
              <Button label="Сбросить" compact onPress={() => void editor?.setTextColor(null)} />
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Label muted>Фон выделенного текста</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {HIGHLIGHT_COLORS.map((color) => (
                <Swatch
                  key={color}
                  color={color}
                  selected={state.backgroundColor.toLowerCase() === color.toLowerCase()}
                  onPress={() => void editor?.setHighlightColor(color)}
                />
              ))}
              <Button label="Убрать" compact onPress={() => void editor?.setHighlightColor(null)} />
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Label muted>Ссылки</Label>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="Внутренняя" compact disabled={!searchTargets} onPress={openInternal} />
              <Button label={state.linkActive ? 'Изменить ссылку' : 'Обычная ссылка'} compact onPress={openLink} />
              {state.linkActive ? (
                <ToolIcon label="Убрать ссылку" icon={Unlink} onPress={() => run(editor, 'unlink')} />
              ) : null}
            </View>
          </View>
        </ScrollView>
      </AppDialog>

      <AppDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        title={state.linkActive ? 'Изменить ссылку' : 'Добавить ссылку'}
        description="Выделите текст или оставьте курсор в нужной позиции"
        icon="edit"
        presentation="sheet"
      >
        <View style={{ gap: 12, padding: 14, paddingBottom: 22 }}>
          <TextInput
            accessibilityLabel="Адрес ссылки"
            placeholder="https://example.com"
            placeholderTextColor={theme.muted}
            value={href}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onChangeText={setHref}
            style={{
              minHeight: 50,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              color: theme.text,
              borderRadius: 12,
              paddingHorizontal: 14,
              fontSize: 15
            }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            {state.linkActive ? (
              <Button
                label="Убрать"
                danger
                onPress={() => {
                  run(editor, 'unlink')
                  setLinkOpen(false)
                }}
              />
            ) : null}
            <Button
              label="Сохранить"
              selected
              disabled={!href.trim()}
              onPress={() => {
                void editor?.setLink(href)
                setLinkOpen(false)
              }}
            />
          </View>
        </View>
      </AppDialog>

      {internalOpen && searchTargets ? (
        <StudyInternalLinkPicker
          searchTargets={searchTargets}
          save={(target, customLabel) => {
            const label = customLabel.trim() || selectedText.trim()
            void editor?.insertInternalLink(internalLinkHtml(target, label))
            setInternalOpen(false)
          }}
          close={() => setInternalOpen(false)}
        />
      ) : null}
    </>
  )
}

export function NotesQuickLinkDialog({
  open,
  close,
  editor,
  state
}: {
  open: boolean
  close(): void
  editor: NotesRichTextDomRef | null
  state: NotesRichTextFormattingState
}): React.JSX.Element {
  const theme = useTheme()
  const [href, setHref] = useState(state.href)

  return (
    <AppDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
      title={state.linkActive ? 'Изменить ссылку' : 'Добавить ссылку'}
      icon="edit"
      presentation="sheet"
    >
      <View style={{ gap: 12, padding: 14, paddingBottom: 22 }}>
        <TextInput
          accessibilityLabel="Адрес ссылки"
          placeholder="https://example.com"
          placeholderTextColor={theme.muted}
          value={href}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onChangeText={setHref}
          style={{
            minHeight: 50,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            color: theme.text,
            borderRadius: 12,
            paddingHorizontal: 14,
            fontSize: 15
          }}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
          {state.linkActive ? (
            <Button
              label="Убрать"
              danger
              onPress={() => {
                run(editor, 'unlink')
                close()
              }}
            />
          ) : null}
          <Button
            label="Сохранить"
            selected
            disabled={!href.trim()}
            onPress={() => {
              void editor?.setLink(href)
              close()
            }}
          />
        </View>
      </View>
    </AppDialog>
  )
}
