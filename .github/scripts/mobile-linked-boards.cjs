const fs = require('node:fs')

function patch(path, operations) {
  let value = fs.readFileSync(path, 'utf8')
  for (const [from, to] of operations) {
    if (!value.includes(from)) {
      throw new Error(`Patch target not found in ${path}: ${from.slice(0, 160)}`)
    }
    value = value.replace(from, to)
  }
  fs.writeFileSync(path, value)
}

fs.writeFileSync(
  'apps/mobile/src/shared/ui/DocumentBoardBlock.tsx',
  `import { useState } from 'react'
import { TextInput, View } from 'react-native'
import type { StudyBoardBlock } from '@mymind/contracts/study'
import { designTokens } from '@mymind/design'
import { Button, Label } from './primitives'
import { useTheme } from './theme'

export type OpenDocumentBoard = (block: StudyBoardBlock) => Promise<void>

function useBoardAction(
  block: StudyBoardBlock,
  openBoard: OpenDocumentBoard | undefined,
  onError: ((reason: unknown) => void) | undefined
): { pending: boolean; open: () => void } {
  const [pending, setPending] = useState(false)

  return {
    pending,
    open: () => {
      if (!openBoard || pending) return
      setPending(true)
      void openBoard(block)
        .catch((reason: unknown) => onError?.(reason))
        .finally(() => setPending(false))
    }
  }
}

export function DocumentBoardEditor({
  block,
  update,
  openBoard,
  onError
}: {
  block: StudyBoardBlock
  update(block: StudyBoardBlock): void
  openBoard?: OpenDocumentBoard
  onError?: (reason: unknown) => void
}): React.JSX.Element {
  const theme = useTheme()
  const action = useBoardAction(block, openBoard, onError)

  return (
    <View style={{ gap: 8 }}>
      <TextInput
        accessibilityLabel="Название доски"
        placeholder="Доска"
        placeholderTextColor={theme.muted}
        value={block.title ?? ''}
        onChangeText={(title) => update({ ...block, title: title || undefined })}
        style={{
          color: theme.text,
          backgroundColor: theme.raised,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: designTokens.radius.md,
          padding: 12,
          minHeight: 48,
          fontSize: 16
        }}
      />
      <Label muted>
        {block.boardId
          ? 'Доска связана с этим блоком и хранится в разделе «Доски».'
          : 'При первом открытии будет создана связанная локальная доска.'}
      </Label>
      {openBoard ? (
        <Button
          label={action.pending ? 'Открытие…' : block.boardId ? 'Открыть доску' : 'Создать доску'}
          selected
          disabled={action.pending}
          onPress={action.open}
        />
      ) : null}
    </View>
  )
}

export function DocumentBoardReader({
  block,
  openBoard,
  onError
}: {
  block: StudyBoardBlock
  openBoard?: OpenDocumentBoard
  onError?: (reason: unknown) => void
}): React.JSX.Element {
  const theme = useTheme()
  const action = useBoardAction(block, openBoard, onError)

  return (
    <View
      style={{
        gap: 10,
        padding: 14,
        borderRadius: designTokens.radius.lg,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface
      }}
    >
      <Label>{block.title || 'Доска'}</Label>
      <Label muted>
        {block.boardId
          ? 'Связанная доска сохранена локально.'
          : 'Доска будет создана при первом открытии.'}
      </Label>
      {openBoard ? (
        <Button
          label={action.pending ? 'Открытие…' : block.boardId ? 'Открыть доску' : 'Создать доску'}
          selected
          disabled={action.pending}
          onPress={action.open}
        />
      ) : null}
    </View>
  )
}
`
)

