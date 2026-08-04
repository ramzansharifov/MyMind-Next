import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  Clock3,
  FilePlus2,
  Folder,
  FolderPlus,
  MoreHorizontal,
  MoveRight,
  Pencil,
  Search,
  StickyNote,
  Trash2,
  X
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type { NoteGroup, NoteSummary, NotesOverview } from '../../../../../shared/contracts/notes'
import { cn } from '../../../shared/lib/cn'

interface NotesHomeProps {
  overview: NotesOverview
  isLoading: boolean
  onOpenNote: (noteId: string) => void
  onCreateGroup: () => void
  onCreateNote: (groupId: string | null) => void
  onRenameGroup: (group: NoteGroup) => void
  onDeleteGroup: (group: NoteGroup) => void
  onRenameNote: (note: NoteSummary) => void
  onMoveNote: (note: NoteSummary, groupId: string | null) => void
  onDeleteNote: (note: NoteSummary) => void
}

const noteDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit'
})

export function NotesHome({
  overview,
  isLoading,
  onOpenNote,
  onCreateGroup,
  onCreateNote,
  onRenameGroup,
  onDeleteGroup,
  onRenameNote,
  onMoveNote,
  onDeleteNote
}: NotesHomeProps): React.JSX.Element {
  const [search, setSearch] = useState('')
  const normalizedSearch = search.trim().toLocaleLowerCase('ru-RU')

  const filteredNotes = useMemo(() => {
    if (!normalizedSearch) {
      return overview.notes
    }

    return overview.notes.filter((note) =>
      `${note.title} ${note.plainText}`.toLocaleLowerCase('ru-RU').includes(normalizedSearch)
    )
  }, [normalizedSearch, overview.notes])

  const notesByGroup = useMemo(() => {
    const result = new Map<string | null, NoteSummary[]>()

    filteredNotes.forEach((note) => {
      const notes = result.get(note.groupId) ?? []
      notes.push(note)
      result.set(note.groupId, notes)
    })

    return result
  }, [filteredNotes])

  const recentNotes = filteredNotes.slice(0, 6)
  const ungroupedNotes = notesByGroup.get(null) ?? []

  return (
    <section className="h-full overflow-y-auto bg-[var(--app-workspace)] px-8 py-7 max-[720px]:px-4 max-[720px]:py-5">
      <div className="mx-auto w-full max-w-[1240px] space-y-5">
        <section className="relative isolate overflow-hidden rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_20px_70px_rgb(0_0_0/0.16)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 right-8 -z-10 size-80 rounded-full bg-violet-500/10 blur-3xl"
          />

          <div className="p-6 max-[720px]:p-4">
            <header className="flex items-start justify-between gap-6 max-[820px]:flex-col">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/12 text-violet-300">
                  <StickyNote aria-hidden="true" className="size-6" />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-300 uppercase">
                    Быстрые записи
                  </p>
                  <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
                    Заметки
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--app-muted)]">
                    Простые записи, файлы и медиа без сложной структуры учебных материалов.
                  </p>
                </div>
              </div>

              <div className="grid w-[22rem] max-w-full shrink-0 grid-cols-2 gap-2 max-[820px]:w-full max-[520px]:grid-cols-1">
                <ActionButton disabled={isLoading} onClick={onCreateGroup}>
                  <FolderPlus aria-hidden="true" className="size-4" />
                  Новая группа
                </ActionButton>
                <ActionButton primary disabled={isLoading} onClick={() => onCreateNote(null)}>
                  <FilePlus2 aria-hidden="true" className="size-4" />
                  Новая заметка
                </ActionButton>
              </div>
            </header>

            <label className="mt-6 flex h-12 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 focus-within:border-violet-500/45 focus-within:ring-2 focus-within:ring-violet-500/10">
              <Search aria-hidden="true" className="size-4 text-[var(--app-muted)]" />
              <input
                value={search}
                aria-label="Поиск по заметкам"
                placeholder="Найти заметку по названию или содержимому"
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/65"
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Очистить поиск"
                  className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-white/[0.06] hover:text-[var(--app-text)]"
                  onClick={() => setSearch('')}
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              )}
            </label>

            <div className="mt-4 grid grid-cols-3 gap-3 max-[760px]:grid-cols-1">
              <Stat value={isLoading ? '—' : overview.notes.length} label="Заметок" />
              <Stat value={isLoading ? '—' : overview.groups.length} label="Групп" />
              <Stat value={isLoading ? '—' : ungroupedNotes.length} label="Без группы" />
            </div>
          </div>
        </section>

        {isLoading ? (
          <LoadingState />
        ) : normalizedSearch ? (
          <NotesSection
            title="Результаты поиска"
            icon={<Search aria-hidden="true" className="size-5" />}
            notes={filteredNotes}
            groups={overview.groups}
            emptyText="По этому запросу ничего не найдено."
            onOpenNote={onOpenNote}
            onRenameNote={onRenameNote}
            onMoveNote={onMoveNote}
            onDeleteNote={onDeleteNote}
          />
        ) : overview.notes.length === 0 && overview.groups.length === 0 ? (
          <EmptyState onCreateGroup={onCreateGroup} onCreateNote={() => onCreateNote(null)} />
        ) : (
          <>
            {recentNotes.length > 0 && (
              <NotesSection
                title="Недавние"
                icon={<Clock3 aria-hidden="true" className="size-5" />}
                notes={recentNotes}
                groups={overview.groups}
                onOpenNote={onOpenNote}
                onRenameNote={onRenameNote}
                onMoveNote={onMoveNote}
                onDeleteNote={onDeleteNote}
              />
            )}

            {overview.groups.map((group) => (
              <GroupSection
                key={group.id}
                group={group}
                notes={notesByGroup.get(group.id) ?? []}
                groups={overview.groups}
                onCreateNote={() => onCreateNote(group.id)}
                onRenameGroup={() => onRenameGroup(group)}
                onDeleteGroup={() => onDeleteGroup(group)}
                onOpenNote={onOpenNote}
                onRenameNote={onRenameNote}
                onMoveNote={onMoveNote}
                onDeleteNote={onDeleteNote}
              />
            ))}

            <NotesSection
              title="Без группы"
              icon={<StickyNote aria-hidden="true" className="size-5" />}
              notes={ungroupedNotes}
              groups={overview.groups}
              emptyText="Здесь появятся заметки, которые не относятся к группе."
              onOpenNote={onOpenNote}
              onRenameNote={onRenameNote}
              onMoveNote={onMoveNote}
              onDeleteNote={onDeleteNote}
            />
          </>
        )}
      </div>
    </section>
  )
}

