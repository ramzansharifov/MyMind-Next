import { Tooltip } from '../../../shared/ui/tooltip'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Select from '@radix-ui/react-select'
import * as Switch from '@radix-ui/react-switch'
import * as Tabs from '@radix-ui/react-tabs'
import * as ToggleGroup from '@radix-ui/react-toggle-group'
import {
  ArrowLeft,
  Check,
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
import type { StudyFolderIconName } from '../../../../../shared/contracts/study'
import { cn } from '../../../shared/lib/cn'
import { FolderIcon } from '../../../shared/ui/FolderIcon'
import { FolderIconPicker } from '../../../shared/ui/FolderIconPicker'

interface NotesHomeProps {
  overview: NotesOverview
  isLoading: boolean
  onOpenNote: (noteId: string) => void
  onCreateGroup: () => void
  onCreateNote: (groupId: string | null) => void
  onRenameGroup: (group: NoteGroup) => void
  onGroupIconChange: (group: NoteGroup, icon: StudyFolderIconName) => void
  onDeleteGroup: (group: NoteGroup) => void
  onRenameNote: (note: NoteSummary) => void
  onMoveNote: (note: NoteSummary, groupId: string | null) => void
  onDeleteNote: (note: NoteSummary) => void
}

type NotesView = 'all' | 'recent' | 'groups' | 'ungrouped'
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
  onGroupIconChange,
  onDeleteGroup,
  onRenameNote,
  onMoveNote,
  onDeleteNote
}: NotesHomeProps): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<NotesView>('all')
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
      const groupNotes = result.get(note.groupId) ?? []
      groupNotes.push(note)
      result.set(note.groupId, groupNotes)
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

  const sortedNotes = useMemo(() => sortNotes(searchedNotes, sort), [searchedNotes, sort])

  const recentNotes = searchedNotes.slice(0, 4)
  const ungroupedNotes = useMemo(
    () =>
      sortNotes(
        searchedNotes.filter((note) => note.groupId === null),
        sort
      ),
    [searchedNotes, sort]
  )

  const selectedGroup = selectedGroupId ? (groupsById.get(selectedGroupId) ?? null) : null
  const selectedGroupNotes = useMemo(
    () =>
      selectedGroupId
        ? sortNotes(
            searchedNotes.filter((note) => note.groupId === selectedGroupId),
            sort
          )
        : [],
    [searchedNotes, selectedGroupId, sort]
  )

  const visibleGroups = useMemo(() => {
    return overview.groups.filter((group) => {
      const groupNotes = notesByGroup.get(group.id) ?? []

      if (hideEmptyGroups && groupNotes.length === 0) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      const groupMatches = group.title.toLocaleLowerCase('ru-RU').includes(normalizedSearch)
      const noteMatches = groupNotes.some((note) =>
        `${note.title} ${note.plainText}`.toLocaleLowerCase('ru-RU').includes(normalizedSearch)
      )

      return groupMatches || noteMatches
    })
  }, [hideEmptyGroups, normalizedSearch, notesByGroup, overview.groups])

  function handleViewChange(value: string): void {
    if (!isNotesView(value)) {
      return
    }

    setView(value)

    if (value === 'groups') {
      setSelectedGroupId(null)
    }
  }

  function openGroupsPage(): void {
    setSelectedGroupId(null)
    setView('groups')
  }

  function openGroup(groupId: string): void {
    setSelectedGroupId(groupId)
    setView('groups')
  }

  const searchPlaceholder =
    view === 'groups' && selectedGroupId === null
      ? 'Найти группу или заметку внутри группы'
      : 'Найти заметку по названию или содержимому'

  return (
    <section className="h-full overflow-y-auto bg-[var(--app-workspace)] px-8 py-7 max-[720px]:px-4 max-[720px]:py-5">
      <div data-notes-home-container className="mx-auto w-full max-w-[1240px] space-y-5">
        <Tabs.Root value={view} onValueChange={handleViewChange}>
          <section data-notes-hero>
            <header className="flex items-start justify-between gap-6 px-1 max-[820px]:flex-col">
              <div className="min-w-0">
                <p className="text-accent-300 text-[11px] font-semibold tracking-[0.12em] uppercase">
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
              <label className="focus-within:border-accent-500/45 focus-within:ring-accent-500/10 flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 focus-within:ring-2">
                <Search aria-hidden="true" className="size-4 shrink-0 text-[var(--app-muted)]" />
                <input
                  value={search}
                  aria-label="Поиск по заметкам"
                  placeholder={searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/65"
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search && (
                  <Tooltip content="Очистить поиск" side="top">
                    <button
                      type="button"
                      aria-label="Очистить поиск"
                      className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-white/[0.06] hover:text-[var(--app-text)]"
                      onClick={() => setSearch('')}
                    >
                      <X aria-hidden="true" className="size-4" />
                    </button>
                  </Tooltip>
                )}
              </label>

              <Tabs.List
                aria-label="Разделы заметок"
                className="flex min-h-12 items-center gap-1 overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5"
              >
                <NotesTab value="all">Все</NotesTab>
                <NotesTab value="recent">
                  <Clock3 aria-hidden="true" className="size-4" />
                  Недавние
                </NotesTab>
                <NotesTab value="groups">
                  <Folder aria-hidden="true" className="size-4" />
                  По группам
                </NotesTab>
                <NotesTab value="ungrouped">
                  <CircleSlash2 aria-hidden="true" className="size-4" />
                  Без группы
                </NotesTab>
              </Tabs.List>
            </div>

            {!isLoading &&
              (overview.notes.length > 0 || overview.groups.length > 0) &&
              view === 'all' && (
                <div
                  data-notes-hero-stats
                  className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-1"
                >
                  <StatCard
                    icon={<StickyNote aria-hidden="true" className="size-5" />}
                    value={overview.notes.length}
                    label="Всего заметок"
                    caption="Все записи в одном месте"
                    onClick={() => setView('all')}
                  />
                  <StatCard
                    icon={<Folder aria-hidden="true" className="size-5" />}
                    value={overview.groups.length}
                    label="Групп"
                    caption="Структура для ваших записей"
                    onClick={openGroupsPage}
                  />
                  <StatCard
                    icon={<CircleSlash2 aria-hidden="true" className="size-5" />}
                    value={(notesByGroup.get(null) ?? []).length}
                    label="Без группы"
                    caption="Заметки, которые можно разобрать"
                    onClick={() => setView('ungrouped')}
                  />
                </div>
              )}
          </section>

          {isLoading ? (
            <div className="mt-5">
              <LoadingState />
            </div>
          ) : overview.notes.length === 0 && overview.groups.length === 0 ? (
            <div className="mt-5">
              <EmptyState onCreateGroup={onCreateGroup} onCreateNote={() => onCreateNote(null)} />
            </div>
          ) : (
            <>
              <Tabs.Content value="all" className="mt-5 space-y-4 outline-none">
                {recentNotes.length > 0 && (
                  <DashboardSection
                    title="Недавние заметки"
                    icon={<Clock3 aria-hidden="true" className="size-5" />}
                    actionLabel="Смотреть все"
                    onAction={() => setView('recent')}
                  >
                    <NotesGrid
                      collection="recent"
                      notes={recentNotes}
                      layout={layout}
                      groupsById={groupsById}
                      groups={overview.groups}
                      onOpenNote={onOpenNote}
                      onRenameNote={onRenameNote}
                      onMoveNote={onMoveNote}
                      onDeleteNote={onDeleteNote}
                    />
                  </DashboardSection>
                )}

                {overview.groups.length > 0 && (
                  <DashboardSection
                    title="Группы"
                    icon={<Folder aria-hidden="true" className="size-5" />}
                    actionLabel="Смотреть все"
                    onAction={openGroupsPage}
                  >
                    <GroupsGrid
                      groups={visibleGroups.slice(0, 3)}
                      notesByGroup={notesByGroup}
                      onOpenGroup={openGroup}
                      onCreateNote={onCreateNote}
                      onRenameGroup={onRenameGroup}
                      onGroupIconChange={onGroupIconChange}
                      onDeleteGroup={onDeleteGroup}
                    />
                  </DashboardSection>
                )}

                <DashboardSection
                  title={normalizedSearch ? 'Результаты поиска' : 'Все заметки'}
                  icon={<StickyNote aria-hidden="true" className="size-5" />}
                  toolbar={
                    <NotesCollectionControls
                      layout={layout}
                      sort={sort}
                      onLayoutChange={setLayout}
                      onSortChange={setSort}
                    />
                  }
                >
                  <NotesGrid
                    collection="all"
                    notes={sortedNotes}
                    layout={layout}
                    groupsById={groupsById}
                    groups={overview.groups}
                    emptyText={
                      normalizedSearch ? 'По этому запросу ничего не найдено.' : 'Заметок пока нет.'
                    }
                    onOpenNote={onOpenNote}
                    onRenameNote={onRenameNote}
                    onMoveNote={onMoveNote}
                    onDeleteNote={onDeleteNote}
                  />
                </DashboardSection>
              </Tabs.Content>

              <Tabs.Content value="recent" className="mt-5 outline-none">
                <DashboardSection
                  title="Недавние заметки"
                  icon={<Clock3 aria-hidden="true" className="size-5" />}
                  toolbar={
                    <NotesCollectionControls
                      layout={layout}
                      sort={sort}
                      onLayoutChange={setLayout}
                      onSortChange={setSort}
                    />
                  }
                >
                  <NotesGrid
                    collection="recent-page"
                    notes={sortedNotes}
                    layout={layout}
                    groupsById={groupsById}
                    groups={overview.groups}
                    emptyText="Недавних заметок пока нет."
                    createAction={{
                      label: 'Создать новую заметку',
                      title: 'Новая заметка',
                      description: 'Добавьте новую запись в раздел заметок.',
                      onCreate: () => onCreateNote(null)
                    }}
                    onOpenNote={onOpenNote}
                    onRenameNote={onRenameNote}
                    onMoveNote={onMoveNote}
                    onDeleteNote={onDeleteNote}
                  />
                </DashboardSection>
              </Tabs.Content>

              <Tabs.Content value="groups" className="mt-5 outline-none">
                {selectedGroup ? (
                  <GroupNotesPage
                    group={selectedGroup}
                    notes={selectedGroupNotes}
                    layout={layout}
                    sort={sort}
                    groupsById={groupsById}
                    groups={overview.groups}
                    onBack={() => setSelectedGroupId(null)}
                    onCreateNote={() => onCreateNote(selectedGroup.id)}
                    onGroupIconChange={onGroupIconChange}
                    onLayoutChange={setLayout}
                    onSortChange={setSort}
                    onOpenNote={onOpenNote}
                    onRenameNote={onRenameNote}
                    onMoveNote={onMoveNote}
                    onDeleteNote={onDeleteNote}
                  />
                ) : (
                  <GroupsDirectoryPage
                    groups={visibleGroups}
                    notesByGroup={notesByGroup}
                    hideEmptyGroups={hideEmptyGroups}
                    onHideEmptyGroupsChange={setHideEmptyGroups}
                    onCreateGroup={onCreateGroup}
                    onCreateNote={onCreateNote}
                    onOpenGroup={openGroup}
                    onRenameGroup={onRenameGroup}
                    onGroupIconChange={onGroupIconChange}
                    onDeleteGroup={onDeleteGroup}
                  />
                )}
              </Tabs.Content>

              <Tabs.Content value="ungrouped" className="mt-5 outline-none">
                <DashboardSection
                  title="Без группы"
                  icon={<CircleSlash2 aria-hidden="true" className="size-5" />}
                  toolbar={
                    <NotesCollectionControls
                      layout={layout}
                      sort={sort}
                      onLayoutChange={setLayout}
                      onSortChange={setSort}
                    />
                  }
                >
                  <NotesGrid
                    collection="ungrouped"
                    notes={ungroupedNotes}
                    layout={layout}
                    groupsById={groupsById}
                    groups={overview.groups}
                    emptyText="Все заметки уже распределены по группам."
                    createAction={{
                      label: 'Создать новую заметку',
                      title: 'Новая заметка без группы',
                      description: 'Создайте запись, которую можно распределить позже.',
                      onCreate: () => onCreateNote(null)
                    }}
                    onOpenNote={onOpenNote}
                    onRenameNote={onRenameNote}
                    onMoveNote={onMoveNote}
                    onDeleteNote={onDeleteNote}
                  />
                </DashboardSection>
              </Tabs.Content>
            </>
          )}
        </Tabs.Root>
      </div>
    </section>
  )
}