patch('apps/mobile/src/shared/ui/DocumentEditor.tsx', [
  [
    `  StudyBlockType,\n  StudyDocument,\n  StudyLocalAsset`,
    `  StudyBlockType,\n  StudyBoardBlock,\n  StudyDocument,\n  StudyLocalAsset`
  ],
  [
    `import { Button, Label } from './primitives'`,
    `import { DocumentBoardEditor, type OpenDocumentBoard } from './DocumentBoardBlock'\nimport { Button, Label } from './primitives'`
  ],
  [
    `  { type: 'mermaid', label: 'Mermaid' },\n  { type: 'divider', label: 'Разделитель' }`,
    `  { type: 'mermaid', label: 'Mermaid' },\n  { type: 'board', label: 'Доска' },\n  { type: 'divider', label: 'Разделитель' }`
  ],
  [
    `  saveRecordedAudio?: (input: VoiceRecordingInput) => Promise<StudyLocalAsset>\n  onAssetError?: (reason: unknown) => void`,
    `  saveRecordedAudio?: (input: VoiceRecordingInput) => Promise<StudyLocalAsset>\n  openBoard?: OpenDocumentBoard\n  onAssetError?: (reason: unknown) => void`
  ],
  [
    `    case 'mermaid':\n      return { id, type, source: '', viewMode: 'write' }\n    case 'divider':`,
    `    case 'mermaid':\n      return { id, type, source: '', viewMode: 'write' }\n    case 'board':\n      return { id, type }\n    case 'divider':`
  ],
  [
    `function BlockInput({\n  block,\n  update,\n  assetActions\n}: {\n  block: StudyBlock\n  update(next: StudyBlock): void\n  assetActions: DocumentAssetActions\n}): React.JSX.Element {`,
    `function BlockInput({\n  block,\n  update,\n  assetActions,\n  openBoard\n}: {\n  block: StudyBlock\n  update(next: StudyBlock): void\n  assetActions: DocumentAssetActions\n  openBoard?: OpenDocumentBoard\n}): React.JSX.Element {`
  ],
  [
    `    case 'board':\n      return (\n        <View style={{ gap: 6 }}>\n          <TextInput\n            accessibilityLabel="Название доски"\n            placeholder="Доска"\n            placeholderTextColor={theme.muted}\n            value={block.title ?? ''}\n            onChangeText={(title) => update({ ...block, title: title || undefined })}\n            style={inputStyle}\n          />\n          <Label muted>\n            {block.boardId\n              ? 'Связанная доска сохранена в документе.'\n              : 'Блок доски без созданного canvas.'}\n          </Label>\n        </View>\n      )`,
    `    case 'board':\n      return (\n        <DocumentBoardEditor\n          block={block as StudyBoardBlock}\n          update={(next) => update(next)}\n          openBoard={openBoard}\n          onError={assetActions.onAssetError}\n        />\n      )`
  ],
  [
    `  resolveAssetUri,\n  saveRecordedAudio,\n  onAssetError`,
    `  resolveAssetUri,\n  saveRecordedAudio,\n  openBoard,\n  onAssetError`
  ],
  [
    `            update={(next) => replace(index, next)}\n            assetActions={assetActions}\n          />`,
    `            update={(next) => replace(index, next)}\n            assetActions={assetActions}\n            openBoard={openBoard}\n          />`
  ]
])

patch('apps/mobile/src/shared/ui/DocumentReader.tsx', [
  [
    `import { AudioAssetPlayer } from './VoiceRecorder'\nimport { Button, Label } from './primitives'`,
    `import { DocumentBoardReader, type OpenDocumentBoard } from './DocumentBoardBlock'\nimport { AudioAssetPlayer } from './VoiceRecorder'\nimport { Button, Label } from './primitives'`
  ],
  [
    `  onAssetError?: (reason: unknown) => void\n  header?: React.ReactElement | null`,
    `  onAssetError?: (reason: unknown) => void\n  openBoard?: OpenDocumentBoard\n  header?: React.ReactElement | null`
  ],
  [
    `  onAssetError\n}: {\n  block: StudyBlock\n  resolveAssetUri?: (asset: StudyLocalAsset) => string | null\n  openAsset?: (asset: StudyLocalAsset) => Promise<void>\n  onAssetError?: (reason: unknown) => void\n}): React.JSX.Element {`,
    `  onAssetError,\n  openBoard\n}: {\n  block: StudyBlock\n  resolveAssetUri?: (asset: StudyLocalAsset) => string | null\n  openAsset?: (asset: StudyLocalAsset) => Promise<void>\n  onAssetError?: (reason: unknown) => void\n  openBoard?: OpenDocumentBoard\n}): React.JSX.Element {`
  ],
  [
    `    case 'board':\n      return (\n        <View\n          style={{\n            gap: 6,\n            padding: 14,\n            borderRadius: designTokens.radius.lg,\n            borderWidth: 1,\n            borderColor: theme.border,\n            backgroundColor: theme.surface\n          }}\n        >\n          <Label>{block.title || 'Доска'}</Label>\n          <Label muted>\n            {block.boardId\n              ? 'Связанная доска сохранена в материале.'\n              : 'Доска ещё не создана для этого блока.'}\n          </Label>\n        </View>\n      )`,
    `    case 'board':\n      return <DocumentBoardReader block={block} openBoard={openBoard} onError={onAssetError} />`
  ],
  [
    `  openAsset,\n  onAssetError,\n  header`,
    `  openAsset,\n  onAssetError,\n  openBoard,\n  header`
  ],
  [
    `            openAsset={openAsset}\n            onAssetError={onAssetError}\n          />`,
    `            openAsset={openAsset}\n            onAssetError={onAssetError}\n            openBoard={openBoard}\n          />`
  ]
])

