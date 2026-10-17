import { randomUUID } from 'expo-crypto'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Keyboard,
  KeyboardAvoidingView,
  Image as NativeImage,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native'
import {
  File,
  Image,
  Mic,
  Plus,
  Settings2,
  Video,
  Music,
  type LucideIcon
} from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
  NotesRichTextInlineControls,
  NotesRichTextSettingsSheet
} from '../../shared/ui/NotesRichTextControls'
import NotesRichTextDom, { type NotesRichTextDomRef } from '../../shared/ui/NotesRichTextDom'
import { Button, Label } from '../../shared/ui/primitives'
import { VoiceRecorder } from '../../shared/ui/VoiceRecorder'
import { StudyAttachmentBlock } from '../../shared/ui/StudyAttachmentBlock'
import { useTheme } from '../../shared/ui/theme'
import { messageFor } from '../../shared/ui/form-model'
import { MobileNoteAppearanceSheet } from './MobileNoteAppearanceSheet'
import type { AttachmentAction, MobileNoteAttachment } from './MobileNoteExtensions'

export type MobileNoteMode = 'edit' | 'read' | 'view'

function CanvasTool({
  label,
  icon: Icon,
  onPress
}: {
  label: string
  icon: LucideIcon
  onPress(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        backgroundColor: pressed ? theme.raised : theme.surface
      })}
    >
      <Icon size={20} color={theme.accent} />
    </Pressable>
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
  onChange(document: NoteDocument, options?: { saveImmediately?: boolean }): void
  onModeChange(mode: MobileNoteMode): void
  registerEditor(editor: NotesRichTextDomRef | null): void
  onError(reason: unknown): void
}): React.JSX.Element {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
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
  const pendingSnapshots = useRef(
    new Map<
      string,
      { resolve(): void; reject(reason: Error): void; timer: ReturnType<typeof setTimeout> }
    >()
  )
  // Expo's native imperative proxy is fire-and-forget. A snapshot is complete
  // only after the DOM has sent its document back through the native action.
  const editor = useMemo(
    () =>
      new Proxy({} as NotesRichTextDomRef, {
        get(_target, method) {
          if (method !== 'flushEditor')
            return (...args: Parameters<NotesRichTextDomRef['command']>) =>
              editorRef.current?.[String(method)]?.(...args)
          return () =>
            new Promise<void>((resolve, reject) => {
              const bridge = editorRef.current
              if (typeof bridge?.flushEditor !== 'function') {
                reject(new Error('Редактор ещё загружается'))
                return
              }
              const id = randomUUID()
              const timer = setTimeout(() => {
                pendingSnapshots.current.delete(id)
                reject(
                  new Error(
                    'Не удалось получить последние изменения. Попробуйте сохранить ещё раз.'
                  )
                )
              }, 8000)
              pendingSnapshots.current.set(id, { resolve, reject, timer })
              void bridge.flushEditor(id)
            })
        }
      }),
    []
  )
  useEffect(() => {
    registerEditor(editor)
    return () => registerEditor(null)
  }, [editor, registerEditor])
  useEffect(
    () => () => {
      pendingSnapshots.current.forEach(({ reject, timer }) => {
        clearTimeout(timer)
        reject(new Error('Редактор закрыт'))
      })
      pendingSnapshots.current.clear()
    },
    []
  )
  const [formatting, setFormatting] = useState(DEFAULT_NOTES_RICH_TEXT_STATE)
  const [panel, setPanel] = useState<
    'text' | 'insert' | 'link' | 'attachment' | 'voice' | 'legacy' | 'preview' | null
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
    if (mode !== 'edit') Keyboard.dismiss()
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
    (Partial<NoteAppearance> & { backgroundPattern?: NoteAppearance['paperPattern'] }) | undefined
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
    attachments: MobileNoteAttachment[],
    requestId?: string
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
    if (requestId) {
      const pending = pendingSnapshots.current.get(requestId)
      if (pending) {
        clearTimeout(pending.timer)
        pendingSnapshots.current.delete(requestId)
        pending.resolve()
      }
    }
  }
  const openPanel = (next: typeof panel): void => {
    if (next === 'insert' && formatting.divider) {
      setDividerStyle(formatting.divider.variant)
      setDividerSize(formatting.divider.thickness)
    }
    Keyboard.dismiss()
    setPanel(next)
  }
  const updateAttachment = (next: MobileNoteAttachment): void => {
    // Native fields need synchronous feedback while the WebView receives the
    // command. Keep older bridge snapshots from undoing the latest field edit.
    pendingAttachmentUpdates.current.set(next.id, next)
    publish({
      ...current.current,
      blocks: current.current.blocks.map((block) => (block.id === next.id ? next : block))
    })
    editor.updateAttachment(JSON.stringify(next))
  }
  const addAttachment = async (kind: StudyAssetKind | 'voice'): Promise<void> => {
    try {
      const block: MobileNoteAttachment = {
        id: randomUUID(),
        type: kind === 'voice' ? 'audio' : kind,
        source: { type: 'local' },
        ...(kind === 'image' ? { imageFit: 'contain' as const, imageHeight: 360 } : {})
      }
      editor.insertAttachment(JSON.stringify(block), kind === 'voice')
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
        dom={{
          scrollEnabled: true,
          style: { flex: 1 },
          allowFileAccess: true,
          allowFileAccessFromFileURLs: true,
          keyboardDisplayRequiresUserAction: false
        }}
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
            await Linking.openURL(href)
          } catch (reason) {
            onError(reason)
          }
        }}
      />
      {mode === 'edit' && ready && !disabled ? (
        <View
          style={{
            paddingBottom: Math.max(6, insets.bottom),
            paddingTop: 6,
            borderTopWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4 }}
          >
            <CanvasTool
              label="Добавить вложение или разделитель"
              icon={Plus}
              onPress={() => openPanel('insert')}
            />
            <CanvasTool
              label="Форматирование текста"
              icon={Settings2}
              onPress={() => openPanel('text')}
            />
            <ScrollView
              horizontal
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="always"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 8, alignItems: 'center', gap: 4 }}
            >
              {attachment ? (
                <CanvasTool
                  label="Настройки выбранного вложения"
                  icon={Settings2}
                  onPress={() => openPanel('attachment')}
                />
              ) : null}
              <NotesRichTextInlineControls
                editor={editor}
                state={formatting}
                showSettings={false}
                openSettings={() => openPanel('text')}
                openLink={() => openPanel('link')}
              />
              {legacy.length ? (
                <Button label="Другие материалы" onPress={() => openPanel('legacy')} />
              ) : null}
            </ScrollView>
          </View>
        </View>
      ) : legacy.length ? (
        <Button label="Другие материалы" onPress={() => openPanel('legacy')} />
      ) : null}

      <NotesRichTextSettingsSheet
        open={panel === 'text'}
        close={() => setPanel(null)}
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
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 28 }}>
          <Label muted>Вложения</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {(
              [
                { kind: 'image', label: 'Изображение', icon: Image },
                { kind: 'video', label: 'Видео', icon: Video },
                { kind: 'audio', label: 'Аудио', icon: Music },
                { kind: 'voice', label: 'Голосовое', icon: Mic },
                { kind: 'file', label: 'Файл', icon: File }
              ] as const
            ).map((item) => (
              <Pressable
                key={item.kind}
                accessibilityRole="button"
                accessibilityLabel={`Добавить: ${item.label}`}
                onPress={() => void addAttachment(item.kind)}
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
                <Text style={{ color: theme.text, fontSize: 12 }}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <Label muted>Разделитель</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
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
                onPress={() => setDividerStyle(variant)}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Button
              label="−"
              accessibilityLabel="Уменьшить толщину разделителя"
              disabled={dividerSize === 1}
              onPress={() => setDividerSize((size) => size - 1)}
            />
            <Label>{dividerSize} px</Label>
            <Button
              label="+"
              accessibilityLabel="Увеличить толщину разделителя"
              disabled={dividerSize === 12}
              onPress={() => setDividerSize((size) => size + 1)}
            />
          </View>
          <Button
            label={formatting.divider ? 'Применить к разделителю' : 'Добавить разделитель'}
            primary
            onPress={() => {
              editor.insertDivider(dividerStyle, dividerSize)
              setPanel(null)
            }}
          />
          {formatting.divider ? (
            <Button
              label="Добавить новый разделитель"
              onPress={() => {
                editor.insertDivider(dividerStyle, dividerSize, true)
                setPanel(null)
              }}
            />
          ) : null}
        </ScrollView>
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
            <View style={{ gap: 12 }}>
              {voice ? (
                <Button label="Записать заново" icon="music" onPress={() => setPanel('voice')} />
              ) : null}
              <Button
                label="Удалить вложение из заметки"
                danger
                icon="delete"
                onPress={() => {
                  editor.deleteAttachment(attachment.id)
                  setSelectedId(null)
                  setPanel(null)
                }}
              />
            </View>
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
          <View style={{ padding: 16, gap: 14 }}>
            <TextInput
              accessibilityLabel="Название голосовой записи"
              placeholder="Название (необязательно)"
              placeholderTextColor={theme.muted}
              value={attachment.title ?? ''}
              onChangeText={(title) => updateAttachment({ ...attachment, title })}
              style={{
                minHeight: 48,
                paddingHorizontal: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                color: theme.text
              }}
            />
            <Button label="Записать заново" icon="music" onPress={() => setPanel('voice')} />
            <Button
              label="Удалить голосовое из заметки"
              danger
              icon="delete"
              onPress={() => {
                editor.deleteAttachment(attachment.id)
                setSelectedId(null)
                setPanel(null)
              }}
            />
          </View>
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
        <View style={{ padding: 16, paddingBottom: 28, gap: 12 }}>
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
        </View>
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
          <NativeImage
            accessibilityLabel={attachment.title || 'Изображение'}
            source={{
              uri:
                attachment.source.type === 'url'
                  ? (normalizeStudyRemoteImageUrl(attachment.source.url) ?? '')
                  : assetUris[attachment.id]
            }}
            resizeMode="contain"
            style={{ flex: 1, width: '100%' }}
          />
        ) : attachment ? (
          <View style={{ padding: 16 }}>
            <StudyAttachmentBlock
              block={attachment}
              openAsset={documentAssets.openAsset}
              resolveAssetUri={documentAssets.resolveAssetUri}
              onError={onError}
            />
          </View>
        ) : null}
      </AppDialog>
    </KeyboardAvoidingView>
  )
}
