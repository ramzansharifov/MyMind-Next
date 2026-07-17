import { readFileSync, writeFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

function write(path, content) {
  writeFileSync(path, content, 'utf8')
}

function replaceOnce(path, before, after) {
  const content = read(path)

  if (content.includes(after)) {
    return
  }

  const first = content.indexOf(before)
  const last = content.lastIndexOf(before)

  if (first < 0 || first !== last) {
    throw new Error(`Expected exactly one match in ${path}: ${before.slice(0, 120)}`)
  }

  write(path, `${content.slice(0, first)}${after}${content.slice(first + before.length)}`)
}

function appendBefore(path, marker, addition) {
  const content = read(path)

  if (content.includes(addition.trim())) {
    return
  }

  const index = content.indexOf(marker)

  if (index < 0) {
    throw new Error(`Marker not found in ${path}: ${marker}`)
  }

  write(path, `${content.slice(0, index)}${addition}${content.slice(index)}`)
}

replaceOnce(
  'src/main/index.ts',
  "import { registerIpcHandlers } from './ipc/register-ipc'\n",
  "import { registerIpcHandlers } from './ipc/register-ipc'\nimport { ensureBoardsSystemRoot } from './repositories/boards.repository'\n"
)
replaceOnce(
  'src/main/index.ts',
  '    initializeDatabase()\n    runDatabaseMigrations()\n\n    const plainTextMaintenance',
  '    initializeDatabase()\n    runDatabaseMigrations()\n    ensureBoardsSystemRoot()\n\n    const plainTextMaintenance'
)

replaceOnce(
  'src/renderer/src/app/AppShell.tsx',
  "  const [isCollapsed, setIsCollapsed] = useState(() => activeView === 'study')\n",
  "  const [isCollapsed, setIsCollapsed] = useState(\n    () => activeView === 'study' || activeView === 'boards'\n  )\n"
)
replaceOnce(
  'src/renderer/src/app/AppShell.tsx',
  "    if (view === 'study' && activeView !== 'study') {\n      setIsCollapsed(true)\n    }\n",
  "    if ((view === 'study' || view === 'boards') && view !== activeView) {\n      setIsCollapsed(true)\n    }\n"
)

replaceOnce(
  'src/renderer/src/modules/study/components/BlockSettingsPanel.tsx',
  "import { Link2, LoaderCircle, Settings2, SquarePlay, Trash2, Upload } from 'lucide-react'\n",
  `import {
  Link2,
  LoaderCircle,
  Presentation,
  Settings2,
  SquarePlay,
  Trash2,
  Upload
} from 'lucide-react'
`
)
replaceOnce(
  'src/renderer/src/modules/study/components/BlockSettingsPanel.tsx',
  '  file: AttachmentBlockSettings,\n  divider: DividerBlockSettings\n',
  '  file: AttachmentBlockSettings,\n  divider: DividerBlockSettings,\n  board: BoardBlockSettings\n'
)
appendBefore(
  'src/renderer/src/modules/study/components/BlockSettingsPanel.tsx',
  'function HeadingSettings({',
  `function BoardBlockSettings({ block }: SettingsRendererProps): React.JSX.Element {
  if (block.type !== 'board') {
    throw new Error('Board settings received an incompatible block')
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-start gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3.5">
        <Presentation
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-[var(--app-accent-300)]"
        />
        <div>
          <p className="text-sm font-medium text-[var(--app-text)]">
            {block.boardId ? 'Связанная доска создана' : 'Доска будет создана при открытии'}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
            Холст хранится в модуле «Доски». Этот блок содержит только ссылку на него.
          </p>
        </div>
      </div>
    </div>
  )
}

`
)

replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  "import { BlockSettingsErrorBoundary } from './BlockSettingsErrorBoundary'\n",
  "import { StudyBoardBlock } from './board/StudyBoardBlock'\nimport { BlockSettingsErrorBoundary } from './BlockSettingsErrorBoundary'\n"
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  "    return <ReadOnlyStudyDocument document={document} />\n",
  "    return <ReadOnlyStudyDocument materialId={materialId} document={document} />\n"
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  '            <EditableBlock block={block} onChange={onChange} />\n',
  '            <EditableBlock materialId={materialId} block={block} onChange={onChange} />\n'
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  `function EditableBlock({
  block,
  onChange
}: {
  block: Exclude<StudyBlock, { type: 'text' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  const strategy = getStudyBlockDefinition(block.type).editStrategy
  const Editor = studyBlockEditors[strategy]
  return <Editor block={block} onChange={onChange} />
}

type EditableBlockProps = {
  block: Exclude<StudyBlock, { type: 'text' }>
  onChange: (block: StudyBlock) => void
}`,
  `function EditableBlock({
  materialId,
  block,
  onChange
}: {
  materialId: string
  block: Exclude<StudyBlock, { type: 'text' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  const strategy = getStudyBlockDefinition(block.type).editStrategy
  const Editor = studyBlockEditors[strategy]
  return <Editor materialId={materialId} block={block} onChange={onChange} />
}

type EditableBlockProps = {
  materialId: string
  block: Exclude<StudyBlock, { type: 'text' }>
  onChange: (block: StudyBlock) => void
}`
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  '  file: EditAttachmentBlock,\n  divider: EditDividerBlock\n',
  '  file: EditAttachmentBlock,\n  divider: EditDividerBlock,\n  board: EditBoardBlock\n'
)
appendBefore(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  "function EditDividerBlock({ block }: EditableBlockProps): React.JSX.Element {",
  `function EditBoardBlock({ materialId, block, onChange }: EditableBlockProps): React.JSX.Element {
  if (block.type !== 'board') throw new Error('Board editor received an incompatible block')
  return (
    <StudyBoardBlock materialId={materialId} block={block} mode="edit" onChange={onChange} />
  )
}

`
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  `function ReadOnlyStudyDocument({ document }: { document: StudyDocument }): React.JSX.Element {
  const outline = buildStudyReadOutline(document.blocks)`,
  `function ReadOnlyStudyDocument({
  materialId,
  document
}: {
  materialId: string
  document: StudyDocument
}): React.JSX.Element {
  const outline = buildStudyReadOutline(document.blocks)`
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  '<StudyReadNodeView key={getStudyReadNodeKey(node)} node={node} />',
  '<StudyReadNodeView key={getStudyReadNodeKey(node)} materialId={materialId} node={node} />'
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  `function StudyReadNodeView({ node }: { node: StudyReadNode }): React.JSX.Element {
  if (node.kind === 'section') {
    return <StudyReadSection section={node} />
  }

  return <StudyBlockReader block={node.block} />
}`,
  `function StudyReadNodeView({
  materialId,
  node
}: {
  materialId: string
  node: StudyReadNode
}): React.JSX.Element {
  if (node.kind === 'section') {
    return <StudyReadSection materialId={materialId} section={node} />
  }

  return <StudyBlockReader materialId={materialId} block={node.block} />
}`
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  'function StudyReadSection({ section }: { section: StudyReadSectionNode }): React.JSX.Element {',
  `function StudyReadSection({
  materialId,
  section
}: {
  materialId: string
  section: StudyReadSectionNode
}): React.JSX.Element {`
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  '<StudyReadNodeView key={getStudyReadNodeKey(child)} node={child} />',
  '<StudyReadNodeView key={getStudyReadNodeKey(child)} materialId={materialId} node={child} />'
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  `function StudyBlockReader({ block }: { block: StudyBlock }): React.JSX.Element {
  const Reader = studyBlockReaders[getStudyBlockDefinition(block.type).readStrategy]
  return <Reader block={block} />
}

type StudyBlockReaderProps = { block: StudyBlock }`,
  `function StudyBlockReader({
  materialId,
  block
}: {
  materialId: string
  block: StudyBlock
}): React.JSX.Element {
  const Reader = studyBlockReaders[getStudyBlockDefinition(block.type).readStrategy]
  return <Reader materialId={materialId} block={block} />
}

type StudyBlockReaderProps = { materialId: string; block: StudyBlock }`
)
replaceOnce(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  '  file: ReadAttachmentBlock,\n  divider: ReadDividerBlock\n',
  '  file: ReadAttachmentBlock,\n  divider: ReadDividerBlock,\n  board: ReadBoardBlock\n'
)
appendBefore(
  'src/renderer/src/modules/study/components/StudyBlockEditor.tsx',
  "function ReadDividerBlock({ block }: StudyBlockReaderProps): React.JSX.Element {",
  `function ReadBoardBlock({ materialId, block }: StudyBlockReaderProps): React.JSX.Element {
  if (block.type !== 'board') throw new Error('Board reader received an incompatible block')
  return <StudyBoardBlock materialId={materialId} block={block} mode="read" />
}

`
)