patch('apps/mobile/src/modules/study/StudyScreen.tsx', [
  [
    `import type { StudyDocument, StudyMaterial, StudyNode } from '@mymind/contracts/study'`,
    `import type { StudyBoardBlock, StudyDocument, StudyMaterial, StudyNode } from '@mymind/contracts/study'`
  ],
  [
    `export function StudyScreen({\n  onImmersiveChange\n}: {\n  onImmersiveChange?: (active: boolean) => void\n}): React.JSX.Element {\n  const { study: api, documentAssets } = useServices()`,
    `export function StudyScreen({\n  onImmersiveChange,\n  onOpenBoard\n}: {\n  onImmersiveChange?: (active: boolean) => void\n  onOpenBoard?: (boardId: string) => void\n}): React.JSX.Element {\n  const { study: api, boards, documentAssets } = useServices()`
  ],
  [
    `  const changeDocument = (next: StudyDocument): void => {\n    setDocument(next)\n    setEditorError('')\n    queueRef.current?.schedule(next)\n  }\n\n  const refreshAfterMutation`,
    `  const changeDocument = (next: StudyDocument): void => {\n    setDocument(next)\n    setEditorError('')\n    queueRef.current?.schedule(next)\n  }\n\n  const openLinkedBoard = useCallback(\n    async (block: StudyBoardBlock): Promise<void> => {\n      if (!material || !document || !onOpenBoard) {\n        throw new Error('Связанную доску сейчас нельзя открыть')\n      }\n      await flush()\n      const board = boards.ensureStudyBoard({ materialId: material.nodeId, blockId: block.id })\n      if (block.boardId !== board.id || block.title !== board.title) {\n        const nextDocument: StudyDocument = {\n          ...document,\n          blocks: document.blocks.map((item) =>\n            item.id === block.id && item.type === 'board'\n              ? { ...item, boardId: board.id, title: board.title }\n              : item\n          )\n        }\n        setDocument(nextDocument)\n        queueRef.current?.schedule(nextDocument)\n        await flush()\n      }\n      notifyDataChanged()\n      onOpenBoard(board.id)\n    },\n    [boards, document, flush, material, onOpenBoard]\n  )\n\n  const refreshAfterMutation`
  ],
  [
    `            onAssetError={(reason) => setEditorError(messageFor(reason))}\n            header={readerHeader}`,
    `            onAssetError={(reason) => setEditorError(messageFor(reason))}\n            openBoard={openLinkedBoard}\n            header={readerHeader}`
  ],
  [
    `            resolveAssetUri={documentAssets.resolveAssetUri}\n            onAssetError={(reason) => setEditorError(messageFor(reason))}\n            header={`,
    `            resolveAssetUri={documentAssets.resolveAssetUri}\n            openBoard={openLinkedBoard}\n            onAssetError={(reason) => setEditorError(messageFor(reason))}\n            header={`
  ]
])

patch('apps/mobile/src/modules/notes/NotesScreen.tsx', [
  [
    `import { STUDY_FOLDER_ICON_NAMES } from '@mymind/contracts/study'`,
    `import type { StudyBoardBlock } from '@mymind/contracts/study'\nimport { STUDY_FOLDER_ICON_NAMES } from '@mymind/contracts/study'`
  ],
  [
    `export function NotesScreen(): React.JSX.Element {\n  const { notes: api, documentAssets } = useServices()`,
    `export function NotesScreen({\n  onOpenBoard\n}: {\n  onOpenBoard?: (boardId: string) => void\n}): React.JSX.Element {\n  const { notes: api, boards, documentAssets } = useServices()`
  ],
  [
    `  const changeDocument = (next: NoteDocument): void => {\n    setDocument(next)\n    setEditorError('')\n    queueRef.current?.schedule(next)\n  }\n\n  const groupChoices`,
    `  const changeDocument = (next: NoteDocument): void => {\n    setDocument(next)\n    setEditorError('')\n    queueRef.current?.schedule(next)\n  }\n\n  const openLinkedBoard = useCallback(\n    async (block: StudyBoardBlock): Promise<void> => {\n      if (!record || !document || !onOpenBoard) {\n        throw new Error('Связанную доску сейчас нельзя открыть')\n      }\n      await flush()\n      const board = boards.ensureNoteBoard({ noteId: record.id, blockId: block.id })\n      if (block.boardId !== board.id || block.title !== board.title) {\n        const nextDocument: NoteDocument = {\n          ...document,\n          blocks: document.blocks.map((item) =>\n            item.id === block.id && item.type === 'board'\n              ? { ...item, boardId: board.id, title: board.title }\n              : item\n          )\n        }\n        setDocument(nextDocument)\n        queueRef.current?.schedule(nextDocument)\n        await flush()\n      }\n      notifyDataChanged()\n      onOpenBoard(board.id)\n    },\n    [boards, document, flush, onOpenBoard, record]\n  )\n\n  const groupChoices`
  ],
  [
    `          saveRecordedAudio={(input) => documentAssets.saveRecordedAudio(record.id, input)}\n          onAssetError={(reason) => setEditorError(messageFor(reason))}`,
    `          saveRecordedAudio={(input) => documentAssets.saveRecordedAudio(record.id, input)}\n          openBoard={openLinkedBoard}\n          onAssetError={(reason) => setEditorError(messageFor(reason))}`
  ]
])

