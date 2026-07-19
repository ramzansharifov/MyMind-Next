import { readFileSync, writeFileSync } from 'node:fs'

function replaceOnce(path, before, after) {
  const content = readFileSync(path, 'utf8')
  const index = content.indexOf(before)

  if (index < 0) {
    throw new Error(`Pattern not found in ${path}: ${before.slice(0, 160)}`)
  }

  if (content.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Pattern is not unique in ${path}: ${before.slice(0, 160)}`)
  }

  writeFileSync(path, content.slice(0, index) + after + content.slice(index + before.length), 'utf8')
}

replaceOnce(
  'src/renderer/src/modules/settings/instructions/boards-instruction-catalog.ts',
  '  Save,\n',
  ''
)

replaceOnce(
  'src/renderer/src/shared/ui/ModuleSidebar.tsx',
  `\nexport function getModuleSidebarLayoutClassName(collapsed: boolean): string {\n  return cn(\n    'grid h-full min-h-0 overflow-hidden',\n    'transition-[grid-template-columns] duration-200 ease-out',\n    'motion-reduce:transition-none',\n    collapsed ? 'grid-cols-[64px_minmax(0,1fr)]' : 'grid-cols-[280px_minmax(0,1fr)]'\n  )\n}\n`,
  ''
)

for (const path of [
  'src/renderer/src/modules/boards/BoardsPage.tsx',
  'src/renderer/src/modules/study/StudyPage.tsx'
]) {
  replaceOnce(
    path,
    `import { getModuleSidebarLayoutClassName, ModuleSidebar } from '../../shared/ui/ModuleSidebar'`,
    `import { ModuleSidebar } from '../../shared/ui/ModuleSidebar'\nimport { getModuleSidebarLayoutClassName } from '../../shared/ui/module-sidebar-layout'`
  )
}

replaceOnce(
  'src/renderer/src/modules/boards/BoardsPage.tsx',
  '  Pencil,\n  Plus,\n  Presentation,',
  '  Pencil,\n  Presentation,'
)

replaceOnce(
  'src/renderer/src/modules/study/StudyPage.tsx',
  '  AlertTriangle,\n  ArrowRight,\n  BookOpen,',
  '  AlertTriangle,\n  BookOpen,'
)

replaceOnce(
  'src/renderer/src/modules/study/components/StudyHome.tsx',
  `import {\n  ArrowRight,\n  BookOpen,`,
  `import {\n  BookOpen,`
)

console.log('Existing UI lint issues fixed')
