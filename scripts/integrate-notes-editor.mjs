/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { readFileSync, writeFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
}

function replaceOnce(source, search, replacement, label) {
  const first = source.indexOf(search)

  if (first < 0) {
    throw new Error(`Missing integration target: ${label}`)
  }

  if (source.indexOf(search, first + search.length) >= 0) {
    throw new Error(`Ambiguous integration target: ${label}`)
  }

  return `${source.slice(0, first)}${replacement}${source.slice(first + search.length)}`
}

function write(path, content) {
  writeFileSync(path, content)
}

const appPath = 'src/renderer/src/App.tsx'
let app = read(appPath)
app = replaceOnce(
  app,
  "import { flushActiveBoardDraft } from './modules/boards/lib/board-draft-lifecycle'\nimport { flushActiveStudyDraft } from './modules/study/lib/study-draft-lifecycle'",
  "import { flushActiveBoardDraft } from './modules/boards/lib/board-draft-lifecycle'\nimport { flushActiveNotesDraft } from './modules/notes/lib/notes-draft-lifecycle'\nimport { flushActiveStudyDraft } from './modules/study/lib/study-draft-lifecycle'",
  'App draft imports'
)
app = replaceOnce(
  app,
  'await Promise.all([flushActiveStudyDraft(), flushActiveBoardDraft()])',
  'await Promise.all([flushActiveStudyDraft(), flushActiveBoardDraft(), flushActiveNotesDraft()])',
  'App draft flush'
)
write(appPath, app)

const editorPath = 'src/renderer/src/modules/study/components/StudyBlockEditor.tsx'
let editor = read(editorPath)
editor = replaceOnce(
  editor,
  "import { BlockSettingsPanel } from './BlockSettingsPanel'\nimport { DeleteConfirmationDialog } from './DeleteConfirmationDialog'",
  "import { BlockSettingsPanel } from './BlockSettingsPanel'\nimport { DeleteConfirmationDialog } from './DeleteConfirmationDialog'\nimport { useStudyBlockAssetClient } from './study-block-asset-context'",
  'StudyBlockEditor asset hook import'
)
editor = replaceOnce(
  editor,
  `interface StudyBlockEditorProps {
  materialId: string
  document: StudyDocument
  mode: 'edit' | 'read'
  focusMode?: boolean
  onChange: (document: StudyDocument) => void
}`,
  `interface StudyBlockEditorProps {
  materialId: string
  document: StudyDocument
  mode: 'edit' | 'read'
  focusMode?: boolean
  allowedBlockTypes?: readonly StudyBlockType[]
  documentLabel?: string
  onChange: (document: StudyDocument) => void
}`,
  'StudyBlockEditor props'
)
editor = replaceOnce(
  editor,
  `const STUDY_BLOCK_DROP_PREFIX = 'study-block-drop'

const blockTypes = studyBlockDefinitions`,
  `const STUDY_BLOCK_DROP_PREFIX = 'study-block-drop'
const allStudyBlockTypes = studyBlockDefinitions.map(({ type }) => type)`,
  'StudyBlockEditor definitions'
)
editor = replaceOnce(
  editor,
  `export function StudyBlockEditor({
  materialId,
  document,
  mode,
  focusMode = false,
  onChange
}: StudyBlockEditorProps): React.JSX.Element {
  const [activeBlockId`,
  `export function StudyBlockEditor({
  materialId,
  document,
  mode,
  focusMode = false,
  allowedBlockTypes = allStudyBlockTypes,
  documentLabel = 'материала',
  onChange
}: StudyBlockEditorProps): React.JSX.Element {
  const allowedBlockTypeSet = new Set<StudyBlockType>(allowedBlockTypes)
  const blockTypes = studyBlockDefinitions.filter(({ type }) => allowedBlockTypeSet.has(type))
  const [activeBlockId`,
  'StudyBlockEditor defaults'
)
editor = replaceOnce(
  editor,
  `  function insertBlock(type: StudyBlockType, index: number): void {
    const block = createStudyBlock(type)`,
  `  function insertBlock(type: StudyBlockType, index: number): void {
    if (!allowedBlockTypeSet.has(type)) {
      return
    }

    const block = createStudyBlock(type)`,
  'StudyBlockEditor insert guard'
)
const insertMenuMarker = '<BlockInsertMenu\n'
const insertMenuOccurrences = editor.split(insertMenuMarker).length - 1
if (insertMenuOccurrences !== 2) {
  throw new Error(`Expected two block insert menus, found ${insertMenuOccurrences}`)
}
editor = editor.replaceAll(
  insertMenuMarker,
  '<BlockInsertMenu\n              blockTypes={blockTypes}\n'
)
editor = replaceOnce(
  editor,
  `function BlockInsertMenu({
  onInsert,
  persistent = false,
  overlay = false
}: {
  onInsert: (type: StudyBlockType) => void`,
  `function BlockInsertMenu({
  blockTypes,
  onInsert,
  persistent = false,
  overlay = false
}: {
  blockTypes: readonly (typeof studyBlockDefinitions)[number][]
  onInsert: (type: StudyBlockType) => void`,
  'BlockInsertMenu definitions prop'
)
editor = replaceOnce(
  editor,
  'description="Блок и всё его содержимое будут удалены из материала."',
  'description={`Блок и всё его содержимое будут удалены из ${documentLabel}.`}',
  'StudyBlockEditor document label'
)
editor = replaceOnce(
  editor,
  `function EditAttachmentBlock({ block }: EditableBlockProps): React.JSX.Element {
  if (
    block.type !== 'image' &&
    block.type !== 'video' &&
    block.type !== 'audio' &&
    block.type !== 'file'
  ) {
    throw new Error('Attachment editor received an incompatible block')
  }
  return <StudyFileBlockView block={block} />
}`,
  `function EditAttachmentBlock({ block }: EditableBlockProps): React.JSX.Element {
  const assetClient = useStudyBlockAssetClient()

  if (
    block.type !== 'image' &&
    block.type !== 'video' &&
    block.type !== 'audio' &&
    block.type !== 'file'
  ) {
    throw new Error('Attachment editor received an incompatible block')
  }

  return <StudyFileBlockView block={block} onOpenFile={assetClient.openAsset} />
}`,
  'EditAttachmentBlock asset integration'
)
write(editorPath, editor)

const settingsPath = 'src/renderer/src/modules/study/components/BlockSettingsPanel.tsx'
let settings = read(settingsPath)
settings = replaceOnce(
  settings,
  "import { studyClient } from '../api/study-client'\nimport {",
  "import {",
  'BlockSettingsPanel remove direct study client'
)
settings = replaceOnce(
  settings,
  "import { StudyDivider } from './StudyDivider'",
  "import { StudyDivider } from './StudyDivider'\nimport { useStudyBlockAssetClient } from './study-block-asset-context'",
  'BlockSettingsPanel asset hook import'
)
settings = replaceOnce(
  settings,
  `function AttachmentSettings({
  materialId,
  block,
  onChange
}: {
  materialId: string
  block: StudyAttachmentBlock
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  const [isPicking, setIsPicking] = useState(false)`,
  `function AttachmentSettings({
  materialId,
  block,
  onChange
}: {
  materialId: string
  block: StudyAttachmentBlock
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  const assetClient = useStudyBlockAssetClient()
  const [isPicking, setIsPicking] = useState(false)`,
  'AttachmentSettings asset client'
)
settings = replaceOnce(
  settings,
  'const asset = await studyClient.importAsset({',
  'const asset = await assetClient.importAsset({',
  'AttachmentSettings import handler'
)
write(settingsPath, settings)
