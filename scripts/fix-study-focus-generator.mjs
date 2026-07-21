/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { readFileSync, writeFileSync } from 'node:fs'

const path = 'scripts/add-study-focus-mode.mjs'
let source = readFileSync(path, 'utf8')

function replaceRequired(before, after) {
  if (!source.includes(before)) {
    throw new Error(`Generator fragment was not found: ${before.slice(0, 160)}`)
  }

  source = source.replace(before, after)
}

replaceRequired(
  `import { readFileSync, writeFileSync } from 'node:fs'`,
  `/* eslint-disable @typescript-eslint/explicit-function-return-type */\nimport { readFileSync, writeFileSync } from 'node:fs'`
)
replaceRequired(
  String.raw`  useEffect(() => {\n    if (focusMode) {\n      setMode('read')\n    }\n  }, [focusMode])\n\n`,
  ''
)

replaceRequired('aria-label="Вернуться к материалу"', 'aria-label="Назад к материалу"')
replaceRequired(
  `import { Tooltip } from '../../../shared/ui/tooltip'`,
  `import { Tooltip, TooltipProvider } from '../../../shared/ui/tooltip'`
)

replaceRequired(
  String.raw`        view: 'boards',\n        resourceId: board.id,\n        focusMode: mode === 'read' && focusMode`,
  String.raw`        view: 'boards',\n        resourceId: board.id,\n        ...(mode === 'read' && focusMode ? { focusMode: true } : {})`
)
replaceRequired(
  String.raw`                      view: 'study',\n                      resourceId: selectedNode.sourceMaterialId,\n                      focusMode`,
  String.raw`                      view: 'study',\n                      resourceId: selectedNode.sourceMaterialId,\n                      ...(focusMode ? { focusMode: true } : {})`
)

const boardTreeMarker = `const boardTreePath = 'src/renderer/src/modules/boards/components/BoardTree.tsx'`
replaceRequired(
  boardTreeMarker,
  `replaceOnce(
  boardCanvasPath,
  \`    <BoardCanvasUiContext.Provider value={boardCanvasUi}>\`,
  \`    <TooltipProvider>\\n      <BoardCanvasUiContext.Provider value={boardCanvasUi}>\`
)
replaceOnce(
  boardCanvasPath,
  \`    </BoardCanvasUiContext.Provider>\\n  )\`,
  \`      </BoardCanvasUiContext.Provider>\\n    </TooltipProvider>\\n  )\`
)

${boardTreeMarker}`
)

replaceRequired(
  String.raw`import type { StudyNode } from '../../../../../shared/contracts/study'\n\nconst studyMocks`,
  String.raw`import type { StudyNode } from '../../../../../shared/contracts/study'\nimport { TooltipProvider } from '../../../shared/ui/tooltip'\n\nconst studyMocks`
)
replaceRequired(
  `const view = render(<StudyMaterialEditor {...props} focusMode={false} />)`,
  `const view = render(<StudyMaterialEditor {...props} focusMode={false} />, {\n      wrapper: TooltipProvider\n    })`
)
replaceRequired(
  `await user.click(screen.getByRole('tab', { name: 'Чтение' }))`,
  `await user.click(await screen.findByRole('tab', { name: 'Чтение' }))`
)

writeFileSync(path, source, 'utf8')
console.log('Patched study focus mode generator')
