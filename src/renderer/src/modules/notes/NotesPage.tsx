import { useCallback, useEffect, useState } from 'react'

import type { NoteGroup, NoteSummary, NotesOverview } from '../../../../shared/contracts/notes'
import type { StudyFolderIconName } from '../../../../shared/contracts/study'
import { DeleteConfirmationDialog } from '../../shared/ui/DeleteConfirmationDialog'
import { notesClient } from './api/notes-client'
import { NoteEditor } from './components/NoteEditor'
import { NoteNameDialog } from './components/NoteNameDialog'
import { NotesHome } from './components/NotesHome'

interface NotesPageProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

const emptyOverview: NotesOverview = {
  groups: [],
  notes: []
}

export function NotesPage({
  resourceId = null,
  onResourceHandled
}: NotesPageProps): React.JSX.Element {
  const [overview, setOverview] = useState<NotesOverview>(emptyOverview)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(resourceId)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createGroupOpen, setCreateGroupOpen] = useState(false)
  const [createNoteOpen, setCreateNoteOpen] = useState(false)
  const [createNoteGroupId, setCreateNoteGroupId] = useState<string | null>(null)
  const [renameGroupTarget, setRenameGroupTarget] = useState<NoteGroup | null>(null)
  const [renameNoteTarget, setRenameNoteTarget] = useState<NoteSummary | null>(null)
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<NoteGroup | null>(null)
  const [deleteNoteTarget, setDeleteNoteTarget] = useState<NoteSummary | null>(null)

  const loadOverview = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      setOverview(await notesClient.listOverview())
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить заметки')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    void notesClient
      .listOverview()
      .then((loadedOverview) => {
        if (active) {
          setOverview(loadedOverview)
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Не удалось загрузить заметки')
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!resourceId) return undefined

    const frame = window.requestAnimationFrame(() => {
      setSelectedNoteId(resourceId)
      onResourceHandled?.()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [onResourceHandled, resourceId])

  const handleNoteUpdated = useCallback((updated: NoteSummary): void => {
    setOverview((current) => ({
      ...current,
      notes: current.notes.some((note) => note.id === updated.id)
        ? current.notes
            .map((note) => (note.id === updated.id ? { ...note, ...updated } : note))
            .sort((first, second) => second.updatedAt - first.updatedAt)
        : [updated, ...current.notes]
    }))
  }, [])

  const handleGroupIconChange = useCallback(
    async (group: NoteGroup, icon: StudyFolderIconName): Promise<void> => {
      setError(null)

      try {
        const updated = await notesClient.updateGroupIcon(group.id, icon)
        setOverview((current) => ({
          ...current,
          groups: current.groups.map((item) => (item.id === updated.id ? updated : item))
        }))
      } catch (reason: unknown) {
        setError(reason instanceof Error ? reason.message : 'Не удалось изменить иконку группы')
      }
    },
    []
  )

  if (selectedNoteId) {
    return (
      <NoteEditor
        key={selectedNoteId}
        noteId={selectedNoteId}
        onBack={() => setSelectedNoteId(null)}
        onNoteUpdated={handleNoteUpdated}
      />
    )
  }

  return (
    <>
      <NotesHome
        overview={overview}
        isLoading={isLoading}
        onOpenNote={setSelectedNoteId}
        onCreateGroup={() => setCreateGroupOpen(true)}
        onCreateNote={(groupId) => {
          setCreateNoteGroupId(groupId)
          setCreateNoteOpen(true)
        }}
        onRenameGroup={setRenameGroupTarget}
        onGroupIconChange={(group, icon) => void handleGroupIconChange(group, icon)}
        onDeleteGroup={setDeleteGroupTarget}
        onRenameNote={setRenameNoteTarget}
        onDeleteNote={setDeleteNoteTarget}
        onMoveNote={(note, groupId) => {
          void notesClient
            .moveNote({ id: note.id, groupId })
            .then(handleNoteUpdated)
            .catch((reason: unknown) => {
              setError(reason instanceof Error ? reason.message : 'Не удалось переместить заметку')
            })
        }}
      />

      {error && (
        <div
          role="alert"
          className="fixed right-5 bottom-5 z-[75] max-w-md rounded-xl border border-red-500/20 bg-[var(--app-surface-raised)] px-4 py-3 text-sm text-red-300 shadow-2xl"
        >
          {error}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => {
              setError(null)
              void loadOverview()
            }}
          >
            Повторить
          </button>
        </div>
      )}

      <NoteNameDialog
        open={createGroupOpen}
        title="Новая группа"
        label="Название группы"
        confirmLabel="Создать"
        onOpenChange={setCreateGroupOpen}
        onConfirm={async (title) => {
          const group = await notesClient.createGroup(title)
          setOverview((current) => ({
            ...current,
            groups: [...current.groups, group].sort((first, second) =>
              first.title.localeCompare(second.title, 'ru-RU')
            )
          }))
        }}
      />

      <NoteNameDialog
        open={createNoteOpen}
        title="Новая заметка"
        label="Название заметки"
        confirmLabel="Создать"
        onOpenChange={setCreateNoteOpen}
        onConfirm={async (title) => {
          const note = await notesClient.createNote({
            groupId: createNoteGroupId,
            title
          })
          handleNoteUpdated(note)
          setSelectedNoteId(note.id)
        }}
      />

      <NoteNameDialog
        open={renameGroupTarget !== null}
        title="Переименовать группу"
        label="Название группы"
        initialValue={renameGroupTarget?.title}
        confirmLabel="Сохранить"
        onOpenChange={(open) => {
          if (!open) setRenameGroupTarget(null)
        }}
        onConfirm={async (title) => {
          if (!renameGroupTarget) return
          const updated = await notesClient.renameGroup(renameGroupTarget.id, title)
          setOverview((current) => ({
            ...current,
            groups: current.groups
              .map((group) => (group.id === updated.id ? updated : group))
              .sort((first, second) => first.title.localeCompare(second.title, 'ru-RU'))
          }))
          setRenameGroupTarget(null)
        }}
      />

      <NoteNameDialog
        open={renameNoteTarget !== null}
        title="Переименовать заметку"
        label="Название заметки"
        initialValue={renameNoteTarget?.title}
        confirmLabel="Сохранить"
        onOpenChange={(open) => {
          if (!open) setRenameNoteTarget(null)
        }}
        onConfirm={async (title) => {
          if (!renameNoteTarget) return
          handleNoteUpdated(await notesClient.renameNote(renameNoteTarget.id, title))
          setRenameNoteTarget(null)
        }}
      />

      <DeleteConfirmationDialog
        open={deleteGroupTarget !== null}
        title="Удалить группу?"
        subject={deleteGroupTarget?.title}
        description="Заметки из этой группы не удалятся и будут перенесены в раздел «Без группы»."
        onOpenChange={(open) => {
          if (!open) setDeleteGroupTarget(null)
        }}
        onConfirm={() => {
          if (!deleteGroupTarget) return
          const groupId = deleteGroupTarget.id
          void notesClient
            .deleteGroup(groupId)
            .then(() => {
              setOverview((current) => ({
                groups: current.groups.filter((group) => group.id !== groupId),
                notes: current.notes.map((note) =>
                  note.groupId === groupId ? { ...note, groupId: null } : note
                )
              }))
            })
            .catch((reason: unknown) => {
              setError(reason instanceof Error ? reason.message : 'Не удалось удалить группу')
            })
            .finally(() => setDeleteGroupTarget(null))
        }}
      />

      <DeleteConfirmationDialog
        open={deleteNoteTarget !== null}
        title="Удалить заметку?"
        subject={deleteNoteTarget?.title}
        description="Заметка и её локальные вложения будут удалены без возможности восстановления."
        onOpenChange={(open) => {
          if (!open) setDeleteNoteTarget(null)
        }}
        onConfirm={() => {
          if (!deleteNoteTarget) return
          const noteId = deleteNoteTarget.id
          void notesClient
            .deleteNote(noteId)
            .then(() => {
              setOverview((current) => ({
                ...current,
                notes: current.notes.filter((note) => note.id !== noteId)
              }))
            })
            .catch((reason: unknown) => {
              setError(reason instanceof Error ? reason.message : 'Не удалось удалить заметку')
            })
            .finally(() => setDeleteNoteTarget(null))
        }}
      />
    </>
  )
}
