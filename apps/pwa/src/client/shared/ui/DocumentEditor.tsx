import { TextControl, Action, openExternalUrl } from '../../../ui/browser'
import { useEffect, useRef, useState } from 'react'
import type {
  StudyAssetKind,
  StudyBlock,
  StudyBlockType,
  StudyDocument,
  StudyLocalAsset
} from '@mymind/contracts/study'
import { designTokens } from '@mymind/design'
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
  Sigma,
  Trash2,
  Type,
  Video,
  Workflow,
  type LucideIcon
} from 'lucide-react'
import { AppDialog } from './AppDialog'
import { AppIcon } from './icons'
import { DocumentRichTextViewer, NotesRichTextBlock } from './NotesRichTextBlock'
import { NotesBlockSettingsSheet } from './NotesBlockSettings'
import { DEFAULT_NOTES_RICH_TEXT_STATE } from './notes-rich-text-state'
import {
  NotesQuickLinkDialog,
  NotesRichTextInlineControls,
  NotesRichTextSettingsSheet
} from './NotesRichTextControls'
import type { NotesRichTextDomRef, NotesRichTextFormattingState } from './NotesRichTextDom'
import { resolveStudyRichTextHtml } from './richTextHtml'
import { StudySourceBlock } from './StudySourceBlock'
import { StudyDividerBlock } from './StudyDividerBlock'
import { StudyAttachmentBlock } from './StudyAttachmentBlock'
import { useConfirmation } from './confirmation-context'
import { Button, Label } from './primitives'
import { useTheme } from './theme'
import { VoiceRecorder, type VoiceRecordingInput } from '../../../platform/VoiceRecorder'
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
  readFooter?: React.ReactElement | null
  presentation?: DocumentEditorPresentation
  mode?: 'edit' | 'read'
  allowedBlockTypes?: readonly StudyBlockType[]
  importAsset?: (kind: StudyAssetKind) => Promise<StudyLocalAsset | null>
  openAsset?: (asset: StudyLocalAsset) => Promise<void>
  resolveAssetUri?: (asset: StudyLocalAsset) => string | null
  saveRecordedAudio?: (input: VoiceRecordingInput) => Promise<StudyLocalAsset>
  onAssetError?: (reason: unknown) => void
}
function newBlock(type: StudyBlockType, id: string): StudyBlock | null {
  switch (type) {
    case 'text':
      return { id, type, text: '', html: '<p></p>' }
    case 'heading':
      return {
        id,
        type,
        text: '',
        level: 1,
        alignment: 'left',
        backgroundScope: 'container'
      }
    case 'code':
      return { id, type, source: '', language: 'text' }
    case 'markdown':
      return { id, type, source: '', viewMode: 'write' }
    case 'latex':
      return {
        id,
        type,
        source: '',
        viewMode: 'write',
        displayMode: 'display',
        alignment: 'center',
        scale: 100
      }
    case 'mermaid':
      return { id, type, source: '', viewMode: 'write', theme: 'dark', scale: 100 }
    case 'divider':
      return { id, type, variant: 'solid', thickness: 1, color: '#6d5dfc' }
    default:
      return null
  }
}
function newAssetBlock(type: StudyAssetKind, id: string, asset: StudyLocalAsset): StudyBlock {
  const source = { type: 'local' as const, asset }
  if (type === 'image') return { id, type, source, imageFit: 'contain', imageHeight: 360 }
  if (type === 'video') return { id, type, source }
  if (type === 'audio') return { id, type, source }
  return { id, type: 'file', source }
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
function headingTypography(level: 1 | 2 | 3): {
  fontSize: number
  lineHeight: number
  letterSpacing: number
} {
  if (level === 1) {
    return { fontSize: 48, lineHeight: 50.4, letterSpacing: -1.68 }
  }
  if (level === 2) {
    return { fontSize: 36, lineHeight: 41.4, letterSpacing: -0.9 }
  }
  return { fontSize: 30, lineHeight: 36, letterSpacing: -0.6 }
}
function BlockInput({
  block,
  update,
  assetActions,
  clean = false
}: {
  block: StudyBlock
  update(next: StudyBlock): void
  assetActions: DocumentAssetActions
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
      return (
        <TextControl
          aria-label={'Текстовый блок'}
          multiline={true}
          placeholder={'Начните писать…'}
          placeholderColor={theme.muted}
          value={block.text}
          onValueChange={(text) => update({ ...block, text, html: undefined })}
          style={{
            ...sourceStyle,
            minHeight: clean ? 112 : 96,
            fontSize: clean ? 17 : 16,
            lineHeight: clean ? '25px' : undefined
          }}
        ></TextControl>
      )
    case 'heading': {
      const typography = headingTypography(block.level)
      const backgroundScope = block.backgroundScope ?? 'container'
      return (
        <div
          className="ui-stack"
          style={{
            gap: 8
          }}
        >
          <TextControl
            aria-label={'Заголовок'}
            placeholder={'Заголовок'}
            placeholderColor={theme.muted}
            value={block.text}
            multiline={true}
            onValueChange={(text) => update({ ...block, text })}
            style={{
              minHeight: typography.lineHeight + 16,
              maxHeight: 384,
              paddingInline: 8,
              paddingBlock: 8,
              borderWidth: 0,
              borderRadius: 8,
              color: block.color ?? theme.text,
              backgroundColor:
                backgroundScope === 'container'
                  ? (block.backgroundColor ?? 'transparent')
                  : 'transparent',
              fontWeight: 600,
              fontSize: typography.fontSize,
              lineHeight: `${typography.lineHeight}px`,
              letterSpacing: typography.letterSpacing,
              textAlign: block.alignment ?? 'left'
            }}
          ></TextControl>
          {!clean ? (
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                gap: 8
              }}
            >
              {([1, 2, 3] as const).map((level) => (
                <Button
                  key={level}
                  label={`H${level}`}
                  selected={block.level === level}
                  onClick={() => update({ ...block, level })}
                />
              ))}
            </div>
          ) : null}
        </div>
      )
    }
    case 'code':
    case 'markdown':
    case 'latex':
    case 'mermaid':
      return <StudySourceBlock block={block} editable update={(next) => update(next)} />
    case 'image':
    case 'video':
    case 'audio':
    case 'file':
      return (
        <StudyAttachmentBlock
          block={block}
          resolveAssetUri={assetActions.resolveAssetUri}
          openAsset={assetActions.openAsset}
          onError={assetActions.onAssetError}
        />
      )
    case 'divider':
      return <StudyDividerBlock block={block} spacing="edit" />
    case 'board':
      return (
        <div
          className="ui-stack"
          style={{
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            backgroundColor: theme.surface
          }}
        >
          <span
            className="ui-text"
            style={{
              color: theme.muted,
              fontSize: 13,
              lineHeight: '19px'
            }}
          >
            Этот блок доступен только в desktop-версии MyMind.
          </span>
        </div>
      )
  }
}
function BlockHeaderIcon({
  label,
  icon: Icon,
  disabled = false,
  danger = false,
  rotation = 0,
  onClick
}: {
  label: string
  icon: LucideIcon
  disabled?: boolean
  danger?: boolean
  rotation?: number
  onClick(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Action
      hitPadding={5}
      role={'button'}
      aria-label={label}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 7,
        backgroundColor: 'transparent',
        opacity: disabled ? 0.25 : 1
      }}
      pressedStyle={{
        backgroundColor: danger ? '#ef44441A' : theme.raised,
        opacity: disabled ? 0.25 : 0.72
      }}
    >
      <Icon
        size={16}
        color={danger ? theme.error : theme.muted}
        style={{ transform: 'rotate(' + `${rotation}deg` + ')' }}
      />
    </Action>
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
  remove(): void
  children: React.ReactNode
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Action
      role={'none'}
      onClick={activate}
      style={{
        padding: active ? 11 : 12,
        borderWidth: active ? 2 : 1,
        borderColor: active ? theme.accent + '66' : theme.border,
        borderRadius: 12,
        backgroundColor: theme.surface
      }}
    >
      <div
        className="ui-stack"
        style={{
          minHeight: 30,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: collapsed ? 0 : 8
        }}
      >
        <div
          className="ui-stack"
          aria-hidden={true}
          style={{
            width: 28,
            height: 28,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.55
          }}
        >
          <GripVertical size={16} color={theme.muted} />
        </div>
        <BlockHeaderIcon
          label={
            collapsed
              ? `Развернуть блок «${blockLabel(block)}»`
              : `Свернуть блок «${blockLabel(block)}»`
          }
          icon={ChevronRight}
          rotation={collapsed ? 0 : 90}
          onClick={toggleCollapsed}
        />
        <span
          className="ui-text"
          data-lines={1}
          style={{
            flex: '1 1 0%',
            marginLeft: 4,
            color: theme.muted,
            fontSize: 11,
            lineHeight: '15px',
            fontWeight: 700,
            letterSpacing: 0.8,
            textTransform: 'uppercase',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 1
          }}
        >
          {blockLabel(block)}
        </span>
        <BlockHeaderIcon
          label="Переместить блок вверх"
          icon={ArrowUp}
          disabled={first}
          onClick={() => move(-1)}
        />
        <BlockHeaderIcon
          label="Переместить блок вниз"
          icon={ArrowDown}
          disabled={last}
          onClick={() => move(1)}
        />
        <BlockHeaderIcon label="Дублировать блок" icon={CopyPlus} onClick={duplicate} />
        <BlockHeaderIcon label="Удалить блок" icon={Trash2} danger onClick={remove} />
      </div>
      <div
        className="ui-stack"
        style={{
          display: collapsed ? 'none' : 'flex'
        }}
      >
        {children}
      </div>
    </Action>
  )
}
function DesktopParityInsertControl({ onClick }: { onClick(): void }): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        height: 32,
        flexDirection: 'row',
        alignItems: 'center'
      }}
    >
      <div
        className="ui-stack"
        style={{
          height: 1,
          flex: '1 1 0%',
          backgroundColor: theme.border
        }}
      ></div>
      <Action
        hitPadding={8}
        role={'button'}
        aria-label={'Добавить блок здесь'}
        onClick={onClick}
        style={{
          width: 26,
          height: 26,
          marginInline: 8,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 13,
          backgroundColor: theme.surface,
          opacity: 1
        }}
        pressedStyle={{
          borderColor: theme.accent + '88',
          backgroundColor: theme.accent + '14',
          opacity: 0.75
        }}
      >
        <Plus size={14} color={theme.muted} />
      </Action>
      <div
        className="ui-stack"
        style={{
          height: 1,
          flex: '1 1 0%',
          backgroundColor: theme.border
        }}
      ></div>
    </div>
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
    <div
      className="ui-stack"
      style={{
        minHeight: 52,
        borderTopWidth: 1,
        borderTopColor: theme.border,
        backgroundColor: theme.surface
      }}
    >
      <div className="ui-scroll" data-horizontal={true}>
        <div
          className="ui-stack ui-scroll-content"
          style={{
            minHeight: 52,
            alignItems: 'center',
            gap: 3,
            paddingInline: 10,
            paddingBlock: 8,
            flexDirection: 'row'
          }}
        >
          <NotesRichTextInlineControls
            editor={editor}
            state={state}
            openSettings={openSettings}
            openLink={openLink}
          />
        </div>
      </div>
    </div>
  )
}
function NotesInsertSheet({
  open,
  pendingAsset,
  allowedBlockTypes,
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
  allowedBlockTypes?: readonly StudyBlockType[]
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
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            gap: 16,
            padding: 14,
            paddingBottom: 24
          }}
        >
          <div
            className="ui-stack"
            style={{
              gap: 8
            }}
          >
            <Label muted>Содержимое</Label>
            {INSERTABLE_BLOCKS.filter(
              (item) => !allowedBlockTypes || allowedBlockTypes.includes(item.type)
            ).map((item) => {
              const Icon = item.icon
              return (
                <Action
                  key={item.type}
                  role={'button'}
                  aria-label={item.label}
                  onClick={() => {
                    insert(item.type)
                    close()
                  }}
                  style={{
                    minHeight: 58,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingInline: 12,
                    borderRadius: 15,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                    opacity: 1
                  }}
                  pressedStyle={{
                    backgroundColor: theme.raised,
                    opacity: 0.76
                  }}
                >
                  <div
                    className="ui-stack"
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
                  </div>
                  <div
                    className="ui-stack"
                    style={{
                      flex: '1 1 0%',
                      minWidth: 0
                    }}
                  >
                    <span
                      className="ui-text"
                      style={{
                        color: theme.text,
                        fontSize: 14,
                        fontWeight: 700
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      className="ui-text"
                      style={{
                        marginTop: 2,
                        color: theme.muted,
                        fontSize: 11.5,
                        lineHeight: '16px'
                      }}
                    >
                      {item.description}
                    </span>
                  </div>
                  <AppIcon name="forward" size={16} color={theme.muted} />
                </Action>
              )
            })}
          </div>

          {importAsset ? (
            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <Label muted>Файлы и медиа</Label>
              {ASSET_BLOCKS.filter(
                (item) => !allowedBlockTypes || allowedBlockTypes.includes(item.type)
              ).map((item) => {
                const Icon = item.icon
                return (
                  <Action
                    key={item.type}
                    role={'button'}
                    aria-label={item.label}
                    aria-disabled={pendingAsset !== null}
                    disabled={pendingAsset !== null}
                    onClick={() => {
                      close()
                      insertAsset(item.type)
                    }}
                    style={{
                      minHeight: 58,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      paddingInline: 12,
                      borderRadius: 15,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor: theme.surface,
                      opacity: pendingAsset !== null ? 0.45 : 1
                    }}
                    pressedStyle={{
                      backgroundColor: theme.raised,
                      opacity: pendingAsset !== null ? 0.45 : 0.76
                    }}
                  >
                    <div
                      className="ui-stack"
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
                    </div>
                    <div
                      className="ui-stack"
                      style={{
                        flex: '1 1 0%',
                        minWidth: 0
                      }}
                    >
                      <span
                        className="ui-text"
                        style={{
                          color: theme.text,
                          fontSize: 14,
                          fontWeight: 700
                        }}
                      >
                        {pendingAsset === item.type ? 'Выбор…' : item.label}
                      </span>
                      <span
                        className="ui-text"
                        style={{
                          marginTop: 2,
                          color: theme.muted,
                          fontSize: 11.5,
                          lineHeight: '16px'
                        }}
                      >
                        {item.description}
                      </span>
                    </div>
                  </Action>
                )
              })}
            </div>
          ) : null}

          {saveRecordedAudio && (!allowedBlockTypes || allowedBlockTypes.includes('audio')) ? (
            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
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
            </div>
          ) : null}
        </div>
      </div>
    </AppDialog>
  )
}
type NotesReadNode =
  | {
      kind: 'block'
      block: StudyBlock
    }
  | {
      kind: 'section'
      heading: Extract<
        StudyBlock,
        {
          type: 'heading'
        }
      >
      children: NotesReadNode[]
    }
