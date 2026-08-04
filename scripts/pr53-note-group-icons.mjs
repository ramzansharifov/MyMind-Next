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

function updateInlineSignature(source, functionName, transform) {
  const pattern = new RegExp(
    `function ${functionName}\\(\\{[\\s\\S]*?\\n\\}: \\{[\\s\\S]*?\\n\\}\\): React\\.JSX\\.Element \\{`
  )
  const match = source.match(pattern)

  if (!match) {
    throw new Error(`${functionName}: signature was not found`)
  }

  const updated = transform(match[0])

  if (updated === match[0]) {
    throw new Error(`${functionName}: signature was not changed`)
  }

  return source.replace(match[0], updated)
}

function updateNotesHomeSignature(source, transform) {
  const pattern = /export function NotesHome\(\{[\s\S]*?\}: NotesHomeProps\): React\.JSX\.Element \{/
  const match = source.match(pattern)

  if (!match) {
    throw new Error('NotesHome: signature was not found')
  }

  const updated = transform(match[0])

  if (updated === match[0]) {
    throw new Error('NotesHome: signature was not changed')
  }

  return source.replace(match[0], updated)
}

// Repository persistence.
{
  const path = 'src/main/repositories/notes.repository.ts'
  let source = read(path)

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
    'export function deleteNoteGroup(id: string): boolean {',
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
    '  renameNoteInputSchema,\n  saveNoteInputSchema\n',
    '  renameNoteInputSchema,\n  saveNoteInputSchema,\n  updateNoteGroupIconInputSchema\n',
    'IPC validation import'
  )
  source = replaceOnce(
    source,
    '  renameNoteGroup,\n  saveNote\n',
    '  renameNoteGroup,\n  saveNote,\n  updateNoteGroupIcon\n',
    'IPC repository import'
  )
  source = replaceOnce(
    source,
    '  ipcMain.handle(NOTES_IPC_CHANNELS.deleteGroup, (_event, rawId: unknown) =>',
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
    `    renameGroup: (input) =>
      ipcRenderer.invoke(NOTES_IPC_CHANNELS.renameGroup, input) as Promise<NoteGroup>,

    deleteGroup:`,
    `    renameGroup: (input) =>
      ipcRenderer.invoke(NOTES_IPC_CHANNELS.renameGroup, input) as Promise<NoteGroup>,

    updateGroupIcon: (input) =>
      ipcRenderer.invoke(NOTES_IPC_CHANNELS.updateGroupIcon, input) as Promise<NoteGroup>,

    deleteGroup:`,
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
    '  OpenStudyAssetInput,\n  StudyLocalAsset\n',
    '  OpenStudyAssetInput,\n  StudyFolderIconName,\n  StudyLocalAsset\n',
    'client icon type import'
  )
  source = replaceOnce(
    source,
    `  renameGroup(id: string, title: string): Promise<NoteGroup> {
    return getNotesApi().renameGroup({ id, title })
  },

  deleteGroup`,
    `  renameGroup(id: string, title: string): Promise<NoteGroup> {
    return getNotesApi().renameGroup({ id, title })
  },

  updateGroupIcon(id: string, icon: StudyFolderIconName): Promise<NoteGroup> {
    return getNotesApi().updateGroupIcon({ id, icon })
  },

  deleteGroup`,
    'client update icon method'
  )

  write(path, source)
}

// Make the shared picker reusable for groups and use the selected accent.
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
    'picker active accent'
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
    '  if (selectedNoteId) {',
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
    '        onRenameGroup={setRenameGroupTarget}\n        onDeleteGroup={setDeleteGroupTarget}',
    '        onRenameGroup={setRenameGroupTarget}\n        onGroupIconChange={(group, icon) => void handleGroupIconChange(group, icon)}\n        onDeleteGroup={setDeleteGroupTarget}',
    'NotesPage home callback'
  )

  write(path, source)
}

