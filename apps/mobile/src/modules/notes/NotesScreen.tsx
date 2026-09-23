import { randomUUID } from 'expo-crypto'
import {
  ArrowDownAZ,
  CircleSlash2,
  Clock3,
  Folder,
  Grid2X2,
  List,
  StickyNote,
  type LucideIcon
} from 'lucide-react-native'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, BackHandler, FlatList, Pressable, Text, TextInput, View } from 'react-native'
import type { NoteDocument, NoteGroup, NoteRecord, NoteSummary } from '@mymind/contracts/notes'
import type { StudyTextBlock } from '@mymind/contracts/study'
import { AutosaveQueue } from '@mymind/core/autosave'
import * as notesValidation from '@mymind/core/validation/notes'
import { useServices } from '../../app/context'
import { notifyDataChanged } from '../../app/changes'
import { useCollection } from '../../shared/hooks/useCollection'
import { DocumentEditor } from '../../shared/ui/DocumentEditor'
import { FormSheet } from '../../shared/ui/FormSheet'
import { ActionMenu } from '../../shared/ui/ActionMenu'
import { useConfirmation } from '../../shared/ui/ConfirmationProvider'
import { useToast } from '../../shared/ui/toast-context'
import { WorkspaceNodeCard } from '../../shared/ui/Workspace'
import { MobileCreateAction } from '../../shared/ui/MobileCreateAction'
import { VisualIconBadge } from '../../shared/ui/VisualPickers'
import { FOLDER_ICON_CHOICES } from '../../shared/ui/visual-options'
import {
  choiceField,
  iconField,
  messageFor,
  textField,
  type FormSpec
} from '../../shared/ui/form-model'
import {
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  SearchField
} from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { SwipeableTabContent } from '../../shared/ui/SwipeableTabContent'
import { MobileNoteAppendEditor } from './MobileNoteAppendEditor'
import { createMobileAppendTextBlock, isTextOnlyNote, withoutNoteBlock } from './mobile-note-policy'

type NoteEditorMode = 'edit' | 'read'
type NoteSaveState = 'saved' | 'dirty' | 'saving' | 'error'
type NotesLayout = 'grid' | 'list'
type NotesSort = 'updated' | 'title'
type NotesView = 'all' | 'recent' | 'groups' | 'ungrouped'

function sortNotes(notes: NoteSummary[], sort: NotesSort): NoteSummary[] {
  return [...notes].sort((left, right) =>
    sort === 'title'
      ? left.title.localeCompare(right.title, 'ru-RU')
      : right.updatedAt - left.updatedAt
  )
}

const NOTES_VIEW_TABS = ['all', 'recent', 'groups', 'ungrouped'] as const

const NOTES_VIEWS: ReadonlyArray<{
  id: NotesView
  label: string
  icon: LucideIcon
}> = [
  { id: 'all', label: 'Все', icon: StickyNote },
  { id: 'recent', label: 'Недавние', icon: Clock3 },
  { id: 'groups', label: 'По группам', icon: Folder },
  { id: 'ungrouped', label: 'Без группы', icon: CircleSlash2 }
]

function NotesTabBar({
  value,
  onChange
}: {
  value: NotesView
  onChange(value: NotesView): void
}): React.JSX.Element {
  const theme = useTheme()

  return (
    <View
      accessibilityRole="tablist"
      style={{
        minHeight: 50,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        padding: 4,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface
      }}
    >
      {NOTES_VIEWS.map((item) => {
        const selected = value === item.id
        const Icon = item.icon
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(item.id)}
            style={({ pressed }) => ({
              flex: 1,
              minWidth: 0,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              backgroundColor: selected
                ? theme.accent + '18'
                : pressed
                  ? theme.raised
                  : 'transparent',
              opacity: pressed ? 0.72 : 1
            })}
          >
            <Icon
              size={18}
              strokeWidth={selected ? 2.4 : 2}
              color={selected ? theme.accent : theme.muted}
            />
          </Pressable>
        )
      })}
    </View>
  )
}

