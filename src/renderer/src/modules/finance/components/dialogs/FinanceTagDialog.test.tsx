import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { FinanceTagSummary } from '../../../../../../shared/contracts/finance'
import { TooltipProvider } from '../../../../shared/ui/tooltip'

const mocks = vi.hoisted(() => ({
  createTag: vi.fn(),
  updateTag: vi.fn()
}))

vi.mock('../../api/finance-client', () => ({ financeClient: mocks }))

import { FinanceTagDialog } from './FinanceTagDialog'

const savedTag: FinanceTagSummary = {
  id: 'tag-salary',
  name: 'Зарплата',
  type: 'income',
  icon: 'briefcase',
  color: '#34d399',
  transactionCount: 0,
  totalAmountMinor: 0,
  averageAmountMinor: 0,
  linkedLimitCount: 0,
  sharePercent: 0,
  createdAt: 1,
  updatedAt: 1
}

describe('FinanceTagDialog', () => {
  it('uses cards for tag purpose and shared icon/color pickers', async () => {
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

    const expenseCard = screen.getByRole('radio', { name: /Расходы/ })
    const incomeCard = screen.getByRole('radio', { name: /Доходы/ })
    const universalCard = screen.getByRole('radio', { name: /Универсальный/ })
    expect(expenseCard).toHaveAttribute('aria-checked', 'true')
    expect(incomeCard).toHaveAttribute('aria-checked', 'false')
    expect(universalCard).toHaveAttribute('aria-checked', 'false')

    await user.click(incomeCard)
    expect(incomeCard).toHaveAttribute('aria-checked', 'true')

    await user.click(screen.getByRole('button', { name: 'Выбрать иконку тега' }))
    expect(document.querySelector('[data-icon-picker-content]')).toHaveClass('z-[120]')
    await user.click(await screen.findByRole('menuitem', { name: 'Работа' }))

    await user.click(screen.getByRole('button', { name: 'Цвет тега' }))
    expect(document.querySelector('[data-color-picker-content]')).toHaveClass('z-[120]')
    await user.click(screen.getByRole('button', { name: 'Цвет #34d399' }))

    await user.type(screen.getByRole('textbox', { name: 'Название' }), 'Зарплата')
    await user.click(screen.getByRole('button', { name: 'Создать тег' }))

    await waitFor(() =>
      expect(mocks.createTag).toHaveBeenCalledWith({
        name: 'Зарплата',
        type: 'income',
        icon: 'briefcase',
        color: '#34d399'
      })
    )
    expect(onSaved).toHaveBeenCalledWith(savedTag)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
