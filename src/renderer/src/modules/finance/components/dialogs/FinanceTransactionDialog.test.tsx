import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  FinanceAccountSummary,
  FinanceTagSummary,
  FinanceTransaction
} from '../../../../../../shared/contracts/finance'
import { FINANCE_RATE_SCALE } from '../../../../../../shared/finance-money'

const mocks = vi.hoisted(() => ({
  previewExpenseImpact: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn()
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
    color: '#fbbf24',
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

const savedTransfer: FinanceTransaction = {
  ...savedTransaction,
  id: 'transfer-1',
  type: 'transfer',
  tagId: null,
  tagNameSnapshot: null,
  tagIconSnapshot: null,
  tagColorSnapshot: null,
  exchangeRateScaled: FINANCE_RATE_SCALE
}

describe('FinanceTransactionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.previewExpenseImpact.mockResolvedValue({ items: [], missingRateCurrencies: [] })
  })

  it('uses neutral inactive type buttons, single-select account/tag cards and a numeric amount input', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
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
    expect(expenseType).toHaveClass('border-red-400/60')
    expect(incomeType).toHaveClass('bg-[var(--app-workspace)]')
    expect(transferType).toHaveClass('bg-[var(--app-workspace)]')

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
    expect(within(tagGroup).getByRole('radio', { name: 'Еда' })).toHaveClass(
      'border-red-400/60',
      'bg-red-500/22'
    )
    expect(within(tagGroup).getAllByRole('radio', { checked: true })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /Создать тег для/ })).not.toBeInTheDocument()

    const amount = screen.getByRole('spinbutton', { name: 'Сумма' })
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

  it('uses one amount for both sides of a transfer and records it as a 1:1 transfer', async () => {
    const user = userEvent.setup()
    mocks.createTransaction.mockResolvedValue(savedTransfer)

    render(
      <FinanceTransactionDialog
        open
        initialType="expense"
        accounts={accounts}
        tags={tags}
        onOpenChange={() => undefined}
        onSaved={() => undefined}
      />
    )

    await user.click(screen.getByRole('radio', { name: 'Перевод' }))
    expect(screen.getByRole('radio', { name: 'Перевод' })).toHaveClass('border-violet-400/60')
    expect(screen.getByRole('radio', { name: 'Доход' })).toHaveClass('bg-[var(--app-workspace)]')
    expect(screen.getByRole('radio', { name: 'Расход' })).toHaveClass('bg-[var(--app-workspace)]')

    const destinationGroup = screen.getByRole('radiogroup', { name: 'Счёт зачисления' })
    await user.click(within(destinationGroup).getByRole('radio', { name: 'Карта, TJS' }))

    expect(screen.queryByText('Сумма списания')).not.toBeInTheDocument()
    expect(screen.queryByText('Сумма зачисления')).not.toBeInTheDocument()
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1)

    await user.type(screen.getByRole('spinbutton', { name: 'Сумма' }), '10')
    await user.click(screen.getByRole('button', { name: 'Создать операцию' }))

    await waitFor(() =>
      expect(mocks.createTransaction).toHaveBeenCalledWith({
        type: 'transfer',
        sourceAccountId: 'cash',
        destinationAccountId: 'card',
        sourceAmountMinor: 1000,
        destinationAmountMinor: 1000,
        exchangeRateScaled: FINANCE_RATE_SCALE,
        occurredAt: expect.any(Number),
        comment: '',
        templateId: null
      })
    )
  })
})
