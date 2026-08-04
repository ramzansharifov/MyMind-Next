import fs from 'node:fs'

const path = 'src/renderer/src/modules/study/components/StudyBlockEditor.tsx'
let source = fs.readFileSync(path, 'utf8')

const constantsAnchor = "const allStudyBlockTypes = studyBlockDefinitions.map(({ type }) => type)\n"
const constantsInsertion = `${constantsAnchor}
interface StudyBlockMenuGroup {
  id: 'primary' | 'technical' | 'media'
  label: string
  types: readonly StudyBlockType[]
}

const STUDY_BLOCK_MENU_GROUPS = [
  {
    id: 'primary',
    label: 'Основное',
    types: ['text', 'heading', 'board', 'divider']
  },
  {
    id: 'technical',
    label: 'Код и разметка',
    types: ['code', 'markdown', 'latex', 'mermaid']
  },
  {
    id: 'media',
    label: 'Медиа и файлы',
    types: ['image', 'video', 'audio', 'file']
  }
] as const satisfies readonly StudyBlockMenuGroup[]
`

if (!source.includes('const STUDY_BLOCK_MENU_GROUPS')) {
  const anchorCount = source.split(constantsAnchor).length - 1

  if (anchorCount !== 1) {
    throw new Error(`Expected one block-type anchor, found ${anchorCount}`)
  }

  source = source.replace(constantsAnchor, constantsInsertion)
}

const functionStart = source.indexOf('function BlockInsertMenu(')
const functionEnd = source.indexOf('\ninterface StudyBlockDragItemProps', functionStart)

if (functionStart < 0 || functionEnd < 0) {
  throw new Error('BlockInsertMenu boundaries were not found')
}

let functionSource = source.slice(functionStart, functionEnd)
const stateAnchor = '  const [open, setOpen] = useState(false)\n\n  return ('
const stateReplacement = `  const [open, setOpen] = useState(false)
  const menuGroups = STUDY_BLOCK_MENU_GROUPS.map((group) => ({
    ...group,
    options: group.types.flatMap((type) => {
      const option = blockTypes.find((candidate) => candidate.type === type)

      return option ? [option] : []
    })
  })).filter((group) => group.options.length > 0)
  const menuWidthClassName =
    menuGroups.length === 3 ? 'w-[660px]' : menuGroups.length === 2 ? 'w-[440px]' : 'w-60'
  const menuColumnsClassName =
    menuGroups.length === 3
      ? 'grid-cols-3'
      : menuGroups.length === 2
        ? 'grid-cols-2'
        : 'grid-cols-1'

  return (`

if (!functionSource.includes('const menuGroups = STUDY_BLOCK_MENU_GROUPS')) {
  const stateCount = functionSource.split(stateAnchor).length - 1

  if (stateCount !== 1) {
    throw new Error(`Expected one BlockInsertMenu state anchor, found ${stateCount}`)
  }

  functionSource = functionSource.replace(stateAnchor, stateReplacement)
}

const contentStart = functionSource.indexOf('        <DropdownMenu.Content')
const contentClose = '        </DropdownMenu.Content>'
const contentEndStart = functionSource.indexOf(contentClose, contentStart)

if (contentStart < 0 || contentEndStart < 0) {
  throw new Error('DropdownMenu.Content boundaries were not found inside BlockInsertMenu')
}

const contentEnd = contentEndStart + contentClose.length
const newContent = `        <DropdownMenu.Content
          sideOffset={6}
          align="center"
          data-study-block-insert-menu="true"
          className={cn(
            'z-50 grid max-w-[calc(100vw-24px)] gap-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-2 shadow-[var(--app-shadow-menu)]',
            menuWidthClassName,
            menuColumnsClassName,
            'max-[760px]:w-72 max-[760px]:grid-cols-1'
          )}
        >
          {menuGroups.map((group, groupIndex) => (
            <DropdownMenu.Group
              key={group.id}
              data-study-block-menu-column={group.id}
              className={cn(
                'min-w-0 px-1.5',
                groupIndex > 0 &&
                  'border-l border-[var(--app-border)] pl-2.5 max-[760px]:mt-1.5 max-[760px]:border-t max-[760px]:border-l-0 max-[760px]:pt-1.5 max-[760px]:pl-1.5'
              )}
            >
              <DropdownMenu.Label className="px-2.5 pt-1 pb-1.5 text-[10px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
                {group.label}
              </DropdownMenu.Label>

              <div className="grid gap-1">
                {group.options.map((option) => (
                  <DropdownMenu.Item
                    key={option.type}
                    className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--app-text)] outline-none hover:bg-white/[0.06] focus:bg-white/[0.06]"
                    onSelect={() => {
                      onInsert(option.type)
                    }}
                  >
                    <StudyBlockTypeIcon
                      type={option.type}
                      className="size-4 text-[var(--app-muted)]"
                    />

                    {option.label}
                  </DropdownMenu.Item>
                ))}
              </div>
            </DropdownMenu.Group>
          ))}
        </DropdownMenu.Content>`

functionSource = `${functionSource.slice(0, contentStart)}${newContent}${functionSource.slice(contentEnd)}`
source = `${source.slice(0, functionStart)}${functionSource}${source.slice(functionEnd)}`

fs.writeFileSync(path, source)
