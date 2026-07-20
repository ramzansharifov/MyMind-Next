import { readFileSync, writeFileSync } from 'node:fs'

function replaceOnce(path, before, after) {
  const content = readFileSync(path, 'utf8')
  const index = content.indexOf(before)

  if (index < 0) {
    throw new Error(`Pattern not found in ${path}: ${before.slice(0, 180)}`)
  }

  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Pattern is not unique in ${path}: ${before.slice(0, 180)}`)
  }

  writeFileSync(path, content.slice(0, index) + after + content.slice(index + before.length), 'utf8')
}

for (const path of [
  'src/renderer/src/modules/boards/components/BoardTree.tsx',
  'src/renderer/src/modules/study/components/StudyTree.tsx'
]) {
  replaceOnce(
    path,
    `  ModuleTreeDragOverlay,\n  ModuleTreeNodeDropIndicator,\n  ModuleTreeRootDropZone\n} from '../../../shared/ui/ModuleTreeDndFeedback'`,
    `  ModuleTreeDragOverlay,\n  ModuleTreeNodeDropIndicator,\n  ModuleTreeRootDropZone,\n  isModuleTreeRootDropHighlighted\n} from '../../../shared/ui/ModuleTreeDndFeedback'`
  )
}

replaceOnce(
  'src/renderer/src/modules/boards/components/BoardTree.tsx',
  `        <BoardRootDropZone\n          active={activeNode !== null}\n          highlighted={dropPreview?.placement === 'root'}\n          isContextActive={selectedNodeId === null}`,
  `        <BoardRootDropZone\n          active={activeNode !== null}\n          isContextActive={selectedNodeId === null}`
)

replaceOnce(
  'src/renderer/src/modules/boards/components/BoardTree.tsx',
  `function BoardRootDropZone({\n  active,\n  highlighted,\n  isContextActive,`,
  `function BoardRootDropZone({\n  active,\n  isContextActive,`
)

replaceOnce(
  'src/renderer/src/modules/boards/components/BoardTree.tsx',
  `  active: boolean\n  highlighted: boolean\n  isContextActive: boolean`,
  `  active: boolean\n  isContextActive: boolean`
)

replaceOnce(
  'src/renderer/src/modules/boards/components/BoardTree.tsx',
  `  const { setNodeRef } = useDroppable({\n    id: ROOT_DROP_ID,\n    disabled: !active\n  })`,
  `  const { isOver, setNodeRef } = useDroppable({\n    id: ROOT_DROP_ID,\n    disabled: !active\n  })`
)

replaceOnce(
  'src/renderer/src/modules/boards/components/BoardTree.tsx',
  `      active={active}\n      highlighted={highlighted}\n      isContextActive={isContextActive}`,
  `      active={active}\n      highlighted={isModuleTreeRootDropHighlighted(active, isOver)}\n      isContextActive={isContextActive}`
)

replaceOnce(
  'src/renderer/src/modules/study/components/StudyTree.tsx',
  `        <StudyRootDropZone\n          dragDisabled={dragDisabled}\n          active={activeNode !== null}\n          highlighted={dropPreview?.placement === 'root'}\n          isContextActive={activeParentId === null}`,
  `        <StudyRootDropZone\n          dragDisabled={dragDisabled}\n          active={activeNode !== null}\n          isContextActive={activeParentId === null}`
)

replaceOnce(
  'src/renderer/src/modules/study/components/StudyTree.tsx',
  `function StudyRootDropZone({\n  dragDisabled,\n  active,\n  highlighted,\n  isContextActive,`,
  `function StudyRootDropZone({\n  dragDisabled,\n  active,\n  isContextActive,`
)

replaceOnce(
  'src/renderer/src/modules/study/components/StudyTree.tsx',
  `  dragDisabled: boolean\n  active: boolean\n  highlighted: boolean\n  isContextActive: boolean`,
  `  dragDisabled: boolean\n  active: boolean\n  isContextActive: boolean`
)

replaceOnce(
  'src/renderer/src/modules/study/components/StudyTree.tsx',
  `  const { setNodeRef } = useDroppable({\n    id: ROOT_DROP_ID,\n    disabled: dragDisabled\n  })`,
  `  const { isOver, setNodeRef } = useDroppable({\n    id: ROOT_DROP_ID,\n    disabled: dragDisabled\n  })`
)

replaceOnce(
  'src/renderer/src/modules/study/components/StudyTree.tsx',
  `      active={active}\n      highlighted={highlighted}\n      isContextActive={isContextActive}`,
  `      active={active}\n      highlighted={isModuleTreeRootDropHighlighted(active, isOver)}\n      isContextActive={isContextActive}`
)

console.log('Root drop highlight now follows direct droppable hover state')