function GroupsDirectoryPage({
  groups,
  notesByGroup,
  hideEmptyGroups,
  onHideEmptyGroupsChange,
  onCreateGroup,
  onCreateNote,
  onOpenGroup,
  onRenameGroup,
  onGroupIconChange,
  onDeleteGroup
}: {
  groups: NoteGroup[]
  notesByGroup: Map<string | null, NoteSummary[]>
  hideEmptyGroups: boolean
  onHideEmptyGroupsChange: (checked: boolean) => void
  onCreateGroup: () => void
  onCreateNote: (groupId: string | null) => void
  onOpenGroup: (groupId: string) => void
  onRenameGroup: (group: NoteGroup) => void
  onGroupIconChange: (group: NoteGroup, icon: StudyFolderIconName) => void
  onDeleteGroup: (group: NoteGroup) => void
}): React.JSX.Element {
  return (
    <div>
      <DashboardSection
        title="Группы"
        icon={<Folder aria-hidden="true" className="size-5" />}
        toolbar={
          <div className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
            <span>Скрыть пустые</span>
            <Switch.Root
              checked={hideEmptyGroups}
              aria-label="Скрыть пустые группы"
              className="focus-visible:ring-accent-500/35 data-[state=checked]:bg-accent-500 relative h-5 w-9 rounded-full border border-[var(--app-border)] bg-[var(--app-workspace)] transition-colors outline-none focus-visible:ring-2"
              onCheckedChange={onHideEmptyGroupsChange}
            >
              <Switch.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[17px]" />
            </Switch.Root>
          </div>
        }
      >
        <GroupsGrid
          groups={groups}
          notesByGroup={notesByGroup}
          onCreateGroup={onCreateGroup}
          onOpenGroup={onOpenGroup}
          onCreateNote={onCreateNote}
          onRenameGroup={onRenameGroup}
          onGroupIconChange={onGroupIconChange}
          onDeleteGroup={onDeleteGroup}
        />
      </DashboardSection>
    </div>
  )
}

