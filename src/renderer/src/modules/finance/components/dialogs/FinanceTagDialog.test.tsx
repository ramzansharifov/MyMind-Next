import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FinanceTagSummary } from '../../../../../../shared/contracts/finance'
import { TooltipProvider } from '../../../../shared/ui/tooltip'

const mocks = vi.hoisted(() => ({
  createTag: vi.fn(),
  updateTag: vi.fn()
}))

vi.mock('../../api/finance-client', () => ({ financeClient: mocks }))

import { FinanceTagDialog } from './FinanceTagDialog'

const savedTag: FinanceTagSummary = {
  id: 'tag-universal',
  name: 'Универсальный',
  type: 'both',
  icon: 'briefcase',
  color: '#fbbf24',
  transactionCount: 0,
  totalAmountMinor: 0,
  averageAmountMinor: 0,
  linkedLimitCount: 0,
  sharePercent: 0,
  createdAt: 1,
  updatedAt: 1
}

describe('FinanceTagDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps only the selected purpose card colored and sends no configurable color', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    const onOpenChange = vi.fn()
    mocks.createTag.mockResolvedValue(savedTag)

    render(
      <TooltipProvider>
        <FinanceTagDialog
          open
          initialType="expense"
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      </TooltipProvider>
    )

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText('Цвет')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Цвет тега' })).not.toBeInTheDocument()

    const expenseCard = screen.getByRole('radio', { name: /Расходы/ })
    const incomeCard = screen.getByRole('radio', { name: /Доходы/ })
    const universalCard = screen.getByRole('radio', { name: /Универсальный/ })
    expect(expenseCard).toHaveAttribute('aria-checked', 'true')
    expect(expenseCard).toHaveClass('border-red-500/45')
    expect(incomeCard).toHaveAttribute('aria-checked', 'false')
    expect(incomeCard).toHaveClass('bg-[var(--app-workspace)]')
    expect(universalCard).toHaveAttribute('aria-checked', 'false')
    expect(universalCard).toHaveClass('bg-[var(--app-workspace)]')

    await user.click(universalCard)
    expect(universalCard).toHaveAttribute('aria-checked', 'true')
    expect(universalCard).toHaveClass('border-amber-500/45')
    expect(expenseCard).toHaveClass('bg-[var(--app-workspace)]')

    await user.click(screen.getByRole('button', { name: 'Выбрать иконку тега' }))
    expect(document.querySelector('[data-icon-picker-content]')).toHaveClass('z-[120]')
    await user.click(await screen.findByRole('menuitem', { name: 'Работа' }))

    await user.type(screen.getByRole('textbox', { name: 'Название' }), 'Универсальный')
    await user.click(screen.getByRole('button', { name: 'Создать тег' }))

    await waitFor(() =>
      expect(mocks.createTag).toHaveBeenCalledWith({
        name: 'Универсальный',
        type: 'both',
        icon: 'briefcase'
      })
    )
    expect(onSaved).toHaveBeenCalledWith(savedTag)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not expose or send a color while editing an existing tag', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    const onOpenChange = vi.fn()
    const updatedTag: FinanceTagSummary = {
      ...savedTag,
      name: 'Прочее',
      type: 'expense',
      color: '#f87171'
    }
    mocks.updateTag.mockResolvedValue(updatedTag)

    render(
      <TooltipProvider>
        <FinanceTagDialog
          open
          tag={savedTag}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      </TooltipProvider>
    )

    expect(screen.queryByText('Цвет')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Цвет тега' })).not.toBeInTheDocument()

    const name = screen.getByRole('textbox', { name: 'Название' })
    await user.clear(name)
    await user.type(name, 'Прочее')
    await user.click(screen.getByRole('radio', { name: /Расходы/ }))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() =>
      expect(mocks.updateTag).toHaveBeenCalledWith({
        id: savedTag.id,
        name: 'Прочее',
        type: 'expense',
        icon: 'briefcase'
      })
    )
  })
})
