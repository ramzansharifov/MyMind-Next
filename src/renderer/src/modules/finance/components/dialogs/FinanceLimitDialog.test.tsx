import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  FinanceAccountSummary,
  FinanceLimitStatus,
  FinanceTagSummary
} from '../../../../../../shared/contracts/finance'

const mocks = vi.hoisted(() => ({
  createLimit: vi.fn(),
  updateLimit: vi.fn()
}))

vi.mock('../../api/finance-client', () => ({ financeClient: mocks }))

import { FinanceLimitDialog } from './FinanceLimitDialog'

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

const usd: FinanceAccountSummary = {
  ...cash,
  id: 'usd',
  name: 'Доллары',
  currencyCode: 'USD',
  icon: 'wallet',
  color: '#a78bfa'
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

const savedLimit: FinanceLimitStatus = {
  id: 'limit-food',
  name: 'Еда на месяц',
  amountMinor: 100_000,
  currencyCode: 'TJS',
  scopeType: 'account-tag',
  accountId: cash.id,
  accountIds: [cash.id, card.id],
  tagId: expenseTag.id,
  periodType: 'month',
  startsAt: 0,
  endsAt: null,
  warningPercent: 80,
  state: 'active',
  createdAt: 1,
  updatedAt: 1,
  periodStart: 1,
  periodEnd: 2,
  spentMinor: 0,
  remainingMinor: 100_000,
  usagePercent: 0,
  daysRemaining: 20,
  exceededMinor: 0,
  projectedMinor: null,
  warningReached: false,
  missingRateCurrencies: []
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createLimit.mockResolvedValue(savedLimit)
})

describe('FinanceLimitDialog', () => {
  it('requires a tag and lets the user select multiple accounts only within one currency', async () => {
    const user = userEvent.setup()

    render(
      <FinanceLimitDialog
        open
        accounts={[cash, card, usd]}
        tags={[expenseTag, incomeTag]}
        onOpenChange={() => undefined}
        onSaved={() => undefined}
      />
    )

    expect(screen.queryByText('Дата начала')).not.toBeInTheDocument()
    expect(screen.queryByText('Область действия')).not.toBeInTheDocument()
    expect(screen.queryByText('Собственный диапазон')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /Все счета/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'Зарплата' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Еда' }))

    const accountGroup = screen.getByRole('group', { name: 'Счета лимита' })
    const cashCard = within(accountGroup).getByRole('checkbox', { name: 'Наличные, TJS' })
    const cardCard = within(accountGroup).getByRole('checkbox', { name: 'Карта, TJS' })
    const usdCard = within(accountGroup).getByRole('checkbox', { name: 'Доллары, USD' })

    await user.click(cashCard)
    await user.click(cardCard)
    expect(cashCard).toHaveAttribute('aria-checked', 'true')
    expect(cardCard).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('Валюта лимита')).toHaveTextContent('TJS')

    await user.click(usdCard)
    expect(cashCard).toHaveAttribute('aria-checked', 'false')
    expect(cardCard).toHaveAttribute('aria-checked', 'false')
    expect(usdCard).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('Валюта лимита')).toHaveTextContent('USD')
  })

  it('shows All accounts only when every account uses one currency and derives currency automatically', async () => {
    const user = userEvent.setup()

    render(
      <FinanceLimitDialog
        open
        accounts={[cash, card]}
        tags={[expenseTag]}
        onOpenChange={() => undefined}
        onSaved={() => undefined}
      />
    )

    const allAccounts = screen.getByRole('checkbox', { name: 'Все счета, TJS' })
    expect(allAccounts).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByLabelText('Валюта лимита')).toHaveTextContent('TJS')

    await user.type(screen.getByRole('textbox', { name: 'Название' }), 'Еда на месяц')
    await user.click(screen.getByRole('radio', { name: 'Еда' }))
    await user.type(screen.getByRole('spinbutton', { name: 'Сумма' }), '1000')
    await user.click(screen.getByRole('button', { name: 'Создать лимит' }))

    await waitFor(() =>
      expect(mocks.createLimit).toHaveBeenCalledWith({
        name: 'Еда на месяц',
        amountMinor: 100_000,
        currencyCode: 'TJS',
        scopeType: 'tag',
        accountId: null,
        accountIds: [],
        tagId: 'food',
        periodType: 'month',
        startsAt: 0,
        endsAt: null,
        warningPercent: 80
      })
    )
  })
})