// Notes home: display and edit the persisted group icon everywhere a group is represented.
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
    `interface NotesHomeProps {
  overview: NotesOverview
  isLoading: boolean
  onOpenNote: (noteId: string) => void
  onCreateGroup: () => void
  onCreateNote: (groupId: string | null) => void
  onRenameGroup: (group: NoteGroup) => void
  onDeleteGroup: (group: NoteGroup) => void`,
    `interface NotesHomeProps {
  overview: NotesOverview
  isLoading: boolean
  onOpenNote: (noteId: string) => void
  onCreateGroup: () => void
  onCreateNote: (groupId: string | null) => void
  onRenameGroup: (group: NoteGroup) => void
  onGroupIconChange: (group: NoteGroup, icon: StudyFolderIconName) => void
  onDeleteGroup: (group: NoteGroup) => void`,
    'NotesHome prop type'
  )
  source = updateNotesHomeSignature(source, (signature) =>
    replaceOnce(
      signature,
      '  onRenameGroup,\n  onDeleteGroup,',
      '  onRenameGroup,\n  onGroupIconChange,\n  onDeleteGroup,',
      'NotesHome prop destructure'
    )
  )

  source = replaceOnce(
    source,
    `                      onCreateNote={onCreateNote}
                      onRenameGroup={onRenameGroup}
                      onDeleteGroup={onDeleteGroup}`,
    `                      onCreateNote={onCreateNote}
                      onRenameGroup={onRenameGroup}
                      onGroupIconChange={onGroupIconChange}
                      onDeleteGroup={onDeleteGroup}`,
    'home preview GroupsGrid callback'
  )
  source = replaceOnce(
    source,
    `                    onCreateNote={() => onCreateNote(selectedGroup.id)}
                    onLayoutChange={setLayout}`,
    `                    onCreateNote={() => onCreateNote(selectedGroup.id)}
                    onGroupIconChange={onGroupIconChange}
                    onLayoutChange={setLayout}`,
    'selected group page callback'
  )
  source = replaceOnce(
    source,
    `                    onOpenGroup={openGroup}
                    onRenameGroup={onRenameGroup}
                    onDeleteGroup={onDeleteGroup}`,
    `                    onOpenGroup={openGroup}
                    onRenameGroup={onRenameGroup}
                    onGroupIconChange={onGroupIconChange}
                    onDeleteGroup={onDeleteGroup}`,
    'groups directory callback'
  )

  source = updateInlineSignature(source, 'GroupsDirectoryPage', (signature) => {
    let updated = replaceOnce(
      signature,
      '  onRenameGroup,\n  onDeleteGroup',
      '  onRenameGroup,\n  onGroupIconChange,\n  onDeleteGroup',
      'GroupsDirectory destructure'
    )
    updated = replaceOnce(
      updated,
      '  onRenameGroup: (group: NoteGroup) => void\n  onDeleteGroup: (group: NoteGroup) => void',
      '  onRenameGroup: (group: NoteGroup) => void\n  onGroupIconChange: (group: NoteGroup, icon: StudyFolderIconName) => void\n  onDeleteGroup: (group: NoteGroup) => void',
      'GroupsDirectory callback type'
    )
    return updated
  })
  source = replaceOnce(
    source,
    `          onCreateNote={onCreateNote}
          onRenameGroup={onRenameGroup}
          onDeleteGroup={onDeleteGroup}`,
    `          onCreateNote={onCreateNote}
          onRenameGroup={onRenameGroup}
          onGroupIconChange={onGroupIconChange}
          onDeleteGroup={onDeleteGroup}`,
    'GroupsDirectory grid callback'
  )

  source = updateInlineSignature(source, 'GroupNotesPage', (signature) => {
    let updated = replaceOnce(
      signature,
      '  onCreateNote,\n  onLayoutChange,',
      '  onCreateNote,\n  onGroupIconChange,\n  onLayoutChange,',
      'GroupNotesPage destructure'
    )
    updated = replaceOnce(
      updated,
      '  onCreateNote: () => void\n  onLayoutChange:',
      '  onCreateNote: () => void\n  onGroupIconChange: (group: NoteGroup, icon: StudyFolderIconName) => void\n  onLayoutChange:',
      'GroupNotesPage callback type'
    )
    return updated
  })
  source = replaceOnce(
    source,
    '        icon={<Folder aria-hidden="true" className="size-5" />}\n        backAction={{',
    `        icon={
          <NoteGroupIconPicker group={group} onChange={onGroupIconChange} className="size-5" />
        }
        backAction={{`,
    'selected group header icon'
  )

  source = updateInlineSignature(source, 'GroupsGrid', (signature) => {
    let updated = replaceOnce(
      signature,
      '  onRenameGroup,\n  onDeleteGroup',
      '  onRenameGroup,\n  onGroupIconChange,\n  onDeleteGroup',
      'GroupsGrid destructure'
    )
    updated = replaceOnce(
      updated,
      '  onRenameGroup: (group: NoteGroup) => void\n  onDeleteGroup: (group: NoteGroup) => void',
      '  onRenameGroup: (group: NoteGroup) => void\n  onGroupIconChange: (group: NoteGroup, icon: StudyFolderIconName) => void\n  onDeleteGroup: (group: NoteGroup) => void',
      'GroupsGrid callback type'
    )
    return updated
  })
  source = replaceOnce(
    source,
    `            onCreateNote={() => onCreateNote(group.id)}
            onRename={() => onRenameGroup(group)}
            onDelete={() => onDeleteGroup(group)}`,
    `            onCreateNote={() => onCreateNote(group.id)}
            onRename={() => onRenameGroup(group)}
            onIconChange={(icon) => onGroupIconChange(group, icon)}
            onDelete={() => onDeleteGroup(group)}`,
    'GroupCard icon callback'
  )

  source = updateInlineSignature(source, 'GroupCard', (signature) => {
    let updated = replaceOnce(
      signature,
      '  onRename,\n  onDelete',
      '  onRename,\n  onIconChange,\n  onDelete',
      'GroupCard destructure'
    )
    updated = replaceOnce(
      updated,
      '  onRename: () => void\n  onDelete: () => void',
      '  onRename: () => void\n  onIconChange: (icon: StudyFolderIconName) => void\n  onDelete: () => void',
      'GroupCard callback type'
    )
    return updated
  })
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

