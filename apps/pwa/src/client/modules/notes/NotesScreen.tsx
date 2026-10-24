import { subscribePageHidden } from '../../../ui/lifecycle'
import { Action, blurActiveElement, subscribeBack, RefreshRegion } from '../../../ui/browser'
import {
  ArrowDownAZ,
  BookOpen,
  Pencil,
  CircleSlash2,
  Clock3,
  Folder,
  Grid2X2,
  List,
  StickyNote,
  type LucideIcon
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { NoteDocument, NoteGroup, NoteRecord, NoteSummary } from '@mymind/contracts/notes'
import { AutosaveQueue } from '@mymind/core/autosave'
import * as notesValidation from '@mymind/core/validation/notes'
import { useServices } from '../../app/context'
import { notifyDataChanged } from '../../app/changes'
import { useCollection } from '../../shared/hooks/useCollection'
import type { NotesRichTextDomRef } from '../../shared/ui/NotesRichTextDom'
import { FormSheet } from '../../shared/ui/FormSheet'
import { ActionMenu, ActionMenuDialog } from '../../shared/ui/ActionMenu'
import { useConfirmation } from '../../shared/ui/confirmation-context'
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
import { EmptyState, ErrorState, IconButton, LoadingState } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { SwipeableTabContent } from '../../shared/ui/SwipeableTabContent'
import { SearchableHeaderRow, SwipeTabBar } from '../../shared/ui/SwipeTabBar'
import { useSwipeTabFeedback, type SwipeTabFeedback } from '../../shared/ui/useSwipeTabFeedback'
import { MobileNoteCanvas, type MobileNoteMode } from './MobileNoteCanvas'
type NoteEditorMode = MobileNoteMode
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
  onChange,
  feedback,
  query,
  onQueryChange,
  onSearchOpenChange
}: {
  value: NotesView
  onChange(value: NotesView): void
  feedback: SwipeTabFeedback<NotesView> | null
  query: string
  onQueryChange(value: string): void
  onSearchOpenChange(open: boolean): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <SwipeTabBar
      items={NOTES_VIEWS}
      value={value}
      onChange={onChange}
      feedback={feedback}
      search={{ value: query, onValueChange: onQueryChange }}
      onSearchOpenChange={onSearchOpenChange}
      renderIcon={(item, selected) => {
        const Icon = item.icon
        return (
          <Icon
            size={18}
            strokeWidth={selected ? 2.4 : 2}
            color={selected ? theme.accent : theme.muted}
          />
        )
      }}
    />
  )
}
function NotesControl({
  label,
  icon: Icon,
  active = false,
  iconOnly = false,
  onClick
}: {
  label: string
  icon: LucideIcon
  active?: boolean
  iconOnly?: boolean
  onClick(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Action
      role={'button'}
      aria-label={label}
      aria-selected={active}
      onClick={onClick}
      style={{
        minWidth: iconOnly ? 38 : undefined,
        height: 38,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: iconOnly ? 0 : 6,
        paddingInline: iconOnly ? 0 : 10,
        borderWidth: 1,
        borderColor: active ? theme.accent + '55' : theme.border,
        borderRadius: 11,
        backgroundColor: active ? theme.accent + '10' : theme.surface,
        opacity: 1
      }}
      pressedStyle={{
        backgroundColor: active ? theme.accent + '10' : theme.raised,
        opacity: 0.72
      }}
    >
      <Icon size={15} color={active ? theme.accent : theme.muted} />
      {!iconOnly ? (
        <span
          className="ui-text"
          style={{
            color: active ? theme.accent : theme.text,
            fontSize: 11.5,
            fontWeight: 700
          }}
        >
          {label}
        </span>
      ) : null}
    </Action>
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
  const [actionsOpen, setActionsOpen] = useState(false)
  const suppressOpenUntil = useRef(0)
  const subtitle = note.plainText.trim()
  const date = new Date(note.updatedAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short'
  })
  const actions = [
    { label: 'Переименовать', icon: 'edit' as const, onClick: onRename },
    { label: 'Переместить', icon: 'move' as const, onClick: onMove },
    {
      label: 'Удалить заметку',
      icon: 'delete' as const,
      danger: true,
      onClick: onDelete
    }
  ]
  const meta = [groupTitle, date].filter(Boolean).join(' · ')
  if (layout === 'list') {
    return (
      <div
        className="ui-stack"
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
        <Action
          role={'button'}
          aria-label={note.title}
          title={'Удерживайте для действий с заметкой'}
          onClick={() => {
            if (Date.now() < suppressOpenUntil.current) return
            onOpen()
          }}
          onHold={() => {
            suppressOpenUntil.current = Date.now() + 900
            setActionsOpen(true)
          }}
          holdDelay={380}
          style={{
            minWidth: 0,
            flex: '1 1 0%',
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 11,
            paddingLeft: 12,
            paddingRight: 12,
            paddingBlock: 12,
            backgroundColor: 'transparent'
          }}
          pressedStyle={{
            backgroundColor: theme.raised
          }}
        >
          <VisualIconBadge value="notes" size={36} />
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
                fontSize: 14,
                lineHeight: '19px',
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1
              }}
            >
              {note.title}
            </span>
            {subtitle ? (
              <span
                className="ui-text"
                data-lines={2}
                style={{
                  marginTop: 3,
                  color: theme.muted,
                  fontSize: 11.5,
                  lineHeight: '16px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 2
                }}
              >
                {subtitle}
              </span>
            ) : null}
            <span
              className="ui-text"
              data-lines={1}
              style={{
                marginTop: subtitle ? 6 : 4,
                color: theme.muted,
                fontSize: 10,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1
              }}
            >
              {meta || 'Без группы'}
            </span>
          </div>
        </Action>
        <ActionMenuDialog
          open={actionsOpen}
          onOpenChange={setActionsOpen}
          title={note.title}
          items={actions}
        />
      </div>
    )
  }
  return (
    <div
      className="ui-stack"
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
      <Action
        role={'button'}
        aria-label={note.title}
        title={'Удерживайте для действий с заметкой'}
        onClick={onOpen}
        onHold={() => setActionsOpen(true)}
        holdDelay={380}
        style={{
          minHeight: 150,
          flex: '1 1 0%',
          gap: 8,
          padding: 12,
          backgroundColor: 'transparent'
        }}
        pressedStyle={{
          backgroundColor: theme.raised
        }}
      >
        <VisualIconBadge value="notes" size={34} />
        <span
          className="ui-text"
          data-lines={2}
          style={{
            color: theme.text,
            fontSize: 13.5,
            lineHeight: '18px',
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2
          }}
        >
          {note.title}
        </span>
        {subtitle ? (
          <span
            className="ui-text"
            data-lines={3}
            style={{
              color: theme.muted,
              fontSize: 11,
              lineHeight: '15px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 3
            }}
          >
            {subtitle}
          </span>
        ) : (
          <span
            className="ui-text"
            style={{
              color: theme.muted,
              fontSize: 11
            }}
          >
            Пустая заметка
          </span>
        )}
        <span
          className="ui-text"
          data-lines={1}
          style={{
            marginTop: 'auto',
            color: theme.muted,
            fontSize: 9.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 1
          }}
        >
          {meta || 'Без группы'}
        </span>
      </Action>
      <ActionMenuDialog
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        title={note.title}
        items={actions}
      />
    </div>
  )
}
function noteMatches(note: NoteSummary, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return true
  return `${note.title} ${note.plainText}`.toLocaleLowerCase().includes(normalized)
}
export function NotesScreen({
  onImmersiveChange,
  onDraftChange,
  resourceId,
  onResourceHandled
}: {
  onImmersiveChange?: (immersive: boolean) => void
  onDraftChange?: (
    draft: {
      flush(): Promise<void>
      hasUnsavedChanges(): boolean
    } | null
  ) => void
  resourceId?: string | null
  onResourceHandled?: () => void
}): React.JSX.Element {
  const { notes: api } = useServices()
  const theme = useTheme()
  const isPwa = true
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
  const [layout, setLayout] = useState<NotesLayout>('list')
  const [sort, setSort] = useState<NotesSort>('updated')
  const [hideEmptyGroups, setHideEmptyGroups] = useState(false)
  const [swipeTabFeedback, showSwipeTabFeedback] = useSwipeTabFeedback<NotesView>()
  const [searchOpen, setSearchOpen] = useState(false)
  const queueRef = useRef<AutosaveQueue<NoteDocument> | null>(null)
  const editorRef = useRef<NotesRichTextDomRef | null>(null)
  const activeNoteRef = useRef<string | null>(null)
  const latestDocumentRef = useRef<NoteDocument | null>(null)
  const registerEditor = useCallback((editor: NotesRichTextDomRef | null) => {
    editorRef.current = editor
  }, [])
  const openNote = useCallback(
    (id: string): void => {
      try {
        const next = api.getNote(id)
        activeNoteRef.current = id
        latestDocumentRef.current = next.document
        setRecord(next)
        setDocument(next.document)
        setEditorError('')
        setEditorMode('edit')
        setSaveState('saved')
        queueRef.current = new AutosaveQueue<NoteDocument>(
          async (value) => {
            setSaveState('saving')
            try {
              const saved = await api.saveNote({ id, document: value })
              if (activeNoteRef.current === id) {
                setRecord((current) =>
                  current?.id === id
                    ? {
                        ...saved,
                        title: current.title,
                        document: latestDocumentRef.current ?? saved.document
                      }
                    : current
                )
                setSaveState(latestDocumentRef.current === value ? 'saved' : 'dirty')
              }
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
  useEffect(() => {
    if (!resourceId) return
    let active = true
    queueMicrotask(() => {
      if (active) {
        openNote(resourceId)
        onResourceHandled?.()
      }
    })
    return () => {
      active = false
    }
  }, [resourceId, openNote, onResourceHandled])
  const flush = useCallback(async (): Promise<void> => {
    const documentQueue = queueRef.current
    if (!documentQueue) return
    try {
      // Flush both the current editor transaction and pending document writes before leaving.
      await Promise.all([documentQueue.flush(), editorRef.current?.flushEditor()])
      if (documentQueue.hasPendingChanges()) setSaveState('saving')
      await documentQueue.flush()
      setSaveState('saved')
      setEditorError('')
    } catch (reason) {
      setSaveState('error')
      throw reason
    }
  }, [])
  const closeEditor = useCallback(async (): Promise<void> => {
    if (closing) return
    blurActiveElement()
    setClosing(true)
    try {
      await flush()
      queueRef.current = null
      activeNoteRef.current = null
      editorRef.current = null
      latestDocumentRef.current = null
      setRecord(null)
      setDocument(null)
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
    const subscription = subscribeBack(() => {
      void closeEditor()
      return true
    })
    return () => subscription.remove()
  }, [closeEditor, record])
  const editorOpen = record !== null
  useEffect(() => {
    onDraftChange?.(
      editorOpen
        ? { flush, hasUnsavedChanges: () => queueRef.current?.hasPendingChanges() ?? false }
        : null
    )
    return () => onDraftChange?.(null)
  }, [editorOpen, flush, onDraftChange])
  useEffect(() => {
    onImmersiveChange?.(editorOpen)
    return () => {
      if (editorOpen) onImmersiveChange?.(false)
    }
  }, [editorOpen, onImmersiveChange])
  useEffect(() => {
    if (!record) return
    const subscription = subscribePageHidden(() => {
      void flush().catch((reason) => setEditorError(messageFor(reason)))
    })
    return () => subscription.remove()
  }, [flush, record])
  const changeDocument = (
    next: NoteDocument,
    options?: {
      saveImmediately?: boolean
    }
  ): void => {
    latestDocumentRef.current = next
    setDocument(next)
    setEditorError('')
    setSaveState('dirty')
    const queue = queueRef.current
    queue?.schedule(next)
    if (options?.saveImmediately)
      void queue?.flush().catch((reason) => {
        setSaveState('error')
        setEditorError(messageFor(reason))
      })
  }
  const changeEditorMode = (nextMode: NoteEditorMode): void => {
    if (nextMode === editorMode || modeChanging || !document) return
    blurActiveElement()
    setModeChanging(true)
    void flush()
      .then(() => setEditorMode(nextMode))
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
        const renamed = api.renameNote(input.id, input.title)
        setRecord((current) =>
          current?.id === input.id ? { ...current, title: renamed.title } : current
        )
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
      onConfirm: async () => {
        await api.deleteNote(note.id)
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
          await api.deleteNote(id)
          queueRef.current = null
          activeNoteRef.current = null
          editorRef.current = null
          latestDocumentRef.current = null
          setRecord(null)
          setDocument(null)
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
    return (
      <div
        className="ui-stack"
        style={{
          flex: '1 1 0%',
          backgroundColor: theme.background
        }}
      >
        <div
          className="ui-stack"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 64,
            paddingInline: 6,
            gap: 4,
            borderBottomWidth: 1,
            borderColor: theme.border
          }}
        >
          <IconButton
            label={closing ? 'Сохранение…' : 'Назад'}
            icon="back"
            ghost
            disabled={closing || modeChanging}
            onClick={() => void closeEditor()}
          />
          <Action
            role={'button'}
            aria-label={'Переименовать заметку'}
            title={`Статус сохранения: ${noteSaveLabel(saveState)}`}
            onClick={() => renameListedNote(record)}
            style={{
              flex: '1 1 0%',
              minWidth: 0,
              minHeight: 48,
              justifyContent: 'center'
            }}
          >
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span
                className="ui-text"
                data-lines={1}
                style={{
                  color: theme.text,
                  fontSize: 17,
                  fontWeight: 700,
                  flexShrink: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 1
                }}
              >
                {record.title}
              </span>
              {isPwa ? (
                <div
                  className="ui-stack"
                  data-testid={'note-save-indicator'}
                  aria-label={`Статус сохранения: ${noteSaveLabel(saveState)}`}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor:
                      saveState === 'error'
                        ? theme.error
                        : saveState === 'saved'
                          ? '#16B58B'
                          : '#F3BF43'
                  }}
                ></div>
              ) : null}
            </div>
            {null}
          </Action>
          {editorMode !== 'view' ? (
            <Action
              role={'button'}
              aria-label={
                editorMode === 'read' ? 'Перейти в режим редактирования' : 'Перейти в режим чтения'
              }
              aria-disabled={closing || modeChanging}
              disabled={closing || modeChanging}
              onClick={() => changeEditorMode(editorMode === 'read' ? 'edit' : 'read')}
              style={{
                width: 42,
                height: 42,
                flexShrink: 0,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 11,
                borderWidth: 1,
                borderColor: '#16B58B',
                backgroundColor: '#16B58B14',
                opacity: closing || modeChanging ? 0.5 : 1
              }}
              pressedStyle={{
                backgroundColor: '#16B58B30'
              }}
            >
              {editorMode === 'read' ? (
                <Pencil size={19} color="#16B58B" />
              ) : (
                <BookOpen size={19} color="#16B58B" />
              )}
            </Action>
          ) : null}
          <ActionMenu
            disabled={closing || modeChanging}
            title="Заметка"
            items={[
              {
                label: 'Вид заметки',
                icon: 'settings',
                onClick: () => changeEditorMode('view')
              },
              {
                label: 'Свойства заметки',
                icon: 'edit',
                onClick: () => editNoteProperties(record)
              },
              { label: 'Удалить заметку', icon: 'delete', danger: true, onClick: deleteCurrentNote }
            ]}
          />
        </div>
        {editorError ? (
          <ErrorState
            message={editorError}
            retry={() => void flush().catch((reason) => setEditorError(messageFor(reason)))}
          />
        ) : null}
        <MobileNoteCanvas
          key={record.id}
          noteId={record.id}
          document={document}
          mode={editorMode}
          disabled={closing || modeChanging}
          onChange={changeDocument}
          onModeChange={changeEditorMode}
          registerEditor={registerEditor}
          onError={(reason) => setEditorError(messageFor(reason))}
        />
        {form && <FormSheet spec={form} close={() => setForm(null)} />}
      </div>
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
      onClick: () => editGroup()
    },
    {
      key: 'note',
      label: selectedGroup ? `Новая заметка · ${selectedGroup.title}` : 'Новая заметка',
      description: selectedGroup
        ? 'Заметка сразу появится в этой группе'
        : 'Создать заметку без группы',
      icon: 'notes' as const,
      onClick: () => createNote(selectedGroup?.id ?? null)
    }
  ]
  const changeView = (next: NotesView): void => {
    if (next === view) return
    if (next === 'groups') setSelectedGroupId(null)
    if (next === 'recent') setSort('updated')
    setView(next)
  }
  return (
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%'
      }}
    >
      <div
        className="ui-stack"
        style={{
          gap: 10,
          marginBottom: 10
        }}
      >
        {view === 'groups' && selectedGroup ? (
          <SearchableHeaderRow search={{ value: query, onValueChange: setQuery }}>
            <IconButton
              label="Назад к группам"
              icon="back"
              compact
              ghost
              onClick={() => setSelectedGroupId(null)}
            />
            <VisualIconBadge value={selectedGroup.icon ?? 'folder'} size={34} />
            <div
              className="ui-stack"
              style={{
                flex: '1 1 0%',
                minWidth: 0
              }}
            >
              <span
                className="ui-text"
                data-lines={1}
                style={{
                  color: theme.text,
                  fontSize: 13.5,
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 1
                }}
              >
                {selectedGroup.title}
              </span>
              <span
                className="ui-text"
                style={{
                  marginTop: 1,
                  color: theme.muted,
                  fontSize: 10.5
                }}
              >
                {allNotes.filter((note) => note.groupId === selectedGroup.id).length} заметок
              </span>
            </div>
            <ActionMenu
              title={selectedGroup.title}
              items={[
                {
                  label: 'Новая заметка',
                  icon: 'add',
                  onClick: () => createNote(selectedGroup.id)
                },
                {
                  label: 'Изменить группу',
                  icon: 'edit',
                  onClick: () => editGroup(selectedGroup)
                },
                {
                  label: 'Удалить группу',
                  icon: 'delete',
                  danger: true,
                  onClick: () => deleteGroup(selectedGroup)
                }
              ]}
            />
          </SearchableHeaderRow>
        ) : (
          <NotesTabBar
            value={view}
            onChange={changeView}
            feedback={swipeTabFeedback}
            query={query}
            onQueryChange={setQuery}
            onSearchOpenChange={setSearchOpen}
          />
        )}

        {view === 'groups' && !selectedGroup ? (
          <div
            className="ui-stack"
            style={{
              minHeight: 38,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}
          >
            <span
              className="ui-text"
              style={{
                color: theme.muted,
                fontSize: 11.5
              }}
            >
              {visibleGroups.length} из {allGroups.length} групп
            </span>
            <NotesControl
              label="Скрыть пустые"
              icon={CircleSlash2}
              active={hideEmptyGroups}
              onClick={() => setHideEmptyGroups((current) => !current)}
            />
          </div>
        ) : (
          <div
            className="ui-stack"
            style={{
              minHeight: 38,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}
          >
            <span
              className="ui-text"
              data-lines={1}
              style={{
                flex: '1 1 0%',
                color: theme.muted,
                fontSize: 11.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1
              }}
            >
              {visibleNotes.length} заметок
              {view === 'all' && allGroups.length ? ` · ${allGroups.length} групп` : ''}
            </span>
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                gap: 6
              }}
            >
              {view !== 'recent' ? (
                <NotesControl
                  label={sort === 'updated' ? 'Недавние' : 'А–Я'}
                  icon={sort === 'updated' ? Clock3 : ArrowDownAZ}
                  active
                  onClick={() =>
                    setSort((current) => (current === 'updated' ? 'title' : 'updated'))
                  }
                />
              ) : null}
              <NotesControl
                label={layout === 'list' ? 'Список' : 'Сетка'}
                icon={layout === 'list' ? List : Grid2X2}
                iconOnly
                active
                onClick={() => setLayout((current) => (current === 'list' ? 'grid' : 'list'))}
              />
            </div>
          </div>
        )}
      </div>

      {overview.error ? <ErrorState message={overview.error} retry={overview.refresh} /> : null}
      {editorError ? <ErrorState message={editorError} /> : null}
      <SwipeableTabContent
        tabs={NOTES_VIEW_TABS}
        value={view}
        onChange={changeView}
        onSwipeChange={showSwipeTabFeedback}
        disabled={Boolean(selectedGroup) || searchOpen}
      >
        {overview.loading ? (
          <LoadingState />
        ) : view === 'groups' && !selectedGroup ? (
          <div className="ui-scroll">
            <div
              className="ui-stack ui-scroll-content"
              style={{
                paddingBottom: 96
              }}
            >
              <div className="ui-stack ui-list" style={{}}>
                {visibleGroups.length > 0 ? (
                  visibleGroups.map((item) => (
                    <div className="ui-stack ui-list-item" key={((item) => item.id)(item)}>
                      {
                        <WorkspaceNodeCard
                          title={item.title}
                          subtitle={`${allNotes.filter((note) => note.groupId === item.id).length} заметок`}
                          leading={<VisualIconBadge value={item.icon ?? 'folder'} />}
                          onClick={() => setSelectedGroupId(item.id)}
                          action={
                            <ActionMenu
                              title={item.title}
                              items={[
                                {
                                  label: 'Новая заметка',
                                  icon: 'add',
                                  onClick: () => createNote(item.id)
                                },
                                {
                                  label: 'Изменить группу',
                                  icon: 'edit',
                                  onClick: () => editGroup(item)
                                },
                                {
                                  label: 'Удалить группу',
                                  icon: 'delete',
                                  danger: true,
                                  onClick: () => deleteGroup(item)
                                }
                              ]}
                            />
                          }
                        />
                      }
                    </div>
                  ))
                ) : (
                  <EmptyState
                    text={query.trim() ? 'По этому запросу группы не найдены.' : 'Групп пока нет.'}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <RefreshRegion
            className="ui-scroll"
            key={`notes-${layout}`}
            onRefresh={overview.refresh}
            busy={overview.loading}
          >
            <div
              className="ui-stack ui-scroll-content"
              style={{
                paddingBottom: 96
              }}
            >
              <div
                className="ui-stack ui-list"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${layout === 'grid' ? 2 : 1}, minmax(0, 1fr))`,
                  ...(layout === 'grid'
                    ? {
                        gap: 8
                      }
                    : undefined)
                }}
              >
                {visibleNotes.length > 0 ? (
                  visibleNotes.map((item) => {
                    const noteGroup = allGroups.find((group) => group.id === item.groupId)
                    return (
                      <div className="ui-stack ui-list-item" key={((item) => item.id)(item)}>
                        {
                          <div
                            className="ui-stack"
                            style={
                              layout === 'grid'
                                ? {
                                    flex: '1 1 0%'
                                  }
                                : undefined
                            }
                          >
                            <MobileNoteCard
                              note={item}
                              groupTitle={noteGroup?.title}
                              layout={layout}
                              onOpen={() => openNote(item.id)}
                              onRename={() => renameListedNote(item)}
                              onMove={() => moveListedNote(item)}
                              onDelete={() => deleteListedNote(item)}
                            />
                          </div>
                        }
                      </div>
                    )
                  })
                ) : (
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
                )}
              </div>
            </div>
          </RefreshRegion>
        )}
      </SwipeableTabContent>

      <MobileCreateAction actions={createActions} iconOnly />
      {form && <FormSheet spec={form} close={() => setForm(null)} />}
    </div>
  )
}
