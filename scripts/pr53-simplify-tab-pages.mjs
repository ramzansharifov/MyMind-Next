import { readFileSync, writeFileSync } from 'node:fs'

const filePath = 'src/renderer/src/modules/notes/components/NotesHome.tsx'
let source = readFileSync(filePath, 'utf8')

function replaceOnce(oldValue, newValue, label) {
  const index = source.indexOf(oldValue)
  if (index < 0) throw new Error(`Missing transformation target: ${label}`)
  if (source.indexOf(oldValue, index + oldValue.length) >= 0) {
    throw new Error(`Ambiguous transformation target: ${label}`)
  }
  source = source.slice(0, index) + newValue + source.slice(index + oldValue.length)
}

replaceOnce(
  `              <Tabs.Content value="recent" className="mt-5 outline-none">
                <NotesPageHeader
                  eyebrow="Недавние"
                  title="Недавние заметки"
                  description="Заметки в порядке последних изменений."
                />
                <DashboardSection`,
  `              <Tabs.Content value="recent" className="mt-5 outline-none">
                <DashboardSection`,
  'remove recent page header'
)

replaceOnce(
  `                    emptyText="Недавних заметок пока нет."
                    onOpenNote={onOpenNote}`,
  `                    emptyText="Недавних заметок пока нет."
                    createAction={{
                      label: 'Создать новую заметку',
                      title: 'Новая заметка',
                      description: 'Добавьте новую запись в раздел заметок.',
                      onCreate: () => onCreateNote(null)
                    }}
                    onOpenNote={onOpenNote}`,
  'add recent create card'
)

replaceOnce(
  `              <Tabs.Content value="ungrouped" className="mt-5 outline-none">
                <NotesPageHeader
                  eyebrow="Без группы"
                  title="Заметки без группы"
                  description="Записи, которые ещё не распределены по группам."
                  action={
                    <ActionButton primary onClick={() => onCreateNote(null)}>
                      <FilePlus2 aria-hidden="true" className="size-4" />
                      Новая заметка
                    </ActionButton>
                  }
                />
                <DashboardSection`,
  `              <Tabs.Content value="ungrouped" className="mt-5 outline-none">
                <DashboardSection`,
  'remove ungrouped page header'
)

replaceOnce(
  `                    emptyText="Все заметки уже распределены по группам."
                    onOpenNote={onOpenNote}`,
  `                    emptyText="Все заметки уже распределены по группам."
                    createAction={{
                      label: 'Создать новую заметку',
                      title: 'Новая заметка без группы',
                      description: 'Создайте запись, которую можно распределить позже.',
                      onCreate: () => onCreateNote(null)
                    }}
                    onOpenNote={onOpenNote}`,
  'add ungrouped create card'
)

replaceOnce(
  `    <div className="space-y-4">
      <NotesPageHeader
        eyebrow="По группам"
        title="Все группы"
        description="Откройте группу, чтобы увидеть собранные в ней заметки."
        action={
          <ActionButton onClick={onCreateGroup}>
            <FolderPlus aria-hidden="true" className="size-4" />
            Новая группа
          </ActionButton>
        }
      />

      <DashboardSection`,
  `    <div>
      <DashboardSection`,
  'remove groups directory page header'
)

replaceOnce(
  `        {groups.length > 0 ? (
          <GroupsGrid
            groups={groups}
            notesByGroup={notesByGroup}
            onOpenGroup={onOpenGroup}
            onCreateNote={onCreateNote}
            onRenameGroup={onRenameGroup}
            onDeleteGroup={onDeleteGroup}
          />
        ) : (
          <SectionEmpty>
            {hideEmptyGroups
              ? 'Нет непустых групп. Отключите фильтр или создайте заметку в группе.'
              : 'Групп пока нет.'}
          </SectionEmpty>
        )}`,
  `        <GroupsGrid
          groups={groups}
          notesByGroup={notesByGroup}
          onCreateGroup={onCreateGroup}
          onOpenGroup={onOpenGroup}
          onCreateNote={onCreateNote}
          onRenameGroup={onRenameGroup}
          onDeleteGroup={onDeleteGroup}
        />`,
  'replace groups empty state with create card'
)

replaceOnce(
  `                    onCreateNote={() => onCreateNote(selectedGroup.id)}
                    onRenameGroup={() => onRenameGroup(selectedGroup)}
                    onDeleteGroup={() => onDeleteGroup(selectedGroup)}
                    onLayoutChange={setLayout}`,
  `                    onCreateNote={() => onCreateNote(selectedGroup.id)}
                    onLayoutChange={setLayout}`,
  'remove selected group header actions from invocation'
)

replaceOnce(
  `  onCreateNote,
  onRenameGroup,
  onDeleteGroup,
  onLayoutChange,`,
  `  onCreateNote,
  onLayoutChange,`,
  'remove selected group header actions from parameters'
)

replaceOnce(
  `  onCreateNote: () => void
  onRenameGroup: () => void
  onDeleteGroup: () => void
  onLayoutChange:`,
  `  onCreateNote: () => void
  onLayoutChange:`,
  'remove selected group header action types'
)