function GroupNotesPage({
  group,
  notes,
  layout,
  sort,
  groupsById,
  groups,
  onBack,
  onCreateNote,
  onGroupIconChange,
  onLayoutChange,
  onSortChange,
  onOpenNote,
  onRenameNote,
  onMoveNote,
  onDeleteNote
}: {
  group: NoteGroup
  notes: NoteSummary[]
  layout: NotesLayout
  sort: NotesSort
  groupsById: Map<string, NoteGroup>
  groups: NoteGroup[]
  onBack: () => void
  onCreateNote: () => void
  onGroupIconChange: (group: NoteGroup, icon: StudyFolderIconName) => void
  onLayoutChange: (layout: NotesLayout) => void
  onSortChange: (sort: NotesSort) => void
  onOpenNote: (noteId: string) => void
  onRenameNote: (note: NoteSummary) => void
  onMoveNote: (note: NoteSummary, groupId: string | null) => void
  onDeleteNote: (note: NoteSummary) => void
}): React.JSX.Element {
  return (
    <div>
      <DashboardSection
        title={group.title}
        icon={<NoteGroupIconPicker group={group} onChange={onGroupIconChange} className="size-5" />}
        backAction={{
          label: 'Вернуться ко всем группам',
          onBack
        }}
        toolbar={
          <NotesCollectionControls
            layout={layout}
            sort={sort}
            onLayoutChange={onLayoutChange}
            onSortChange={onSortChange}
          />
        }
      >
        <NotesGrid
          collection="group"
          notes={notes}
          layout={layout}
          groupsById={groupsById}
          groups={groups}
          emptyText="В этой группе пока нет заметок."
          createAction={{
            label: `Создать заметку в группе «${group.title}»`,
            title: 'Новая заметка',
            description: `Добавьте новую запись в группу «${group.title}».`,
            onCreate: onCreateNote
          }}
          onOpenNote={onOpenNote}
          onRenameNote={onRenameNote}
          onMoveNote={onMoveNote}
          onDeleteNote={onDeleteNote}
        />
      </DashboardSection>
    </div>
  )
}

