import { randomUUID } from 'expo-crypto'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, AppState, BackHandler, FlatList, TextInput, View } from 'react-native'
import type { NoteDocument, NoteGroup, NoteRecord, NoteSummary } from '@mymind/contracts/notes'
import { STUDY_FOLDER_ICON_NAMES } from '@mymind/contracts/study'
import { AutosaveQueue } from '@mymind/core/autosave'
import * as notesValidation from '@mymind/core/validation/notes'
import { useServices } from '../../app/context'
import { notifyDataChanged } from '../../app/changes'
import { useCollection } from '../../shared/hooks/useCollection'
import { DocumentEditor } from '../../shared/ui/DocumentEditor'
import { FormSheet } from '../../shared/ui/FormSheet'
import { choiceField, messageFor, textField, type FormSpec } from '../../shared/ui/form-model'
import {
  Button,
  EmptyState,
  ErrorState,
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

export function NotesScreen(): React.JSX.Element {
  const { notes: api } = useServices()
  const theme = useTheme()
  const overview = useCollection(useCallback(() => api.listNotesOverview(), [api]))
  const [query, setQuery] = useState('')
  const [groupId, setGroupId] = useState<string | null | undefined>(undefined)
  const [groupsView, setGroupsView] = useState(false)
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
        choiceField(
          'icon',
          'Иконка',
          STUDY_FOLDER_ICON_NAMES.map((icon) => ({ value: icon, label: icon }))
        )
      ],
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

  const createNote = (): void => {
    setForm({
      title: 'Новая заметка',
      initial: { title: '', groupId: groupId ?? null },
      fields: [textField('title', 'Название'), choiceField('groupId', 'Группа', groupChoices)],
      save: (values) => {
        const input = notesValidation.createNoteInputSchema.parse({
          title: values.title,
          groupId: values.groupId
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
    Alert.alert('Удалить заметку?', 'Заметка и её локальные данные будут удалены.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          const id = record.id
          setClosing(true)
          void (async () => {
            try {
              queueRef.current?.discardPending()
              await api.deleteNote(id)
              queueRef.current = null
              setRecord(null)
              setDocument(null)
              setEditorError('')
              notifyDataChanged()
              overview.refresh()
            } catch (reason) {
              setEditorError(messageFor(reason))
            } finally {
              setClosing(false)
            }
          })()
        }
      }
    ])
  }

  if (record && document) {
    return (
      <View style={{ flex: 1 }}>
        {editorError ? <ErrorState message={editorError} retry={() => void flush()} /> : null}
        <DocumentEditor
          document={document}
          onChange={changeDocument}
          createId={randomUUID}
          header={
            <View style={{ gap: 12, paddingBottom: 16 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button
                  label={closing ? 'Сохранение…' : 'Назад'}
                  disabled={closing}
                  onPress={() => void closeEditor()}
                />
                <Button
                  label="Свойства"
                  disabled={closing}
                  onPress={() => editNoteProperties(record)}
                />
                <Button label="Удалить" danger disabled={closing} onPress={deleteCurrentNote} />
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

  const notes = (overview.data?.notes ?? []).filter(
    (note) => noteMatches(note, query) && (groupId === undefined || note.groupId === groupId)
  )

  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 10, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            label={groupsView ? 'К заметкам' : 'Группы'}
            onPress={() => setGroupsView((value) => !value)}
          />
          <Button
            label={groupsView ? '+ Группа' : '+ Заметка'}
            selected
            onPress={() => (groupsView ? editGroup() : createNote())}
          />
        </View>
        {!groupsView ? (
          <>
            <SearchField value={query} onChangeText={setQuery} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button
                label="Все"
                selected={groupId === undefined}
                onPress={() => setGroupId(undefined)}
              />
              <Button
                label="Без группы"
                selected={groupId === null}
                onPress={() => setGroupId(null)}
              />
              {(overview.data?.groups ?? []).map((group) => (
                <Button
                  key={group.id}
                  label={group.title}
                  selected={groupId === group.id}
                  onPress={() => setGroupId(group.id)}
                />
              ))}
            </View>
          </>
        ) : null}
      </View>

      {overview.error ? <ErrorState message={overview.error} retry={overview.refresh} /> : null}
      {overview.loading ? (
        <LoadingState />
      ) : groupsView ? (
        <FlatList
          data={overview.data?.groups ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<EmptyState text="Групп пока нет." />}
          renderItem={({ item }) => (
            <Row
              title={item.title}
              subtitle={`${overview.data?.notes.filter((note) => note.groupId === item.id).length ?? 0} заметок · ${item.icon}`}
              onPress={() => {
                setGroupId(item.id)
                setGroupsView(false)
              }}
            >
              <Button label="Изменить" onPress={() => editGroup(item)} />
              <Button
                label="Удалить"
                danger
                onPress={() =>
                  Alert.alert(
                    'Удалить группу?',
                    'Заметки сохранятся и перейдут в раздел «Без группы».',
                    [
                      { text: 'Отмена', style: 'cancel' },
                      {
                        text: 'Удалить',
                        style: 'destructive',
                        onPress: () => {
                          try {
                            api.deleteNoteGroup(item.id)
                            if (groupId === item.id) setGroupId(undefined)
                            overview.refresh()
                            notifyDataChanged()
                          } catch (reason) {
                            Alert.alert('Не удалось удалить группу', messageFor(reason))
                          }
                        }
                      }
                    ]
                  )
                }
              />
            </Row>
          )}
        />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          refreshing={overview.loading}
          onRefresh={overview.refresh}
          ListEmptyComponent={<EmptyState text="Заметок пока нет." />}
          renderItem={({ item }) => (
            <Row
              title={item.title}
              subtitle={[
                item.plainText.slice(0, 180),
                overview.data?.groups.find((group) => group.id === item.groupId)?.title
              ]
                .filter(Boolean)
                .join(' · ')}
              onPress={() => openNote(item.id)}
            />
          )}
        />
      )}
      {form && <FormSheet spec={form} close={() => setForm(null)} />}
    </View>
  )
}