replaceOnce(
  'src/main/repositories/study.repository.ts',
  "import { documentToPlainText } from '../domain/study-document-index'\n",
  "import { documentToPlainText } from '../domain/study-document-index'\nimport { cleanupBoardsForStudyDocument } from './boards.repository'\n"
)
replaceOnce(
  'src/main/repositories/study.repository.ts',
  `    blocks: document.blocks.map((block) => {
      if (block.type !== 'text' || !block.html) {
        return block
      }
`,
  `    blocks: document.blocks.map((block) => {
      if (block.type === 'board') {
        return {
          id: randomUUID(),
          type: 'board'
        }
      }

      if (block.type !== 'text' || !block.html) {
        return block
      }
`
)
replaceOnce(
  'src/main/repositories/study.repository.ts',
  `  await cleanupStudyAssetsForDocument(input.nodeId, savedMaterial.document).catch(
    (reason: unknown) => {
      console.error('Failed to clean up unreferenced study assets', reason)
    }
  )

  return savedMaterial
`,
  `  await cleanupStudyAssetsForDocument(input.nodeId, savedMaterial.document).catch(
    (reason: unknown) => {
      console.error('Failed to clean up unreferenced study assets', reason)
    }
  )

  try {
    cleanupBoardsForStudyDocument(input.nodeId, savedMaterial.document)
  } catch (reason: unknown) {
    console.error('Failed to clean up unreferenced study boards', reason)
  }

  return savedMaterial
`
)