function DashboardSection({
  title,
  icon,
  backAction,
  actionLabel,
  onAction,
  toolbar,
  children
}: {
  title: string
  icon: React.ReactNode
  backAction?: {
    label: string
    onBack: () => void
  }
  actionLabel?: string
  onAction?: () => void
  toolbar?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]">
      <header className="flex min-h-12 items-center gap-3 border-b border-[var(--app-border)] px-5 py-3 max-[620px]:flex-wrap">
        {backAction && (
          <Tooltip content={backAction.label} side="top">
            <button
              type="button"
              aria-label={backAction.label}
              className="focus-visible:ring-accent-500/35 flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] outline-none hover:text-[var(--app-text)] focus-visible:ring-2"
              onClick={backAction.onBack}
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
            </button>
          </Tooltip>
        )}
        <span className="text-accent-300">{icon}</span>
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

function NotesCollectionControls({
  layout,
  sort,
  onLayoutChange,
  onSortChange
}: {
  layout: NotesLayout
  sort: NotesSort
  onLayoutChange: (layout: NotesLayout) => void
  onSortChange: (sort: NotesSort) => void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <Select.Root
        value={sort}
        onValueChange={(value) => isNotesSort(value) && onSortChange(value)}
      >
        <Select.Trigger
          aria-label="Сортировка заметок"
          className="focus-visible:ring-accent-500/35 flex h-9 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-xs text-[var(--app-muted)] outline-none hover:text-[var(--app-text)] focus-visible:ring-2"
        >
          <span>Сортировка:</span>
          <Select.Value />
          <Select.Icon asChild>
            <ChevronDown aria-hidden="true" className="size-3.5" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={6}
            align="end"
            className="z-[70] min-w-44 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] shadow-2xl"
          >
            <Select.Viewport className="p-1.5">
              <SortItem value="updated">Недавние</SortItem>
              <SortItem value="title">По названию</SortItem>
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      <ToggleGroup.Root
        type="single"
        value={layout}
        aria-label="Вид заметок"
        className="flex rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1"
        onValueChange={(value) => isNotesLayout(value) && onLayoutChange(value)}
      >
        <ToggleGroup.Item
          value="grid"
          aria-label="Показать заметки сеткой"
          className="focus-visible:ring-accent-500/35 data-[state=on]:bg-accent-500 flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] outline-none hover:text-[var(--app-text)] focus-visible:ring-2 data-[state=on]:text-white"
        >
          <LayoutGrid aria-hidden="true" className="size-4" />
        </ToggleGroup.Item>
        <ToggleGroup.Item
          value="list"
          aria-label="Показать заметки списком"
          className="focus-visible:ring-accent-500/35 data-[state=on]:bg-accent-500 flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] outline-none hover:text-[var(--app-text)] focus-visible:ring-2 data-[state=on]:text-white"
        >
          <List aria-hidden="true" className="size-4" />
        </ToggleGroup.Item>
      </ToggleGroup.Root>
    </div>
  )
}

function SortItem({
  value,
  children
}: {
  value: NotesSort
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Select.Item
      value={value}
      className="relative flex cursor-default items-center rounded-lg py-2 pr-8 pl-3 text-sm text-[var(--app-text)] outline-none data-[highlighted]:bg-white/[0.06]"
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator className="absolute right-3">
        <Check aria-hidden="true" className="text-accent-300 size-4" />
      </Select.ItemIndicator>
    </Select.Item>
  )
}

function NotesGrid({
  collection,
  notes,
  layout,
  groupsById,
  groups,
  emptyText = 'Заметок пока нет.',
  createAction,
  onOpenNote,
  onRenameNote,
  onMoveNote,
  onDeleteNote
}: {
  collection: string
  notes: NoteSummary[]
  layout: NotesLayout
  groupsById: Map<string, NoteGroup>
  groups: NoteGroup[]
  emptyText?: string
  createAction?: {
    label: string
    title: string
    description: string
    onCreate: () => void
  }
  onOpenNote: (noteId: string) => void
  onRenameNote: (note: NoteSummary) => void
  onMoveNote: (note: NoteSummary, groupId: string | null) => void
  onDeleteNote: (note: NoteSummary) => void
}): React.JSX.Element {
  if (notes.length === 0 && !createAction) {
    return <SectionEmpty>{emptyText}</SectionEmpty>
  }

  return (
    <div
      data-notes-collection={collection}
      data-notes-layout={layout}
      className={cn(
        layout === 'grid'
          ? 'grid grid-cols-3 gap-3 max-[960px]:grid-cols-2 max-[620px]:grid-cols-1'
          : 'flex flex-col gap-2'
      )}
    >
      {createAction && (
        <CollectionCreateCard
          kind="note"
          layout={layout}
          label={createAction.label}
          title={createAction.title}
          description={createAction.description}
          onCreate={createAction.onCreate}
        />
      )}
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          layout={layout}
          groupTitle={note.groupId ? groupsById.get(note.groupId)?.title : null}
          groups={groups}
          onOpen={() => onOpenNote(note.id)}
          onRename={() => onRenameNote(note)}
          onMove={(groupId) => onMoveNote(note, groupId)}
          onDelete={() => onDeleteNote(note)}
        />
      ))}
    </div>
  )
}

