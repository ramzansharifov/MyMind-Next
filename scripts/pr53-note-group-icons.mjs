import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function write(path, content) {
  fs.writeFileSync(path, content)
}

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) {
    throw new Error(`${label}: expected 1 match, found ${count}`)
  }
  return source.replace(before, after)
}

function replaceRegexOnce(source, pattern, after, label) {
  const matches = source.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`))
  if ((matches?.length ?? 0) !== 1) {
    throw new Error(`${label}: expected 1 match, found ${matches?.length ?? 0}`)
  }
  return source.replace(pattern, after)
}

// Repository persistence.
{
  const path = 'src/main/repositories/notes.repository.ts'
  let source = read(path)
  source = replaceOnce(
    source,
    "import type {\n  CreateNoteInput,\n  NoteDocument,",
    "import type {\n  CreateNoteInput,\n  NoteDocument,",
    'repository import anchor'
  )
  source = replaceOnce(
    source,
    "} from '../../shared/contracts/notes'\n",
    "} from '../../shared/contracts/notes'\nimport type { StudyFolderIconName } from '../../shared/contracts/study'\n",
    'repository study icon import'
  )
  source = replaceOnce(
    source,
    "      title: title?.trim() || 'Новая группа',\n      createdAt: now,",
    "      title: title?.trim() || 'Новая группа',\n      icon: 'folder',\n      createdAt: now,",
    'default note group icon'
  )
  source = replaceOnce(
    source,
    "export function deleteNoteGroup(id: string): boolean {",
    `export function updateNoteGroupIcon(id: string, icon: StudyFolderIconName): NoteGroup {
  const database = getDatabase()
  const now = new Date()
  const result = database
    .update(noteGroups)
    .set({ icon, updatedAt: now })
    .where(eq(noteGroups.id, id))
    .run()

  if (result.changes === 0) {
    throw new Error('Группа заметок не найдена')
  }

  const updated = database.select().from(noteGroups).where(eq(noteGroups.id, id)).get()

  if (!updated) {
    throw new Error('Группа заметок не найдена')
  }

  return mapNoteGroup(updated)
}

export function deleteNoteGroup(id: string): boolean {`,
    'repository update icon function'
  )
  write(path, source)
}

// IPC handler.
{
  const path = 'src/main/ipc/register-notes-ipc.ts'
  let source = read(path)
  source = replaceOnce(
    source,
    '  saveNoteInputSchema\n',
    '  saveNoteInputSchema,\n  updateNoteGroupIconInputSchema\n',
    'IPC validation import'
  )
  source = replaceOnce(
    source,
    '  saveNote\n',
    '  saveNote,\n  updateNoteGroupIcon\n',
    'IPC repository import'
  )
  source = replaceOnce(
    source,
    "  ipcMain.handle(NOTES_IPC_CHANNELS.deleteGroup, (_event, rawId: unknown) =>",
    `  ipcMain.handle(NOTES_IPC_CHANNELS.updateGroupIcon, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const input = updateNoteGroupIconInputSchema.parse(rawInput)
      return updateNoteGroupIcon(input.id, input.icon)
    })
  )

  ipcMain.handle(NOTES_IPC_CHANNELS.deleteGroup, (_event, rawId: unknown) =>`,
    'IPC update icon handler'
  )
  write(path, source)
}

// Preload API.
{
  const path = 'src/preload/index.ts'
  let source = read(path)
  source = replaceOnce(
    source,
    "    renameGroup: (input) =>\n      ipcRenderer.invoke(NOTES_IPC_CHANNELS.renameGroup, input) as Promise<NoteGroup>,\n\n    deleteGroup:",
    "    renameGroup: (input) =>\n      ipcRenderer.invoke(NOTES_IPC_CHANNELS.renameGroup, input) as Promise<NoteGroup>,\n\n    updateGroupIcon: (input) =>\n      ipcRenderer.invoke(NOTES_IPC_CHANNELS.updateGroupIcon, input) as Promise<NoteGroup>,\n\n    deleteGroup:",
    'preload update icon method'
  )
  write(path, source)
}

// Renderer client.
{
  const path = 'src/renderer/src/modules/notes/api/notes-client.ts'
  let source = read(path)
  source = replaceOnce(
    source,
    '  StudyLocalAsset\n',
    '  StudyFolderIconName,\n  StudyLocalAsset\n',
    'client icon type import'
  )
  source = replaceOnce(
    source,
    "  renameGroup(id: string, title: string): Promise<NoteGroup> {\n    return getNotesApi().renameGroup({ id, title })\n  },\n\n  deleteGroup",
    "  renameGroup(id: string, title: string): Promise<NoteGroup> {\n    return getNotesApi().renameGroup({ id, title })\n  },\n\n  updateGroupIcon(id: string, icon: StudyFolderIconName): Promise<NoteGroup> {\n    return getNotesApi().updateGroupIcon({ id, icon })\n  },\n\n  deleteGroup",
    'client update icon method'
  )
  write(path, source)
}

// Make the shared picker reusable for groups and respect the selected accent.
{
  const path = 'src/renderer/src/shared/ui/FolderIconPicker.tsx'
  let source = read(path)
  source = replaceOnce(
    source,
    "  align?: 'start' | 'center' | 'end'\n}",
    "  align?: 'start' | 'center' | 'end'\n  label?: string\n}",
    'picker label prop'
  )
  source = replaceOnce(
    source,
    "  trigger,\n  align = 'end'\n}: FolderIconPickerProps)",
    "  trigger,\n  align = 'end',\n  label = 'Иконка папки'\n}: FolderIconPickerProps)",
    'picker label default'
  )
  source = replaceOnce(
    source,
    '            Иконка папки\n',
    '            {label}\n',
    'picker label render'
  )
  source = replaceOnce(
    source,
    "                      'border-violet-500/25 bg-violet-500/15 text-violet-200 shadow-sm'",
    "                      '[border-color:color-mix(in_srgb,var(--app-accent-500)_25%,transparent)] [background:color-mix(in_srgb,var(--app-accent-500)_15%,transparent)] text-[var(--app-accent-500)] shadow-sm'",
    'picker accent state'
  )
  write(path, source)
}

// Notes page state and API callback.
{
  const path = 'src/renderer/src/modules/notes/NotesPage.tsx'
  let source = read(path)
  source = replaceOnce(
    source,
    "import type { NoteGroup, NoteSummary, NotesOverview } from '../../../../shared/contracts/notes'\n",
    "import type { NoteGroup, NoteSummary, NotesOverview } from '../../../../shared/contracts/notes'\nimport type { StudyFolderIconName } from '../../../../shared/contracts/study'\n",
    'NotesPage icon import'
  )
  source = replaceOnce(
    source,
    "  if (selectedNoteId) {",
    `  const handleGroupIconChange = useCallback(
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

  if (selectedNoteId) {`,
    'NotesPage group icon handler'
  )
  source = replaceOnce(
    source,
    '        onRenameGroup={setRenameGroupTarget}\n',
    '        onRenameGroup={setRenameGroupTarget}\n        onGroupIconChange={(group, icon) => void handleGroupIconChange(group, icon)}\n',
    'NotesPage home callback'
  )
  write(path, source)
}

// Notes home: shared picker on group cards and selected group header.
{
  const path = 'src/renderer/src/modules/notes/components/NotesHome.tsx'
  let source = read(path)
  source = replaceOnce(
    source,
    "import type { NoteGroup, NoteSummary, NotesOverview } from '../../../../../shared/contracts/notes'\n",
    "import type { NoteGroup, NoteSummary, NotesOverview } from '../../../../../shared/contracts/notes'\nimport type { StudyFolderIconName } from '../../../../../shared/contracts/study'\n",
    'NotesHome icon type import'
  )
  source = replaceOnce(
    source,
    "import { cn } from '../../../shared/lib/cn'\n",
    "import { cn } from '../../../shared/lib/cn'\nimport { FolderIcon } from '../../../shared/ui/FolderIcon'\nimport { FolderIconPicker } from '../../../shared/ui/FolderIconPicker'\n",
    'NotesHome shared icon imports'
  )
  source = replaceOnce(
    source,
    '  onRenameGroup: (group: NoteGroup) => void\n',
    '  onRenameGroup: (group: NoteGroup) => void\n  onGroupIconChange: (group: NoteGroup, icon: StudyFolderIconName) => void\n',
    'NotesHome prop type'
  )
  source = replaceOnce(
    source,
    '  onRenameGroup,\n  onDeleteGroup,',
    '  onRenameGroup,\n  onGroupIconChange,\n  onDeleteGroup,',
    'NotesHome prop destructure'
  )
  source = replaceOnce(
    source,
    '                      onRenameGroup={onRenameGroup}\n                      onDeleteGroup={onDeleteGroup}',
    '                      onRenameGroup={onRenameGroup}\n                      onGroupIconChange={onGroupIconChange}\n                      onDeleteGroup={onDeleteGroup}',
    'home preview GroupsGrid callback'
  )
  source = replaceOnce(
    source,
    '                    onRenameNote={onRenameNote}\n                    onMoveNote={onMoveNote}',
    '                    onGroupIconChange={onGroupIconChange}\n                    onRenameNote={onRenameNote}\n                    onMoveNote={onMoveNote}',
    'selected group page callback'
  )
  source = replaceOnce(
    source,
    '                    onRenameGroup={onRenameGroup}\n                    onDeleteGroup={onDeleteGroup}',
    '                    onRenameGroup={onRenameGroup}\n                    onGroupIconChange={onGroupIconChange}\n                    onDeleteGroup={onDeleteGroup}',
    'groups directory callback'
  )

  source = replaceOnce(
    source,
    '  onRenameGroup,\n  onDeleteGroup\n}: {\n  groups: NoteGroup[]',
    '  onRenameGroup,\n  onGroupIconChange,\n  onDeleteGroup\n}: {\n  groups: NoteGroup[]',
    'GroupsDirectory destructure'
  )
  source = replaceOnce(
    source,
    '  onRenameGroup: (group: NoteGroup) => void\n  onDeleteGroup: (group: NoteGroup) => void\n}): React.JSX.Element {',
    '  onRenameGroup: (group: NoteGroup) => void\n  onGroupIconChange: (group: NoteGroup, icon: StudyFolderIconName) => void\n  onDeleteGroup: (group: NoteGroup) => void\n}): React.JSX.Element {',
    'GroupsDirectory callback type'
  )
  source = replaceOnce(
    source,
    '          onRenameGroup={onRenameGroup}\n          onDeleteGroup={onDeleteGroup}',
    '          onRenameGroup={onRenameGroup}\n          onGroupIconChange={onGroupIconChange}\n          onDeleteGroup={onDeleteGroup}',
    'GroupsDirectory grid callback'
  )

  source = replaceOnce(
    source,
    '  onRenameNote,\n  onMoveNote,',
    '  onGroupIconChange,\n  onRenameNote,\n  onMoveNote,',
    'GroupNotesPage destructure'
  )
  source = replaceOnce(
    source,
    '  onCreateNote: () => void\n  onLayoutChange:',
    '  onCreateNote: () => void\n  onGroupIconChange: (group: NoteGroup, icon: StudyFolderIconName) => void\n  onLayoutChange:',
    'GroupNotesPage callback type'
  )
  source = replaceOnce(
    source,
    '        icon={<Folder aria-hidden="true" className="size-5" />}\n        backAction={{',
    `        icon={
          <NoteGroupIconPicker
            group={group}
            onChange={onGroupIconChange}
            className="size-5"
          />
        }
        backAction={{`,
    'selected group header icon'
  )

  source = replaceOnce(
    source,
    '  onRenameGroup,\n  onDeleteGroup\n}: {\n  groups: NoteGroup[]\n  notesByGroup:',
    '  onRenameGroup,\n  onGroupIconChange,\n  onDeleteGroup\n}: {\n  groups: NoteGroup[]\n  notesByGroup:',
    'GroupsGrid destructure'
  )
  source = replaceOnce(
    source,
    '  onRenameGroup: (group: NoteGroup) => void\n  onDeleteGroup: (group: NoteGroup) => void\n}): React.JSX.Element {\n  return (\n    <div className="grid grid-cols-3',
    '  onRenameGroup: (group: NoteGroup) => void\n  onGroupIconChange: (group: NoteGroup, icon: StudyFolderIconName) => void\n  onDeleteGroup: (group: NoteGroup) => void\n}): React.JSX.Element {\n  return (\n    <div className="grid grid-cols-3',
    'GroupsGrid callback type'
  )
  source = replaceOnce(
    source,
    '            onRename={() => onRenameGroup(group)}\n            onDelete={() => onDeleteGroup(group)}',
    '            onRename={() => onRenameGroup(group)}\n            onIconChange={(icon) => onGroupIconChange(group, icon)}\n            onDelete={() => onDeleteGroup(group)}',
    'GroupCard icon callback'
  )

  source = replaceOnce(
    source,
    '  onRename,\n  onDelete\n}: {\n  group: NoteGroup',
    '  onRename,\n  onIconChange,\n  onDelete\n}: {\n  group: NoteGroup',
    'GroupCard destructure'
  )
  source = replaceOnce(
    source,
    '  onRename: () => void\n  onDelete: () => void\n}): React.JSX.Element {',
    '  onRename: () => void\n  onIconChange: (icon: StudyFolderIconName) => void\n  onDelete: () => void\n}): React.JSX.Element {',
    'GroupCard callback type'
  )
  source = replaceOnce(
    source,
    `        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
          <Folder aria-hidden="true" className="size-5" />
        </div>`,
    `        <NoteGroupIconPicker
          group={group}
          onChange={(_group, icon) => onIconChange(icon)}
          className="size-5"
        />`,
    'GroupCard icon picker'
  )

  source = replaceOnce(
    source,
    '\nfunction NoteCard({',
    `
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
        <button
          type="button"
          aria-label={\`Изменить иконку группы «\${group.title}»\`}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--app-accent-500)_15%,transparent)] bg-[color-mix(in_srgb,var(--app-accent-500)_10%,transparent)] text-[var(--app-accent-500)] outline-none transition-colors hover:border-[color-mix(in_srgb,var(--app-accent-500)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--app-accent-500)_15%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)]/35"
        >
          <FolderIcon name={group.icon} expanded className={className} />
        </button>
      }
    />
  )
}

function NoteCard({`,
    'NoteGroupIconPicker helper'
  )
  write(path, source)
}

// Preload contract test expects the new API method.
{
  const path = 'src/preload/index.test.ts'
  let source = read(path)
  if (!source.includes("'updateGroupIcon'")) {
    source = replaceOnce(
      source,
      "      'renameGroup',\n",
      "      'renameGroup',\n      'updateGroupIcon',\n",
      'preload test method list'
    )
  }
  write(path, source)
}

// Repository test: default and persisted group icon.
{
  const path = 'src/main/repositories/notes.repository.test.ts'
  let source = read(path)
  source = replaceOnce(
    source,
    '  renameNoteGroup,\n',
    '  renameNoteGroup,\n  updateNoteGroupIcon,\n',
    'repository test import'
  )
  source = replaceRegexOnce(
    source,
    /const group = createNoteGroup\('Проекты'\)/,
    "const group = createNoteGroup('Проекты')\n    expect(group.icon).toBe('folder')\n    expect(updateNoteGroupIcon(group.id, 'science').icon).toBe('science')",
    'repository icon assertion'
  )
  write(path, source)
}

// Renderer fixtures and icon-picker behavior.
{
  const path = 'src/renderer/src/modules/notes/NotesPage.test.tsx'
  let source = read(path)
  source = replaceOnce(
    source,
    '  renameGroup: vi.fn(),\n',
    '  renameGroup: vi.fn(),\n  updateGroupIcon: vi.fn(),\n',
    'NotesPage test mock'
  )
  source = replaceOnce(
    source,
    "  title: 'Работа',\n  createdAt:",
    "  title: 'Работа',\n  icon: 'work',\n  createdAt:",
    'NotesPage group fixture icon'
  )
  source = replaceOnce(
    source,
    '  notesMocks.createGroup.mockResolvedValue({\n    id:',
    "  notesMocks.updateGroupIcon.mockImplementation(async ({ id, icon }) => ({\n    ...group,\n    id,\n    icon\n  }))\n  notesMocks.createGroup.mockResolvedValue({\n    id:",
    'NotesPage icon mock implementation'
  )
  source = replaceOnce(
    source,
    "    title: 'Проекты',\n    createdAt:",
    "    title: 'Проекты',\n    icon: 'folder',\n    createdAt:",
    'created group fixture icon'
  )
  source = replaceOnce(
    source,
    "  it('opens a group as a dedicated notes page', async () => {",
    `  it('updates a group icon through the shared folder icon picker', async () => {
    const user = userEvent.setup()
    render(<NotesPage />)

    await screen.findByRole('heading', { name: 'Заметки' })
    await user.click(screen.getByRole('button', { name: 'Изменить иконку группы «Работа»' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Наука' }))

    await waitFor(() =>
      expect(notesMocks.updateGroupIcon).toHaveBeenCalledWith('group-work', 'science')
    )
  })

  it('opens a group as a dedicated notes page', async () => {`,
    'NotesPage icon test'
  )
  write(path, source)
}
