import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  ChevronDown,
  ChevronRight,
  CircleSlash2,
  Clock3,
  FilePlus2,
  Folder,
  FolderPlus,
  LayoutGrid,
  List,
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

type NotesScope = 'all' | 'recent' | 'grouped' | 'ungrouped'
type NotesLayout = 'grid' | 'list'
type NotesSort = 'updated' | 'title'

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
  const [scope, setScope] = useState<NotesScope>('all')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [layout, setLayout] = useState<NotesLayout>('grid')
  const [sort, setSort] = useState<NotesSort>('updated')
  const [hideEmptyGroups, setHideEmptyGroups] = useState(false)

  const normalizedSearch = search.trim().toLocaleLowerCase('ru-RU')

  const groupsById = useMemo(
    () => new Map(overview.groups.map((group) => [group.id, group])),
    [overview.groups]
  )

  const notesByGroup = useMemo(() => {
    const result = new Map<string | null, NoteSummary[]>()

    overview.notes.forEach((note) => {
      const notes = result.get(note.groupId) ?? []
      notes.push(note)
      result.set(note.groupId, notes)
    })

    return result
  }, [overview.notes])

  const notesByRecency = useMemo(
    () => [...overview.notes].sort((left, right) => right.updatedAt - left.updatedAt),
    [overview.notes]
  )

  const searchedNotes = useMemo(() => {
    if (!normalizedSearch) {
      return notesByRecency
    }

    return notesByRecency.filter((note) =>
      `${note.title} ${note.plainText}`.toLocaleLowerCase('ru-RU').includes(normalizedSearch)
    )
  }, [normalizedSearch, notesByRecency])

  const scopedNotes = useMemo(() => {
    if (scope === 'recent') {
      return searchedNotes.slice(0, 6)
    }

    if (scope === 'ungrouped') {
      return searchedNotes.filter((note) => note.groupId === null)
    }

    if (scope === 'grouped') {
      if (selectedGroupId) {
        return searchedNotes.filter((note) => note.groupId === selectedGroupId)
      }

      return searchedNotes.filter((note) => note.groupId !== null)
    }

    return searchedNotes
  }, [scope, searchedNotes, selectedGroupId])

  const visibleNotes = useMemo(() => {
    if (sort === 'title') {
      return [...scopedNotes].sort((left, right) => left.title.localeCompare(right.title, 'ru-RU'))
    }

    return [...scopedNotes].sort((left, right) => right.updatedAt - left.updatedAt)
  }, [scope, scopedNotes, sort])

  const recentNotes = searchedNotes.slice(0, 3)
  const ungroupedNotes = notesByGroup.get(null) ?? []
  const visibleGroups = hideEmptyGroups
    ? overview.groups.filter((group) => (notesByGroup.get(group.id) ?? []).length > 0)
    : overview.groups

  const allNotesTitle = normalizedSearch
    ? 'Результаты поиска'
    : scope === 'recent'
      ? 'Недавние заметки'
      : scope === 'ungrouped'
        ? 'Заметки без группы'
        : scope === 'grouped'
          ? selectedGroupId
            ? groupsById.get(selectedGroupId)?.title ?? 'Заметки группы'
            : 'Заметки в группах'
          : 'Все заметки'

  function selectScope(nextScope: NotesScope): void {
    setScope(nextScope)

    if (nextScope !== 'grouped') {
      setSelectedGroupId(null)
    }
  }

  function selectGroup(groupId: string | null): void {
    setScope('grouped')
    setSelectedGroupId(groupId)
  }

  return (
    <section className="h-full overflow-y-auto bg-[var(--app-workspace)] px-8 py-7 max-[720px]:px-4 max-[720px]:py-5">
      <div className="mx-auto w-full max-w-[1440px] space-y-4">
        <header className="flex items-start justify-between gap-6 px-1 max-[820px]:flex-col">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-violet-300 uppercase">
              Заметки
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
              Заметки
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--app-muted)]">
              Организуйте мысли, идеи, файлы и медиа в одном месте.
            </p>
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

        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 max-[980px]:grid-cols-1">
          <label className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 focus-within:border-violet-500/45 focus-within:ring-2 focus-within:ring-violet-500/10">
            <Search aria-hidden="true" className="size-4 shrink-0 text-[var(--app-muted)]" />
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

          <div className="flex min-h-12 items-center gap-1 overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5">
            <ScopeButton active={scope === 'all'} onClick={() => selectScope('all')}>
              Все
            </ScopeButton>
            <ScopeButton active={scope === 'recent'} onClick={() => selectScope('recent')}>
              <Clock3 aria-hidden="true" className="size-4" />
              Недавние
            </ScopeButton>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Фильтр по группам"
                  data-active={scope === 'grouped'}
                  className="flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-sm text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] data-[active=true]:bg-violet-500 data-[active=true]:text-white"
                >
                  <Folder aria-hidden="true" className="size-4" />
                  <span>{selectedGroupId ? groupsById.get(selectedGroupId)?.title : 'По группам'}</span>
                  <ChevronDown aria-hidden="true" className="size-3.5" />
                </button>
              </DropdownMenu.Trigger>
              <MenuContent align="end">
                <DropdownMenu.Item
                  className="cursor-default rounded-lg px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:bg-white/[0.06]"
                  onSelect={() => selectGroup(null)}
                >
                  Все группы
                </DropdownMenu.Item>
                {overview.groups.map((group) => (
                  <DropdownMenu.Item
                    key={group.id}
                    className="cursor-default rounded-lg px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:bg-white/[0.06]"
                    onSelect={() => selectGroup(group.id)}
                  >
                    {group.title}
                  </DropdownMenu.Item>
                ))}
              </MenuContent>
            </DropdownMenu.Root>

            <ScopeButton active={scope === 'ungrouped'} onClick={() => selectScope('ungrouped')}>
              <CircleSlash2 aria-hidden="true" className="size-4" />
              Без группы
            </ScopeButton>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-1">
          <StatCard
            icon={<StickyNote aria-hidden="true" className="size-5" />}
            value={isLoading ? '—' : overview.notes.length}
            label="Всего заметок"
            caption="Все записи в одном месте"
            onClick={() => selectScope('all')}
          />
          <StatCard
            icon={<Folder aria-hidden="true" className="size-5" />}
            value={isLoading ? '—' : overview.groups.length}
            label="Групп"
            caption="Структура для ваших записей"
            onClick={() => selectGroup(null)}
          />
          <StatCard
            icon={<CircleSlash2 aria-hidden="true" className="size-5" />}
            value={isLoading ? '—' : ungroupedNotes.length}
            label="Без группы"
            caption="Заметки, которые можно разобрать"
            onClick={() => selectScope('ungrouped')}
          />
        </div>

        {isLoading ? (
          <LoadingState />
        ) : overview.notes.length === 0 && overview.groups.length === 0 ? (
          <EmptyState onCreateGroup={onCreateGroup} onCreateNote={() => onCreateNote(null)} />
        ) : (
          <>
            {recentNotes.length > 0 && (
              <DashboardSection
                title="Недавние заметки"
                icon={<Clock3 aria-hidden="true" className="size-5" />}
                actionLabel="Смотреть все"
                onAction={() => selectScope('recent')}
              >
                <div className="grid grid-cols-3 gap-3 max-[1050px]:grid-cols-2 max-[680px]:grid-cols-1">
                  {recentNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      groupTitle={note.groupId ? groupsById.get(note.groupId)?.title : null}
                      groups={overview.groups}
                      onOpen={() => onOpenNote(note.id)}
                      onRename={() => onRenameNote(note)}
                      onMove={(groupId) => onMoveNote(note, groupId)}
                      onDelete={() => onDeleteNote(note)}
                    />
                  ))}
                </div>
              </DashboardSection>
            )}

            <DashboardSection
              title="Группы"
              icon={<Folder aria-hidden="true" className="size-5" />}
              actionLabel="Смотреть все"
              onAction={() => selectGroup(null)}
              toolbar={
                <label className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
                  <span>Скрыть пустые</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hideEmptyGroups}
                    aria-label="Скрыть пустые группы"
                    className={cn(
                      'relative h-5 w-9 rounded-full border border-[var(--app-border)] transition-colors',
                      hideEmptyGroups ? 'bg-violet-500' : 'bg-[var(--app-workspace)]'
                    )}
                    onClick={() => setHideEmptyGroups((current) => !current)}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute top-0.5 size-3.5 rounded-full bg-white transition-transform',
                        hideEmptyGroups ? 'translate-x-[17px]' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </label>
              }
            >
              <div className="grid grid-cols-4 gap-3 max-[1180px]:grid-cols-3 max-[900px]:grid-cols-2 max-[580px]:grid-cols-1">
                {visibleGroups.map((group) => {
                  const groupNotes = notesByGroup.get(group.id) ?? []

                  return (
                    <GroupCard
                      key={group.id}
                      title={group.title}
                      noteCount={groupNotes.length}
                      description={groupNotes[0]?.plainText.trim() || 'Заметки этой группы.'}
                      icon={<Folder aria-hidden="true" className="size-5" />}
                      onOpen={() => selectGroup(group.id)}
                      onCreateNote={() => onCreateNote(group.id)}
                      onRename={() => onRenameGroup(group)}
                      onDelete={() => onDeleteGroup(group)}
                    />
                  )
                })}

                <GroupCard
                  title="Без группы"
                  noteCount={ungroupedNotes.length}
                  description="Заметки, которые пока не относятся к группе."
                  icon={<CircleSlash2 aria-hidden="true" className="size-5" />}
                  onOpen={() => selectScope('ungrouped')}
                  onCreateNote={() => onCreateNote(null)}
                />
              </div>
            </DashboardSection>

            <DashboardSection
              title={allNotesTitle}
              icon={<StickyNote aria-hidden="true" className="size-5" />}
              toolbar={
                <div className="flex items-center gap-2">
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        type="button"
                        aria-label="Сортировка заметок"
                        className="flex h-9 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-xs text-[var(--app-muted)] hover:text-[var(--app-text)]"
                      >
                        Сортировка: {sort === 'updated' ? 'Недавние' : 'По названию'}
                        <ChevronDown aria-hidden="true" className="size-3.5" />
                      </button>
                    </DropdownMenu.Trigger>
                    <MenuContent align="end">
                      <DropdownMenu.Item
                        className="cursor-default rounded-lg px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:bg-white/[0.06]"
                        onSelect={() => setSort('updated')}
                      >
                        Недавние
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="cursor-default rounded-lg px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:bg-white/[0.06]"
                        onSelect={() => setSort('title')}
                      >
                        По названию
                      </DropdownMenu.Item>
                    </MenuContent>
                  </DropdownMenu.Root>

                  <div className="flex rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1">
                    <LayoutButton
                      active={layout === 'grid'}
                      label="Показать заметки сеткой"
                      onClick={() => setLayout('grid')}
                    >
                      <LayoutGrid aria-hidden="true" className="size-4" />
                    </LayoutButton>
                    <LayoutButton
                      active={layout === 'list'}
                      label="Показать заметки списком"
                      onClick={() => setLayout('list')}
                    >
                      <List aria-hidden="true" className="size-4" />
                    </LayoutButton>
                  </div>
                </div>
              }
            >
              {visibleNotes.length > 0 ? (
                <div
                  className={cn(
                    layout === 'grid'
                      ? 'grid grid-cols-2 gap-3 max-[820px]:grid-cols-1'
                      : 'flex flex-col gap-2'
                  )}
                >
                  {visibleNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      layout={layout}
                      groupTitle={note.groupId ? groupsById.get(note.groupId)?.title : null}
                      groups={overview.groups}
                      onOpen={() => onOpenNote(note.id)}
                      onRename={() => onRenameNote(note)}
                      onMove={(groupId) => onMoveNote(note, groupId)}
                      onDelete={() => onDeleteNote(note)}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-[var(--app-border)] px-4 py-8 text-center text-sm text-[var(--app-muted)]">
                  {normalizedSearch
                    ? 'По этому запросу ничего не найдено.'
                    : 'В выбранном разделе пока нет заметок.'}
                </p>
              )}
            </DashboardSection>
          </>
        )}
      </div>
    </section>
  )
}

