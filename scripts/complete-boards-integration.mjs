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

  const firstIndex = content.indexOf(before)
  if (firstIndex < 0) {
    throw new Error(`Pattern not found in ${path}: ${before.slice(0, 120)}`)
  }

  const secondIndex = content.indexOf(before, firstIndex + before.length)
  if (secondIndex >= 0) {
    throw new Error(`Pattern is not unique in ${path}: ${before.slice(0, 120)}`)
  }

  write(path, content.slice(0, firstIndex) + after + content.slice(firstIndex + before.length))
}

function insertBeforeOnce(path, marker, inserted) {
  const content = read(path)

  if (content.includes(inserted.trim())) {
    return
  }

  const index = content.indexOf(marker)
  if (index < 0) {
    throw new Error(`Marker not found in ${path}: ${marker.slice(0, 120)}`)
  }

  write(path, content.slice(0, index) + inserted + content.slice(index))
}

const catalogPath =
  'src/renderer/src/modules/settings/instructions/learning-instruction-catalog.ts'

replaceOnce(
  catalogPath,
  String.raw`    ],
    shortcuts: []
  }
} satisfies Record<StudyBlockType, BlockInstructionContent>`,
  String.raw`    ],
    shortcuts: []
  },
  board: {
    summary: 'Связанная с материалом бесконечная доска tldraw для схем, заметок и свободного размещения объектов.',
    intro:
      'Блок «Доска» создаёт отдельный холст, связанный с текущим материалом. Содержимое доски хранится в модуле «Доски», а блок служит точкой входа.',
    sections: [
      {
        title: 'Создание и открытие',
        steps: [
          'Добавьте блок «Доска» в материал.',
          'Нажмите «Создать доску» при первом открытии.',
          'MyMind создаст связанную доску в защищённой папке «Обучение».',
          'При следующих открытиях будет использоваться та же доска.'
        ]
      },
      {
        title: 'Связь с материалом',
        paragraphs: [
          'Для каждого блока создаётся отдельная доска. Связь определяется материалом и идентификатором блока.',
          'После создания блок сохраняет идентификатор и название доски, поэтому её можно открывать как из материала, так и из отдельного модуля.'
        ]
      },
      {
        title: 'Работа с доской',
        bullets: [
          'Рисуйте, добавляйте текст, фигуры, стрелки, изображения и другие элементы tldraw.',
          'Изменения сохраняются автоматически.',
          'Переименование и управление структурой выполняются в модуле «Доски».',
          'Системная папка «Обучение» защищена от удаления.'
        ]
      }
    ],
    shortcuts: []
  }
} satisfies Record<StudyBlockType, BlockInstructionContent>`
)

const settingsPath = 'src/renderer/src/modules/study/components/BlockSettingsPanel.tsx'

replaceOnce(
  settingsPath,
  String.raw`  file: AttachmentBlockSettings,
  divider: DividerBlockSettings`,
  String.raw`  file: AttachmentBlockSettings,
  divider: DividerBlockSettings,
  board: BoardBlockSettings`
)

insertBeforeOnce(
  settingsPath,
  'function DividerSettings({\n',
  String.raw`function BoardBlockSettings({ block }: SettingsRendererProps): React.JSX.Element {
  if (block.type !== 'board') {
    throw new Error('Board settings received an incompatible block')
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-xl border border-(--app-border) bg-(--app-workspace) p-4">
        <p className="text-sm font-medium text-(--app-text)">
          {block.title ?? 'Доска материала'}
        </p>

        <p className="mt-1 text-xs leading-5 text-(--app-muted)">
          {block.boardId
            ? 'Связь с доской создана. Используйте кнопку внутри блока, чтобы открыть холст.'
            : 'Доска будет создана при первом открытии блока.'}
        </p>
      </div>

      <p className="text-xs leading-5 text-(--app-muted)">
        Название, структура и содержимое связанной доски управляются в модуле «Доски».
      </p>
    </div>
  )
}

`
)

const editorPath = 'src/renderer/src/modules/study/components/StudyBlockEditor.tsx'

insertBeforeOnce(
  editorPath,
  "import { BlockSettingsErrorBoundary } from './BlockSettingsErrorBoundary'\n",
  "import { StudyBoardBlock } from './board/StudyBoardBlock'\n"
)

replaceOnce(
  editorPath,
  '    return <ReadOnlyStudyDocument document={document} />',
  '    return <ReadOnlyStudyDocument materialId={materialId} document={document} />'
)

replaceOnce(
  editorPath,
  '            <EditableBlock block={block} onChange={onChange} />',
  '            <EditableBlock materialId={materialId} block={block} onChange={onChange} />'
)

