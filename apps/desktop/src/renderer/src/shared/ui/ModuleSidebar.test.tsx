import { render } from '@testing-library/react'
import { BookOpen } from 'lucide-react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children
}))

import { ModuleSidebar } from './ModuleSidebar'

describe('ModuleSidebar content spacing', () => {
  it('allows a module tree to occupy the full sidebar width', () => {
    const { container } = render(
      <ModuleSidebar
        navigationLabel="Навигация"
        moduleLabel="Обучение"
        homeLabel="Главная"
        icon={BookOpen}
        collapsed={false}
        homeSelected={false}
        expandLabel="Показать"
        collapseLabel="Скрыть"
        contentClassName="px-0 py-3"
        onHomeSelect={vi.fn()}
        onCollapsedChange={vi.fn()}
      >
        <div>Дерево</div>
      </ModuleSidebar>
    )

    expect(container.querySelector('[data-module-sidebar-content]')).toHaveClass('px-0', 'py-3')
  })
})