function DashboardSection({
  title,
  icon,
  actionLabel,
  onAction,
  toolbar,
  children
}: {
  title: string
  icon: React.ReactNode
  actionLabel?: string
  onAction?: () => void
  toolbar?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]">
      <header className="flex min-h-12 items-center gap-3 border-b border-[var(--app-border)] px-5 py-3 max-[620px]:flex-wrap">
        <span className="text-violet-300">{icon}</span>
        <h2 className="text-base font-semibold text-[var(--app-text)]">{title}</h2>
        <div className="ml-auto flex items-center gap-3">
          {toolbar}
          {actionLabel && onAction && (
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-[var(--app-muted)] hover:text-[var(--app-text)]"
              onClick={onAction}
            >
              {actionLabel}
              <ChevronRight aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </div>
      </header>
      <div className="p-3">{children}</div>
    </section>
  )
}

function GroupCard({
  title,
  noteCount,
  description,
  icon,
  onOpen,
  onCreateNote,
  onRename,
  onDelete
}: {
  title: string
  noteCount: number
  description: string
  icon: React.ReactNode
  onOpen: () => void
  onCreateNote: () => void
  onRename?: () => void
  onDelete?: () => void
}): React.JSX.Element {
  return (
    <article className="group relative min-h-44 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
      <div className="flex items-start gap-3 pr-7">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[var(--app-text)]">{title}</h3>
          <p className="mt-0.5 text-xs text-[var(--app-muted)]">{noteCount} заметок</p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-5 text-[var(--app-muted)]">{description}</p>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text)] hover:border-violet-500/30"
          onClick={onOpen}
        >
          Открыть
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          aria-label={`Создать заметку в разделе «${title}»`}
          className="flex size-9 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:text-[var(--app-text)]"
          onClick={onCreateNote}
        >
          <FilePlus2 aria-hidden="true" className="size-4" />
        </button>
      </div>

      {(onRename || onDelete) && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={`Действия группы «${title}»`}
              className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
            >
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </button>
          </DropdownMenu.Trigger>
          <MenuContent>
            {onRename && (
              <MenuItem icon={<Pencil />} onSelect={onRename}>
                Переименовать
              </MenuItem>
            )}
            {onDelete && (
              <MenuItem danger icon={<Trash2 />} onSelect={onDelete}>
                Удалить группу
              </MenuItem>
            )}
          </MenuContent>
        </DropdownMenu.Root>
      )}
    </article>
  )
}