function buildNotesReadOutline(blocks: StudyBlock[]): NotesReadNode[] {
  const root: NotesReadNode[] = []
  const stack: Array<
    Extract<
      NotesReadNode,
      {
        kind: 'section'
      }
    >
  > = []
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
      const section: Extract<
        NotesReadNode,
        {
          kind: 'section'
        }
      > = {
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
  heading: Extract<
    StudyBlock,
    {
      type: 'heading'
    }
  >
}): React.JSX.Element {
  const theme = useTheme()
  const backgroundScope = heading.backgroundScope ?? 'container'
  const backgroundColor = heading.backgroundColor ?? 'transparent'
  const typography = headingTypography(heading.level)
  return (
    <div
      className="ui-stack"
      style={{
        borderRadius: 8,
        backgroundColor: backgroundScope === 'container' ? backgroundColor : 'transparent',
        paddingInline: 4,
        paddingBlock: 6
      }}
    >
      <span
        className="ui-text"
        style={{
          color: heading.color ?? theme.text,
          fontSize: typography.fontSize,
          lineHeight: `${typography.lineHeight}px`,
          letterSpacing: typography.letterSpacing,
          fontWeight: 600,
          textAlign: heading.alignment ?? 'left'
        }}
      >
        <span
          className="ui-text"
          style={{
            backgroundColor: backgroundScope === 'text' ? backgroundColor : 'transparent'
          }}
        >
          {heading.text || 'Без заголовка'}
        </span>
      </span>
    </div>
  )
}
function NotesReadBlock({
  block,
  assetActions
}: {
  block: StudyBlock
  assetActions: DocumentAssetActions
}): React.JSX.Element {
  const theme = useTheme()
  switch (block.type) {
    case 'text':
      return block.text.trim() || block.html?.trim() ? (
        <DocumentRichTextViewer
          html={resolveStudyRichTextHtml(block)}
          onOpenExternalLink={(href) => {
            void openExternalUrl(href).catch((reason: unknown) => {
              assetActions.onAssetError?.(reason)
            })
          }}
        />
      ) : (
        <span
          className="ui-text"
          style={{
            color: theme.muted,
            fontSize: 13,
            lineHeight: '20px'
          }}
        >
          Пустой текстовый блок
        </span>
      )
    case 'heading':
      return <NotesReadHeading heading={block} />
    case 'code':
    case 'markdown':
    case 'latex':
    case 'mermaid':
      return <StudySourceBlock block={block} editable={false} />
    case 'image':
    case 'video':
    case 'audio':
    case 'file':
      return (
        <StudyAttachmentBlock
          block={block}
          resolveAssetUri={assetActions.resolveAssetUri}
          openAsset={assetActions.openAsset}
          onError={assetActions.onAssetError}
        />
      )
    case 'divider':
      return <StudyDividerBlock block={block} spacing="read" />
    case 'board':
      return (
        <div
          className="ui-stack"
          style={{
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            backgroundColor: theme.surface
          }}
        >
          <span
            className="ui-text"
            style={{
              color: theme.muted,
              fontSize: 13,
              lineHeight: '19px'
            }}
          >
            Этот блок доступен только в desktop-версии MyMind.
          </span>
        </div>
      )
  }
}
function NotesReadSection({
  section,
  assetActions,
  depth = 0
}: {
  section: Extract<
    NotesReadNode,
    {
      kind: 'section'
    }
  >
  assetActions: DocumentAssetActions
  depth?: number
}): React.JSX.Element {
  const theme = useTheme()
  const [open, setOpen] = useState(true)
  const hasContent = section.children.length > 0
  return (
    <div
      className="ui-stack"
      style={{
        gap: 10
      }}
    >
      <Action
        role={hasContent ? 'button' : undefined}
        aria-label={
          hasContent
            ? `${open ? 'Свернуть' : 'Развернуть'} раздел «${section.heading.text || 'Без заголовка'}»`
            : undefined
        }
        disabled={!hasContent}
        onClick={() => setOpen((current) => !current)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginLeft: depth ? -3 : 0,
          paddingBlock: 2,
          opacity: 1
        }}
        pressedStyle={{
          opacity: 0.72
        }}
      >
        <ChevronRight
          size={16}
          color={theme.muted}
          style={{
            opacity: hasContent ? 1 : 0,
            transform: 'rotate(' + (open ? '90deg' : '0deg') + ')'
          }}
        />
        <div
          className="ui-stack"
          style={{
            flex: '1 1 0%',
            minWidth: 0
          }}
        >
          <NotesReadHeading heading={section.heading} />
        </div>
      </Action>

      {open && hasContent ? (
        <div
          className="ui-stack"
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
                depth={depth + 1}
              />
            ) : (
              <NotesReadBlock
                key={child.block.id}
                block={child.block}
                assetActions={assetActions}
              />
            )
          )}
        </div>
      ) : null}
    </div>
  )
}
function NotesDocumentReader({
  document,
  assetActions
}: {
  document: StudyDocument
  assetActions: DocumentAssetActions
}): React.JSX.Element {
  const outline = buildNotesReadOutline(document.blocks)
  return (
    <div
      className="ui-stack"
      style={{
        gap: 22
      }}
    >
      {outline.map((node) =>
        node.kind === 'section' ? (
          <NotesReadSection key={node.heading.id} section={node} assetActions={assetActions} />
        ) : (
          <NotesReadBlock key={node.block.id} block={node.block} assetActions={assetActions} />
        )
      )}
    </div>
  )
}
export function DocumentEditor({
  document,
  onChange,
  createId,
  header,
  readFooter,
  presentation = 'default',
  mode = 'edit',
  allowedBlockTypes,
  importAsset,
  openAsset,
  resolveAssetUri,
  saveRecordedAudio,
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
  const [richTextRefs, setRichTextRefs] = useState(() => new Map<string, NotesRichTextDomRef>())
  const assetActions = { importAsset, openAsset, resolveAssetUri, onAssetError }
  useEffect(() => {
    documentRef.current = document
  }, [document])
  // Clear dependent controls as part of rendering the changed document.
  if (activeBlockId && !document.blocks.some((block) => block.id === activeBlockId)) {
    setActiveBlockId(null)
    setSettingsOpen(false)
    setRichSettingsOpen(false)
    setQuickLinkOpen(false)
    setRichTextState(DEFAULT_NOTES_RICH_TEXT_STATE)
  }
  if (clean && mode === 'read') {
    return (
      <div
        className="ui-scroll"
        style={{
          flex: '1 1 0%'
        }}
      >
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingInline: 14,
            paddingTop: 4,
            paddingBottom: 48
          }}
        >
          {header}
          <div
            className="ui-stack"
            aria-label={'Содержимое заметки'}
            style={{
              minHeight: 360,
              paddingInline: 18,
              paddingBlock: 22,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 20,
              backgroundColor: theme.surface
            }}
          >
            <NotesDocumentReader document={document} assetActions={assetActions} />
          </div>
          {readFooter ? (
            <div
              className="ui-stack"
              style={{
                marginTop: 14
              }}
            >
              {readFooter}
            </div>
          ) : null}
        </div>
      </div>
    )
  }
  const blockAllowed = (type: StudyBlockType): boolean =>
    !allowedBlockTypes || allowedBlockTypes.includes(type)
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
    if (!source || source.type === 'board') return
    const copy: StudyBlock = { ...source, id: createId() }
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
    if (allowedBlockTypes?.length === 1 && allowedBlockTypes[0] === 'text') {
      const block = newBlock('text', createId())
      if (block) insertBlockAt(block, index)
      return
    }
    setInsertOpen(true)
  }
  const insert = (type: StudyBlockType): void => {
    if (!blockAllowed(type)) return
    const block = newBlock(type, createId())
    if (!block) return
    insertBlockAt(block)
    setInsertOpen(false)
  }
  const insertAsset = async (type: StudyAssetKind): Promise<void> => {
    if (!blockAllowed(type) || !importAsset || pendingAsset) return
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
    activeBlock?.type === 'text' ? (richTextRefs.get(activeBlock.id) ?? null) : null
  const list = (
    <div
      className="ui-scroll"
      style={{
        flex: '1 1 0%'
      }}
    >
      <div
        className="ui-stack ui-scroll-content"
        style={{
          paddingInline: 12,
          paddingBottom: activeBlock?.type === 'text' ? 18 : 48
        }}
      >
        {header ?? null}
        <div className="ui-stack ui-list" style={{}}>
          {document.blocks.length > 0 ? (
            document.blocks.map((item, index) => (
              <div className="ui-stack ui-list-item" key={((block) => block.id)(item)}>
                {
                  <div className="ui-stack">
                    <DesktopParityInsertControl onClick={() => openInsertAt(index)} />
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
                      remove={() => requestRemove(index)}
                    >
                      {item.type === 'text' ? (
                        <NotesRichTextBlock
                          block={item}
                          registerRef={(editor) => {
                            setRichTextRefs((current) => {
                              if ((current.get(item.id) ?? null) === editor) return current
                              const next = new Map(current)
                              if (editor) next.set(item.id, editor)
                              else next.delete(item.id)
                              return next
                            })
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
                        />
                      )}
                    </DesktopParityBlockCard>
                  </div>
                }
              </div>
            ))
          ) : (
            <div
              className="ui-stack"
              style={{
                paddingBlock: 18
              }}
            >
              <Label muted>Документ пуст. Добавьте первый блок.</Label>
            </div>
          )}
        </div>
        {<DesktopParityInsertControl onClick={() => openInsertAt(document.blocks.length)} />}
      </div>
    </div>
  )
  return (
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%',
        minHeight: 0
      }}
    >
      {list}

      {activeBlock?.type === 'text' ? (
        <RichTextFormattingDock
          editor={activeRichEditor}
          state={richTextState}
          openSettings={() => setRichSettingsOpen(true)}
          openLink={() => setQuickLinkOpen(true)}
        />
      ) : activeBlock && activeBlock.type !== 'board' ? (
        <div
          className="ui-stack"
          style={{
            minHeight: 52,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            paddingInline: 12,
            paddingBlock: 8,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            backgroundColor: theme.surface
          }}
        >
          <div
            className="ui-stack"
            style={{
              minWidth: 0,
              flex: '1 1 0%'
            }}
          >
            <span
              className="ui-text"
              data-lines={1}
              style={{
                color: theme.text,
                fontSize: 13,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1
              }}
            >
              {blockLabel(activeBlock)}
            </span>
            <span
              className="ui-text"
              data-lines={1}
              style={{
                marginTop: 2,
                color: theme.muted,
                fontSize: 11,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1
              }}
            >
              Настройки активного блока
            </span>
          </div>
          <Button label="Настройки" icon="settings" compact onClick={() => setSettingsOpen(true)} />
        </div>
      ) : null}

      <NotesInsertSheet
        open={insertOpen}
        pendingAsset={pendingAsset}
        allowedBlockTypes={allowedBlockTypes}
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

      {settingsOpen &&
      activeBlock &&
      activeIndex >= 0 &&
      activeBlock.type !== 'text' &&
      activeBlock.type !== 'board' ? (
        <NotesBlockSettingsSheet
          block={activeBlock}
          update={(next) => replace(activeIndex, next)}
          close={() => setSettingsOpen(false)}
          importAsset={importAsset}
          onAssetError={onAssetError}
        />
      ) : null}
    </div>
  )
}
