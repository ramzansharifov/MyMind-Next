const fs = require('node:fs')

const path = 'apps/mobile/src/modules/study/StudyScreen.tsx'
let value = fs.readFileSync(path, 'utf8')

function replace(from, to) {
  if (!value.includes(from)) throw new Error(`Patch target not found: ${from.slice(0, 120)}`)
  value = value.replace(from, to)
}

replace(
  "import { DocumentEditor } from '../../shared/ui/DocumentEditor'",
  "import { DocumentEditor } from '../../shared/ui/DocumentEditor'\nimport { DocumentReader } from '../../shared/ui/DocumentReader'"
)

replace(
  'export function StudyScreen(): React.JSX.Element {',
  'export function StudyScreen({\n  onImmersiveChange\n}: {\n  onImmersiveChange?: (active: boolean) => void\n}): React.JSX.Element {'
)

replace(
  "  const [pendingAction, setPendingAction] = useState(false)\n  const queueRef = useRef<AutosaveQueue<StudyDocument> | null>(null)",
  "  const [pendingAction, setPendingAction] = useState(false)\n  const [materialMode, setMaterialMode] = useState<'read' | 'edit'>('edit')\n  const [focusMode, setFocusMode] = useState(false)\n  const queueRef = useRef<AutosaveQueue<StudyDocument> | null>(null)"
)

replace(
  "  const currentFolder = effectiveFolderId\n    ? (allNodes.find((node) => node.id === effectiveFolderId) ?? null)\n    : null\n\n  const openMaterial = useCallback(",
  "  const currentFolder = effectiveFolderId\n    ? (allNodes.find((node) => node.id === effectiveFolderId) ?? null)\n    : null\n\n  const setFocus = useCallback(\n    (active: boolean): void => {\n      setFocusMode(active)\n      onImmersiveChange?.(active)\n      if (active) setMaterialMode('read')\n    },\n    [onImmersiveChange]\n  )\n\n  const openMaterial = useCallback("
)

replace(
  "      try {\n        const next = api.getMaterial(id)\n        setMaterial(next)",
  "      try {\n        setFocus(false)\n        setMaterialMode('edit')\n        const next = api.getMaterial(id)\n        setMaterial(next)"
)
replace('    [api]\n  )\n\n  const flush', '    [api, setFocus]\n  )\n\n  const flush')

replace(
  "    try {\n      await flush()\n      queueRef.current = null\n      setMaterial(null)",
  "    try {\n      await flush()\n      setFocus(false)\n      queueRef.current = null\n      setMaterial(null)"
)
replace('  }, [closing, flush, nodes])', '  }, [closing, flush, nodes, setFocus])')

replace(
  "    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {\n      if (material) {",
  "    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {\n      if (focusMode) {\n        setFocus(false)\n        return true\n      }\n      if (material) {"
)
replace(
  '  }, [closeMaterial, currentFolder?.parentId, effectiveFolderId, material])',
  '  }, [closeMaterial, currentFolder?.parentId, effectiveFolderId, focusMode, material, setFocus])'
)

replace(
  "                if (material?.nodeId === node.id) {\n                  queueRef.current = null",
  "                if (material?.nodeId === node.id) {\n                  setFocus(false)\n                  queueRef.current = null"
)