function NoteCard({
  note,
  groupTitle,
  groups,
  layout = 'grid',
  onOpen,
  onRename,
  onMove,
  onDelete
}: {
  note: NoteSummary
  groupTitle?: string | null
  groups: NoteGroup[]
  layout?: NotesLayout
  onOpen: () => void
  onRename: () => void
  onMove: (groupId: string | null) => void
  onDelete: () => void
}): React.JSX.Element {
  const snippet = note.plainText.trim() || 'Пустая заметка'

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-violet-500/30 hover:shadow-lg',
        layout === 'grid' ? 'min-h-40' : 'min-h-28'
      )}
    >
      <button
        type="button"
        aria-label={`Открыть заметку «${note.title}»`}
        className={cn(
          'flex h-full w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:ring-inset',
          layout === 'grid' ? 'flex-col p-4' : 'items-start gap-4 p-4 pr-12'
        )}
        onClick={onOpen}
      >
        {layout === 'grid' && (
          <div className="flex items-start gap-3 pr-8">
            <span className="mt-1 size-2 shrink-0 rounded-full bg-violet-400" />
            <h3 className="line-clamp-2 leading-5 font-semibold text-[var(--app-text)]">
              {note.title}
            </h3>
          </div>
        )}

        {layout === 'list' && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
            <StickyNote aria-hidden="true" className="size-4" />
          </div>
        )}

        <div className={cn('min-w-0', layout === 'list' && 'flex-1')}>
          {layout === 'list' && (
            <div className="flex flex-wrap items-center gap-2 pr-4">
              <h3 className="truncate font-semibold text-[var(--app-text)]">{note.title}</h3>
              <NoteGroupBadge title={groupTitle} />
            </div>
          )}

          {layout === 'grid' && <NoteGroupBadge title={groupTitle} />}

          <p
            className={cn(
              'text-xs leading-5 text-[var(--app-muted)]',
              layout === 'grid' ? 'mt-3 line-clamp-3' : 'mt-2 line-clamp-2'
            )}
          >
            {snippet}
          </p>
          <time
            dateTime={new Date(note.updatedAt).toISOString()}
            className={cn(
              'block text-[10px] text-[var(--app-muted)]',
              layout === 'grid' ? 'mt-auto pt-4' : 'mt-3'
            )}
          >
            Изменено {noteDateFormatter.format(new Date(note.updatedAt))}
          </time>
        </div>
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
                  disabled={note.groupId === null}
                  className="cursor-default rounded-lg px-3 py-2 text-sm text-[var(--app-text)] outline-none focus:bg-white/[0.06] disabled:opacity-40"
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

