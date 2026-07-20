import { readFileSync, writeFileSync } from 'node:fs'

function replaceOnce(path, from, to) {
  const source = readFileSync(path, 'utf8')
  const first = source.indexOf(from)
  const last = source.lastIndexOf(from)

  if (first < 0 || first !== last) {
    throw new Error(`Expected exactly one match in ${path}: ${from.slice(0, 120)}`)
  }

  writeFileSync(path, `${source.slice(0, first)}${to}${source.slice(first + from.length)}`)
}

function replaceBetween(path, startMarker, endMarker, replacementPath) {
  const source = readFileSync(path, 'utf8')
  const start = source.indexOf(startMarker)
  const end = source.indexOf(endMarker, start)

  if (start < 0 || end < 0) {
    throw new Error(`Unable to find replacement range in ${path}`)
  }

  const replacement = readFileSync(replacementPath, 'utf8')
  writeFileSync(path, `${source.slice(0, start)}${replacement}${source.slice(end)}`)
}

const boardTreePath = 'src/renderer/src/modules/boards/components/BoardTree.tsx'
replaceOnce(
  boardTreePath,
  `import * as DropdownMenu from '@radix-ui/react-dropdown-menu'`,
  `import * as ContextMenu from '@radix-ui/react-context-menu'\nimport * as DropdownMenu from '@radix-ui/react-dropdown-menu'`
)
replaceOnce(
  boardTreePath,
  `          <div className={cn('shrink-0', collapsed ? 'space-y-1.5' : 'space-y-1')}>`,
  `          <div className={cn('shrink-0', collapsed ? 'space-y-1.5' : 'space-y-0')}>`
)
replaceBetween(
  boardTreePath,
  'function BoardTreeNode({',
  'function BoardTreeDropZones(',
  'scripts/board-tree-node.replacement.txt'
)
replaceBetween(
  boardTreePath,
  'function BoardNodeMenu({',
  'function groupBoardNodesByParent(',
  'scripts/board-menu.replacement.txt'
)

const boardsPagePath = 'src/renderer/src/modules/boards/BoardsPage.tsx'
replaceOnce(
  boardsPagePath,
  `        collapsed={sidebarCollapsed}\n        homeSelected={selectedId === null}`,
  `        collapsed={sidebarCollapsed}\n        contentClassName={sidebarCollapsed ? undefined : 'px-0 py-3'}\n        homeSelected={selectedId === null}`
)

const mainCssPath = 'src/renderer/src/assets/main.css'
replaceOnce(
  mainCssPath,
  `.study-tree-guide {\n  position: absolute;\n  z-index: 0;\n  width: 1px;\n  pointer-events: none;\n  background: color-mix(in srgb, var(--app-border-strong) 82%, transparent);\n  opacity: 0;\n  transition: opacity 140ms ease;\n}\n\n[data-module-sidebar]:hover .study-tree-guide {\n  opacity: 0.82;\n}`,
  `.study-tree-guide,\n.board-tree-guide {\n  position: absolute;\n  z-index: 0;\n  width: 1px;\n  pointer-events: none;\n  background: color-mix(in srgb, var(--app-border-strong) 82%, transparent);\n  opacity: 0;\n  transition: opacity 140ms ease;\n}\n\n[data-module-sidebar]:hover .study-tree-guide,\n[data-module-sidebar]:hover .board-tree-guide {\n  opacity: 0.82;\n}`
)

console.log('Board sidebar improvements applied')