function GroupsGrid({
  groups,
  notesByGroup,
  onCreateGroup,
  onOpenGroup,
  onCreateNote,
  onRenameGroup,
  onGroupIconChange,
  onDeleteGroup
}: {
  groups: NoteGroup[]
  notesByGroup: Map<string | null, NoteSummary[]>
  onCreateGroup?: () => void
  onOpenGroup: (groupId: string) => void
  onCreateNote: (groupId: string | null) => void
  onRenameGroup: (group: NoteGroup) => void
  onGroupIconChange: (group: NoteGroup, icon: StudyFolderIconName) => void
  onDeleteGroup: (group: NoteGroup) => void
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-3 gap-3 max-[960px]:grid-cols-2 max-[620px]:grid-cols-1">
      {onCreateGroup && (
        <CollectionCreateCard
          kind="group"
          label="Создать новую группу"
          title="Новая группа"
          description="Создайте отдельное пространство для связанных заметок."
          onCreate={onCreateGroup}
        />
      )}
      {groups.map((group) => {
        const groupNotes = notesByGroup.get(group.id) ?? []

        return (
          <GroupCard
            key={group.id}
            group={group}
            noteCount={groupNotes.length}
            description={groupNotes[0]?.plainText.trim() || 'Заметки этой группы.'}
            onOpen={() => onOpenGroup(group.id)}
            onCreateNote={() => onCreateNote(group.id)}
            onRename={() => onRenameGroup(group)}
            onIconChange={(icon) => onGroupIconChange(group, icon)}
            onDelete={() => onDeleteGroup(group)}
          />
        )
      })}
    </div>
  )
}