function GroupSection({
  group,
  notes,
  groups,
  onCreateNote,
  onRenameGroup,
  onDeleteGroup,
  onOpenNote,
  onRenameNote,
  onMoveNote,
  onDeleteNote
}: {
  group: NoteGroup
  notes: NoteSummary[]
  groups: NoteGroup[]
  onCreateNote: () => void
  onRenameGroup: () => void
  onDeleteGroup: () => void
  onOpenNote: (noteId: string) => void
  onRenameNote: (note: NoteSummary) => void
  onMoveNote: (note: NoteSummary, groupId: string | null) => void
  onDeleteNote: (note: NoteSummary) => void
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]">
      <header className="flex items-center gap-3 border-b border-[var(--app-border)] px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
          <Folder aria-hidden="true" className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-semibold text-[var(--app-text)]">{group.title}</h2>
          <p className="mt-0.5 text-xs text-[var(--app-muted)]">{notes.length} заметок</p>
        </div>
        <ActionButton compact onClick={onCreateNote}>
          <FilePlus2 aria-hidden="true" className="size-4" />
          <span className="max-[580px]:hidden">Добавить</span>
        </ActionButton>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={`Действия группы «${group.title}»`}
              className="flex size-9 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-white/[0.06] hover:text-[var(--app-text)]"
            >
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </button>
          </DropdownMenu.Trigger>
          <MenuContent>
            <MenuItem icon={<Pencil />} onSelect={onRenameGroup}>
              Переименовать
            </MenuItem>
            <MenuItem danger icon={<Trash2 />} onSelect={onDeleteGroup}>
              Удалить группу
            </MenuItem>
          </MenuContent>
        </DropdownMenu.Root>
      </header>

      <div className="p-4">
        {notes.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 max-[1050px]:grid-cols-2 max-[680px]:grid-cols-1">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                groups={groups}
                onOpen={() => onOpenNote(note.id)}
                onRename={() => onRenameNote(note)}
                onMove={(groupId) => onMoveNote(note, groupId)}
                onDelete={() => onDeleteNote(note)}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--app-border)] px-4 py-8 text-center text-sm text-[var(--app-muted)]">
            В этой группе пока нет заметок.
          </p>
        )}
      </div>
    </section>
  )
}

function NotesSection({
  title,
  icon,
  notes,
  groups,
  emptyText = 'Заметок пока нет.',
  onOpenNote,
  onRenameNote,
  onMoveNote,
  onDeleteNote
}: {
  title: string
  icon: React.ReactNode
  notes: NoteSummary[]
  groups: NoteGroup[]
  emptyText?: string
  onOpenNote: (noteId: string) => void
  onRenameNote: (note: NoteSummary) => void
  onMoveNote: (note: NoteSummary, groupId: string | null) => void
  onDeleteNote: (note: NoteSummary) => void
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]">
      <header className="flex items-center gap-3 border-b border-[var(--app-border)] px-5 py-4">
        <span className="text-violet-300">{icon}</span>
        <h2 className="text-base font-semibold text-[var(--app-text)]">{title}</h2>
        <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] text-[var(--app-muted)]">
          {notes.length}
        </span>
      </header>
      <div className="p-4">
        {notes.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 max-[1050px]:grid-cols-2 max-[680px]:grid-cols-1">
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                groups={groups}
                onOpen={() => onOpenNote(note.id)}
                onRename={() => onRenameNote(note)}
                onMove={(groupId) => onMoveNote(note, groupId)}
                onDelete={() => onDeleteNote(note)}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--app-border)] px-4 py-8 text-center text-sm text-[var(--app-muted)]">
            {emptyText}
          </p>
        )}
      </div>
    </section>
  )
}

