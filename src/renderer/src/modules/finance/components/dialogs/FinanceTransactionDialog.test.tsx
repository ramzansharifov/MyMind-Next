import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type {
  FinanceAccountSummary,
  FinanceTagSummary,
  FinanceTransaction
} from '../../../../../../shared/contracts/finance'

const mocks = vi.hoisted(() => ({
  previewExpenseImpact: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  useTemplate: vi.fn()
}))

vi.mock('../../api/finance-client', () => ({ financeClient: mocks }))

import { FinanceTransactionDialog } from './FinanceTransactionDialog'

const accounts: FinanceAccountSummary[] = [
  {
    id: 'cash',
    name: 'Наличные',
    currencyCode: 'TJS',
    initialBalanceMinor: 0,
    balanceMinor: 0,
    icon: 'banknote',
    color: '#34d399',
    transactionCount: 0,
    lastTransactionAt: null,
    periodChangeMinor: 0,
    createdAt: 1,
    updatedAt: 1
  },
  {
    id: 'card',
    name: 'Карта',
    currencyCode: 'TJS',
    initialBalanceMinor: 0,
    balanceMinor: 0,
    icon: 'credit-card',
    color: '#60a5fa',
    transactionCount: 0,
    lastTransactionAt: null,
    periodChangeMinor: 0,
    createdAt: 1,
    updatedAt: 1
  }
]

const tags: FinanceTagSummary[] = [
  {
    id: 'food',
    name: 'Еда',
    type: 'expense',
    icon: 'utensils',
    color: '#f87171',
    transactionCount: 0,
    totalAmountMinor: 0,
    averageAmountMinor: 0,
    linkedLimitCount: 0,
    sharePercent: 0,
    createdAt: 1,
    updatedAt: 1
  },
  {
    id: 'general',
    name: 'Общее',
    type: 'both',
    icon: 'tag',
    color: '#a78bfa',
    transactionCount: 0,
    totalAmountMinor: 0,
    averageAmountMinor: 0,
    linkedLimitCount: 0,
    sharePercent: 0,
    createdAt: 1,
    updatedAt: 1
  }
]

const savedTransaction: FinanceTransaction = {
  id: 'transaction-1',
  type: 'expense',
  tagId: 'food',
  tagNameSnapshot: 'Еда',
  tagIconSnapshot: 'utensils',
  tagColorSnapshot: '#f87171',
  templateId: null,
  templateNameSnapshot: null,
  occurredAt: 1,
  comment: '',
  exchangeRateScaled: null,
  isSystem: false,
  systemReason: null,
  createdAt: 1,
  updatedAt: 1,
  entries: []
}

describe('FinanceTransactionDialog', () => {
  it('uses semantic type buttons, single-select account/tag cards and a numeric amount input', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    mocks.previewExpenseImpact.mockResolvedValue({ items: [], missingRateCurrencies: [] })
    mocks.createTransaction.mockResolvedValue(savedTransaction)

    render(
      <FinanceTransactionDialog
        open
        initialType="expense"
        accounts={accounts}
        tags={tags}
        onOpenChange={() => undefined}
        onSaved={onSaved}
      />
    )

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()

    const typeGroup = screen.getByRole('radiogroup', { name: 'Тип операции' })
    const expenseType = within(typeGroup).getByRole('radio', { name: 'Расход' })
    const incomeType = within(typeGroup).getByRole('radio', { name: 'Доход' })
    const transferType = within(typeGroup).getByRole('radio', { name: 'Перевод' })
    expect(expenseType).toHaveAttribute('aria-checked', 'true')
    expect(incomeType).toHaveClass('border-emerald-500/20')
    expect(transferType).toHaveClass('border-violet-500/20')

    const accountGroup = screen.getByRole('radiogroup', { name: 'Счёт операции' })
    expect(within(accountGroup).getByRole('radio', { name: 'Наличные, TJS' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    await user.click(within(accountGroup).getByRole('radio', { name: 'Карта, TJS' }))
    expect(within(accountGroup).getByRole('radio', { name: 'Карта, TJS' })).toHaveAttribute(
      'aria-checked',
      'true'
    )

    const tagGroup = screen.getByRole('radiogroup', { name: 'Тег операции' })
    await user.click(within(tagGroup).getByRole('radio', { name: 'Еда' }))
    expect(within(tagGroup).getByRole('radio', { name: 'Еда' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(within(tagGroup).getAllByRole('radio', { checked: true })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /Создать тег для/ })).not.toBeInTheDocument()

    const amount = screen.getByRole('spinbutton', { name: /Сумма/ })
    expect(amount).toHaveAttribute('type', 'number')
    await user.type(amount, '12.50')
    await user.click(screen.getByRole('button', { name: 'Создать операцию' }))

    await waitFor(() =>
      expect(mocks.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expense',
          accountId: 'card',
          tagId: 'food',
          amountMinor: 1250
        })
      )
    )
    expect(onSaved).toHaveBeenCalledWith(savedTransaction)
  })
})
