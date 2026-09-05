import { render, screen } from '@testing-library/react'
import { ListTodo } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { ModuleHeader } from './ModuleHeader'
import { StandardModulePage } from './StandardModulePage'
import { WorkspaceStatCard } from './WorkspacePrimitives'

describe('standard module layout primitives', () => {
  it('provides one shared content container for standard modules', () => {
    const { container } = render(
      <StandardModulePage>
        <div>Контент</div>
      </StandardModulePage>
    )

    expect(container.querySelector('[data-standard-module-page]')).toBeInTheDocument()
    expect(container.querySelector('[data-standard-module-container]')).toBeInTheDocument()
    expect(screen.getByText('Контент')).toBeInTheDocument()
  })

  it('keeps common header chrome without visual secondary copy', () => {
    const { container } = render(
      <ModuleHeader
        icon={ListTodo}
        eyebrow="Раздел"
        title="Задачи"
        description="Описание"
        actions={<button type="button">Новая задача</button>}
      >
        <div>Фильтры</div>
      </ModuleHeader>
    )

    expect(container.querySelector('[data-module-header]')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Задачи' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Новая задача' })).toBeInTheDocument()
    expect(screen.getByText('Фильтры')).toBeInTheDocument()
    expect(screen.queryByText('Раздел')).not.toBeInTheDocument()
    expect(screen.getByText('Описание')).toHaveClass('sr-only')
  })

  it('keeps statistic context accessible without showing a second subtitle', () => {
    render(
      <WorkspaceStatCard
        icon={<ListTodo />}
        value={4}
        label="Сегодня"
        description="Задачи со сроком на сегодня"
      />
    )

    expect(screen.getByText('Сегодня')).toBeInTheDocument()
    expect(screen.getByText('Задачи со сроком на сегодня')).toHaveClass('sr-only')
  })
})
