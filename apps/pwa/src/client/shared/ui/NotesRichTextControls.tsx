import { Action, TextControl } from '../../../ui/browser'
import { useState } from 'react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  CircleCheck,
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
} from 'lucide-react'
import { AppDialog } from './AppDialog'
import type {
  NotesRichTextDomRef,
  NotesRichTextFormattingState,
  NotesRichTextCommand
} from './NotesRichTextDom'
import { Button, Label } from './primitives'
import { useTheme } from './theme'
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
  '#202127',
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
  onClick
}: {
  label: string
  icon: LucideIcon
  active?: boolean
  disabled?: boolean
  onClick(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Action
      role={'button'}
      aria-label={label}
      aria-selected={active}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        borderWidth: active ? 1 : 0,
        borderColor: active ? theme.accent + '66' : 'transparent',
        backgroundColor: active ? theme.accent + '18' : 'transparent',
        opacity: disabled ? 0.3 : 1
      }}
      pressedStyle={{
        backgroundColor: active ? theme.accent + '18' : theme.raised,
        opacity: disabled ? 0.3 : 0.7
      }}
    >
      <Icon size={17} color={active ? theme.accent : theme.muted} />
    </Action>
  )
}
export function NotesRichTextInlineControls({
  editor,
  state,
  openSettings,
  openLink,
  showSettings = true
}: {
  editor: NotesRichTextDomRef | null
  state: NotesRichTextFormattingState
  openSettings(): void
  openLink(): void
  showSettings?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <>
      <ToolIcon
        label="Жирный"
        icon={Bold}
        active={state.bold}
        onClick={() => run(editor, 'bold')}
      />
      <ToolIcon
        label="Курсив"
        icon={Italic}
        active={state.italic}
        onClick={() => run(editor, 'italic')}
      />
      <ToolIcon
        label="Подчёркивание"
        icon={Underline}
        active={state.underline}
        onClick={() => run(editor, 'underline')}
      />
      <ToolIcon
        label="Зачёркивание"
        icon={Strikethrough}
        active={state.strike}
        onClick={() => run(editor, 'strike')}
      />
      <ToolIcon label="Код" icon={Code2} active={state.code} onClick={() => run(editor, 'code')} />
      <ToolIcon
        label="Маркированный список"
        icon={List}
        active={state.bulletList}
        onClick={() => run(editor, 'bulletList')}
      />
      <ToolIcon
        label="Нумерованный список"
        icon={ListOrdered}
        active={state.orderedList}
        onClick={() => run(editor, 'orderedList')}
      />
      {state.taskList !== undefined ? (
        <ToolIcon
          label="Список с чекбоксами"
          icon={CircleCheck}
          active={state.taskList}
          onClick={() => run(editor, 'taskList')}
        />
      ) : null}
      <ToolIcon
        label="Цитата"
        icon={Quote}
        active={state.blockquote}
        onClick={() => run(editor, 'blockquote')}
      />
      <ToolIcon label="Ссылка" icon={Link2} active={state.linkActive} onClick={openLink} />
      {showSettings ? (
        <Action
          role={'button'}
          aria-label={'Все настройки текста'}
          onClick={openSettings}
          style={{
            minWidth: 42,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            opacity: 1
          }}
          pressedStyle={{
            opacity: 0.7
          }}
        >
          <span
            className="ui-text"
            style={{
              color: theme.text,
              fontSize: 13,
              fontWeight: 800
            }}
          >
            Aa
          </span>
        </Action>
      ) : null}
    </>
  )
}
function Swatch({
  color,
  selected,
  onClick
}: {
  color: string
  selected: boolean
  onClick(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Action
      role={'button'}
      aria-label={`Цвет ${color}`}
      aria-selected={selected}
      onClick={onClick}
      style={{
        width: 42,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? theme.accent : theme.border,
        backgroundColor: theme.surface,
        opacity: 1
      }}
      pressedStyle={{
        opacity: 0.72
      }}
    >
      <div
        className="ui-stack"
        style={{
          width: 24,
          height: 24,
          borderRadius: 8,
          backgroundColor: color
        }}
      ></div>
    </Action>
  )
}
export function NotesRichTextSettingsSheet({
  open,
  close,
  onAfterClose,
  editor,
  state
}: {
  open: boolean
  close(): void
  onAfterClose?(): void
  editor: NotesRichTextDomRef | null
  state: NotesRichTextFormattingState
}): React.JSX.Element {
  const theme = useTheme()
  const [linkOpen, setLinkOpen] = useState(false)
  const [href, setHref] = useState('')
  const openLink = (): void => {
    setHref(state.href)
    setLinkOpen(true)
  }
  return (
    <>
      <AppDialog
        open={open}
        onAfterClose={onAfterClose}
        onOpenChange={(next) => {
          if (!next) close()
        }}
        title="Форматирование текста"
        icon="settings"
        presentation="sheet"
      >
        <div className="ui-scroll">
          <div
            className="ui-stack ui-scroll-content"
            style={{
              gap: 18,
              padding: 14,
              paddingBottom: 28
            }}
          >
            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <Label muted>Быстро</Label>
              <div
                className="ui-stack"
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 6
                }}
              >
                <ToolIcon
                  label="Отменить"
                  icon={Undo2}
                  disabled={!state.canUndo}
                  onClick={() => run(editor, 'undo')}
                />
                <ToolIcon
                  label="Повторить"
                  icon={Redo2}
                  disabled={!state.canRedo}
                  onClick={() => run(editor, 'redo')}
                />
                <ToolIcon
                  label="Очистить форматирование"
                  icon={RemoveFormatting}
                  onClick={() => run(editor, 'clearFormatting')}
                />
              </div>
            </div>

            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <Label muted>Текст</Label>
              <div
                className="ui-stack"
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 6
                }}
              >
                <ToolIcon
                  label="Жирный"
                  icon={Bold}
                  active={state.bold}
                  onClick={() => run(editor, 'bold')}
                />
                <ToolIcon
                  label="Курсив"
                  icon={Italic}
                  active={state.italic}
                  onClick={() => run(editor, 'italic')}
                />
                <ToolIcon
                  label="Подчёркивание"
                  icon={Underline}
                  active={state.underline}
                  onClick={() => run(editor, 'underline')}
                />
                <ToolIcon
                  label="Зачёркивание"
                  icon={Strikethrough}
                  active={state.strike}
                  onClick={() => run(editor, 'strike')}
                />
                <ToolIcon
                  label="Код"
                  icon={Code2}
                  active={state.code}
                  onClick={() => run(editor, 'code')}
                />
                <ToolIcon
                  label="Цитата"
                  icon={Quote}
                  active={state.blockquote}
                  onClick={() => run(editor, 'blockquote')}
                />
              </div>
            </div>

            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <Label muted>Списки</Label>
              <div
                className="ui-stack"
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 6
                }}
              >
                <ToolIcon
                  label="Маркированный список"
                  icon={List}
                  active={state.bulletList}
                  onClick={() => run(editor, 'bulletList')}
                />
                <ToolIcon
                  label="Нумерованный список"
                  icon={ListOrdered}
                  active={state.orderedList}
                  onClick={() => run(editor, 'orderedList')}
                />
                {state.taskList !== undefined ? (
                  <ToolIcon
                    label="Список с чекбоксами"
                    icon={CircleCheck}
                    active={state.taskList}
                    onClick={() => run(editor, 'taskList')}
                  />
                ) : null}
                <ToolIcon
                  label="Увеличить отступ"
                  icon={IndentIncrease}
                  onClick={() => run(editor, 'indent')}
                />
                <ToolIcon
                  label="Уменьшить отступ"
                  icon={IndentDecrease}
                  onClick={() => run(editor, 'outdent')}
                />
              </div>
            </div>

            {state.taskList !== undefined ? (
              <div
                className="ui-stack"
                style={{
                  gap: 8
                }}
              >
                <Label muted>Регистр текста</Label>
                <div
                  className="ui-stack"
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8
                  }}
                >
                  <Button
                    label="aa"
                    accessibilityLabel="Все строчные"
                    onClick={() => run(editor, 'lowercase')}
                  />
                  <Button
                    label="AA"
                    accessibilityLabel="Все прописные"
                    onClick={() => run(editor, 'uppercase')}
                  />
                  <Button
                    label="Aa"
                    accessibilityLabel="Каждое слово с большой буквы"
                    onClick={() => run(editor, 'titlecase')}
                  />
                </div>
              </div>
            ) : null}
            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <Label muted>Выравнивание</Label>
              <div
                className="ui-stack"
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 6
                }}
              >
                <ToolIcon
                  label="Слева"
                  icon={AlignLeft}
                  active={state.alignment === 'left'}
                  onClick={() => run(editor, 'alignLeft')}
                />
                <ToolIcon
                  label="По центру"
                  icon={AlignCenter}
                  active={state.alignment === 'center'}
                  onClick={() => run(editor, 'alignCenter')}
                />
                <ToolIcon
                  label="Справа"
                  icon={AlignRight}
                  active={state.alignment === 'right'}
                  onClick={() => run(editor, 'alignRight')}
                />
                <ToolIcon
                  label="По ширине"
                  icon={AlignJustify}
                  active={state.alignment === 'justify'}
                  onClick={() => run(editor, 'alignJustify')}
                />
              </div>
            </div>

            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <Label muted>Размер текста</Label>
              <div
                className="ui-stack"
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 6
                }}
              >
                {FONT_SIZES.map((size) => (
                  <Button
                    key={size.value}
                    label={size.label}
                    compact
                    selected={state.fontSize === size.value}
                    onClick={() => void editor?.setFontSize(size.value)}
                  />
                ))}
              </div>
            </div>

            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <Label muted>Цвет текста</Label>
              <div
                className="ui-stack"
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 7
                }}
              >
                <Swatch
                  color={theme.accent}
                  selected={state.color.toLowerCase() === theme.accent.toLowerCase()}
                  onClick={() => void editor?.setTextColor(theme.accent)}
                />
                {TEXT_COLORS.map((color) => (
                  <Swatch
                    key={color}
                    color={color}
                    selected={state.color.toLowerCase() === color.toLowerCase()}
                    onClick={() => void editor?.setTextColor(color)}
                  />
                ))}
                <Button label="Сбросить" compact onClick={() => void editor?.setTextColor(null)} />
              </div>
            </div>

            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <Label muted>Фон выделенного текста</Label>
              <div
                className="ui-stack"
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 7
                }}
              >
                <Swatch
                  color={theme.accent}
                  selected={state.backgroundColor.toLowerCase() === theme.accent.toLowerCase()}
                  onClick={() => void editor?.setHighlightColor(theme.accent)}
                />
                {HIGHLIGHT_COLORS.map((color) => (
                  <Swatch
                    key={color}
                    color={color}
                    selected={state.backgroundColor.toLowerCase() === color.toLowerCase()}
                    onClick={() => void editor?.setHighlightColor(color)}
                  />
                ))}
                <Button
                  label="Убрать"
                  compact
                  onClick={() => void editor?.setHighlightColor(null)}
                />
              </div>
            </div>

            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <Label muted>Ссылки</Label>
              <div
                className="ui-stack"
                style={{
                  flexDirection: 'row',
                  gap: 8
                }}
              >
                <Button
                  label={state.linkActive ? 'Изменить ссылку' : 'Обычная ссылка'}
                  compact
                  onClick={openLink}
                />
                {state.linkActive ? (
                  <ToolIcon
                    label="Убрать ссылку"
                    icon={Unlink}
                    onClick={() => run(editor, 'unlink')}
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </AppDialog>

      <AppDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        title={state.linkActive ? 'Изменить ссылку' : 'Добавить ссылку'}
        description="Выделите текст или оставьте курсор в нужной позиции"
        icon="edit"
        presentation="sheet"
      >
        <div
          className="ui-stack"
          style={{
            gap: 12,
            padding: 14,
            paddingBottom: 22
          }}
        >
          <TextControl
            aria-label={'Адрес ссылки'}
            placeholder={'https://example.com'}
            placeholderColor={theme.muted}
            value={href}
            autoCapitalize={'none'}
            autoCorrect={'off'}
            inputMode={'url'}
            onValueChange={setHref}
            style={{
              minHeight: 50,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              color: theme.text,
              borderRadius: 12,
              paddingInline: 14,
              fontSize: 15
            }}
          ></TextControl>
          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 8
            }}
          >
            {state.linkActive ? (
              <Button
                label="Убрать"
                danger
                onClick={() => {
                  run(editor, 'unlink')
                  setLinkOpen(false)
                }}
              />
            ) : null}
            <Button
              label="Сохранить"
              selected
              disabled={!href.trim()}
              onClick={() => {
                void editor?.setLink(href)
                setLinkOpen(false)
              }}
            />
          </div>
        </div>
      </AppDialog>
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
      <div
        className="ui-stack"
        style={{
          gap: 12,
          padding: 14,
          paddingBottom: 22
        }}
      >
        <TextControl
          aria-label={'Адрес ссылки'}
          placeholder={'https://example.com'}
          placeholderColor={theme.muted}
          value={href}
          autoCapitalize={'none'}
          autoCorrect={'off'}
          inputMode={'url'}
          onValueChange={setHref}
          style={{
            minHeight: 50,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            color: theme.text,
            borderRadius: 12,
            paddingInline: 14,
            fontSize: 15
          }}
        ></TextControl>
        <div
          className="ui-stack"
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 8
          }}
        >
          {state.linkActive ? (
            <Button
              label="Убрать"
              danger
              onClick={() => {
                run(editor, 'unlink')
                close()
              }}
            />
          ) : null}
          <Button
            label="Сохранить"
            selected
            disabled={!href.trim()}
            onClick={() => {
              void editor?.setLink(href)
              close()
            }}
          />
        </div>
      </div>
    </AppDialog>
  )
}
