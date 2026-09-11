import { randomUUID } from 'expo-crypto'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, BackHandler, FlatList, ScrollView, TextInput, View } from 'react-native'
import type { NoteDocument, NoteGroup, NoteRecord, NoteSummary } from '@mymind/contracts/notes'
import type { StudyBoardBlock } from '@mymind/contracts/study'
import { AutosaveQueue } from '@mymind/core/autosave'
import * as notesValidation from '@mymind/core/validation/notes'
import { useServices } from '../../app/context'
import { notifyDataChanged } from '../../app/changes'
import { useCollection } from '../../shared/hooks/useCollection'
import { DocumentEditor } from '../../shared/ui/DocumentEditor'
import { FormSheet } from '../../shared/ui/FormSheet'
import { ActionMenu } from '../../shared/ui/ActionMenu'
import { useConfirmation } from '../../shared/ui/ConfirmationProvider'
import { useToast } from '../../shared/ui/ToastProvider'
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
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Label,
  LoadingState,
  Row,
  SearchField
} from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'

function noteMatches(note: NoteSummary, query: string): boolean {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return true
  return `${note.title} ${note.plainText}`.toLocaleLowerCase().includes(normalized)
}

export function NotesScreen({
  onOpenBoard
}: {
  onOpenBoard?: (boardId: string) => void
}): React.JSX.Element {
  const { notes: api, boards, documentAssets } = useServices()
  const theme = useTheme()
  const confirm = useConfirmation()
  const toast = useToast()
  const overview = useCollection(useCallback(() => api.listNotesOverview(), [api]))
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'all' | 'recent' | 'groups' | 'ungrouped'>('all')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [form, setForm] = useState<FormSpec | null>(null)
  const [record, setRecord] = useState<NoteRecord | null>(null)
  const [document, setDocument] = useState<NoteDocument | null>(null)
  const [editorError, setEditorError] = useState('')
  const [closing, setClosing] = useState(false)
  const queueRef = useRef<AutosaveQueue<NoteDocument> | null>(null)

  const openNote = useCallback(
    (id: string): void => {
      try {
        const next = api.getNote(id)
        setRecord(next)
        setDocument(next.document)
        setEditorError('')
        queueRef.current = new AutosaveQueue<NoteDocument>(
          async (value) => {
            const saved = await api.saveNote({ id, document: value })
            setRecord(saved)
            notifyDataChanged()
          },
          {
            delayMs: 350,
            onError: (reason) => setEditorError(messageFor(reason))
          }
        )
      } catch (reason) {
        setEditorError(messageFor(reason))
      }
    },
    [api]
  )

  const flush = useCallback(async (): Promise<void> => {
    const queue = queueRef.current
    if (!queue) return
    await queue.flush()
    setEditorError('')
  }, [])

  const closeEditor = useCallback(async (): Promise<void> => {
    if (closing) return
    setClosing(true)
    try {
      await flush()
      queueRef.current = null
      setRecord(null)
      setDocument(null)
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
    queueRef.current?.schedule(next)
  }

  const openLinkedBoard = useCallback(
    async (block: StudyBoardBlock): Promise<void> => {
      if (!record || !document || !onOpenBoard) {
        throw new Error('Связанную доску сейчас нельзя открыть')
      }
      await flush()
      const board = boards.ensureNoteBoard({ noteId: record.id, blockId: block.id })
      if (block.boardId !== board.id || block.title !== board.title) {
        const nextDocument: NoteDocument = {
          ...document,
          blocks: document.blocks.map((item) =>
            item.id === block.id && item.type === 'board'
              ? { ...item, boardId: board.id, title: board.title }
              : item
          )
        }
        setDocument(nextDocument)
        queueRef.current?.schedule(nextDocument)
        await flush()
      }
      notifyDataChanged()
      onOpenBoard(board.id)
    },
    [boards, document, flush, onOpenBoard, record]
  )

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
      <View style={{ flex: 1 }}>
        {editorError ? <ErrorState message={editorError} retry={() => void flush()} /> : null}
        <DocumentEditor
          document={document}
          onChange={changeDocument}
          createId={randomUUID}
          importAsset={(kind) => documentAssets.importAsset(record.id, kind)}
          openAsset={documentAssets.openAsset}
          resolveAssetUri={documentAssets.resolveAssetUri}
          saveRecordedAudio={(input) => documentAssets.saveRecordedAudio(record.id, input)}
          openBoard={openLinkedBoard}
          onAssetError={(reason) => setEditorError(messageFor(reason))}
          header={
            <View style={{ gap: 12, paddingBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <IconButton
                  label={closing ? 'Сохранение…' : 'Назад'}
                  icon="back"
                  disabled={closing}
                  onPress={() => void closeEditor()}
                />
                <View style={{ flex: 1 }} />
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
                  color: theme.text,
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 12,
                  minHeight: 52,
                  paddingHorizontal: 14,
                  fontSize: 20,
                  fontWeight: '700'
                }}
              />
              <Label muted>Изменения содержимого сохраняются автоматически.</Label>
            </View>
          }
        />
        {form && <FormSheet spec={form} close={() => setForm(null)} />}
      </View>
    )
  }

  const allNotes = [...(overview.data?.notes ?? [])].sort(
    (left, right) => right.updatedAt - left.updatedAt
  )
  const selectedGroup = selectedGroupId
    ? (overview.data?.groups.find((group) => group.id === selectedGroupId) ?? null)
    : null
  const searchedNotes = allNotes.filter((note) => noteMatches(note, query))
  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')
  const visibleGroups = (overview.data?.groups ?? []).filter((group) => {
    if (!normalizedQuery) return true
    if (group.title.toLocaleLowerCase('ru-RU').includes(normalizedQuery)) return true
    return (overview.data?.notes ?? []).some(
      (note) => note.groupId === group.id && noteMatches(note, query)
    )
  })
  const notes =
    view === 'ungrouped'
      ? searchedNotes.filter((note) => note.groupId === null)
      : view === 'groups' && selectedGroup
        ? searchedNotes.filter((note) => note.groupId === selectedGroup.id)
        : searchedNotes
  const visibleNotes = view === 'recent' ? notes.slice(0, 20) : notes

  const createActions =
    view === 'groups' && !selectedGroup
      ? [
          {
            key: 'group',
            label: 'Новая группа',
            description: 'Создать новую группу заметок',
            icon: 'folder' as const,
            onPress: () => editGroup()
          }
        ]
      : [
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

  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 10, marginBottom: 12 }}>
        {view === 'groups' && selectedGroup ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Button
              label="Все группы"
              icon="back"
              compact
              onPress={() => setSelectedGroupId(null)}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Label>{selectedGroup.title}</Label>
            </View>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <Button label="Все" selected={view === 'all'} onPress={() => setView('all')} />
            <Button
              label="Недавние"
              icon="clock"
              selected={view === 'recent'}
              onPress={() => setView('recent')}
            />
            <Button
              label="Группы"
              icon="folder"
              selected={view === 'groups'}
              onPress={() => {
                setSelectedGroupId(null)
                setView('groups')
              }}
            />
            <Button
              label="Без группы"
              selected={view === 'ungrouped'}
              onPress={() => setView('ungrouped')}
            />
          </ScrollView>
        )}

        <SearchField value={query} onChangeText={setQuery} />
      </View>

      {overview.error ? <ErrorState message={overview.error} retry={overview.refresh} /> : null}
      {overview.loading ? (
        <LoadingState />
      ) : view === 'groups' && !selectedGroup ? (
        <FlatList
          data={visibleGroups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 88 }}
          ListEmptyComponent={
            <EmptyState
              text={query.trim() ? 'По этому запросу группы не найдены.' : 'Групп пока нет.'}
            />
          }
          renderItem={({ item }) => (
            <WorkspaceNodeCard
              title={item.title}
              subtitle={
                (overview.data?.notes.filter((note) => note.groupId === item.id).length ?? 0) +
                ' заметок'
              }
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
                      onPress: () => {
                        void confirm({
                          title: 'Удалить группу?',
                          description: 'Заметки сохранятся и перейдут в раздел «Без группы».',
                          tone: 'danger',
                          onConfirm: () => {
                            api.deleteNoteGroup(item.id)
                            if (selectedGroupId === item.id) setSelectedGroupId(null)
                            overview.refresh()
                            notifyDataChanged()
                            toast.success('Группа удалена')
                          }
                        })
                      }
                    }
                  ]}
                />
              }
            />
          )}
        />
      ) : (
        <FlatList
          data={visibleNotes}
          keyExtractor={(item) => item.id}
          refreshing={overview.loading}
          onRefresh={overview.refresh}
          contentContainerStyle={{ paddingBottom: 88 }}
          ListEmptyComponent={
            <EmptyState
              text={
                view === 'ungrouped'
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
            const noteGroup = overview.data?.groups.find((group) => group.id === item.groupId)
            return (
              <WorkspaceNodeCard
                title={item.title}
                subtitle={[
                  item.plainText.slice(0, 160),
                  noteGroup?.title,
                  new Date(item.updatedAt).toLocaleDateString('ru-RU')
                ]
                  .filter(Boolean)
                  .join(' · ')}
                leadingIcon="notes"
                onPress={() => openNote(item.id)}
              />
            )
          }}
        />
      )}

      <MobileCreateAction actions={createActions} />
      {form && <FormSheet spec={form} close={() => setForm(null)} />}
    </View>
  )

}
