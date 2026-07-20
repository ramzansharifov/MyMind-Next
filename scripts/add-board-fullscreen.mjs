import { readFileSync, writeFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

function write(path, content) {
  writeFileSync(path, content, 'utf8')
}

function replaceOnce(path, before, after) {
  const content = read(path)

  if (content.includes(after)) return

  const index = content.indexOf(before)
  if (index < 0) {
    throw new Error(`Pattern not found in ${path}: ${before.slice(0, 180)}`)
  }

  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Pattern is not unique in ${path}: ${before.slice(0, 180)}`)
  }

  write(path, content.slice(0, index) + after + content.slice(index + before.length))
}

function replaceRange(path, startMarker, endMarker, replacement) {
  const content = read(path)
  const startIndex = content.indexOf(startMarker)
  if (startIndex < 0) {
    throw new Error(`Start marker not found in ${path}: ${startMarker}`)
  }

  const endIndex = content.indexOf(endMarker, startIndex)
  if (endIndex < 0) {
    throw new Error(`End marker not found in ${path}: ${endMarker}`)
  }

  write(path, content.slice(0, startIndex) + replacement + content.slice(endIndex))
}

const boardsPagePath = 'src/renderer/src/modules/boards/BoardsPage.tsx'

replaceOnce(
  boardsPagePath,
  `  LoaderCircle,\n  LockKeyhole,\n  MoreHorizontal,`,
  `  LoaderCircle,\n  LockKeyhole,\n  Maximize2,\n  Minimize2,\n  MoreHorizontal,`
)

replaceOnce(
  boardsPagePath,
  `  const [saveState, setSaveState] = useState<BoardSaveState>('saved')`,
  `  const [saveState, setSaveState] = useState<BoardSaveState>('saved')\n  const [isBoardFullscreen, setIsBoardFullscreen] = useState(false)`
)

replaceOnce(
  boardsPagePath,
  `      await flushActiveBoardDraft()\n      setSelectedId(nodeId)\n      setSaveState('saved')`,
  `      await flushActiveBoardDraft()\n      setIsBoardFullscreen(false)\n      setSelectedId(nodeId)\n      setSaveState('saved')`
)

replaceOnce(
  boardsPagePath,
  `        if (!active) return\n        setSelectedId(resourceId)\n        setSaveState('saved')`,
  `        if (!active) return\n        setIsBoardFullscreen(false)\n        setSelectedId(resourceId)\n        setSaveState('saved')`
)

replaceOnce(
  boardsPagePath,
  `      if (!nextNodes.some((node) => node.id === selectedId)) {\n        setSelectedId(null)\n      }`,
  `      if (!nextNodes.some((node) => node.id === selectedId)) {\n        setIsBoardFullscreen(false)\n        setSelectedId(null)\n      }`
)

replaceOnce(
  boardsPagePath,
  `            node={selectedNode}\n            saveState={saveState}\n            onSaveStateChange={setSaveState}\n            onRename={() => startRename(selectedNode)}`,
  `            node={selectedNode}\n            saveState={saveState}\n            isFullscreen={isBoardFullscreen}\n            onSaveStateChange={setSaveState}\n            onRename={() => startRename(selectedNode)}\n            onFullscreenChange={setIsBoardFullscreen}`
)

replaceRange(
  boardsPagePath,
  `function BoardWorkspace({`,
  `function BoardCanvasLoadingFallback(): React.JSX.Element {`,
  `function BoardWorkspace({\n  node,\n  saveState,\n  isFullscreen,\n  onSaveStateChange,\n  onRename,\n  onFullscreenChange\n}: {\n  node: BoardNode\n  saveState: BoardSaveState\n  isFullscreen: boolean\n  onSaveStateChange: (state: BoardSaveState) => void\n  onRename: () => void\n  onFullscreenChange: (fullscreen: boolean) => void\n}): React.JSX.Element {\n  useEffect(() => {\n    if (!isFullscreen) return undefined\n\n    function handleKeyDown(event: KeyboardEvent): void {\n      if (event.key !== 'Escape' || document.querySelector('[role="alertdialog"]')) return\n\n      event.preventDefault()\n      onFullscreenChange(false)\n    }\n\n    window.addEventListener('keydown', handleKeyDown)\n\n    return () => {\n      window.removeEventListener('keydown', handleKeyDown)\n    }\n  }, [isFullscreen, onFullscreenChange])\n\n  const fullscreenLabel = isFullscreen\n    ? 'Вернуть обычный вид доски'\n    : 'Развернуть доску на весь экран'\n\n  return (\n    <section\n      role="region"\n      aria-label={\`Рабочая область доски «\${node.title}»\`}\n      data-board-fullscreen={isFullscreen}\n      className={cn(\n        'flex h-full min-h-0 flex-col bg-[var(--app-workspace)]',\n        isFullscreen && 'fixed inset-0 z-40 h-screen w-screen'\n      )}\n    >\n      <header className="flex h-20 shrink-0 items-center gap-4 border-b border-[var(--app-border)] bg-[var(--app-workspace)] px-5">\n        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--app-accent-500)]/10 text-[var(--app-accent-300)]">\n          <Presentation aria-hidden="true" className="size-5" />\n        </div>\n        <div className="min-w-0 flex-1">\n          <p className="text-[10px] font-semibold tracking-[0.12em] text-[var(--app-accent-300)] uppercase">\n            Доска\n          </p>\n          <h1 className="mt-1 truncate text-lg font-semibold text-[var(--app-text)]">\n            {node.title}\n          </h1>\n        </div>\n        <WorkspaceActionButton\n          type="button"\n          className="w-auto px-3 max-[720px]:size-10 max-[720px]:px-0"\n          onClick={onRename}\n        >\n          <Pencil aria-hidden="true" />\n          <span className="max-[720px]:hidden">Переименовать</span>\n        </WorkspaceActionButton>\n        <Tooltip content={fullscreenLabel} side="bottom">\n          <WorkspaceActionButton\n            type="button"\n            aria-label={fullscreenLabel}\n            aria-pressed={isFullscreen}\n            className="w-auto px-3 max-[720px]:size-10 max-[720px]:px-0"\n            onClick={() => onFullscreenChange(!isFullscreen)}\n          >\n            {isFullscreen ? (\n              <Minimize2 aria-hidden="true" />\n            ) : (\n              <Maximize2 aria-hidden="true" />\n            )}\n            <span className="max-[720px]:hidden">\n              {isFullscreen ? 'Обычный вид' : 'На весь экран'}\n            </span>\n          </WorkspaceActionButton>\n        </Tooltip>\n        <BoardSaveStatus state={saveState} />\n      </header>\n      <div className="min-h-0 flex-1">\n        <BoardCanvasErrorBoundary resetKey={node.id}>\n          <Suspense fallback={<BoardCanvasLoadingFallback />}>\n            <BoardCanvas boardId={node.id} onSaveStateChange={onSaveStateChange} />\n          </Suspense>\n        </BoardCanvasErrorBoundary>\n      </div>\n    </section>\n  )\n}\n\n`
)

const boardsTestPath = 'src/renderer/src/modules/boards/BoardsPage.test.tsx'

replaceOnce(
  boardsTestPath,
  `  it('loads BoardCanvas only for a board and isolates a lazy import failure in the workspace', async () => {\n    vi.spyOn(console, 'error').mockImplementation(() => undefined)`,
  `  it('loads BoardCanvas only for a board, toggles fullscreen, and isolates a lazy import failure', async () => {\n    const user = userEvent.setup()\n    vi.spyOn(console, 'error').mockImplementation(() => undefined)`
)

replaceOnce(
  boardsTestPath,
  `    fireEvent.click(screen.getAllByRole('button', { name: 'Тестовая доска' })[0])\n\n    expect(await screen.findByRole('alert', { name: 'Ошибка редактора доски' })).toBeInTheDocument()`,
  `    fireEvent.click(screen.getAllByRole('button', { name: 'Тестовая доска' })[0])\n\n    const workspace = await screen.findByRole('region', {\n      name: 'Рабочая область доски «Тестовая доска»'\n    })\n    expect(workspace).toHaveAttribute('data-board-fullscreen', 'false')\n\n    await user.click(\n      screen.getByRole('button', { name: 'Развернуть доску на весь экран' })\n    )\n\n    expect(workspace).toHaveAttribute('data-board-fullscreen', 'true')\n    expect(workspace).toHaveClass('fixed')\n    expect(\n      screen.getByRole('button', { name: 'Вернуть обычный вид доски' })\n    ).toHaveAttribute('aria-pressed', 'true')\n\n    await user.keyboard('{Escape}')\n\n    expect(workspace).toHaveAttribute('data-board-fullscreen', 'false')\n    expect(workspace).not.toHaveClass('fixed')\n\n    expect(await screen.findByRole('alert', { name: 'Ошибка редактора доски' })).toBeInTheDocument()`
)

const boardsCatalogPath =
  'src/renderer/src/modules/settings/instructions/boards-instruction-catalog.ts'

replaceOnce(
  boardsCatalogPath,
  `      {\n        title: 'Автоматическое сохранение',`,
  `      {\n        title: 'Полноэкранный режим',\n        paragraphs: [\n          'Кнопка «На весь экран» в верхней панели разворачивает рабочую область поверх основной навигации и дерева досок. Холст получает всё доступное пространство окна MyMind.'\n        ],\n        bullets: [\n          'Повторное нажатие на кнопку «Обычный вид» возвращает исходную компоновку.',\n          'Клавиша Esc также завершает полноэкранный режим, если поверх доски не открыт диалог.',\n          'Переключение режима не пересоздаёт холст, поэтому выбранный инструмент, масштаб, история и несохранённые изменения сохраняются.',\n          'Состояние боковых панелей после выхода остаётся таким же, каким было до разворачивания доски.'\n        ]\n      },\n      {\n        title: 'Автоматическое сохранение',`
)

const instructionTestPath =
  'src/renderer/src/modules/settings/instructions/LearningInstructions.test.tsx'

replaceOnce(
  instructionTestPath,
  `  it('navigates to and highlights a section from the contents list', async () => {`,
  `  it('documents fullscreen board controls and preserved canvas state', () => {\n    render(<BoardsInstructionArticlePage topicId="boards-canvas" onBack={vi.fn()} />)\n\n    expect(screen.getByRole('heading', { name: 'Полноэкранный режим' })).toBeInTheDocument()\n    expect(screen.getByText(/Клавиша Esc также завершает полноэкранный режим/)).toBeInTheDocument()\n    expect(screen.getByText(/не пересоздаёт холст/)).toBeInTheDocument()\n  })\n\n  it('navigates to and highlights a section from the contents list', async () => {`
)

console.log('Board fullscreen mode applied')