function NoteCard({
  note,
  groups,
  onOpen,
  onRename,
  onMove,
  onDelete
}: {
  note: NoteSummary
  groups: NoteGroup[]
  onOpen: () => void
  onRename: () => void
  onMove: (groupId: string | null) => void
  onDelete: () => void
}): React.JSX.Element {
  const snippet = note.plainText.trim() || 'Пустая заметка'

  return (
    <article className="group relative min-h-40 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-violet-500/30 hover:shadow-lg">
      <button
        type="button"
        aria-label={`Открыть заметку «${note.title}»`}
        className="flex h-full w-full flex-col p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:ring-inset"
        onClick={onOpen}
      >
        <div className="flex items-start gap-3 pr-8">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
            <StickyNote aria-hidden="true" className="size-4" />
          </div>
          <h3 className="line-clamp-2 leading-5 font-semibold text-[var(--app-text)]">
            {note.title}
          </h3>
        </div>
        <p className="mt-4 line-clamp-3 text-xs leading-5 text-[var(--app-muted)]">{snippet}</p>
        <time
          dateTime={new Date(note.updatedAt).toISOString()}
          className="mt-auto pt-4 text-[10px] text-[var(--app-muted)]"
        >
          {noteDateFormatter.format(new Date(note.updatedAt))}
        </time>
      </button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={`Действия заметки «${note.title}»`}
            className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-lg bg-[var(--app-surface)] text-[var(--app-muted)] opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus:opacity-100"
          >
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </button>
        </DropdownMenu.Trigger>
        <MenuContent>
          <MenuItem icon={<Pencil />} onSelect={onRename}>
            Переименовать
          </MenuItem>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:bg-white/[0.06]">
              <MoveRight aria-hidden="true" className="size-4 text-[var(--app-muted)]" />
              Переместить
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={6}
                className="z-[70] min-w-48 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1.5 shadow-2xl"
              >
                <DropdownMenu.Item
                  className="cursor-default rounded-lg px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:bg-white/[0.06]"
                  onSelect={() => onMove(null)}
                >
                  Без группы
                </DropdownMenu.Item>
                {groups.map((group) => (
                  <DropdownMenu.Item
                    key={group.id}
                    disabled={group.id === note.groupId}
                    className="cursor-default rounded-lg px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:bg-white/[0.06] disabled:opacity-40"
                    onSelect={() => onMove(group.id)}
                  >
                    {group.title}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
          <MenuItem danger icon={<Trash2 />} onSelect={onDelete}>
            Удалить
          </MenuItem>
        </MenuContent>
      </DropdownMenu.Root>
    </article>
  )
}

function MenuContent({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={6}
        align="end"
        className="z-[70] min-w-48 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1.5 shadow-2xl"
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  )
}

function MenuItem({
  children,
  icon,
  danger = false,
  onSelect
}: {
  children: React.ReactNode
  icon: React.ReactElement
  danger?: boolean
  onSelect: () => void
}): React.JSX.Element {
  return (
    <DropdownMenu.Item
      className={cn(
        'flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none',
        danger ? 'text-red-300 focus:bg-red-500/10' : 'text-[var(--app-text)] focus:bg-white/[0.06]'
      )}
      onSelect={onSelect}
    >
      <span className="[&>svg]:size-4">{icon}</span>
      {children}
    </DropdownMenu.Item>
  )
}

function ActionButton({
  children,
  primary = false,
  compact = false,
  disabled = false,
  onClick
}: {
  children: React.ReactNode
  primary?: boolean
  compact?: boolean
  disabled?: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/35 disabled:cursor-not-allowed disabled:opacity-50',
        compact ? 'h-9 px-3' : 'h-11 px-4',
        primary
          ? 'bg-violet-500 text-white hover:bg-violet-400'
          : 'border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-text)] hover:border-violet-500/30'
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Stat({ value, label }: { value: string | number; label: string }): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 py-3">
      <p className="text-xl font-semibold text-[var(--app-text)]">{value}</p>
      <p className="mt-0.5 text-xs text-[var(--app-muted)]">{label}</p>
    </div>
  )
}

function LoadingState(): React.JSX.Element {
  return (
    <div className="flex min-h-52 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-sm text-[var(--app-muted)]">
      Загрузка заметок…
    </div>
  )
}

function EmptyState({
  onCreateGroup,
  onCreateNote
}: {
  onCreateGroup: () => void
  onCreateNote: () => void
}): React.JSX.Element {
  return (
    <section className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
        <StickyNote aria-hidden="true" className="size-7" />
      </div>
      <h2 className="mt-5 text-xl font-semibold text-[var(--app-text)]">Создай первую заметку</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--app-muted)]">
        Заметки можно хранить отдельно или объединять в простые группы.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <ActionButton onClick={onCreateGroup}>
          <FolderPlus aria-hidden="true" className="size-4" />
          Создать группу
        </ActionButton>
        <ActionButton primary onClick={onCreateNote}>
          <FilePlus2 aria-hidden="true" className="size-4" />
          Создать заметку
        </ActionButton>
      </div>
    </section>
  )
}