const materialBlock = `  if (material && document) {
    const node = allNodes.find((item) => item.id === material.nodeId)
    const reading = focusMode || materialMode === 'read'
    const readerHeader = (
      <View
        style={{
          gap: 12,
          paddingHorizontal: focusMode ? 16 : 0,
          paddingTop: focusMode ? 12 : 0,
          paddingBottom: 20
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {focusMode ? (
            <Button label="Выйти из фокуса" selected onPress={() => setFocus(false)} />
          ) : (
            <>
              <Button
                label={closing ? 'Сохранение…' : 'Назад'}
                disabled={closing}
                onPress={() => void closeMaterial()}
              />
              <Button label="Редактировать" onPress={() => setMaterialMode('edit')} />
              <Button label="Фокус" selected onPress={() => setFocus(true)} />
              {node ? (
                <Button label="Свойства" disabled={closing} onPress={() => editNode(node)} />
              ) : null}
              {node ? (
                <Button
                  label="Копия"
                  disabled={closing || pendingAction}
                  onPress={() => duplicate(node)}
                />
              ) : null}
              {node ? (
                <Button
                  label="Удалить"
                  danger
                  disabled={closing || pendingAction}
                  onPress={() => confirmDelete(node)}
                />
              ) : null}
            </>
          )}
        </View>
        {node ? <Label title>{node.title}</Label> : null}
        {!focusMode ? <Label muted>Режим чтения не изменяет содержимое материала.</Label> : null}
      </View>
    )

    return (
      <View style={{ flex: 1 }}>
        {editorError ? <ErrorState message={editorError} retry={() => void flush()} /> : null}
        {reading ? (
          <DocumentReader
            document={document}
            openAsset={documentAssets.openAsset}
            resolveAssetUri={documentAssets.resolveAssetUri}
            onAssetError={(reason) => setEditorError(messageFor(reason))}
            header={readerHeader}
          />
        ) : (
          <DocumentEditor
            document={document}
            onChange={changeDocument}
            createId={randomUUID}
            importAsset={(kind) => documentAssets.importAsset(material.nodeId, kind)}
            openAsset={documentAssets.openAsset}
            resolveAssetUri={documentAssets.resolveAssetUri}
            onAssetError={(reason) => setEditorError(messageFor(reason))}
            header={
              <View style={{ gap: 12, paddingBottom: 16 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Button
                    label={closing ? 'Сохранение…' : 'Назад'}
                    disabled={closing}
                    onPress={() => void closeMaterial()}
                  />
                  <Button label="Чтение" onPress={() => setMaterialMode('read')} />
                  <Button label="Фокус" onPress={() => setFocus(true)} />
                  {node ? (
                    <Button label="Свойства" disabled={closing} onPress={() => editNode(node)} />
                  ) : null}
                  {node ? (
                    <Button
                      label="Копия"
                      disabled={closing || pendingAction}
                      onPress={() => duplicate(node)}
                    />
                  ) : null}
                  {node ? (
                    <Button
                      label="Удалить"
                      danger
                      disabled={closing || pendingAction}
                      onPress={() => confirmDelete(node)}
                    />
                  ) : null}
                </View>
                {node ? <Label title>{node.title}</Label> : null}
                <Label muted>Изменения содержимого сохраняются автоматически.</Label>
              </View>
            }
          />
        )}
        {!focusMode && form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
      </View>
    )
  }`

const pattern = /  if \(material && document\) \{[\s\S]*?\n  \}\n\n  const normalizedQuery/
if (!pattern.test(value)) throw new Error('Material render block not found')
value = value.replace(pattern, `${materialBlock}\n\n  const normalizedQuery`)
fs.writeFileSync(path, value)

const readerPath = 'apps/mobile/src/shared/ui/DocumentReader.tsx'
let reader = fs.readFileSync(readerPath, 'utf8')
reader = reader.replace(
  "      contentContainerStyle={{ paddingBottom: 64 }}",
  "      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 64 }}"
)
fs.writeFileSync(readerPath, reader)

const parityPath = 'MOBILE_PARITY.md'
let parity = fs.readFileSync(parityPath, 'utf8')
parity = parity.replace(
  /^\| Study\s+\|.*$/m,
  '| Study | Nested folders/materials, versioned block documents, read/edit/focus, resource navigation, code workspace, links, assets, PDF, duplicate, reorder, autosave, deletion barriers | Shared contracts, V3 SQLite repository, native tree CRUD, lossless block editor, serialized autosave, local attachments, dedicated native read mode and immersive focus mode with safe back handling | Rich Markdown/LaTeX/Mermaid rendering, code workspace, PDF and deeper internal-link/navigation parity; preserve unsupported blocks losslessly |'
)
fs.writeFileSync(parityPath, parity)
