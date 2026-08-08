import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  FinanceAccountSummary,
  FinanceTagSummary,
  FinanceTemplate
} from '../../../../../../shared/contracts/finance'

const mocks = vi.hoisted(() => ({
  createTemplate: vi.fn(),
  updateTemplate: vi.fn()
}))

vi.mock('../../api/finance-client', () => ({ financeClient: mocks }))

import { FinanceTemplateDialog } from './FinanceTemplateDialog'

const cash: FinanceAccountSummary = {
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
}

const card: FinanceAccountSummary = {
  ...cash,
  id: 'card',
  name: 'Карта',
  icon: 'credit-card',
  color: '#60a5fa'
}

const expenseTag: FinanceTagSummary = {
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
}

const incomeTag: FinanceTagSummary = {
  ...expenseTag,
  id: 'salary',
  name: 'Зарплата',
  type: 'income',
  icon: 'briefcase',
  color: '#34d399'
}

const savedTemplate: FinanceTemplate = {
  id: 'template-food',
  name: 'Обед',
  type: 'expense',
  sourceAccountId: cash.id,
  destinationAccountId: null,
  tagId: expenseTag.id,
  sourceAmountMinor: 5000,
  destinationAmountMinor: null,
  comment: '',
  createdAt: 1,
  updatedAt: 1
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createTemplate.mockResolvedValue(savedTemplate)
})

describe('FinanceTemplateDialog', () => {
  it('creates a passive template with card selectors and a native number amount field', async () => {
    const user = userEvent.setup()

    render(
      <FinanceTemplateDialog
        open
        accounts={[cash, card]}
        tags={[expenseTag, incomeTag]}
        onOpenChange={() => undefined}
        onSaved={() => undefined}
      />
    )

    expect(screen.getByRole('radiogroup', { name: 'Тип операции' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Расход' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Наличные, TJS' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Еда' })).toBeInTheDocument()
    expect(screen.queryByText('Расписание')).not.toBeInTheDocument()
    expect(screen.queryByText(/Напоминать/)).not.toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: 'Сумма' })).toHaveAttribute('type', 'number')

    await user.type(screen.getByRole('textbox', { name: 'Название' }), 'Обед')
    await user.click(screen.getByRole('radio', { name: 'Еда' }))
    await user.type(screen.getByRole('spinbutton', { name: 'Сумма' }), '50')
    await user.click(screen.getByRole('button', { name: 'Создать шаблон' }))

    await waitFor(() =>
      expect(mocks.createTemplate).toHaveBeenCalledWith({
        name: 'Обед',
        type: 'expense',
        sourceAccountId: 'cash',
        destinationAccountId: null,
        tagId: 'food',
        sourceAmountMinor: 5000,
        destinationAmountMinor: null,
        comment: ''
      })
    )
  })

  it('switches account and tag cards with the selected operation type', async () => {
    const user = userEvent.setup()

    render(
      <FinanceTemplateDialog
        open
        accounts={[cash, card]}
        tags={[expenseTag, incomeTag]}
        onOpenChange={() => undefined}
        onSaved={() => undefined}
      />
    )

    await user.click(screen.getByRole('radio', { name: 'Доход' }))
    expect(screen.getByRole('radio', { name: 'Зарплата' })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Еда' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Перевод' }))
    expect(screen.queryByRole('radio', { name: 'Зарплата' })).not.toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Счёт зачисления шаблона' })).toBeInTheDocument()
  })
})
