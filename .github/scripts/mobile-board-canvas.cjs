const fs = require('node:fs')

const path = 'apps/mobile/src/modules/boards/BoardsScreen.tsx'
let value = fs.readFileSync(path, 'utf8')

function replace(from, to) {
  if (!value.includes(from)) throw new Error(`Patch target not found: ${from.slice(0, 140)}`)
  value = value.replace(from, to)
}

replace(
  "import { useCallback, useMemo, useState } from 'react'\nimport { Alert, FlatList, View } from 'react-native'",
  "import { useCallback, useEffect, useMemo, useRef, useState } from 'react'\nimport { Alert, AppState, BackHandler, FlatList, View } from 'react-native'"
)
replace(
  "import { STUDY_FOLDER_ICON_NAMES } from '@mymind/contracts/study'\nimport * as boardValidation from '@mymind/core/validation/boards'",
  "import { STUDY_FOLDER_ICON_NAMES } from '@mymind/contracts/study'\nimport { BoardSaveState } from '@mymind/core/board-save-queue'\nimport * as boardValidation from '@mymind/core/validation/boards'\nimport { appearanceTokens } from '@mymind/design'"
)
replace(
  "import { useCollection } from '../../shared/hooks/useCollection'\nimport { FormSheet } from '../../shared/ui/FormSheet'",
  "import { useCollection } from '../../shared/hooks/useCollection'\nimport BoardCanvasDom, { type BoardCanvasDomRef } from './BoardCanvasDom'\nimport { FormSheet } from '../../shared/ui/FormSheet'"
)
replace(
  "} from '../../shared/ui/primitives'",
  "} from '../../shared/ui/primitives'\nimport { useTheme } from '../../shared/ui/theme'"
)

replace(
  "  const [pending, setPending] = useState(false)\n  const [error, setError] = useState('')",
  "  const [pending, setPending] = useState(false)\n  const [error, setError] = useState('')\n  const [saveState, setSaveState] = useState<BoardSaveState>('saved')\n  const [closingBoard, setClosingBoard] = useState(false)\n  const canvasRef = useRef<BoardCanvasDomRef>(null)\n  const theme = useTheme()\n  const canvasColorScheme =\n    theme.background === appearanceTokens.dark.background ? 'dark' : 'light'"
)

replace(
  "  const refresh = (): void => {\n    nodes.refresh()\n    notifyDataChanged()\n  }\n\n  const createNode",
  `  const refresh = (): void => {
    nodes.refresh()
    notifyDataChanged()
  }

  const openBoard = (node: BoardNode): void => {
    setError('')
    setSaveState('saved')
    setOpened({ node, document: api.getDocument(node.id) })
  }

  const closeBoard = useCallback(async (): Promise<void> => {
    if (!opened || closingBoard) return
    setClosingBoard(true)
    try {
      await canvasRef.current?.flush()
      setOpened(null)
      setError('')
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setClosingBoard(false)
    }
  }, [closingBoard, opened])

  useEffect(() => {
    if (!opened) return undefined
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      void closeBoard()
      return true
    })
    return () => subscription.remove()
  }, [closeBoard, opened])

  useEffect(() => {
    if (!opened) return undefined
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        void canvasRef.current?.flush().catch((reason: unknown) => setError(messageFor(reason)))
      }
    })
    return () => subscription.remove()
  }, [opened])

  const createNode`
)

replace(
  "        if (created.type === 'board')\n          setOpened({ node: created, document: api.getDocument(created.id) })",
  "        if (created.type === 'board') openBoard(created)"
)