function NotesControl({
  label,
  icon: Icon,
  active = false,
  iconOnly = false,
  onPress
}: {
  label: string
  icon: LucideIcon
  active?: boolean
  iconOnly?: boolean
  onPress(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: iconOnly ? 38 : undefined,
        height: 38,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: iconOnly ? 0 : 6,
        paddingHorizontal: iconOnly ? 0 : 10,
        borderWidth: 1,
        borderColor: active ? theme.accent + '55' : theme.border,
        borderRadius: 11,
        backgroundColor: active ? theme.accent + '10' : pressed ? theme.raised : theme.surface,
        opacity: pressed ? 0.72 : 1
      })}
    >
      <Icon size={15} color={active ? theme.accent : theme.muted} />
      {!iconOnly ? (
        <Text
          style={{ color: active ? theme.accent : theme.text, fontSize: 11.5, fontWeight: '700' }}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  )
}

function noteSaveLabel(state: NoteSaveState): string {
  if (state === 'saving') return 'Сохранение…'
  if (state === 'dirty') return 'Есть изменения'
  if (state === 'error') return 'Ошибка сохранения'
  return 'Сохранено'
}

function MobileNoteCard({
  note,
  groupTitle,
  layout,
  onOpen,
  onRename,
  onMove,
  onDelete
}: {
  note: NoteSummary
  groupTitle?: string
  layout: NotesLayout
  onOpen(): void
  onRename(): void
  onMove(): void
  onDelete(): void
}): React.JSX.Element {
  const theme = useTheme()
  const subtitle = note.plainText.trim()
  const date = new Date(note.updatedAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short'
  })
  const menu = (
    <ActionMenu
      title={note.title}
      items={[
        { label: 'Переименовать', icon: 'edit', onPress: onRename },
        { label: 'Переместить', icon: 'move', onPress: onMove },
        { label: 'Удалить заметку', icon: 'delete', danger: true, onPress: onDelete }
      ]}
    />
  )
  const meta = [groupTitle, date].filter(Boolean).join(' · ')

  if (layout === 'list') {
    return (
      <View
        style={{
          minHeight: 78,
          marginBottom: 8,
          flexDirection: 'row',
          alignItems: 'stretch',
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 16,
          backgroundColor: theme.surface
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={note.title}
          onPress={onOpen}
          style={({ pressed }) => ({
            minWidth: 0,
            flex: 1,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 11,
            paddingLeft: 12,
            paddingRight: 4,
            paddingVertical: 12,
            backgroundColor: pressed ? theme.raised : 'transparent'
          })}
        >
          <VisualIconBadge value="notes" size={36} />
          <View style={{ minWidth: 0, flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{ color: theme.text, fontSize: 14, lineHeight: 19, fontWeight: '700' }}
            >
              {note.title}
            </Text>
            {subtitle ? (
              <Text
                numberOfLines={2}
                style={{ marginTop: 3, color: theme.muted, fontSize: 11.5, lineHeight: 16 }}
              >
                {subtitle}
              </Text>
            ) : null}
            <Text
              numberOfLines={1}
              style={{ marginTop: subtitle ? 6 : 4, color: theme.muted, fontSize: 10 }}
            >
              {meta || 'Без группы'}
            </Text>
          </View>
        </Pressable>
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingRight: 6 }}>
          {menu}
        </View>
      </View>
    )
  }

  return (
    <View
      style={{
        minHeight: 152,
        marginBottom: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={note.title}
        onPress={onOpen}
        style={({ pressed }) => ({
          minHeight: 150,
          flex: 1,
          gap: 8,
          padding: 12,
          paddingRight: 42,
          backgroundColor: pressed ? theme.raised : 'transparent'
        })}
      >
        <VisualIconBadge value="notes" size={34} />
        <Text
          numberOfLines={2}
          style={{ color: theme.text, fontSize: 13.5, lineHeight: 18, fontWeight: '700' }}
        >
          {note.title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={3} style={{ color: theme.muted, fontSize: 11, lineHeight: 15 }}>
            {subtitle}
          </Text>
        ) : (
          <Text style={{ color: theme.muted, fontSize: 11 }}>Пустая заметка</Text>
        )}
        <Text numberOfLines={1} style={{ marginTop: 'auto', color: theme.muted, fontSize: 9.5 }}>
          {meta || 'Без группы'}
        </Text>
      </Pressable>
      <View style={{ position: 'absolute', top: 5, right: 4 }}>{menu}</View>
    </View>
  )
}

function noteMatches(note: NoteSummary, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return true
  return `${note.title} ${note.plainText}`.toLocaleLowerCase().includes(normalized)
}

export function NotesScreen({
  onImmersiveChange
}: {
  onImmersiveChange?: (immersive: boolean) => void
}): React.JSX.Element {
  const { notes: api, documentAssets } = useServices()
  const theme = useTheme()
  const confirm = useConfirmation()
  const toast = useToast()
  const overview = useCollection(useCallback(() => api.listNotesOverview(), [api]))
  const [query, setQuery] = useState('')
  const [view, setView] = useState<NotesView>('all')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [form, setForm] = useState<FormSpec | null>(null)
  const [record, setRecord] = useState<NoteRecord | null>(null)
  const [document, setDocument] = useState<NoteDocument | null>(null)
  const [editorError, setEditorError] = useState('')
  const [closing, setClosing] = useState(false)
  const [editorMode, setEditorMode] = useState<NoteEditorMode>('edit')
  const [modeChanging, setModeChanging] = useState(false)
  const [saveState, setSaveState] = useState<NoteSaveState>('saved')
  const [appendBlock, setAppendBlock] = useState<StudyTextBlock | null>(null)
  const [layout, setLayout] = useState<NotesLayout>('list')
  const [sort, setSort] = useState<NotesSort>('updated')
  const [hideEmptyGroups, setHideEmptyGroups] = useState(false)
  const queueRef = useRef<AutosaveQueue<NoteDocument> | null>(null)
  const appendQueueRef = useRef<AutosaveQueue<StudyTextBlock> | null>(null)

  const openNote = useCallback(
    (id: string): void => {
      try {
        const next = api.getNote(id)
        setRecord(next)
        setDocument(next.document)
        setAppendBlock(null)
        setEditorError('')
        setEditorMode(isTextOnlyNote(next.document) ? 'edit' : 'read')
        setSaveState('saved')
        queueRef.current = new AutosaveQueue<NoteDocument>(
          async (value) => {
            setSaveState('saving')
            try {
              const saved = await api.saveNote({ id, document: value })
              setRecord(saved)
              setSaveState('saved')
              notifyDataChanged()
            } catch (reason) {
              setSaveState('error')
              throw reason
            }
          },
          {
            delayMs: 350,
            onError: (reason) => {
              setSaveState('error')
              setEditorError(messageFor(reason))
            }
          }
        )

        appendQueueRef.current = new AutosaveQueue<StudyTextBlock>(
          async (block) => {
            setSaveState('saving')
            try {
              const saved = await api.upsertTextBlock(id, block)
              setRecord(saved)
              setDocument(saved.document)
              setSaveState('saved')
              notifyDataChanged()
            } catch (reason) {
              setSaveState('error')
              throw reason
            }
          },
          {
            delayMs: 350,
            onError: (reason) => {
              setSaveState('error')
              setEditorError(messageFor(reason))
            }
          }
        )
      } catch (reason) {
        setEditorError(messageFor(reason))
      }
    },
    [api]
  )

  const flush = useCallback(async (): Promise<void> => {
    const documentQueue = queueRef.current
    const appendQueue = appendQueueRef.current
    if (!documentQueue && !appendQueue) return
    if (documentQueue?.hasPendingChanges() || appendQueue?.hasPendingChanges()) {
      setSaveState('saving')
    }
    try {
      await documentQueue?.flush()
      await appendQueue?.flush()
      setSaveState('saved')
      setEditorError('')
    } catch (reason) {
      setSaveState('error')
      throw reason
    }
  }, [])

  const closeEditor = useCallback(async (): Promise<void> => {
    if (closing) return
    setClosing(true)
    try {
      await flush()
      queueRef.current = null
      appendQueueRef.current = null
      setRecord(null)
      setDocument(null)
      setAppendBlock(null)
      setEditorMode('edit')
      setSaveState('saved')
      overview.refresh()
    } catch (reason) {
      setEditorError(messageFor(reason))
    } finally {
      setClosing(false)
    }
  }, [closing, flush, overview])

  useEffect(() => {
    if (!record) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      void closeEditor()
      return true
    })
    return () => subscription.remove()
  }, [closeEditor, record])

  const editorOpen = record !== null

  useEffect(() => {
    onImmersiveChange?.(editorOpen)
    return () => {
      if (editorOpen) onImmersiveChange?.(false)
    }
  }, [editorOpen, onImmersiveChange])

  useEffect(() => {
    if (!record) return
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        void flush().catch((reason) => setEditorError(messageFor(reason)))
      }
    })
    return () => subscription.remove()
  }, [flush, record])

  const changeDocument = (next: NoteDocument): void => {
    setDocument(next)
    setEditorError('')
    setSaveState('dirty')
    queueRef.current?.schedule(next)
  }

  const changeAppendBlock = (next: StudyTextBlock): void => {
    setAppendBlock(next)
    setEditorError('')
    setSaveState('dirty')
    appendQueueRef.current?.schedule(next)
  }

  const changeEditorMode = (nextMode: NoteEditorMode): void => {
    if (nextMode === editorMode || modeChanging || !document) return
    if (nextMode === 'edit') {
      if (!isTextOnlyNote(document)) {
        setAppendBlock(createMobileAppendTextBlock(randomUUID()))
      }
      setEditorMode('edit')
      return
    }

    setModeChanging(true)
    void flush()
      .then(() => {
        setAppendBlock(null)
        setEditorMode('read')
      })
      .catch((reason) => setEditorError(messageFor(reason)))
      .finally(() => setModeChanging(false))
  }

  const groupChoices = [
    { value: null, label: 'Без группы' },
    ...(overview.data?.groups ?? []).map((group) => ({ value: group.id, label: group.title }))
  ]

  const editGroup = (group?: NoteGroup): void => {
    setForm({
      title: group ? 'Изменить группу' : 'Новая группа',
      initial: {
        title: group?.title ?? '',
        icon: group?.icon ?? 'folder'
      },
      fields: [
        textField('title', 'Название'),
        iconField('icon', 'Иконка', FOLDER_ICON_CHOICES, 'folder')
      ],
      preview: {
        titleKey: 'title',
        iconKey: 'icon',
        iconFamily: 'folder',
        description: 'Так группа будет выглядеть в заметках.'
      },
      save: (values) => {
        if (group) {
          const renamed = notesValidation.renameNoteGroupInputSchema.parse({
            id: group.id,
            title: values.title
          })
          api.renameNoteGroup(renamed.id, renamed.title)
          const icon = notesValidation.updateNoteGroupIconInputSchema.parse({
            id: group.id,
            icon: values.icon
          })
          api.updateNoteGroupIcon(icon.id, icon.icon)
        } else {
          const input = notesValidation.createNoteGroupInputSchema.parse({ title: values.title })
          const created = api.createNoteGroup(input.title)
          const icon = notesValidation.updateNoteGroupIconInputSchema.parse({
            id: created.id,
            icon: values.icon
          })
          api.updateNoteGroupIcon(icon.id, icon.icon)
        }
        overview.refresh()
      }
    })
  }

  const deleteGroup = (group: NoteGroup): void => {
    void confirm({
      title: 'Удалить группу?',
      description: 'Заметки сохранятся и перейдут в раздел «Без группы».',
      tone: 'danger',
      onConfirm: () => {
        api.deleteNoteGroup(group.id)
        if (selectedGroupId === group.id) setSelectedGroupId(null)
        overview.refresh()
        notifyDataChanged()
        toast.success('Группа удалена')
      }
    })
  }

  const createNote = (targetGroupId: string | null): void => {
    setForm({
      title: targetGroupId ? 'Новая заметка в группе' : 'Новая заметка',
      initial: { title: '' },
      fields: [textField('title', 'Название')],
      save: (values) => {
        const input = notesValidation.createNoteInputSchema.parse({
          title: values.title,
          groupId: targetGroupId
        })
        const created = api.createNote(input)
        overview.refresh()
        openNote(created.id)
      }
    })
  }

  const editNoteProperties = (note: NoteRecord): void => {
    setForm({
      title: 'Свойства заметки',
      initial: { title: note.title, groupId: note.groupId },
      fields: [textField('title', 'Название'), choiceField('groupId', 'Группа', groupChoices)],
      save: async (values) => {
        await flush()
        const renamed = notesValidation.renameNoteInputSchema.parse({
          id: note.id,
          title: values.title
        })
        api.renameNote(renamed.id, renamed.title)
        const moved = notesValidation.moveNoteInputSchema.parse({
          id: note.id,
          groupId: values.groupId
        })
        api.moveNote(moved.id, moved.groupId)
        const updated = api.getNote(note.id)
        setRecord(updated)
        setDocument(updated.document)
        overview.refresh()
      }
    })
  }

  const renameListedNote = (note: NoteSummary): void => {
    setForm({
      title: 'Переименовать заметку',
      initial: { title: note.title },
      fields: [textField('title', 'Название')],
      save: (values) => {
        const input = notesValidation.renameNoteInputSchema.parse({
          id: note.id,
          title: values.title
        })
        api.renameNote(input.id, input.title)
        overview.refresh()
        notifyDataChanged()
      }
    })
  }

  const moveListedNote = (note: NoteSummary): void => {
    setForm({
      title: 'Переместить заметку',
      initial: { groupId: note.groupId },
      fields: [choiceField('groupId', 'Группа', groupChoices)],
      save: (values) => {
        const input = notesValidation.moveNoteInputSchema.parse({
          id: note.id,
          groupId: values.groupId
        })
        api.moveNote(input.id, input.groupId)
        overview.refresh()
        notifyDataChanged()
      }
    })
  }

  const deleteListedNote = (note: NoteSummary): void => {
    void confirm({
      title: 'Удалить заметку?',
      description: 'Заметка и её локальные данные будут удалены без возможности восстановления.',
      tone: 'danger',
      onConfirm: () => {
        api.deleteNote(note.id)
        overview.refresh()
        notifyDataChanged()
        toast.success('Заметка удалена')
      }
    })
  }

  const deleteCurrentNote = (): void => {
    if (!record) return
    const id = record.id
    void confirm({
      title: 'Удалить заметку?',
      description: 'Заметка и её локальные данные будут удалены.',
      tone: 'danger',
      onConfirm: async () => {
        setClosing(true)
        try {
          queueRef.current?.discardPending()
          appendQueueRef.current?.discardPending()
          await api.deleteNote(id)
          queueRef.current = null
          appendQueueRef.current = null
          setRecord(null)
          setDocument(null)
          setAppendBlock(null)
          setEditorError('')
          notifyDataChanged()
          overview.refresh()
          toast.success('Заметка удалена')
        } finally {
          setClosing(false)
        }
      }
    })
  }

  if (record && document) {
    const textOnly = isTextOnlyNote(document)
    const appendMode = editorMode === 'edit' && !textOnly
    const visibleDocument = appendMode
      ? withoutNoteBlock(document, appendBlock?.id ?? null)
      : document

    return (
      <View style={{ flex: 1 }}>
        {editorError ? <ErrorState message={editorError} retry={() => void flush()} /> : null}
        <DocumentEditor
          document={visibleDocument}
          onChange={changeDocument}
          createId={randomUUID}
          presentation="notes-clean"
          mode={appendMode ? 'read' : editorMode}
          allowedBlockTypes={['text']}
          readFooter={
            appendMode && appendBlock ? (
              <MobileNoteAppendEditor block={appendBlock} update={changeAppendBlock} />
            ) : null
          }
          openAsset={documentAssets.openAsset}
          resolveAssetUri={documentAssets.resolveAssetUri}
          onAssetError={(reason) => setEditorError(messageFor(reason))}
          header={
            <View
              style={{
                minHeight: 58,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingBottom: 8
              }}
            >
              <IconButton
                label={closing ? 'Сохранение…' : 'Назад'}
                icon="back"
                compact
                ghost
                disabled={closing}
                onPress={() => void closeEditor()}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                {editorMode === 'edit' && !appendMode ? (
                  <TextInput
                    accessibilityLabel="Название заметки"
                    value={record.title}
                    onChangeText={(title) =>
                      setRecord((current) => (current ? { ...current, title } : current))
                    }
                    onEndEditing={() => {
                      try {
                        const input = notesValidation.renameNoteInputSchema.parse({
                          id: record.id,
                          title: record.title
                        })
                        const renamed = api.renameNote(input.id, input.title)
                        setRecord((current) => (current ? { ...current, ...renamed } : current))
                        overview.refresh()
                      } catch (reason) {
                        setEditorError(messageFor(reason))
                      }
                    }}
                    style={{
                      minHeight: 34,
                      color: theme.text,
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                      fontSize: 20,
                      lineHeight: 25,
                      fontWeight: '700'
                    }}
                  />
                ) : (
                  <Text
                    numberOfLines={2}
                    style={{
                      color: theme.text,
                      paddingHorizontal: 4,
                      fontSize: 20,
                      lineHeight: 25,
                      fontWeight: '700'
                    }}
                  >
                    {record.title}
                  </Text>
                )}
                <Text
                  style={{
                    marginTop: 1,
                    paddingHorizontal: 4,
                    color:
                      saveState === 'error'
                        ? theme.error
                        : saveState === 'dirty'
                          ? '#f59e0b'
                          : saveState === 'saved'
                            ? '#22c55e'
                            : theme.accent,
                    fontSize: 10.5,
                    fontWeight: '600'
                  }}
                >
                  {noteSaveLabel(saveState)}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  padding: 3,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 12,
                  backgroundColor: theme.surface
                }}
              >
                <IconButton
                  label="Режим чтения"
                  icon="notes"
                  compact
                  ghost
                  selected={editorMode === 'read'}
                  disabled={modeChanging || closing}
                  onPress={() => changeEditorMode('read')}
                />
                <IconButton
                  label="Режим редактирования"
                  icon="edit"
                  compact
                  ghost
                  selected={editorMode === 'edit'}
                  disabled={modeChanging || closing}
                  onPress={() => changeEditorMode('edit')}
                />
              </View>
              <ActionMenu
                disabled={closing}
                title="Заметка"
                items={[
                  {
                    label: 'Свойства заметки',
                    icon: 'edit',
                    onPress: () => editNoteProperties(record)
                  },
                  {
                    label: 'Удалить заметку',
                    icon: 'delete',
                    danger: true,
                    onPress: deleteCurrentNote
                  }
                ]}
              />
            </View>
          }
        />
        {form && <FormSheet spec={form} close={() => setForm(null)} />}
      </View>
    )
  }

  const allNotes = overview.data?.notes ?? []
  const allGroups = overview.data?.groups ?? []
  const notesByRecency = sortNotes(allNotes, 'updated')
  const selectedGroup = selectedGroupId
    ? (allGroups.find((group) => group.id === selectedGroupId) ?? null)
    : null
  const searchedNotes = notesByRecency.filter((note) => noteMatches(note, query))
  const sortedNotes = sortNotes(searchedNotes, sort)
  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')
  const visibleGroups = allGroups.filter((group) => {
    const groupNotes = allNotes.filter((note) => note.groupId === group.id)
    if (hideEmptyGroups && groupNotes.length === 0) return false
    if (!normalizedQuery) return true
    if (group.title.toLocaleLowerCase('ru-RU').includes(normalizedQuery)) return true
    return groupNotes.some((note) => noteMatches(note, query))
  })
  const visibleNotes =
    view === 'recent'
      ? searchedNotes
      : view === 'ungrouped'
        ? sortedNotes.filter((note) => note.groupId === null)
        : view === 'groups' && selectedGroup
          ? sortedNotes.filter((note) => note.groupId === selectedGroup.id)
          : sortedNotes

  const createActions = [
    {
      key: 'group',
      label: 'Новая группа',
      description: 'Создать новую группу заметок',
      icon: 'folder' as const,
      onPress: () => editGroup()
    },
    {
      key: 'note',
      label: selectedGroup ? `Новая заметка · ${selectedGroup.title}` : 'Новая заметка',
      description: selectedGroup
        ? 'Заметка сразу появится в этой группе'
        : 'Создать заметку без группы',
      icon: 'notes' as const,
      onPress: () => createNote(selectedGroup?.id ?? null)
    }
  ]

  const changeView = (next: NotesView): void => {
    if (next === view) return
    if (next === 'groups') setSelectedGroupId(null)
    if (next === 'recent') setSort('updated')
    setView(next)
    toast.info(NOTES_VIEWS.find((item) => item.id === next)?.label ?? 'Заметки', 'notes-view')
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 10, marginBottom: 10 }}>
        {view === 'groups' && selectedGroup ? (
          <View
            style={{
              minHeight: 54,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              paddingHorizontal: 7,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 15,
              backgroundColor: theme.surface
            }}
          >
            <IconButton
              label="Назад к группам"
              icon="back"
              compact
              ghost
              onPress={() => setSelectedGroupId(null)}
            />
            <VisualIconBadge value={selectedGroup.icon ?? 'folder'} size={34} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{ color: theme.text, fontSize: 13.5, fontWeight: '700' }}
              >
                {selectedGroup.title}
              </Text>
              <Text style={{ marginTop: 1, color: theme.muted, fontSize: 10.5 }}>
                {allNotes.filter((note) => note.groupId === selectedGroup.id).length} заметок
              </Text>
            </View>
            <ActionMenu
              title={selectedGroup.title}
              items={[
                {
                  label: 'Новая заметка',
                  icon: 'add',
                  onPress: () => createNote(selectedGroup.id)
                },
                {
                  label: 'Изменить группу',
                  icon: 'edit',
                  onPress: () => editGroup(selectedGroup)
                },
                {
                  label: 'Удалить группу',
                  icon: 'delete',
                  danger: true,
                  onPress: () => deleteGroup(selectedGroup)
                }
              ]}
            />
          </View>
        ) : (
          <NotesTabBar value={view} onChange={changeView} />
        )}

        <SearchField value={query} onChangeText={setQuery} />

        {view === 'groups' && !selectedGroup ? (
          <View
            style={{
              minHeight: 38,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}
          >
            <Text style={{ color: theme.muted, fontSize: 11.5 }}>
              {visibleGroups.length} из {allGroups.length} групп
            </Text>
            <NotesControl
              label="Скрыть пустые"
              icon={CircleSlash2}
              active={hideEmptyGroups}
              onPress={() => setHideEmptyGroups((current) => !current)}
            />
          </View>
        ) : (
          <View
            style={{
              minHeight: 38,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}
          >
            <Text numberOfLines={1} style={{ flex: 1, color: theme.muted, fontSize: 11.5 }}>
              {visibleNotes.length} заметок
              {view === 'all' && allGroups.length ? ` · ${allGroups.length} групп` : ''}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {view !== 'recent' ? (
                <NotesControl
                  label={sort === 'updated' ? 'Недавние' : 'А–Я'}
                  icon={sort === 'updated' ? Clock3 : ArrowDownAZ}
                  active
                  onPress={() =>
                    setSort((current) => (current === 'updated' ? 'title' : 'updated'))
                  }
                />
              ) : null}
              <NotesControl
                label={layout === 'list' ? 'Список' : 'Сетка'}
                icon={layout === 'list' ? List : Grid2X2}
                iconOnly
                active
                onPress={() => setLayout((current) => (current === 'list' ? 'grid' : 'list'))}
              />
            </View>
          </View>
        )}
      </View>

      {overview.error ? <ErrorState message={overview.error} retry={overview.refresh} /> : null}
      {editorError ? <ErrorState message={editorError} /> : null}
      <SwipeableTabContent
        tabs={NOTES_VIEW_TABS}
        value={view}
        onChange={changeView}
        disabled={Boolean(selectedGroup)}
      >
        {overview.loading ? (
          <LoadingState />
        ) : view === 'groups' && !selectedGroup ? (
          <FlatList
          data={visibleGroups}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 96 }}
          ListEmptyComponent={
            <EmptyState
              text={query.trim() ? 'По этому запросу группы не найдены.' : 'Групп пока нет.'}
            />
          }
          renderItem={({ item }) => (
            <WorkspaceNodeCard
              title={item.title}
              subtitle={`${allNotes.filter((note) => note.groupId === item.id).length} заметок`}
              leading={<VisualIconBadge value={item.icon ?? 'folder'} />}
              onPress={() => setSelectedGroupId(item.id)}
              action={
                <ActionMenu
                  title={item.title}
                  items={[
                    {
                      label: 'Новая заметка',
                      icon: 'add',
                      onPress: () => createNote(item.id)
                    },
                    {
                      label: 'Изменить группу',
                      icon: 'edit',
                      onPress: () => editGroup(item)
                    },
                    {
                      label: 'Удалить группу',
                      icon: 'delete',
                      danger: true,
                      onPress: () => deleteGroup(item)
                    }
                  ]}
                />
              }
            />
          )}
        />
      ) : (
        <FlatList
          key={`notes-${layout}`}
          data={visibleNotes}
          keyExtractor={(item) => item.id}
          numColumns={layout === 'grid' ? 2 : 1}
          columnWrapperStyle={layout === 'grid' ? { gap: 8 } : undefined}
          showsVerticalScrollIndicator={false}
          refreshing={overview.loading}
          onRefresh={overview.refresh}
          contentContainerStyle={{ paddingBottom: 96 }}
          ListEmptyComponent={
            <EmptyState
              text={
                query.trim()
                  ? 'По этому запросу заметки не найдены.'
                  : view === 'ungrouped'
                    ? 'Все заметки уже распределены по группам.'
                    : selectedGroup
                      ? 'В этой группе пока нет заметок.'
                      : view === 'recent'
                        ? 'Недавних заметок пока нет.'
                        : 'Заметок пока нет.'
              }
            />
          }
          renderItem={({ item }) => {
            const noteGroup = allGroups.find((group) => group.id === item.groupId)
            return (
              <View style={layout === 'grid' ? { flex: 1, maxWidth: '50%' } : undefined}>
                <MobileNoteCard
                  note={item}
                  groupTitle={noteGroup?.title}
                  layout={layout}
                  onOpen={() => openNote(item.id)}
                  onRename={() => renameListedNote(item)}
                  onMove={() => moveListedNote(item)}
                  onDelete={() => deleteListedNote(item)}
                />
              </View>
            )
            }}
          />
        )}
      </SwipeableTabContent>

      <MobileCreateAction actions={createActions} iconOnly />
      {form && <FormSheet spec={form} close={() => setForm(null)} />}
    </View>
  )
}