function CollectionCreateCard({
  kind,
  layout = 'grid',
  label,
  title,
  description,
  onCreate
}: {
  kind: 'note' | 'group'
  layout?: NotesLayout
  label: string
  title: string
  description: string
  onCreate: () => void
}): React.JSX.Element {
  const Icon = kind === 'group' ? FolderPlus : FilePlus2

  return (
    <button
      type="button"
      data-notes-create-card={kind}
      aria-label={label}
      className={cn(
        'group flex w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--app-border-strong)] bg-[var(--app-empty-surface)] p-4 text-center outline-none',
        'transition-[background-color,border-color,transform,box-shadow]',
        'hover:-translate-y-px hover:border-[var(--app-accent-500)] hover:bg-[var(--app-card-hover)] hover:shadow-[var(--app-shadow-hover)]',
        'focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)]/35',
        kind === 'group'
          ? 'min-h-44 flex-col'
          : layout === 'list'
            ? 'min-h-28'
            : 'min-h-40 flex-col'
      )}
      onClick={onCreate}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-control)] text-[var(--app-accent-500)] transition-transform group-hover:scale-105">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className={cn('min-w-0', layout === 'list' && kind === 'note' && 'text-left')}>
        <span className="block text-sm font-semibold text-[var(--app-text)]">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-[var(--app-muted)]">{description}</span>
      </span>
    </button>
  )
}

