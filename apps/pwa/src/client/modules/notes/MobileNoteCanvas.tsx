import {
  Action,
  useSafeArea,
  blurActiveElement,
  openExternalUrl,
  TextControl
} from '../../../ui/browser'
import { randomUUID } from '../../../platform/crypto'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  File,
  Image,
  Link2,
  ListTodo,
  Mic,
  Minus,
  Music,
  Plus,
  Type,
  Video,
  type LucideIcon
} from 'lucide-react'
import {
  DEFAULT_NOTE_APPEARANCE,
  getNoteAppearanceVariant,
  type NoteAppearance,
  type NoteDocument
} from '@mymind/contracts/notes'
import type { StudyAssetKind } from '@mymind/contracts/study'
import { normalizeStudyRemoteImageUrl } from '@mymind/core/study-remote-media'
import { useServices } from '../../app/context'
import { AppDialog } from '../../shared/ui/AppDialog'
import { DocumentEditor } from '../../shared/ui/DocumentEditor'
import { NotesBlockSettingsSheet } from '../../shared/ui/NotesBlockSettings'
import { DEFAULT_NOTES_RICH_TEXT_STATE } from '../../shared/ui/notes-rich-text-state'
import {
  NotesQuickLinkDialog,
  NotesRichTextSettingsSheet
} from '../../shared/ui/NotesRichTextControls'
import NotesRichTextDom, { type NotesRichTextDomRef } from '../../shared/ui/NotesRichTextDom'
import { Button, Label } from '../../shared/ui/primitives'
import { VoiceRecorder } from '../../../platform/VoiceRecorder'
import { StudyAttachmentBlock } from '../../shared/ui/StudyAttachmentBlock'
import { useTheme } from '../../shared/ui/theme'
import { messageFor } from '../../shared/ui/form-model'
import { MobileNoteAppearanceSheet } from './MobileNoteAppearanceSheet'
import type { AttachmentAction, MobileNoteAttachment } from './MobileNoteExtensions'
export type MobileNoteMode = 'edit' | 'read' | 'view'
function CanvasTool({
  label,
  icon: Icon,
  compact = false,
  selected = false,
  subtle = false,
  onClick
}: {
  label: string
  icon: LucideIcon
  compact?: boolean
  selected?: boolean
  subtle?: boolean
  onClick(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Action
      role={'button'}
      aria-label={label}
      aria-selected={selected}
      onClick={onClick}
      style={{
        width: compact ? 40 : 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        backgroundColor: selected ? (subtle ? theme.raised : theme.accent + '20') : theme.surface
      }}
      pressedStyle={{
        backgroundColor: selected ? (subtle ? theme.raised : theme.accent + '20') : theme.raised
      }}
    >
      <Icon size={compact ? 18 : 20} color={subtle ? theme.muted : theme.accent} />
    </Action>
  )
}
export function MobileNoteCanvas({
  noteId,
  document,
  mode,
  disabled = false,
  onChange,
  onModeChange,
  registerEditor,
  onError
}: {
  noteId: string
  document: NoteDocument
  mode: MobileNoteMode
  disabled?: boolean
  onChange(
    document: NoteDocument,
    options?: {
      saveImmediately?: boolean
    }
  ): void
  onModeChange(mode: MobileNoteMode): void
  registerEditor(editor: NotesRichTextDomRef | null): void
  onError(reason: unknown): void
}): React.JSX.Element {
  const theme = useTheme()
  const insets = useSafeArea()
  const { documentAssets } = useServices()
  const [initial] = useState(() => document)
  const current = useRef(document)
  useEffect(() => {
    current.current = document
  }, [document])
  const [canvasId] = useState(
    () =>
      document.blocks.find((block) => block.type === 'text' || block.type === 'heading')?.id ??
      randomUUID()
  )
  const editorRef = useRef<NotesRichTextDomRef | null>(null)
  const pendingAttachmentUpdates = useRef(new Map<string, MobileNoteAttachment>())
  const [ready, setReady] = useState(false)
  // A stable, typed React ref controller keeps toolbar callbacks usable across editor renders.
  const editor = useMemo<NotesRichTextDomRef>(() => {
    const currentEditor = (): NotesRichTextDomRef => {
      if (!editorRef.current) throw new Error('Редактор ещё загружается')
      return editorRef.current
    }
    return {
      flushEditor: async () => currentEditor().flushEditor(),
      insertAttachment: (block, voice) => currentEditor().insertAttachment(block, voice),
      updateAttachment: (block) => currentEditor().updateAttachment(block),
      deleteAttachment: (id) => currentEditor().deleteAttachment(id),
      insertDivider: (variant, thickness, force) =>
        currentEditor().insertDivider(variant, thickness, force),
      command: (command) => currentEditor().command(command),
      setFontSize: (value) => currentEditor().setFontSize(value),
      setTextColor: (value) => currentEditor().setTextColor(value),
      setHighlightColor: (value) => currentEditor().setHighlightColor(value),
      setLink: (href) => currentEditor().setLink(href),
      getSelectedText: async () => currentEditor().getSelectedText(),
      insertInternalLink: (html) => currentEditor().insertInternalLink(html),
      focusEditor: async () => currentEditor().focusEditor()
    }
  }, [])
  useEffect(() => {
    registerEditor(editor)
    return () => registerEditor(null)
  }, [editor, registerEditor])
  const [formatting, setFormatting] = useState(DEFAULT_NOTES_RICH_TEXT_STATE)
  const [panel, setPanel] = useState<
    'text' | 'insert' | 'divider' | 'link' | 'attachment' | 'voice' | 'legacy' | 'preview' | null
  >(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [voiceBusy, setVoiceBusy] = useState(false)
  const previousMode = useRef<MobileNoteMode>('edit')
  const [lastMode, setLastMode] = useState(mode)
  if (lastMode !== mode) {
    setLastMode(mode)
    if (mode !== 'edit') setPanel(null)
  }
  useEffect(() => {
    if (mode !== 'view') previousMode.current = mode
    if (mode !== 'edit') blurActiveElement()
  }, [mode])
  const [dividerStyle, setDividerStyle] = useState('solid')
  const [dividerSize, setDividerSize] = useState(3)
  const attachment = document.blocks.find(
    (block): block is MobileNoteAttachment =>
      block.id === selectedId && ['image', 'video', 'audio', 'file'].includes(block.type)
  )
  const legacy = document.blocks.filter(
    (block) => !['text', 'heading', 'image', 'video', 'audio', 'file'].includes(block.type)
  )
  const voice =
    attachment?.type === 'audio' &&
    document.blocks.some(
      (block) =>
        block.type === 'text' &&
        block.html
          ?.split(/<div\b/i)
          .some(
            (tag) =>
              tag.split('>')[0].includes(`data-note-attachment-id="${attachment.id}"`) &&
              tag.split('>')[0].includes('data-note-voice-recording="true"')
          )
    )
  const savedAppearance = document.appearance as
    | (Partial<NoteAppearance> & {
        backgroundPattern?: NoteAppearance['paperPattern']
      })
    | undefined
  const appearance: NoteAppearance = {
    ...DEFAULT_NOTE_APPEARANCE,
    ...savedAppearance,
    variant: getNoteAppearanceVariant(savedAppearance),
    paperPattern: savedAppearance?.paperPattern ?? savedAppearance?.backgroundPattern ?? 'none'
  }
  const assetUris: Record<string, string> = {}
  document.blocks.forEach((block) => {
    if (['image', 'video', 'audio', 'file'].includes(block.type)) {
      const media = block as MobileNoteAttachment
      if (media.source.type === 'local' && media.source.asset) {
        const uri = documentAssets.resolveAssetUri(media.source.asset)
        if (uri) assetUris[media.id] = uri
      }
    }
  })
  const publish = (next: NoteDocument, saveImmediately = false): void => {
    current.current = next
    onChange(next, { saveImmediately })
  }
  const canvasChanged = async (
    html: string,
    text: string,
    attachments: MobileNoteAttachment[]
  ): Promise<void> => {
    const previous = current.current
    const preserved = previous.blocks.filter(
      (block) => !['text', 'heading', 'image', 'video', 'audio', 'file'].includes(block.type)
    )
    const nextAttachments = attachments.map((attachment) => {
      const pending = pendingAttachmentUpdates.current.get(attachment.id)
      if (pending && JSON.stringify(pending) === JSON.stringify(attachment))
        pendingAttachmentUpdates.current.delete(attachment.id)
      return pending ?? attachment
    })
    const blocks: NoteDocument['blocks'] = [
      { id: canvasId, type: 'text', html, text },
      ...nextAttachments,
      ...preserved
    ]
    if (JSON.stringify(blocks) !== JSON.stringify(previous.blocks)) publish({ ...previous, blocks })
  }
  const openPanel = (next: typeof panel): void => {
    if ((next === 'insert' || next === 'divider') && formatting.divider) {
      setDividerStyle(formatting.divider.variant)
      setDividerSize(formatting.divider.thickness)
    }
    blurActiveElement()
    setPanel(next)
  }
  const updateAttachment = (next: MobileNoteAttachment): void => {
    // Keep document state and the editor transaction synchronized during an attachment edit.
    pendingAttachmentUpdates.current.set(next.id, next)
    publish({
      ...current.current,
      blocks: current.current.blocks.map((block) => (block.id === next.id ? next : block))
    })
    editor.updateAttachment(next)
  }
  const addAttachment = async (kind: StudyAssetKind | 'voice'): Promise<void> => {
    try {
      const block: MobileNoteAttachment = {
        id: randomUUID(),
        type: kind === 'voice' ? 'audio' : kind,
        source: { type: 'local' },
        ...(kind === 'image' ? { imageFit: 'contain' as const, imageHeight: 360 } : {})
      }
      editor.insertAttachment(block, kind === 'voice')
      await editor.flushEditor()
      setSelectedId(block.id)
      setPanel(kind === 'voice' ? 'voice' : 'attachment')
    } catch (reason) {
      onError(reason)
    }
  }
  const attachmentPressed = async (id: string, action: AttachmentAction): Promise<void> => {
    setSelectedId(id)
    if (action === 'settings') openPanel('attachment')
    else if (action === 'record') openPanel('voice')
    else if (action === 'preview') openPanel('preview')
    else if (action === 'open') {
      const block = current.current.blocks.find((item) => item.id === id) as
        MobileNoteAttachment | undefined
      if (block?.source.type === 'local' && block.source.asset) {
        try {
          await documentAssets.openAsset(block.source.asset)
        } catch (reason) {
          onError(reason)
        }
      }
    }
  }
  const renderDividerControls = (): React.JSX.Element => (
    <div
      className="ui-stack"
      style={{
        gap: 14
      }}
    >
      <Label muted>Разделитель</Label>
      <div
        className="ui-stack"
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8
        }}
      >
        {[
          ['solid', '━━━━'],
          ['tapered', '━◆━'],
          ['dashed', '┅┅┅'],
          ['dotted', '••••']
        ].map(([variant, label]) => (
          <Button
            key={variant}
            accessibilityLabel={`Разделитель: ${variant}`}
            label={label}
            selected={dividerStyle === variant}
            onClick={() => setDividerStyle(variant)}
          />
        ))}
      </div>
      <div
        className="ui-stack"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16
        }}
      >
        <Button
          label="−"
          accessibilityLabel="Уменьшить толщину разделителя"
          disabled={dividerSize === 1}
          onClick={() => setDividerSize((size) => size - 1)}
        />
        <Label>{dividerSize} px</Label>
        <Button
          label="+"
          accessibilityLabel="Увеличить толщину разделителя"
          disabled={dividerSize === 12}
          onClick={() => setDividerSize((size) => size + 1)}
        />
      </div>
      <Button
        label={formatting.divider ? 'Применить к разделителю' : 'Добавить разделитель'}
        primary
        onClick={() => {
          editor.insertDivider(dividerStyle, dividerSize)
          setPanel(null)
        }}
      />
      {formatting.divider ? (
        <Button
          label="Добавить новый разделитель"
          onClick={() => {
            editor.insertDivider(dividerStyle, dividerSize, true)
            setPanel(null)
          }}
        />
      ) : null}
    </div>
  )
  return (
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%',
        backgroundColor: theme.background
      }}
    >
      <NotesRichTextDom
        ref={editorRef}
        noteDocument={initial}
        noteAppearance={appearance}
        assetUris={assetUris}
        html=""
        editable={mode === 'edit' && !disabled}
        textColor={theme.text}
        mutedColor={theme.muted}
        borderColor={theme.border}
        surfaceColor={theme.surface}
        workspaceColor={theme.background}
        accentColor={theme.accent}
        onChange={async () => undefined}
        onCanvasChange={canvasChanged}
        onAttachmentPress={attachmentPressed}
        onEditorReady={async () => setReady(true)}
        onFocusEditor={async () => {
          setSelectedId(null)
        }}
        onFormattingState={async (state) => {
          setFormatting(state)
          if (panel === null) setSelectedId(state.attachmentId ?? null)
        }}
        onHeightChange={async () => undefined}
        onOpenExternalLink={async (href) => {
          try {
            await openExternalUrl(href)
          } catch (reason) {
            onError(reason)
          }
        }}
      />
      {mode === 'edit' && ready && !disabled ? (
        <div
          className="ui-stack"
          style={{
            paddingBottom: Math.max(6, insets.bottom),
            paddingTop: 6,
            borderTopWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface
          }}
        >
          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingInline: 6,
              gap: 8
            }}
          >
            <div
              className="ui-scroll"
              style={{
                flex: '1 1 0%',
                minWidth: 0
              }}
              data-horizontal={true}
            >
              <div
                className="ui-stack ui-scroll-content"
                style={{
                  alignItems: 'center',
                  gap: 2,
                  paddingRight: 4,
                  flexDirection: 'row'
                }}
              >
                <CanvasTool
                  compact={true}
                  subtle={true}
                  label={'Добавить вложение'}
                  icon={Plus}
                  onClick={() => openPanel('insert')}
                />
                <CanvasTool
                  compact={true}
                  subtle={true}
                  label="Форматирование текста"
                  icon={Type}
                  onClick={() => openPanel('text')}
                />
                {
                  <CanvasTool
                    compact
                    subtle
                    label="Создать чек-лист"
                    icon={ListTodo}
                    selected={Boolean(formatting.taskList)}
                    onClick={() => {
                      void (async () => {
                        await editor.command('taskList')
                        await editor.focusEditor()
                      })().catch(onError)
                    }}
                  />
                }
                <CanvasTool
                  compact={true}
                  subtle={true}
                  label="Вставить изображение"
                  icon={Image}
                  onClick={() => void addAttachment('image')}
                />
                <CanvasTool
                  compact={true}
                  subtle={true}
                  label="Вставить разделитель"
                  icon={Minus}
                  onClick={() => openPanel('divider')}
                />
                <CanvasTool
                  compact={true}
                  subtle={true}
                  label="Добавить ссылку"
                  icon={Link2}
                  onClick={() => openPanel('link')}
                />
                <CanvasTool
                  compact={true}
                  subtle={true}
                  label="Добавить голосовую запись"
                  icon={Mic}
                  onClick={() => void addAttachment('voice')}
                />
              </div>
            </div>
          </div>
          {legacy.length ? (
            <div
              className="ui-stack"
              style={{
                paddingInline: 8,
                paddingTop: 6
              }}
            >
              <Button label="Другие материалы" onClick={() => openPanel('legacy')} />
            </div>
          ) : null}
        </div>
      ) : legacy.length ? (
        <Button label="Другие материалы" onClick={() => openPanel('legacy')} />
      ) : null}

      <NotesRichTextSettingsSheet
        open={panel === 'text'}
        close={() => {
          setPanel(null)
        }}
        onAfterClose={() => {
          if (panel === null && mode === 'edit' && !disabled && editorRef.current)
            void editor.focusEditor()
        }}
        editor={editor}
        state={formatting}
      />
      {panel === 'link' ? (
        <NotesQuickLinkDialog
          key={formatting.href}
          open
          close={() => setPanel(null)}
          editor={editor}
          state={formatting}
        />
      ) : null}
      {mode === 'view' ? (
        <MobileNoteAppearanceSheet
          value={appearance}
          close={() => onModeChange(previousMode.current)}
          onChange={(value) => publish({ ...current.current, appearance: value }, true)}
        />
      ) : null}

      <AppDialog
        open={panel === 'insert'}
        title="Добавить в заметку"
        icon="add"
        presentation="sheet"
        onOpenChange={(open) => {
          if (!open) setPanel(null)
        }}
      >
        <div className="ui-scroll">
          <div
            className="ui-stack ui-scroll-content"
            style={{
              padding: 16,
              gap: 16,
              paddingBottom: 28
            }}
          >
            <Label muted>Вложения</Label>
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 10
              }}
            >
              {(
                [
                  { kind: 'image', label: 'Изображение', icon: Image },
                  { kind: 'video', label: 'Видео', icon: Video },
                  { kind: 'audio', label: 'Аудио', icon: Music },
                  { kind: 'voice', label: 'Голосовое', icon: Mic },
                  { kind: 'file', label: 'Файл', icon: File }
                ] as const
              )
                .filter((item) => item.kind !== 'image' && item.kind !== 'voice')
                .map((item) => (
                  <Action
                    key={item.kind}
                    role={'button'}
                    aria-label={`Добавить: ${item.label}`}
                    onClick={() => void addAttachment(item.kind)}
                    style={{
                      width: '30%',
                      minHeight: 84,
                      gap: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 12,
                      backgroundColor: theme.surface
                    }}
                  >
                    <item.icon size={24} color={theme.accent} />
                    <span
                      className="ui-text"
                      style={{
                        color: theme.text,
                        fontSize: 12
                      }}
                    >
                      {item.label}
                    </span>
                  </Action>
                ))}
            </div>
            {null}
          </div>
        </div>
      </AppDialog>

      <AppDialog
        open={panel === 'divider'}
        title="Разделитель"
        icon="add"
        presentation="sheet"
        onOpenChange={(open) => {
          if (!open) setPanel(null)
        }}
      >
        <div
          className="ui-stack"
          style={{
            padding: 16,
            paddingBottom: 28
          }}
        >
          {renderDividerControls()}
        </div>
      </AppDialog>

      {panel === 'attachment' && attachment && !voice ? (
        <NotesBlockSettingsSheet
          key={attachment.id}
          block={attachment}
          close={() => setPanel(null)}
          update={(block) => updateAttachment(block as MobileNoteAttachment)}
          importAsset={(kind) => documentAssets.importAsset(noteId, kind)}
          onAssetError={onError}
          footer={
            <div
              className="ui-stack"
              style={{
                gap: 12
              }}
            >
              {voice ? (
                <Button label="Записать заново" icon="music" onClick={() => setPanel('voice')} />
              ) : null}
              <Button
                label="Удалить вложение из заметки"
                danger
                icon="delete"
                onClick={() => {
                  editor.deleteAttachment(attachment.id)
                  setSelectedId(null)
                  setPanel(null)
                }}
              />
            </div>
          }
        />
      ) : null}

      <AppDialog
        open={panel === 'attachment' && Boolean(voice)}
        title="Настройки голосового"
        icon="music"
        presentation="sheet"
        onOpenChange={(open) => {
          if (!open) setPanel(null)
        }}
      >
        {attachment ? (
          <div
            className="ui-stack"
            style={{
              padding: 16,
              gap: 14
            }}
          >
            <TextControl
              aria-label={'Название голосовой записи'}
              placeholder={'Название (необязательно)'}
              placeholderColor={theme.muted}
              value={attachment.title ?? ''}
              onValueChange={(title) => updateAttachment({ ...attachment, title })}
              style={{
                minHeight: 48,
                paddingInline: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                color: theme.text
              }}
            ></TextControl>
            <Button label="Записать заново" icon="music" onClick={() => setPanel('voice')} />
            <Button
              label="Удалить голосовое из заметки"
              danger
              icon="delete"
              onClick={() => {
                editor.deleteAttachment(attachment.id)
                setSelectedId(null)
                setPanel(null)
              }}
            />
          </div>
        ) : null}
      </AppDialog>

      <AppDialog
        open={panel === 'voice'}
        title="Голосовая запись"
        icon="music"
        presentation="sheet"
        busy={voiceBusy}
        onOpenChange={(open) => {
          if (!open) setPanel(null)
        }}
      >
        <div
          className="ui-stack"
          style={{
            padding: 16,
            paddingBottom: 28,
            gap: 12
          }}
        >
          <Label muted>Запись будет добавлена в выбранное место заметки.</Label>
          {panel === 'voice' && attachment?.type === 'audio' ? (
            <VoiceRecorder
              onBusyChange={setVoiceBusy}
              saveRecording={(input) => documentAssets.saveRecordedAudio(noteId, input)}
              onSaved={(asset) => {
                updateAttachment({
                  ...attachment,
                  source: { type: 'local', asset },
                  title: attachment.title || 'Голосовая запись'
                })
                setVoiceBusy(false)
                setPanel(null)
              }}
              onError={onError}
            />
          ) : null}
        </div>
      </AppDialog>
      <AppDialog
        open={panel === 'legacy'}
        title="Другие материалы"
        presentation="fullscreen"
        onOpenChange={(open) => {
          if (!open) setPanel(null)
        }}
      >
        <DocumentEditor
          document={{ version: 1, blocks: legacy }}
          mode="read"
          onChange={() => undefined}
          createId={randomUUID}
          openAsset={documentAssets.openAsset}
          resolveAssetUri={documentAssets.resolveAssetUri}
          onAssetError={(reason) => onError(new Error(messageFor(reason)))}
        />
      </AppDialog>
      <AppDialog
        open={panel === 'preview'}
        title={attachment?.title || (attachment?.type === 'image' ? 'Изображение' : 'Аудио')}
        presentation="fullscreen"
        onOpenChange={(open) => {
          if (!open) setPanel(null)
        }}
      >
        {attachment?.type === 'image' ? (
          <img
            aria-label={attachment.title || 'Изображение'}
            src={
              attachment.source.type === 'url'
                ? (normalizeStudyRemoteImageUrl(attachment.source.url) ?? '')
                : assetUris[attachment.id]
            }
            style={{
              flex: '1 1 0%',
              width: '100%',
              objectFit: 'contain'
            }}
            alt=""
            draggable="false"
          ></img>
        ) : attachment ? (
          <div
            className="ui-stack"
            style={{
              padding: 16
            }}
          >
            <StudyAttachmentBlock
              block={attachment}
              openAsset={documentAssets.openAsset}
              resolveAssetUri={documentAssets.resolveAssetUri}
              onError={onError}
            />
          </div>
        ) : null}
      </AppDialog>
    </div>
  )
}