// Preload contract test.
{
  const path = 'src/preload/index.test.ts'
  let source = read(path)

  source = replaceOnce(
    source,
    "      'renameGroup',\n      'deleteGroup',",
    "      'renameGroup',\n      'updateGroupIcon',\n      'deleteGroup',",
    'preload test method list'
  )

  write(path, source)
}

// Repository behavior.
{
  const path = 'src/main/repositories/notes.repository.test.ts'
  let source = read(path)

  source = replaceOnce(
    source,
    '  renameNote,\n  saveNote\n',
    '  renameNote,\n  saveNote,\n  updateNoteGroupIcon\n',
    'repository test import'
  )
  source = replaceOnce(
    source,
    "    const first = createNoteGroup('Работа')\n    const second = createNoteGroup('Личное')",
    "    const first = createNoteGroup('Работа')\n    const second = createNoteGroup('Личное')\n\n    expect(first.icon).toBe('folder')\n    expect(updateNoteGroupIcon(first.id, 'science').icon).toBe('science')",
    'repository icon assertions'
  )

  write(path, source)
}

// Renderer fixtures and picker behavior.
{
  const path = 'src/renderer/src/modules/notes/NotesPage.test.tsx'
  let source = read(path)

  source = replaceOnce(
    source,
    '  renameGroup: vi.fn(),\n  renameNote:',
    '  renameGroup: vi.fn(),\n  updateGroupIcon: vi.fn(),\n  renameNote:',
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
    "  notesMocks.createGroup.mockResolvedValue({\n    id: 'group-new',",
    "  notesMocks.updateGroupIcon.mockImplementation(async (id, icon) => ({ ...group, id, icon }))\n  notesMocks.createGroup.mockResolvedValue({\n    id: 'group-new',",
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
