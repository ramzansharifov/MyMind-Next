import { readFileSync, writeFileSync } from 'node:fs'

function replaceOnce(path, before, after) {
  const content = readFileSync(path, 'utf8')
  const index = content.indexOf(before)

  if (index < 0) {
    throw new Error(`Pattern not found in ${path}: ${before.slice(0, 220)}`)
  }

  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Pattern is not unique in ${path}: ${before.slice(0, 220)}`)
  }

  writeFileSync(path, content.slice(0, index) + after + content.slice(index + before.length), 'utf8')
}

function createFile(path, content) {
  writeFileSync(path, content, 'utf8')
}

const navigationPath = 'src/renderer/src/app/module-navigation.ts'
replaceOnce(
  navigationPath,
  `  resourceId?: string | null\n}`,
  `  resourceId?: string | null\n  focusMode?: boolean\n}`
)

const registryPath = 'src/renderer/src/app/module-registry.ts'
replaceOnce(
  registryPath,
  `export interface AppModuleProps {\n  resourceId?: string | null\n  onResourceHandled?: () => void\n}`,
  `export interface AppModuleProps {\n  resourceId?: string | null\n  onResourceHandled?: () => void\n  focusMode?: boolean\n  onFocusModeChange?: (active: boolean) => void\n}`
)

const shellPath = 'src/renderer/src/app/AppShell.tsx'
replaceOnce(
  shellPath,
  `interface AppShellProps {\n  activeView: AppViewId\n  onViewChange: (view: AppViewId) => void\n  children: ReactNode\n}`,
  `interface AppShellProps {\n  activeView: AppViewId\n  onViewChange: (view: AppViewId) => void\n  focusMode?: boolean\n  children: ReactNode\n}`
)
replaceOnce(
  shellPath,
  `export function AppShell({ activeView, onViewChange, children }: AppShellProps): React.JSX.Element {`,
  `export function AppShell({\n  activeView,\n  onViewChange,\n  focusMode = false,\n  children\n}: AppShellProps): React.JSX.Element {`
)
replaceOnce(shellPath, `        <aside\n`, `        {!focusMode && (\n          <aside\n`)
replaceOnce(
  shellPath,
  `        </aside>\n\n        <main id="workspace" className="min-w-0 flex-1 overflow-hidden bg-[var(--app-workspace)]">`,
  `          </aside>\n        )}\n\n        <main\n          id="workspace"\n          data-focus-mode={focusMode}\n          className="min-w-0 flex-1 overflow-hidden bg-[var(--app-workspace)]"\n        >`
)

const appPath = 'src/renderer/src/App.tsx'
replaceOnce(
  appPath,
  `      resourceId: string | null\n      message: string`,
  `      resourceId: string | null\n      focusMode: boolean\n      message: string`
)
replaceOnce(
  appPath,
  `  const [activeResourceId, setActiveResourceId] = useState<string | null>(null)\n  const [isSaving, setIsSaving] = useState(false)`,
  `  const [activeResourceId, setActiveResourceId] = useState<string | null>(null)\n  const [focusMode, setFocusMode] = useState(false)\n  const [isSaving, setIsSaving] = useState(false)`
)
replaceOnce(
  appPath,
  `    async (target: AppViewId, resourceId: string | null = null): Promise<void> => {`,
  `    async (\n      target: AppViewId,\n      resourceId: string | null = null,\n      nextFocusMode = false\n    ): Promise<void> => {`
)
replaceOnce(
  appPath,
  `        (target === activeView && resourceId === activeResourceId) ||`,
  `        (target === activeView &&\n          resourceId === activeResourceId &&\n          nextFocusMode === focusMode) ||`
)
replaceOnce(
  appPath,
  `        setActiveView(target)\n        setActiveResourceId(resourceId)`,
  `        setActiveView(target)\n        setActiveResourceId(resourceId)\n        setFocusMode(nextFocusMode)`
)
replaceOnce(
  appPath,
  `          target,\n          resourceId,\n          message:`,
  `          target,\n          resourceId,\n          focusMode: nextFocusMode,\n          message:`
)
replaceOnce(
  appPath,
  `    [activeResourceId, activeView, flushActiveDrafts]`,
  `    [activeResourceId, activeView, flushActiveDrafts, focusMode]`
)
replaceOnce(
  appPath,
  `      void changeView(detail.view, detail.resourceId ?? null)`,
  `      void changeView(detail.view, detail.resourceId ?? null, detail.focusMode ?? false)`
)
replaceOnce(
  appPath,
  `    <AppShell\n      activeView={activeView}\n      onViewChange={(view) => {\n        void changeView(view)\n      }}\n    >`,
  `    <AppShell\n      activeView={activeView}\n      focusMode={focusMode}\n      onViewChange={(view) => {\n        void changeView(view, null, false)\n      }}\n    >`
)
replaceOnce(
  appPath,
  `          <ActiveModule\n            resourceId={activeResourceId}\n            onResourceHandled={() => setActiveResourceId(null)}\n          />`,
  `          <ActiveModule\n            resourceId={activeResourceId}\n            onResourceHandled={() => setActiveResourceId(null)}\n            focusMode={focusMode}\n            onFocusModeChange={setFocusMode}\n          />`
)
replaceOnce(
  appPath,
  `                    void changeView(failure.target, failure.resourceId)`,
  `                    void changeView(failure.target, failure.resourceId, failure.focusMode)`
)
replaceOnce(
  appPath,
  `                    setActiveView(flushFailure.target)\n                    setActiveResourceId(flushFailure.resourceId)\n                    setFlushFailure(null)`,
  `                    setActiveView(flushFailure.target)\n                    setActiveResourceId(flushFailure.resourceId)\n                    setFocusMode(flushFailure.focusMode)\n                    setFlushFailure(null)`
)

const studyPagePath = 'src/renderer/src/modules/study/StudyPage.tsx'
replaceOnce(
  studyPagePath,
  `export function StudyPage({ resourceId, onResourceHandled }: AppModuleProps): React.JSX.Element {`,
  `export function StudyPage({\n  resourceId,\n  onResourceHandled,\n  focusMode = false,\n  onFocusModeChange\n}: AppModuleProps): React.JSX.Element {`
)
replaceOnce(
  studyPagePath,
  `    <section className={getModuleSidebarLayoutClassName(isSidebarCollapsed)}>\n      <ModuleSidebar`,
  `    <section\n      data-study-focus-mode={focusMode}\n      className={\n        focusMode\n          ? 'h-full min-h-0 w-full bg-[var(--app-workspace)]'\n          : getModuleSidebarLayoutClassName(isSidebarCollapsed)\n      }\n    >\n      {!focusMode && (\n        <ModuleSidebar`
)
replaceOnce(
  studyPagePath,
  `      </ModuleSidebar>\n\n      <main className="min-h-0 min-w-0 bg-[var(--app-workspace)]">`,
  `        </ModuleSidebar>\n      )}\n\n      <main className="min-h-0 min-w-0 bg-[var(--app-workspace)]">`
)
replaceOnce(
  studyPagePath,
  `              node={selectedNode}\n              onRename={() => {`,
  `              node={selectedNode}\n              focusMode={focusMode}\n              onFocusModeChange={onFocusModeChange}\n              onRename={() => {`
)

const materialEditorPath = 'src/renderer/src/modules/study/components/StudyMaterialEditor.tsx'
replaceOnce(
  materialEditorPath,
  `import { ArrowLeft, BookOpen, Check, Edit3, LoaderCircle, Pencil } from 'lucide-react'`,
  `import {\n  ArrowLeft,\n  BookOpen,\n  Check,\n  Edit3,\n  LoaderCircle,\n  Maximize2,\n  Minimize2,\n  Pencil\n} from 'lucide-react'`
)
replaceOnce(
  materialEditorPath,
  `  node: StudyNode\n  onRename: () => void`,
  `  node: StudyNode\n  focusMode?: boolean\n  onFocusModeChange?: (active: boolean) => void\n  onRename: () => void`
)
replaceOnce(
  materialEditorPath,
  `  node,\n  onRename,`,
  `  node,\n  focusMode = false,\n  onFocusModeChange,\n  onRename,`
)
replaceOnce(
  materialEditorPath,
  `  const [mode, setMode] = useState<'edit' | 'read'>('edit')`,
  `  const [mode, setMode] = useState<'edit' | 'read'>(() => (focusMode ? 'read' : 'edit'))`
)
replaceOnce(
  materialEditorPath,
  `  const [isLoading, setIsLoading] = useState(true)\n\n  const saveTimerRef`,
  `  const [isLoading, setIsLoading] = useState(true)\n\n  useEffect(() => {\n    if (focusMode) {\n      setMode('read')\n    }\n  }, [focusMode])\n\n  useEffect(() => {\n    if (!focusMode) return undefined\n\n    function handleKeyDown(event: KeyboardEvent): void {\n      if (event.key !== 'Escape' || event.defaultPrevented) return\n      onFocusModeChange?.(false)\n    }\n\n    window.addEventListener('keydown', handleKeyDown)\n    return () => window.removeEventListener('keydown', handleKeyDown)\n  }, [focusMode, onFocusModeChange])\n\n  const saveTimerRef`
)
replaceOnce(
  materialEditorPath,
  `    <section className="flex h-full min-h-0 flex-col">\n      <header className="flex min-h-20 shrink-0 items-center gap-4 border-b border-[var(--app-border)] px-6">`,
  `    <section\n      data-study-material-focus={focusMode}\n      className="flex h-full min-h-0 flex-col bg-[var(--app-workspace)]"\n    >\n      <header\n        className={cn(\n          'flex shrink-0 items-center gap-4 border-b border-[var(--app-border)]',\n          focusMode\n            ? 'min-h-14 bg-[var(--app-surface)] px-5'\n            : 'min-h-20 bg-[var(--app-workspace)] px-6'\n        )}\n      >`
)
replaceOnce(materialEditorPath, `        {onBack && (`, `        {!focusMode && onBack && (`)
replaceOnce(materialEditorPath, `            Материал\n`, `            {focusMode ? 'Режим фокуса' : 'Материал'}\n`)
replaceOnce(
  materialEditorPath,
  `        <Tooltip content="Переименовать материал" side="bottom">\n          <StudyActionButton\n            type="button"\n            aria-label="Переименовать материал"\n            className="w-auto shrink-0 px-3 max-[760px]:w-10 max-[760px]:px-0"\n            onClick={onRename}\n          >\n            <Pencil aria-hidden="true" />\n\n            <span className="max-[760px]:hidden">Переименовать</span>\n          </StudyActionButton>\n        </Tooltip>`,
  `        {!focusMode && (\n          <Tooltip content="Переименовать материал" side="bottom">\n            <StudyActionButton\n              type="button"\n              aria-label="Переименовать материал"\n              className="w-auto shrink-0 px-3 max-[760px]:w-10 max-[760px]:px-0"\n              onClick={onRename}\n            >\n              <Pencil aria-hidden="true" />\n\n              <span className="max-[760px]:hidden">Переименовать</span>\n            </StudyActionButton>\n          </Tooltip>\n        )}`
)
replaceOnce(
  materialEditorPath,
  `        <SaveStatus\n          state={saveState}\n          onRetry={() => {\n            void autosaveQueue.flushLatestDraft().catch((reason: unknown) => {\n              console.error('Failed to retry study material save', reason)\n            })\n          }}\n        />`,
  `        {!focusMode && (\n          <SaveStatus\n            state={saveState}\n            onRetry={() => {\n              void autosaveQueue.flushLatestDraft().catch((reason: unknown) => {\n                console.error('Failed to retry study material save', reason)\n              })\n            }}\n          />\n        )}`
)
replaceOnce(
  materialEditorPath,
  `        <Tabs.Root\n          value={mode}\n          onValueChange={(value) => {\n            if (value === 'edit' || value === 'read') {\n              setMode(value)\n            }\n          }}\n        >\n          <Tabs.List\n            aria-label="Режим просмотра материала"\n            className="inline-flex rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-1"\n          >\n            <Tabs.Trigger\n              value="edit"\n              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] data-[state=active]:bg-[var(--app-surface-raised)] data-[state=active]:text-[var(--app-text)]"\n            >\n              <Edit3 aria-hidden="true" className="size-4" />\n              Правка\n            </Tabs.Trigger>\n\n            <Tabs.Trigger\n              value="read"\n              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] data-[state=active]:bg-[var(--app-surface-raised)] data-[state=active]:text-[var(--app-text)]"\n            >\n              <BookOpen aria-hidden="true" className="size-4" />\n              Чтение\n            </Tabs.Trigger>\n          </Tabs.List>\n        </Tabs.Root>`,
  `        {!focusMode && (\n          <Tabs.Root\n            value={mode}\n            onValueChange={(value) => {\n              if (value === 'edit' || value === 'read') {\n                setMode(value)\n              }\n            }}\n          >\n            <Tabs.List\n              aria-label="Режим просмотра материала"\n              className="inline-flex rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-1"\n            >\n              <Tabs.Trigger\n                value="edit"\n                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] data-[state=active]:bg-[var(--app-surface-raised)] data-[state=active]:text-[var(--app-text)]"\n              >\n                <Edit3 aria-hidden="true" className="size-4" />\n                Правка\n              </Tabs.Trigger>\n\n              <Tabs.Trigger\n                value="read"\n                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] data-[state=active]:bg-[var(--app-surface-raised)] data-[state=active]:text-[var(--app-text)]"\n              >\n                <BookOpen aria-hidden="true" className="size-4" />\n                Чтение\n              </Tabs.Trigger>\n            </Tabs.List>\n          </Tabs.Root>\n        )}`
)
replaceOnce(
  materialEditorPath,
  `        )}\n      </header>\n\n      <div`,
  `        )}\n\n        {focusMode ? (\n          <Tooltip content="Выйти из режима фокуса" side="bottom">\n            <StudyActionButton\n              type="button"\n              aria-label="Выйти из режима фокуса"\n              className="w-auto shrink-0 px-3"\n              onClick={() => onFocusModeChange?.(false)}\n            >\n              <Minimize2 aria-hidden="true" />\n              <span className="max-[640px]:hidden">Выйти из фокуса</span>\n            </StudyActionButton>\n          </Tooltip>\n        ) : mode === 'read' ? (\n          <Tooltip content="Открыть режим фокуса" side="bottom">\n            <StudyActionButton\n              type="button"\n              aria-label="Открыть режим фокуса"\n              className="w-auto shrink-0 px-3 max-[760px]:w-10 max-[760px]:px-0"\n              onClick={() => onFocusModeChange?.(true)}\n            >\n              <Maximize2 aria-hidden="true" />\n              <span className="max-[760px]:hidden">Фокус</span>\n            </StudyActionButton>\n          </Tooltip>\n        ) : null}\n      </header>\n\n      <div`
)
replaceOnce(
  materialEditorPath,
  `            mode === 'read'\n              ? 'mx-auto grid w-full max-w-[1400px] grid-cols-[minmax(0,1fr)_280px] items-start gap-5 max-[1180px]:grid-cols-1'\n              : undefined`,
  `            mode === 'read'\n              ? focusMode\n                ? 'mx-auto w-full max-w-5xl'\n                : 'mx-auto grid w-full max-w-[1400px] grid-cols-[minmax(0,1fr)_280px] items-start gap-5 max-[1180px]:grid-cols-1'\n              : undefined`
)
replaceOnce(
  materialEditorPath,
  `            mode={mode}\n            onChange={updateDocument}`,
  `            mode={mode}\n            focusMode={focusMode}\n            onChange={updateDocument}`
)
replaceOnce(
  materialEditorPath,
  `          {mode === 'read' && (\n            <StudyReadNavigation blocks={document.blocks} scrollContainerRef={readScrollRef} />\n          )}`,
  `          {mode === 'read' && !focusMode && (\n            <StudyReadNavigation blocks={document.blocks} scrollContainerRef={readScrollRef} />\n          )}`
)

const blockEditorPath = 'src/renderer/src/modules/study/components/StudyBlockEditor.tsx'
replaceOnce(
  blockEditorPath,
  `  mode: 'edit' | 'read'\n  onChange:`,
  `  mode: 'edit' | 'read'\n  focusMode?: boolean\n  onChange:`
)
replaceOnce(
  blockEditorPath,
  `  document,\n  mode,\n  onChange`,
  `  document,\n  mode,\n  focusMode = false,\n  onChange`
)
replaceOnce(
  blockEditorPath,
  `    return <ReadOnlyStudyDocument materialId={materialId} document={document} />`,
  `    return (\n      <ReadOnlyStudyDocument materialId={materialId} document={document} focusMode={focusMode} />\n    )`
)
replaceOnce(
  blockEditorPath,
  `function ReadOnlyStudyDocument({\n  materialId,\n  document\n}: {\n  materialId: string\n  document: StudyDocument\n}): React.JSX.Element {`,
  `function ReadOnlyStudyDocument({\n  materialId,\n  document,\n  focusMode\n}: {\n  materialId: string\n  document: StudyDocument\n  focusMode: boolean\n}): React.JSX.Element {`
)
replaceOnce(
  blockEditorPath,
  `    <div className="mx-auto min-h-[85vh] w-full max-w-5xl rounded-2xl border border-(--app-border) bg-(--app-surface)">`,
  `    <div\n      className={cn(\n        'mx-auto min-h-[85vh] w-full max-w-5xl',\n        !focusMode && 'rounded-2xl border border-(--app-border) bg-(--app-surface)'\n      )}\n    >`
)
replaceOnce(
  blockEditorPath,
  `          <StudyReadNodeView key={getStudyReadNodeKey(node)} materialId={materialId} node={node} />`,
  `          <StudyReadNodeView\n            key={getStudyReadNodeKey(node)}\n            materialId={materialId}\n            node={node}\n            focusMode={focusMode}\n          />`
)
replaceOnce(
  blockEditorPath,
  `function StudyReadNodeView({\n  materialId,\n  node\n}: {\n  materialId: string\n  node: StudyReadNode\n}): React.JSX.Element {\n  if (node.kind === 'section') {\n    return <StudyReadSection materialId={materialId} section={node} />\n  }\n\n  return <StudyBlockReader materialId={materialId} block={node.block} />\n}`,
  `function StudyReadNodeView({\n  materialId,\n  node,\n  focusMode\n}: {\n  materialId: string\n  node: StudyReadNode\n  focusMode: boolean\n}): React.JSX.Element {\n  if (node.kind === 'section') {\n    return <StudyReadSection materialId={materialId} section={node} focusMode={focusMode} />\n  }\n\n  return <StudyBlockReader materialId={materialId} block={node.block} focusMode={focusMode} />\n}`
)
replaceOnce(
  blockEditorPath,
  `function StudyReadSection({\n  materialId,\n  section\n}: {\n  materialId: string\n  section: StudyReadSectionNode\n}): React.JSX.Element {`,
  `function StudyReadSection({\n  materialId,\n  section,\n  focusMode\n}: {\n  materialId: string\n  section: StudyReadSectionNode\n  focusMode: boolean\n}): React.JSX.Element {`
)
replaceOnce(
  blockEditorPath,
  `              node={child}\n            />`,
  `              node={child}\n              focusMode={focusMode}\n            />`
)
replaceOnce(
  blockEditorPath,
  `function StudyBlockReader({\n  materialId,\n  block\n}: {\n  materialId: string\n  block: StudyBlock\n}): React.JSX.Element {\n  const Reader = studyBlockReaders[getStudyBlockDefinition(block.type).readStrategy]\n\n  return <Reader materialId={materialId} block={block} />\n}`,
  `function StudyBlockReader({\n  materialId,\n  block,\n  focusMode\n}: {\n  materialId: string\n  block: StudyBlock\n  focusMode: boolean\n}): React.JSX.Element {\n  const Reader = studyBlockReaders[getStudyBlockDefinition(block.type).readStrategy]\n\n  return <Reader materialId={materialId} block={block} focusMode={focusMode} />\n}`
)
replaceOnce(
  blockEditorPath,
  `type StudyBlockReaderProps = {\n  materialId: string\n  block: StudyBlock\n}`,
  `type StudyBlockReaderProps = {\n  materialId: string\n  block: StudyBlock\n  focusMode?: boolean\n}`
)
replaceOnce(
  blockEditorPath,
  `function ReadBoardBlock({ materialId, block }: StudyBlockReaderProps): React.JSX.Element {`,
  `function ReadBoardBlock({\n  materialId,\n  block,\n  focusMode\n}: StudyBlockReaderProps): React.JSX.Element {`
)
replaceOnce(
  blockEditorPath,
  `  return <StudyBoardBlock materialId={materialId} block={block} mode="read" />`,
  `  return (\n    <StudyBoardBlock materialId={materialId} block={block} mode="read" focusMode={focusMode} />\n  )`
)

const studyBoardPath = 'src/renderer/src/modules/study/components/board/StudyBoardBlock.tsx'
replaceOnce(
  studyBoardPath,
  `  mode: 'edit' | 'read'\n  onChange?:`,
  `  mode: 'edit' | 'read'\n  focusMode?: boolean\n  onChange?:`
)
replaceOnce(
  studyBoardPath,
  `  block,\n  mode,\n  onChange`,
  `  block,\n  mode,\n  focusMode = false,\n  onChange`
)
replaceOnce(
  studyBoardPath,
  `        view: 'boards',\n        resourceId: board.id`,
  `        view: 'boards',\n        resourceId: board.id,\n        focusMode: mode === 'read' && focusMode`
)

const boardsPagePath = 'src/renderer/src/modules/boards/BoardsPage.tsx'
replaceOnce(
  boardsPagePath,
  `  LoaderCircle,\n  LockKeyhole,\n  Palette,`,
  `  LoaderCircle,\n  LockKeyhole,\n  Minimize2,\n  Palette,`
)
replaceOnce(
  boardsPagePath,
  `import { requestAppModuleNavigation } from '../../app/module-navigation'`,
  `import { requestAppModuleNavigation } from '../../app/module-navigation'\nimport type { AppModuleProps } from '../../app/module-registry'`
)
replaceOnce(
  boardsPagePath,
  `import { getModuleSidebarLayoutClassName } from '../../shared/ui/module-sidebar-layout'`,
  `import { getModuleSidebarLayoutClassName } from '../../shared/ui/module-sidebar-layout'\nimport { Tooltip } from '../../shared/ui/tooltip'`
)
replaceOnce(
  boardsPagePath,
  `export interface BoardsPageProps {\n  resourceId?: string | null\n  onResourceHandled?: () => void\n}`,
  `export type BoardsPageProps = AppModuleProps`
)
replaceOnce(
  boardsPagePath,
  `export function BoardsPage({ resourceId, onResourceHandled }: BoardsPageProps): React.JSX.Element {`,
  `export function BoardsPage({\n  resourceId,\n  onResourceHandled,\n  focusMode = false,\n  onFocusModeChange\n}: BoardsPageProps): React.JSX.Element {`
)
replaceOnce(
  boardsPagePath,
  `    <section className={getModuleSidebarLayoutClassName(sidebarCollapsed)}>\n      <ModuleSidebar`,
  `    <section\n      data-boards-focus-mode={focusMode}\n      className={\n        focusMode\n          ? 'h-full min-h-0 w-full bg-[var(--app-workspace)]'\n          : getModuleSidebarLayoutClassName(sidebarCollapsed)\n      }\n    >\n      {!focusMode && (\n        <ModuleSidebar`
)
replaceOnce(
  boardsPagePath,
  `      </ModuleSidebar>\n\n      <main className="min-w-0 flex-1 overflow-hidden">`,
  `        </ModuleSidebar>\n      )}\n\n      <main className="min-w-0 flex-1 overflow-hidden">`
)
replaceOnce(
  boardsPagePath,
  `            onSaveStateChange={setSaveState}\n            onRename={() => startRename(selectedNode)}`,
  `            onSaveStateChange={setSaveState}\n            focusMode={focusMode}\n            onFocusModeChange={onFocusModeChange}\n            onRename={() => startRename(selectedNode)}`
)
replaceOnce(
  boardsPagePath,
  `                      view: 'study',\n                      resourceId: selectedNode.sourceMaterialId`,
  `                      view: 'study',\n                      resourceId: selectedNode.sourceMaterialId,\n                      focusMode`
)
replaceOnce(
  boardsPagePath,
  `  onSaveStateChange,\n  onRename,\n  onBackToMaterial`,
  `  onSaveStateChange,\n  focusMode,\n  onFocusModeChange,\n  onRename,\n  onBackToMaterial`
)
replaceOnce(
  boardsPagePath,
  `  onSaveStateChange: (state: BoardSaveState) => void\n  onRename: () => void`,
  `  onSaveStateChange: (state: BoardSaveState) => void\n  focusMode: boolean\n  onFocusModeChange?: (active: boolean) => void\n  onRename: () => void`
)
replaceOnce(
  boardsPagePath,
  `    <section className="flex h-full min-h-0 flex-col">\n      <header className="flex h-20 shrink-0 items-center gap-4 border-b border-[var(--app-border)] bg-[var(--app-workspace)] px-5">`,
  `    <section\n      data-board-workspace-focus={focusMode}\n      className="flex h-full min-h-0 flex-col bg-[var(--app-workspace)]"\n    >\n      <header\n        className={cn(\n          'flex shrink-0 items-center gap-4 border-b border-[var(--app-border)]',\n          focusMode ? 'h-14 bg-[var(--app-surface)] px-4' : 'h-20 bg-[var(--app-workspace)] px-5'\n        )}\n      >`
)
replaceOnce(
  boardsPagePath,
  `        {onBackToMaterial && (\n          <WorkspaceActionButton\n            type="button"\n            className="w-auto px-3 max-[720px]:size-10 max-[720px]:px-0"\n            onClick={onBackToMaterial}\n          >\n            <ArrowLeft aria-hidden="true" />\n            <span className="max-[720px]:hidden">Назад к материалу</span>\n          </WorkspaceActionButton>\n        )}`,
  `        {onBackToMaterial && (\n          <Tooltip content="Вернуться к материалу" side="bottom">\n            <WorkspaceActionButton\n              type="button"\n              aria-label="Вернуться к материалу"\n              className="w-auto px-3 max-[720px]:size-10 max-[720px]:px-0"\n              onClick={onBackToMaterial}\n            >\n              <ArrowLeft aria-hidden="true" />\n              <span className="max-[720px]:hidden">Назад к материалу</span>\n            </WorkspaceActionButton>\n          </Tooltip>\n        )}`
)
replaceOnce(
  boardsPagePath,
  `        <WorkspaceActionButton\n          type="button"\n          className="w-auto px-3 max-[720px]:size-10 max-[720px]:px-0"\n          onClick={onRename}\n        >\n          <Pencil aria-hidden="true" />\n          <span className="max-[720px]:hidden">Переименовать</span>\n        </WorkspaceActionButton>\n        <BoardSaveStatus state={saveState} />`,
  `        {!focusMode && (\n          <Tooltip content="Переименовать доску" side="bottom">\n            <WorkspaceActionButton\n              type="button"\n              aria-label="Переименовать доску"\n              className="w-auto px-3 max-[720px]:size-10 max-[720px]:px-0"\n              onClick={onRename}\n            >\n              <Pencil aria-hidden="true" />\n              <span className="max-[720px]:hidden">Переименовать</span>\n            </WorkspaceActionButton>\n          </Tooltip>\n        )}\n        {!focusMode && <BoardSaveStatus state={saveState} />}\n        {focusMode && (\n          <Tooltip content="Выйти из режима фокуса" side="bottom">\n            <WorkspaceActionButton\n              type="button"\n              aria-label="Выйти из режима фокуса"\n              className="w-auto px-3 max-[720px]:size-10 max-[720px]:px-0"\n              onClick={() => onFocusModeChange?.(false)}\n            >\n              <Minimize2 aria-hidden="true" />\n              <span className="max-[720px]:hidden">Выйти из фокуса</span>\n            </WorkspaceActionButton>\n          </Tooltip>\n        )}`
)
replaceOnce(
  boardsPagePath,
  `            <BoardCanvas boardId={node.id} onSaveStateChange={onSaveStateChange} />`,
  `            <BoardCanvas\n              boardId={node.id}\n              focusMode={focusMode}\n              onFocusModeChange={onFocusModeChange}\n              onSaveStateChange={onSaveStateChange}\n            />`
)
replaceOnce(
  boardsPagePath,
  `      {error && (\n        <button\n          type="button"\n          aria-label="Закрыть сообщение об ошибке"`,
  `      {error && (\n        <Tooltip content="Закрыть сообщение об ошибке" side="left">\n          <button\n            type="button"\n            aria-label="Закрыть сообщение об ошибке"`
)
replaceOnce(
  boardsPagePath,
  `          <span className="text-sm text-red-200">{error}</span>\n        </button>\n      )}`,
  `            <span className="text-sm text-red-200">{error}</span>\n          </button>\n        </Tooltip>\n      )}`
)

const boardCanvasPath = 'src/renderer/src/modules/boards/components/BoardCanvas.tsx'
replaceOnce(
  boardCanvasPath,
  `import { cn } from '../../../shared/lib/cn'`,
  `import { cn } from '../../../shared/lib/cn'\nimport { Tooltip } from '../../../shared/ui/tooltip'`
)
replaceOnce(
  boardCanvasPath,
  `  boardId: string\n  onSaveStateChange?:`,
  `  boardId: string\n  focusMode?: boolean\n  onFocusModeChange?: (active: boolean) => void\n  onSaveStateChange?:`
)
replaceOnce(
  boardCanvasPath,
  `        <TldrawUiButton\n          type="icon"\n          aria-label={controls.fullscreenLabel}\n          aria-pressed={controls.isFullscreen}\n          data-board-fullscreen-control="true"\n          title={controls.fullscreenLabel}\n          onClick={controls.toggleFullscreen}\n        >\n          {controls.isFullscreen ? (\n            <Minimize2 aria-hidden="true" className="size-4" />\n          ) : (\n            <Maximize2 aria-hidden="true" className="size-4" />\n          )}\n        </TldrawUiButton>`,
  `        <Tooltip\n          content={controls.fullscreenLabel}\n          side="bottom"\n          contentClassName="z-[1000]"\n        >\n          <TldrawUiButton\n            type="icon"\n            aria-label={controls.fullscreenLabel}\n            aria-pressed={controls.isFullscreen}\n            data-board-fullscreen-control="true"\n            onClick={controls.toggleFullscreen}\n          >\n            {controls.isFullscreen ? (\n              <Minimize2 aria-hidden="true" className="size-4" />\n            ) : (\n              <Maximize2 aria-hidden="true" className="size-4" />\n            )}\n          </TldrawUiButton>\n        </Tooltip>`
)
replaceOnce(
  boardCanvasPath,
  `export function BoardCanvas({ boardId, onSaveStateChange }: BoardCanvasProps): React.JSX.Element {`,
  `export function BoardCanvas({\n  boardId,\n  focusMode = false,\n  onFocusModeChange,\n  onSaveStateChange\n}: BoardCanvasProps): React.JSX.Element {`
)
replaceOnce(
  boardCanvasPath,
  `  const saveTimerRef = useRef<number | null>(null)\n  const isFullscreen = fullscreenBoardId === boardId`,
  `  const saveTimerRef = useRef<number | null>(null)\n  const isLocalFullscreen = fullscreenBoardId === boardId\n  const isFullscreen = focusMode || isLocalFullscreen`
)
replaceOnce(
  boardCanvasPath,
  `      setFullscreenBoardId(null)`,
  `      if (focusMode) {\n        onFocusModeChange?.(false)\n      } else {\n        setFullscreenBoardId(null)\n      }`
)
replaceOnce(
  boardCanvasPath,
  `  }, [isFullscreen])`,
  `  }, [focusMode, isFullscreen, onFocusModeChange])`
)
replaceOnce(
  boardCanvasPath,
  `  const toggleFullscreen = useCallback(() => {\n    setFullscreenBoardId((current) => (current === boardId ? null : boardId))\n  }, [boardId])`,
  `  const toggleFullscreen = useCallback(() => {\n    if (focusMode) {\n      onFocusModeChange?.(false)\n      return\n    }\n\n    setFullscreenBoardId((current) => (current === boardId ? null : boardId))\n  }, [boardId, focusMode, onFocusModeChange])`
)
replaceOnce(
  boardCanvasPath,
  `  const fullscreenLabel = isFullscreen\n    ? 'Вернуть обычный вид доски'\n    : 'Развернуть доску на весь экран'`,
  `  const fullscreenLabel = focusMode\n    ? 'Выйти из режима фокуса'\n    : isFullscreen\n      ? 'Вернуть обычный вид доски'\n      : 'Развернуть доску на весь экран'`
)
replaceOnce(
  boardCanvasPath,
  `        data-board-fullscreen={isFullscreen}\n        className={cn(`,
  `        data-board-fullscreen={isFullscreen}\n        data-board-focus-mode={focusMode}\n        className={cn(`
)
replaceOnce(
  boardCanvasPath,
  `          isFullscreen && 'fixed inset-0 z-40 h-screen w-screen'`,
  `          isLocalFullscreen && 'fixed inset-0 z-40 h-screen w-screen'`
)

const boardTreePath = 'src/renderer/src/modules/boards/components/BoardTree.tsx'
replaceOnce(
  boardTreePath,
  `              (isFolder ? (\n                <button\n                  type="button"\n                  aria-label={node.isExpanded ? 'Свернуть папку' : 'Развернуть папку'}\n                  className="z-20 flex size-5 shrink-0 items-center justify-center rounded-sm p-0 outline-none hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-violet-500/35"\n                  onClick={() => void onToggle(node)}\n                >\n                  {node.isExpanded ? (\n                    <ChevronDown aria-hidden="true" className="size-3.5" />\n                  ) : (\n                    <ChevronRight aria-hidden="true" className="size-3.5" />\n                  )}\n                </button>\n              ) : (`,
  `              (isFolder ? (\n                <Tooltip\n                  content={node.isExpanded ? 'Свернуть папку' : 'Развернуть папку'}\n                  side="right"\n                >\n                  <button\n                    type="button"\n                    aria-label={node.isExpanded ? 'Свернуть папку' : 'Развернуть папку'}\n                    className="z-20 flex size-5 shrink-0 items-center justify-center rounded-sm p-0 outline-none hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-violet-500/35"\n                    onClick={() => void onToggle(node)}\n                  >\n                    {node.isExpanded ? (\n                      <ChevronDown aria-hidden="true" className="size-3.5" />\n                    ) : (\n                      <ChevronRight aria-hidden="true" className="size-3.5" />\n                    )}\n                  </button>\n                </Tooltip>\n              ) : (`
)
replaceOnce(
  boardTreePath,
  `      <DropdownMenu.Trigger asChild>\n        <button\n          type="button"\n          aria-label={\`Действия: \${nodeTitle}\`}`,
  `      <Tooltip content={\`Действия: \${nodeTitle}\`} side="right">\n        <DropdownMenu.Trigger asChild>\n          <button\n            type="button"\n            aria-label={\`Действия: \${nodeTitle}\`}`
)
replaceOnce(
  boardTreePath,
  `        </button>\n      </DropdownMenu.Trigger>\n\n      <BoardNodeDropdownMenuContent entries={entries} />`,
  `          </button>\n        </DropdownMenu.Trigger>\n      </Tooltip>\n\n      <BoardNodeDropdownMenuContent entries={entries} />`
)

createFile(
  'src/renderer/src/app/AppShell.focus.test.tsx',
  `import { render, screen } from '@testing-library/react'\nimport { describe, expect, it, vi } from 'vitest'\n\nimport { AppShell } from './AppShell'\n\ndescribe('AppShell focus mode', () => {\n  it('removes the application navigation and gives the workspace the full window', () => {\n    render(\n      <AppShell activeView="study" focusMode onViewChange={vi.fn()}>\n        <div>Учебный материал</div>\n      </AppShell>\n    )\n\n    expect(screen.queryByRole('complementary', { name: 'Боковая панель' })).not.toBeInTheDocument()\n    expect(screen.getByText('Учебный материал')).toBeInTheDocument()\n    expect(document.querySelector('#workspace')).toHaveAttribute('data-focus-mode', 'true')\n  })\n})\n`
)

createFile(
  'src/renderer/src/modules/study/components/StudyMaterialEditor.focus.test.tsx',
  `import { fireEvent, render, screen, waitFor } from '@testing-library/react'\nimport userEvent from '@testing-library/user-event'\nimport { beforeEach, describe, expect, it, vi } from 'vitest'\n\nimport type { StudyNode } from '../../../../../shared/contracts/study'\n\nconst studyMocks = vi.hoisted(() => ({\n  getMaterial: vi.fn(),\n  saveMaterial: vi.fn()\n}))\n\nvi.mock('../api/study-client', () => ({\n  studyClient: studyMocks\n}))\n\nvi.mock('./StudyBlockEditor', () => ({\n  StudyBlockEditor: ({ mode, focusMode }: { mode: string; focusMode: boolean }) => (\n    <div data-testid="study-block-editor">\n      {mode}:{String(focusMode)}\n    </div>\n  )\n}))\n\nvi.mock('./StudyReadNavigation', () => ({\n  StudyReadNavigation: () => <aside>Навигация чтения</aside>\n}))\n\nimport { StudyMaterialEditor } from './StudyMaterialEditor'\n\nconst materialNode: StudyNode = {\n  id: 'material-focus',\n  type: 'material',\n  parentId: null,\n  title: 'Материал для фокуса',\n  position: 0,\n  isExpanded: true,\n  createdAt: 1,\n  updatedAt: 1\n}\n\nbeforeEach(() => {\n  studyMocks.getMaterial.mockResolvedValue({\n    nodeId: materialNode.id,\n    document: { version: 1, blocks: [] },\n    plainText: '',\n    createdAt: 1,\n    updatedAt: 1\n  })\n  studyMocks.saveMaterial.mockResolvedValue(undefined)\n})\n\ndescribe('StudyMaterialEditor focus mode', () => {\n  it('enters focus only from reading, hides editing chrome and exits by Escape', async () => {\n    const user = userEvent.setup()\n    const onFocusModeChange = vi.fn()\n    const props = {\n      node: materialNode,\n      onRename: vi.fn(),\n      navigation: null,\n      onNavigationHandled: vi.fn(),\n      onFocusModeChange\n    }\n\n    const view = render(<StudyMaterialEditor {...props} focusMode={false} />)\n\n    await waitFor(() => expect(studyMocks.getMaterial).toHaveBeenCalledWith(materialNode.id))\n    await user.click(screen.getByRole('tab', { name: 'Чтение' }))\n    await user.click(screen.getByRole('button', { name: 'Открыть режим фокуса' }))\n\n    expect(onFocusModeChange).toHaveBeenLastCalledWith(true)\n\n    view.rerender(<StudyMaterialEditor {...props} focusMode />)\n\n    expect(screen.getByTestId('study-block-editor')).toHaveTextContent('read:true')\n    expect(screen.queryByRole('tab', { name: 'Правка' })).not.toBeInTheDocument()\n    expect(screen.queryByRole('button', { name: 'Переименовать материал' })).not.toBeInTheDocument()\n    expect(screen.queryByText('Навигация чтения')).not.toBeInTheDocument()\n    expect(screen.getByRole('button', { name: 'Выйти из режима фокуса' })).toBeInTheDocument()\n\n    fireEvent.keyDown(window, { key: 'Escape' })\n    expect(onFocusModeChange).toHaveBeenLastCalledWith(false)\n  })\n})\n`
)

createFile(
  'src/renderer/src/modules/study/components/board/StudyBoardBlock.focus.test.tsx',
  `import { render, screen, waitFor } from '@testing-library/react'\nimport userEvent from '@testing-library/user-event'\nimport { afterEach, describe, expect, it, vi } from 'vitest'\n\nimport type { StudyBlock } from '../../../../../../shared/contracts/study'\nimport { APP_MODULE_NAVIGATE_EVENT, type AppModuleNavigationRequest } from '../../../../app/module-navigation'\n\nconst boardMocks = vi.hoisted(() => ({\n  ensureStudyBoard: vi.fn()\n}))\n\nvi.mock('../../../boards/api/boards-client', () => ({\n  boardsClient: boardMocks\n}))\n\nimport { StudyBoardBlock } from './StudyBoardBlock'\n\nconst block: Extract<StudyBlock, { type: 'board' }> = {\n  id: 'board-block-focus',\n  type: 'board',\n  boardId: 'board-focus',\n  title: 'Доска фокуса'\n}\n\nafterEach(() => {\n  boardMocks.ensureStudyBoard.mockReset()\n})\n\ndescribe('StudyBoardBlock focus navigation', () => {\n  it('preserves focus mode when a board is opened from reading', async () => {\n    const user = userEvent.setup()\n    let request: AppModuleNavigationRequest | null = null\n    const listener = (event: Event): void => {\n      request = (event as CustomEvent<AppModuleNavigationRequest>).detail\n    }\n\n    boardMocks.ensureStudyBoard.mockResolvedValue({\n      id: 'board-focus',\n      type: 'board',\n      parentId: null,\n      title: 'Доска фокуса',\n      position: 0,\n      isExpanded: true,\n      isSystem: false,\n      sourceMaterialId: 'material-focus',\n      sourceBlockId: block.id,\n      createdAt: 1,\n      updatedAt: 1\n    })\n\n    window.addEventListener(APP_MODULE_NAVIGATE_EVENT, listener)\n    render(\n      <StudyBoardBlock\n        materialId="material-focus"\n        block={block}\n        mode="read"\n        focusMode\n      />\n    )\n\n    await user.click(screen.getByRole('button', { name: /Открыть доску/ }))\n    await waitFor(() => expect(request).not.toBeNull())\n\n    expect(request).toEqual({\n      view: 'boards',\n      resourceId: 'board-focus',\n      focusMode: true\n    })\n\n    window.removeEventListener(APP_MODULE_NAVIGATE_EVENT, listener)\n  })\n})\n`
)

console.log('Study focus mode implementation applied')