patch('apps/mobile/src/app/MobileApp.tsx', [
  [
    `  const [route, setRoute] = useState<Route>('home')\n  const [immersive, setImmersive] = useState(false)`,
    `  const [route, setRoute] = useState<Route>('home')\n  const [boardResourceId, setBoardResourceId] = useState<string | null>(null)\n  const [immersive, setImmersive] = useState(false)`
  ],
  [
    `  const navigate = useCallback((next: Route): void => {\n    setImmersive(false)\n    setRoute(next)\n  }, [])`,
    `  const navigate = useCallback((next: Route): void => {\n    setImmersive(false)\n    setBoardResourceId(null)\n    setRoute(next)\n  }, [])\n\n  const openBoard = useCallback((boardId: string): void => {\n    setImmersive(false)\n    setBoardResourceId(boardId)\n    setRoute('boards')\n  }, [])`
  ],
  [
    `                  <StudyScreen onImmersiveChange={setImmersive} />\n                ) : route === 'boards' ? (\n                  <BoardsScreen />\n                ) : route === 'notes' ? (\n                  <NotesScreen />`,
    `                  <StudyScreen onImmersiveChange={setImmersive} onOpenBoard={openBoard} />\n                ) : route === 'boards' ? (\n                  <BoardsScreen initialBoardId={boardResourceId} />\n                ) : route === 'notes' ? (\n                  <NotesScreen onOpenBoard={openBoard} />`
  ]
])

patch('apps/mobile/src/modules/boards/BoardsScreen.tsx', [
  [
    `export function BoardsScreen(): React.JSX.Element {`,
    `export function BoardsScreen({\n  initialBoardId = null\n}: {\n  initialBoardId?: string | null\n}): React.JSX.Element {`
  ],
  [
    `  const canvasRef = useRef<BoardCanvasDomRef>(null)`,
    `  const canvasRef = useRef<BoardCanvasDomRef>(null)\n  const initialBoardRef = useRef<string | null>(null)`
  ],
  [
    `  const openBoard = (node: BoardNode): void => {\n    setError('')\n    setSaveState('saved')\n    setOpened({ node, document: api.getDocument(node.id) })\n  }`,
    `  const openBoard = useCallback(\n    (node: BoardNode): void => {\n      setError('')\n      setSaveState('saved')\n      setOpened({ node, document: api.getDocument(node.id) })\n    },\n    [api]\n  )\n\n  useEffect(() => {\n    if (!initialBoardId || nodes.loading || initialBoardRef.current === initialBoardId) return\n    initialBoardRef.current = initialBoardId\n    const target = allNodes.find((node) => node.id === initialBoardId)\n    if (!target || target.type !== 'board') {\n      setError('Связанная доска не найдена')\n      return\n    }\n    try {\n      openBoard(target)\n    } catch (reason) {\n      setError(messageFor(reason))\n    }\n  }, [allNodes, initialBoardId, nodes.loading, openBoard])`
  ]
])

const parityPath = 'MOBILE_PARITY.md'
let parity = fs.readFileSync(parityPath, 'utf8')
parity = parity.replace(
  /^\| Boards\s+\|.*$/m,
  '| Boards | Folder trees, tldraw snapshots, gestures, autosave, system roots for Study/Notes, protected linked boards, select/edit/pan/zoom | Shared V4 persistence plus the same tldraw 5.2.5 snapshot editor inside Expo DOM, native save/background barriers, and direct Study/Notes board-block creation/open navigation with durable boardId/title synchronization | Physical-device gesture/performance smoke test and deeper tldraw asset handling; snapshots remain opaque/lossless and are never converted to an incompatible custom shape model |'
)
parity = parity.replace(
  '- Native React Native UI only. No renderer imports, DOM JSX, WebView-based desktop app, or mock records.',
  '- Native React Native UI is the default and no desktop renderer is embedded. Boards are the deliberate exception: the canvas alone runs the exact tldraw web editor in Expo’s first-party offline DOM-component bridge so desktop tldraw snapshots remain lossless; the surrounding app, navigation and persistence stay native. No remote website or desktop app is wrapped, and no mock records are used.'
)
fs.writeFileSync(parityPath, parity)