const groupPageStart = source.indexOf('function GroupNotesPage(')
if (groupPageStart < 0) throw new Error('Missing GroupNotesPage')
const groupReturnStart = source.indexOf(
  '  return (\n    <div className="space-y-4">\n',
  groupPageStart
)
if (groupReturnStart < 0) throw new Error('Missing GroupNotesPage return')
const groupSectionStart = source.indexOf('      <DashboardSection', groupReturnStart)
if (groupSectionStart < 0) throw new Error('Missing GroupNotesPage DashboardSection')
source =
  source.slice(0, groupReturnStart) +
  '  return (\n    <div>\n' +
  source.slice(groupSectionStart)

replaceOnce(
  `      <DashboardSection
        title={group.title}
        icon={<Folder aria-hidden="true" className="size-5" />}`, 
  `      <DashboardSection
        title={group.title}
        icon={<Folder aria-hidden="true" className="size-5" />}
        backAction={{
          label: 'Вернуться ко всем группам',
          onBack
        }}`,
  'move group back action into block header'
)

replaceOnce(
  `          emptyText="В этой группе пока нет заметок."
          onOpenNote={onOpenNote}`,
  `          emptyText="В этой группе пока нет заметок."
          createAction={{
            label: \`Создать заметку в группе «\${group.title}»\`,
            title: 'Новая заметка',
            description: \`Добавьте новую запись в группу «\${group.title}».\`,
            onCreate: onCreateNote
          }}
          onOpenNote={onOpenNote}`,
  'add selected group create card'
)

const pageHeaderStart = source.indexOf('function NotesPageHeader(')
const dashboardStart = source.indexOf('function DashboardSection(', pageHeaderStart)
if (pageHeaderStart < 0 || dashboardStart < 0) throw new Error('Missing NotesPageHeader block')
source = source.slice(0, pageHeaderStart) + source.slice(dashboardStart)

replaceOnce(
  `function DashboardSection({
  title,
  icon,
  actionLabel,`,
  `function DashboardSection({
  title,
  icon,
  backAction,
  actionLabel,`,
  'add dashboard back action parameter'
)

replaceOnce(
  `  title: string
  icon: React.ReactNode
  actionLabel?: string`,
  `  title: string
  icon: React.ReactNode
  backAction?: {
    label: string
    onBack: () => void
  }
  actionLabel?: string`,
  'add dashboard back action type'
)

replaceOnce(
  `      <header className="flex min-h-12 items-center gap-3 border-b border-[var(--app-border)] px-5 py-3 max-[620px]:flex-wrap">
        <span className="text-violet-300">{icon}</span>`,
  `      <header className="flex min-h-12 items-center gap-3 border-b border-[var(--app-border)] px-5 py-3 max-[620px]:flex-wrap">
        {backAction && (
          <button
            type="button"
            aria-label={backAction.label}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] outline-none hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35"
            onClick={backAction.onBack}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </button>
        )}
        <span className="text-violet-300">{icon}</span>`,
  'render dashboard back action'
)

replaceOnce(
  `  emptyText = 'Заметок пока нет.',
  onOpenNote,`,
  `  emptyText = 'Заметок пока нет.',
  createAction,
  onOpenNote,`,
  'add notes create action parameter'
)

replaceOnce(
  `  emptyText?: string
  onOpenNote:`,
  `  emptyText?: string
  createAction?: {
    label: string
    title: string
    description: string
    onCreate: () => void
  }
  onOpenNote:`,
  'add notes create action type'
)

replaceOnce(
  `  if (notes.length === 0) {
    return <SectionEmpty>{emptyText}</SectionEmpty>
  }`,
  `  if (notes.length === 0 && !createAction) {
    return <SectionEmpty>{emptyText}</SectionEmpty>
  }`,
  'preserve empty state only without create action'
)

replaceOnce(
  `    >
      {notes.map((note) => (`,
  `    >
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
      {notes.map((note) => (`,
  'render note create card'
)

replaceOnce(
  `  notesByGroup,
  onOpenGroup,`,
  `  notesByGroup,
  onCreateGroup,
  onOpenGroup,`,
  'add group create action parameter'
)

replaceOnce(
  `  notesByGroup: Map<string | null, NoteSummary[]>
  onOpenGroup:`,
  `  notesByGroup: Map<string | null, NoteSummary[]>
  onCreateGroup?: () => void
  onOpenGroup:`,
  'add group create action type'
)

replaceOnce(
  `    <div className="grid grid-cols-3 gap-3 max-[960px]:grid-cols-2 max-[620px]:grid-cols-1">
      {groups.map((group) => {`,
  `    <div className="grid grid-cols-3 gap-3 max-[960px]:grid-cols-2 max-[620px]:grid-cols-1">
      {onCreateGroup && (
        <CollectionCreateCard
          kind="group"
          label="Создать новую группу"
          title="Новая группа"
          description="Создайте отдельное пространство для связанных заметок."
          onCreate={onCreateGroup}
        />
      )}
      {groups.map((group) => {`,
  'render group create card'
)

const groupCardStart = source.indexOf('function GroupCard(')
if (groupCardStart < 0) throw new Error('Missing GroupCard insertion point')
const createCard = `function CollectionCreateCard({
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
        kind === 'group' ? 'min-h-44 flex-col' : layout === 'list' ? 'min-h-28' : 'min-h-40 flex-col'
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

`
source = source.slice(0, groupCardStart) + createCard + source.slice(groupCardStart)

writeFileSync(filePath, source)