replaceOnce(
  'src/renderer/src/modules/settings/instructions/learning-instruction-catalog.ts',
  `  divider: {
    summary: 'Визуальное разделение частей материала с выбором стиля, толщины и цвета.',`,
  `  board: {
    summary: 'Связанная бесконечная доска tldraw, доступная из материала и отдельного модуля.',
    intro:
      'Блок «Доска» связывает материал с полноценным холстом tldraw. Содержимое хранится отдельно от JSON материала и открывается в модуле «Доски».',
    sections: [
      {
        title: 'Создание и открытие',
        steps: [
          'Добавьте блок «Доска» в материал.',
          'Нажмите «Создать доску» при первом открытии.',
          'MyMind создаст доску в защищённой папке «Обучение» и повторит путь папок материала.',
          'Последующие открытия ведут к той же доске.'
        ]
      },
      {
        title: 'Работа на холсте',
        bullets: [
          'Используйте инструменты tldraw для текста, фигур, стрелок и рисования.',
          'Холст бесконечный: масштабируйте и перемещайте рабочую область.',
          'Изменения сохраняются автоматически после короткой паузы.'
        ]
      },
      {
        title: 'Связь с модулем досок',
        paragraphs: [
          'Связанная доска отображается в модуле «Доски» под системной папкой «Обучение». Удаление блока удаляет связанную доску после сохранения материала.',
          'Дублирование блока создаёт новую независимую доску при первом открытии.'
        ]
      }
    ],
    shortcuts: []
  },
  divider: {
    summary: 'Визуальное разделение частей материала с выбором стиля, толщины и цвета.',`
)

replaceOnce(
  'src/renderer/src/modules/settings/instructions/LearningInstructions.test.tsx',
  "    expect(screen.getByText('11 типов блоков')).toBeInTheDocument()\n",
  "    expect(screen.getByText(`${studyBlockDefinitions.length} типов блоков`)).toBeInTheDocument()\n"
)
replaceOnce(
  'src/renderer/src/App.test.tsx',
  '        study: {\n',
  `        boards: {
          listNodes: vi.fn().mockResolvedValue([]),
          createNode: vi.fn(),
          renameNode: vi.fn(),
          deleteNode: vi.fn(),
          updateExpansion: vi.fn(),
          moveNode: vi.fn(),
          getDocument: vi.fn(),
          saveDocument: vi.fn(),
          ensureStudyBoard: vi.fn()
        },

        study: {
`
)
