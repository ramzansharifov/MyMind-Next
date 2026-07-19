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

replaceOnce(
  'src/renderer/src/modules/settings/instructions/LearningInstructions.tsx',
  `  function openSection(sectionIndex: number): void {\n    const sectionId = getInstructionSectionId(scope, article.id, sectionIndex)`,
  `  const articleId = article.id\n\n  function openSection(sectionIndex: number): void {\n    const sectionId = getInstructionSectionId(scope, articleId, sectionIndex)`
)

replaceOnce(
  'src/renderer/src/modules/boards/BoardsPage.test.tsx',
  `import { fireEvent, render, screen, waitFor } from '@testing-library/react'`,
  `import { fireEvent, render, screen, waitFor } from '@testing-library/react'\nimport userEvent from '@testing-library/user-event'`
)

replaceOnce(
  'src/renderer/src/modules/boards/BoardsPage.test.tsx',
  `import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'\n\nimport type { BoardNode }`,
  `import type { ReactElement } from 'react'\nimport { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'\n\nimport type { BoardNode }`
)

replaceOnce(
  'src/renderer/src/modules/boards/BoardsPage.test.tsx',
  `vi.mock('./components/load-board-canvas', () => ({`,
  `vi.mock('../../shared/ui/tooltip', () => ({\n  Tooltip: ({ children }: { children: ReactElement }) => children\n}))\n\nvi.mock('./components/load-board-canvas', () => ({`
)

replaceOnce(
  'src/renderer/src/modules/boards/BoardsPage.test.tsx',
  `  it('does not offer manual deletion for a folder linked to study', async () => {\n    const linkedFolder: BoardNode = {`,
  `  it('does not offer manual deletion for a folder linked to study', async () => {\n    const user = userEvent.setup()\n    const linkedFolder: BoardNode = {`
)

replaceOnce(
  'src/renderer/src/modules/boards/BoardsPage.test.tsx',
  `    fireEvent.click(screen.getByRole('button', { name: 'Действия: Физика' }))`,
  `    await user.click(screen.getByRole('button', { name: 'Действия: Физика' }))`
)

replaceOnce(
  'src/renderer/src/modules/boards/BoardsPage.test.tsx',
  `    expect(screen.getByRole('menuitem', { name: 'Переименовать' })).toBeInTheDocument()`,
  `    expect(await screen.findByRole('menuitem', { name: 'Переименовать' })).toBeInTheDocument()`
)

console.log('Existing UI lint, type, and test isolation issues fixed')