replaceOnce(
  editorPath,
  String.raw`function EditableBlock({
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
  String.raw`function EditableBlock({
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
  editorPath,
  String.raw`  file: EditAttachmentBlock,
  divider: EditDividerBlock
} satisfies Record<Exclude<StudyBlockRenderStrategy, 'text'>, EditableBlockStrategy>`,
  String.raw`  file: EditAttachmentBlock,
  divider: EditDividerBlock,
  board: EditBoardBlock
} satisfies Record<Exclude<StudyBlockRenderStrategy, 'text'>, EditableBlockStrategy>`
)

insertBeforeOnce(
  editorPath,
  "type StudyHeadingBlock = Extract<StudyBlock, { type: 'heading' }>\n",
  String.raw`function EditBoardBlock({
  materialId,
  block,
  onChange
}: EditableBlockProps): React.JSX.Element {
  if (block.type !== 'board') {
    throw new Error('Board editor received an incompatible block')
  }

  return (
    <StudyBoardBlock
      materialId={materialId}
      block={block}
      mode="edit"
      onChange={onChange}
    />
  )
}

`
)

replaceOnce(
  editorPath,
  'function ReadOnlyStudyDocument({ document }: { document: StudyDocument }): React.JSX.Element {',
  String.raw`function ReadOnlyStudyDocument({
  materialId,
  document
}: {
  materialId: string
  document: StudyDocument
}): React.JSX.Element {`
)

replaceOnce(
  editorPath,
  '<StudyReadNodeView key={getStudyReadNodeKey(node)} node={node} />',
  '<StudyReadNodeView key={getStudyReadNodeKey(node)} materialId={materialId} node={node} />'
)

replaceOnce(
  editorPath,
  String.raw`function StudyReadNodeView({ node }: { node: StudyReadNode }): React.JSX.Element {
  if (node.kind === 'section') {
    return <StudyReadSection section={node} />
  }

  return <StudyBlockReader block={node.block} />
}`,
  String.raw`function StudyReadNodeView({
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
  editorPath,
  'function StudyReadSection({ section }: { section: StudyReadSectionNode }): React.JSX.Element {',
  String.raw`function StudyReadSection({
  materialId,
  section
}: {
  materialId: string
  section: StudyReadSectionNode
}): React.JSX.Element {`
)

replaceOnce(
  editorPath,
  '<StudyReadNodeView key={getStudyReadNodeKey(child)} node={child} />',
  '<StudyReadNodeView key={getStudyReadNodeKey(child)} materialId={materialId} node={child} />'
)

replaceOnce(
  editorPath,
  String.raw`function StudyBlockReader({ block }: { block: StudyBlock }): React.JSX.Element {
  const Reader = studyBlockReaders[getStudyBlockDefinition(block.type).readStrategy]
  return <Reader block={block} />
}

type StudyBlockReaderProps = { block: StudyBlock }`,
  String.raw`function StudyBlockReader({
  materialId,
  block
}: {
  materialId: string
  block: StudyBlock
}): React.JSX.Element {
  const Reader = studyBlockReaders[getStudyBlockDefinition(block.type).readStrategy]

  return <Reader materialId={materialId} block={block} />
}

type StudyBlockReaderProps = {
  materialId: string
  block: StudyBlock
}`
)

replaceOnce(
  editorPath,
  String.raw`  file: ReadAttachmentBlock,
  divider: ReadDividerBlock
} satisfies Record<StudyBlockRenderStrategy, StudyBlockReaderStrategy>`,
  String.raw`  file: ReadAttachmentBlock,
  divider: ReadDividerBlock,
  board: ReadBoardBlock
} satisfies Record<StudyBlockRenderStrategy, StudyBlockReaderStrategy>`
)

insertBeforeOnce(
  editorPath,
  "function StudyBlockTypeIcon({\n",
  String.raw`function ReadBoardBlock({
  materialId,
  block
}: StudyBlockReaderProps): React.JSX.Element {
  if (block.type !== 'board') {
    throw new Error('Board reader received an incompatible block')
  }

  return <StudyBoardBlock materialId={materialId} block={block} mode="read" />
}

`
)

const boardsPath = 'src/renderer/src/modules/boards/BoardsPage.tsx'

replaceOnce(
  boardsPath,
  String.raw`  useEffect(() => {
    let active = true

    refreshNodes()
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Не удалось загрузить доски')
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [refreshNodes])

  useEffect(() => {
    if (!resourceId || nodes.length === 0) return

    if (nodes.some((node) => node.id === resourceId)) {
      setSelectedId(resourceId)
    }

    onResourceHandled?.()
  }, [nodes, onResourceHandled, resourceId])`,
  String.raw`  useEffect(() => {
    let active = true

    void boardsClient
      .listNodes()
      .then((nextNodes) => {
        if (active) {
          setNodes(nextNodes)
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Не удалось загрузить доски')
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
  }, [])`
)

insertBeforeOnce(
  boardsPath,
  '  async function createNode(): Promise<void> {\n',
  String.raw`  useEffect(() => {
    if (!resourceId || nodes.length === 0) {
      return
    }

    if (!nodes.some((node) => node.id === resourceId)) {
      onResourceHandled?.()
      return
    }

    void openNode(resourceId).finally(() => {
      onResourceHandled?.()
    })
  }, [nodes, onResourceHandled, openNode, resourceId])

`
)

replaceOnce(
  boardsPath,
  '            children={nodesByParent.get(selectedNode.id) ?? []}',
  '            items={nodesByParent.get(selectedNode.id) ?? []}'
)

replaceOnce(
  boardsPath,
  String.raw`function BoardFolderPage({
  folder,
  children,
  onOpen,
  onCreate,
  onRename
}: {
  folder: BoardNode
  children: BoardNode[]`,
  String.raw`function BoardFolderPage({
  folder,
  items,
  onOpen,
  onCreate,
  onRename
}: {
  folder: BoardNode
  items: BoardNode[]`
)

replaceOnce(
  boardsPath,
  '<BoardItemsSection title="Содержимое" items={children} onOpen={onOpen} />',
  '<BoardItemsSection title="Содержимое" items={items} onOpen={onOpen} />'
)

const canvasPath = 'src/renderer/src/modules/boards/components/BoardCanvas.tsx'

insertBeforeOnce(
  canvasPath,
  'interface BoardCanvasProps {\n',
  String.raw`interface BoardLoadState {
  boardId: string
  store: TLStore | null
  error: string | null
}

`
)

replaceOnce(
  canvasPath,
  String.raw`  const [store, setStore] = useState<TLStore | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const saveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let active = true
    setStore(null)
    setLoadError(null)

    boardsClient
      .getDocument(boardId)
      .then((document) => {
        if (!active) return

        const nextStore = createTLStore({
          snapshot: (document.snapshot ?? undefined) as TLEditorSnapshot | undefined
        })

        setStore(nextStore)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setLoadError(reason instanceof Error ? reason.message : 'Не удалось загрузить доску')
      })

    return () => {
      active = false
    }
  }, [boardId])`,
  String.raw`  const [loadState, setLoadState] = useState<BoardLoadState | null>(null)
  const saveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let active = true

    void boardsClient
      .getDocument(boardId)
      .then((document) => {
        if (!active) {
          return
        }

        const nextStore = createTLStore({
          snapshot: (document.snapshot ?? undefined) as TLEditorSnapshot | undefined
        })

        setLoadState({
          boardId,
          store: nextStore,
          error: null
        })
      })
      .catch((reason: unknown) => {
        if (!active) {
          return
        }

        setLoadState({
          boardId,
          store: null,
          error: reason instanceof Error ? reason.message : 'Не удалось загрузить доску'
        })
      })

    return () => {
      active = false
    }
  }, [boardId])

  const store = loadState?.boardId === boardId ? loadState.store : null
  const loadError = loadState?.boardId === boardId ? loadState.error : null`
)

const moduleRegistryTestPath = 'src/renderer/src/app/module-registry.test.ts'

replaceOnce(
  moduleRegistryTestPath,
  String.raw`    expect(getAppModule('study')).toBe(appModuleRegistry.study)
    expect(getAppModule('settings')).toBe(appModuleRegistry.settings)
    expect(primaryNavigationItems.map(({ id }) => id)).toEqual(['study'])`,
  String.raw`    expect(getAppModule('study')).toBe(appModuleRegistry.study)
    expect(getAppModule('boards')).toBe(appModuleRegistry.boards)
    expect(getAppModule('settings')).toBe(appModuleRegistry.settings)
    expect(primaryNavigationItems.map(({ id }) => id)).toEqual(['study', 'boards'])`
)

const documentIndexTestPath = 'src/main/domain/study-document-index.test.ts'

replaceOnce(
  documentIndexTestPath,
  String.raw`      'file',
      'divider'
    ])`,
  String.raw`      'file',
      'divider',
      'board'
    ])`
)

const registryTestPath =
  'src/renderer/src/modules/study/lib/study-block-registry.test.ts'

replaceOnce(
  registryTestPath,
  String.raw`  'file',
  'divider'
] satisfies StudyBlockType[]`,
  String.raw`  'file',
  'divider',
  'board'
] satisfies StudyBlockType[]`
)

replaceOnce(
  registryTestPath,
  String.raw`      {
        type: 'divider',
        label: 'Разделитель'
      }
    ])`,
  String.raw`      {
        type: 'divider',
        label: 'Разделитель'
      },
      {
        type: 'board',
        label: 'Доска'
      }
    ])`
)

const instructionsTestPath =
  'src/renderer/src/modules/settings/instructions/LearningInstructions.test.tsx'

replaceOnce(
  instructionsTestPath,
  "    expect(screen.getByText('11 типов блоков')).toBeInTheDocument()",
  "    expect(screen.getByText('12 типов блоков')).toBeInTheDocument()"
)

console.log('Boards integration patches applied')