replace(
  `          onPress: () => {
            setPending(true)
            setError('')
            void api
              .deleteNode(node.id)
              .then(() => {
                if (opened?.node.id === node.id) setOpened(null)
                if (effectiveFolderId === node.id) setFolderId(node.parentId)
                refresh()
              })
              .catch((reason) => setError(messageFor(reason)))
              .finally(() => setPending(false))
          }`,
  `          onPress: () => {
            setPending(true)
            setError('')
            void (async () => {
              if (opened?.node.id === node.id) await canvasRef.current?.flush()
              await api.deleteNode(node.id)
              if (opened?.node.id === node.id) setOpened(null)
              if (effectiveFolderId === node.id) setFolderId(node.parentId)
              refresh()
            })()
              .catch((reason) => setError(messageFor(reason)))
              .finally(() => setPending(false))
          }`
)

const openedPattern = /  if \(opened\) \{[\s\S]*?\n  \}\n\n  const normalizedQuery/
if (!openedPattern.test(value)) throw new Error('Opened board render block not found')
const openedBlock = `  if (opened) {
    const current = allNodes.find((node) => node.id === opened.node.id) ?? opened.node
    const saveLabel =
      saveState === 'saving'
        ? 'Сохранение…'
        : saveState === 'dirty'
          ? 'Есть несохранённые изменения'
          : saveState === 'error'
            ? 'Ошибка сохранения'
            : 'Сохранено локально'

    return (
      <View style={{ flex: 1, gap: 10 }}>
        {error ? <ErrorState message={error} /> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            label={closingBoard ? 'Сохранение…' : 'Назад'}
            disabled={closingBoard || pending}
            onPress={() => void closeBoard()}
          />
          <Button label="Свойства" disabled={closingBoard || pending} onPress={() => editNode(current)} />
          <Button
            label="Удалить"
            danger
            disabled={closingBoard || pending}
            onPress={() => confirmDelete(current)}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Label title>{current.title}</Label>
          <Label muted>{saveLabel}</Label>
        </View>
        <View style={{ flex: 1, minHeight: 320, overflow: 'hidden', borderRadius: 12 }}>
          <BoardCanvasDom
            key={current.id}
            ref={canvasRef}
            snapshot={opened.document.snapshot}
            colorScheme={canvasColorScheme}
            saveSnapshot={async (snapshot) => {
              api.saveDocument(current.id, snapshot)
            }}
            onSaveState={async (state) => {
              setSaveState(state)
            }}
            onError={async (message) => {
              setError(message)
            }}
            dom={{ scrollEnabled: false, style: { flex: 1 } }}
          />
        </View>
        {form && <FormSheet spec={form} close={() => setForm(null)} />}
      </View>
    )
  }`
value = value.replace(openedPattern, `${openedBlock}\n\n  const normalizedQuery`)

replace(
  ": setOpened({ node: item, document: api.getDocument(item.id) })",
  ': openBoard(item)'
)

fs.writeFileSync(path, value)

const parityPath = 'MOBILE_PARITY.md'
let parity = fs.readFileSync(parityPath, 'utf8')
parity = parity.replace(
  /^\| Boards\s+\|.*$/m,
  '| Boards | Folder trees, tldraw snapshots, gestures, autosave, system roots for Study/Notes, protected linked boards, select/edit/pan/zoom | Shared V4 persistence and linked-source lifecycle plus an isolated offline Expo DOM adapter running the same tldraw 5.2.5 store/snapshot format with forced mobile UI, serialized autosave and native flush barriers | Physical-device gesture/performance smoke test, embedded board opening from Study/Notes blocks and deeper asset handling; never convert tldraw snapshots to an incompatible custom shape model |'
)
parity = parity.replace(
  '- Native React Native UI only. No renderer imports, DOM JSX, WebView-based desktop app, or mock records.',
  '- Native React Native UI is the default and no desktop renderer is embedded. Boards are the deliberate exception: the canvas alone runs the exact tldraw web editor in Expo’s first-party offline DOM-component bridge so desktop tldraw snapshots remain lossless; the surrounding app, navigation and persistence stay native. No remote website or desktop app is wrapped, and no mock records are used.'
)
fs.writeFileSync(parityPath, parity)