function NoteGroupBadge({ title }: { title?: string | null }): React.JSX.Element {
  return (
    <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-violet-500/10 px-2 py-1 text-[10px] text-violet-300">
      {title ? (
        <Folder aria-hidden="true" className="size-3" />
      ) : (
        <CircleSlash2 aria-hidden="true" className="size-3" />
      )}
      <span className="truncate">{title ?? 'Без группы'}</span>
    </span>
  )
}

function ScopeButton({
  active,
  children,
  onClick
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      data-active={active}
      className="flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-sm text-[var(--app-muted)] transition-colors hover:text-[var(--app-text)] data-[active=true]:bg-violet-500 data-[active=true]:text-white"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function LayoutButton({
  active,
  label,
  children,
  onClick
}: {
  active: boolean
  label: string
  children: React.ReactNode
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      data-active={active}
      className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:text-[var(--app-text)] data-[active=true]:bg-violet-500 data-[active=true]:text-white"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function StatCard({
  icon,
  value,
  label,
  caption,
  onClick
}: {
  icon: React.ReactNode
  value: string | number
  label: string
  caption: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className="flex min-h-24 items-center gap-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-4 text-left hover:border-violet-500/30"
      onClick={onClick}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="flex items-baseline gap-2">
          <strong className="text-2xl font-semibold text-[var(--app-text)]">{value}</strong>
          <span className="text-sm text-[var(--app-muted)]">{label}</span>
        </span>
        <span className="mt-1 block truncate text-xs text-[var(--app-muted)]">{caption}</span>
      </span>
    </button>
  )
}

function MenuContent({
  children,
  align = 'end'
}: {
  children: React.ReactNode
  align?: 'start' | 'center' | 'end'
}): React.JSX.Element {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={6}
        align={align}
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
  disabled = false,
  onClick
}: {
  children: React.ReactNode
  primary?: boolean
  disabled?: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-violet-500/35 disabled:cursor-not-allowed disabled:opacity-50',
        primary
          ? 'bg-violet-500 text-white hover:bg-violet-400'
          : 'border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] hover:border-violet-500/30'
      )}
      onClick={onClick}
    >
      {children}
    </button>
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