function GroupCard({
  group,
  noteCount,
  description,
  onOpen,
  onCreateNote,
  onRename,
  onIconChange,
  onDelete
}: {
  group: NoteGroup
  noteCount: number
  description: string
  onOpen: () => void
  onCreateNote: () => void
  onRename: () => void
  onIconChange: (icon: StudyFolderIconName) => void
  onDelete: () => void
}): React.JSX.Element {
  return (
    <article className="group relative min-h-44 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
      <div className="flex items-start gap-3 pr-7">
        <NoteGroupIconPicker
          group={group}
          onChange={(_group, icon) => onIconChange(icon)}
          className="size-5"
        />
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[var(--app-text)]">{group.title}</h3>
          <p className="mt-0.5 text-xs text-[var(--app-muted)]">{noteCount} заметок</p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-5 text-[var(--app-muted)]">{description}</p>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Открыть группу «${group.title}»`}
          className="hover:border-accent-500/30 flex h-9 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text)]"
          onClick={onOpen}
        >
          Открыть
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
        <Tooltip content={`Создать заметку в группе «${group.title}»`} side="top">
          <button
            type="button"
            aria-label={`Создать заметку в группе «${group.title}»`}
            className="flex size-9 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:text-[var(--app-text)]"
            onClick={onCreateNote}
          >
            <FilePlus2 aria-hidden="true" className="size-4" />
          </button>
        </Tooltip>
      </div>

      <DropdownMenu.Root>
        <Tooltip content={`Действия группы «${group.title}»`} side="top">
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={`Действия группы «${group.title}»`}
              className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
            >
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </button>
          </DropdownMenu.Trigger>
        </Tooltip>
        <MenuContent>
          <MenuItem icon={<Pencil />} onSelect={onRename}>
            Переименовать
          </MenuItem>
          <MenuItem danger icon={<Trash2 />} onSelect={onDelete}>
            Удалить группу
          </MenuItem>
        </MenuContent>
      </DropdownMenu.Root>
    </article>
  )
}

function NoteGroupIconPicker({
  group,
  onChange,
  className
}: {
  group: NoteGroup
  onChange: (group: NoteGroup, icon: StudyFolderIconName) => void
  className: string
}): React.JSX.Element {
  return (
    <FolderIconPicker
      value={group.icon}
      label="Иконка группы"
      align="start"
      onChange={(icon) => onChange(group, icon)}
      trigger={
        <Tooltip content={`Изменить иконку группы «${group.title}»`} side="top">
          <button
            type="button"
            aria-label={`Изменить иконку группы «${group.title}»`}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--app-accent-500)_15%,transparent)] bg-[color-mix(in_srgb,var(--app-accent-500)_10%,transparent)] text-[var(--app-accent-500)] transition-colors outline-none hover:border-[color-mix(in_srgb,var(--app-accent-500)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--app-accent-500)_15%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)]/35"
          >
            <FolderIcon name={group.icon} expanded className={className} />
          </button>
        </Tooltip>
      }
    />
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
        'group hover:border-accent-500/30 relative overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lg',
        layout === 'grid' ? 'min-h-40' : 'min-h-28'
      )}
    >
      <button
        type="button"
        aria-label={`Открыть заметку «${note.title}»`}
        className={cn(
          'focus-visible:ring-accent-500/40 flex h-full w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-inset',
          layout === 'grid' ? 'flex-col p-4' : 'items-start gap-4 p-4 pr-12'
        )}
        onClick={onOpen}
      >
        {layout === 'grid' && (
          <div className="flex items-start gap-3 pr-8">
            <span className="bg-accent-400 mt-1 size-2 shrink-0 rounded-full" />
            <h3 className="line-clamp-2 leading-5 font-semibold text-[var(--app-text)]">
              {note.title}
            </h3>
          </div>
        )}

        {layout === 'list' && (
          <div className="bg-accent-500/10 text-accent-300 flex size-9 shrink-0 items-center justify-center rounded-xl">
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
        <Tooltip content={`Действия заметки «${note.title}»`} side="top">
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label={`Действия заметки «${note.title}»`}
              className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-lg bg-[var(--app-surface)] text-[var(--app-muted)] opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus:opacity-100"
            >
              <MoreHorizontal aria-hidden="true" className="size-4" />
            </button>
          </DropdownMenu.Trigger>
        </Tooltip>
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
    <span className="bg-accent-500/10 text-accent-300 mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-1 text-[10px]">
      {title ? (
        <Folder aria-hidden="true" className="size-3" />
      ) : (
        <CircleSlash2 aria-hidden="true" className="size-3" />
      )}
      <span className="truncate">{title ?? 'Без группы'}</span>
    </span>
  )
}

function NotesTab({
  value,
  children
}: {
  value: NotesView
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tabs.Trigger
      value={value}
      className="focus-visible:ring-accent-500/35 data-[state=active]:bg-accent-500 flex h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-sm text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] focus-visible:ring-2 data-[state=active]:text-white"
    >
      {children}
    </Tabs.Trigger>
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
      className="hover:border-accent-500/30 flex min-h-24 items-center gap-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-5 py-4 text-left"
      onClick={onClick}
    >
      <span className="bg-accent-500/10 text-accent-300 flex size-11 shrink-0 items-center justify-center rounded-xl">
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

function SectionEmpty({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <p className="rounded-xl border border-dashed border-[var(--app-border)] px-4 py-8 text-center text-sm text-[var(--app-muted)]">
      {children}
    </p>
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
        'focus-visible:ring-accent-500/35 flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
        primary
          ? 'bg-accent-500 hover:bg-accent-400 text-white'
          : 'hover:border-accent-500/30 border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)]'
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
      <div className="bg-accent-500/10 text-accent-300 flex size-14 items-center justify-center rounded-2xl">
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

function sortNotes(notes: NoteSummary[], sort: NotesSort): NoteSummary[] {
  if (sort === 'title') {
    return [...notes].sort((left, right) => left.title.localeCompare(right.title, 'ru-RU'))
  }

  return [...notes].sort((left, right) => right.updatedAt - left.updatedAt)
}

function isNotesView(value: string): value is NotesView {
  return value === 'all' || value === 'recent' || value === 'groups' || value === 'ungrouped'
}

function isNotesLayout(value: string): value is NotesLayout {
  return value === 'grid' || value === 'list'
}

function isNotesSort(value: string): value is NotesSort {
  return value === 'updated' || value === 'title'
}
