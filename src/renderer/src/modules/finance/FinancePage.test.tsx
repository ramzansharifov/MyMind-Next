import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { FinanceDashboard } from '../../../../shared/contracts/finance'

const mocks = vi.hoisted(() => ({
  getDashboard: vi.fn(),
  listTags: vi.fn(),
  listTemplates: vi.fn(),
  listExchangeRates: vi.fn(),
  listTransactions: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  previewExpenseImpact: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
  createLimit: vi.fn(),
  updateLimit: vi.fn(),
  setLimitState: vi.fn(),
  deleteLimit: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  setTemplateState: vi.fn(),
  deleteTemplate: vi.fn(),
  snoozeTemplate: vi.fn(),
  skipTemplate: vi.fn(),
  setBaseCurrency: vi.fn(),
  upsertExchangeRate: vi.fn(),
  deleteExchangeRate: vi.fn(),
  clearAccountHistory: vi.fn(),
  getReport: vi.fn()
}))

vi.mock('./api/finance-client', () => ({ financeClient: mocks }))

import { FinancePage } from './FinancePage'

const account = {
  id: 'account-card',
  name: 'Карта',
  type: 'card' as const,
  currencyCode: 'TJS',
  initialBalanceMinor: 100_00,
  balanceMinor: 80_00,
  icon: 'credit-card' as const,
  color: '#8b5cf6',
  transactionCount: 1,
  lastTransactionAt: 100,
  periodChangeMinor: -20_00,
  createdAt: 1,
  updatedAt: 1
}

const emptyDashboard: FinanceDashboard = {
  settings: { id: 'default', baseCurrencyCode: 'TJS', createdAt: 1, updatedAt: 1 },
  period: { from: 0, to: 1000 },
  totalBalanceMinor: 0,
  totalBalanceComplete: true,
  missingRateCurrencies: [],
  balancesByCurrency: [],
  incomeMinor: 0,
  expenseMinor: 0,
  netMinor: 0,
  operationCount: 0,
  accounts: [],
  limits: [],
  recentTransactions: [],
  upcomingTemplates: []
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getDashboard.mockResolvedValue(emptyDashboard)
  mocks.listTags.mockResolvedValue([])
  mocks.listTemplates.mockResolvedValue([])
  mocks.listExchangeRates.mockResolvedValue([
    { currencyCode: 'TJS', baseCurrencyCode: 'TJS', rateScaled: 1_000_000, updatedAt: 1 }
  ])
  mocks.listTransactions.mockResolvedValue({ items: [], total: 0, limit: 30, offset: 0 })
  mocks.createAccount.mockResolvedValue(account)
  mocks.previewExpenseImpact.mockResolvedValue({ items: [], missingRateCurrencies: [] })
  mocks.getReport.mockResolvedValue({
    period: { from: 0, to: 1 },
    comparisonPeriod: { from: -2, to: -1 },
    currencyCode: 'TJS',
    incomeMinor: 0,
    expenseMinor: 0,
    netMinor: 0,
    averageExpenseMinor: 0,
    largestExpenseMinor: 0,
    largestIncomeMinor: 0,
    operationCount: 0,
    changePercent: null,
    missingRateCurrencies: [],
    timeline: [],
    expenseByTag: [],
    incomeByTag: [],
    transferFlows: [],
    limits: []
  })
})

describe('FinancePage', () => {
  it('renders the horizontal five-page workspace without a nested sidebar', async () => {
    render(<FinancePage />)
    expect(await screen.findByRole('heading', { name: 'Личные финансы' })).toBeInTheDocument()
    for (const label of ['Главная', 'Транзакции', 'Счета', 'Теги', 'Отчёты']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(document.querySelector('[data-module-sidebar]')).not.toBeInTheDocument()
  })

  it('shows the dashboard empty state and switches internal pages', async () => {
    const user = userEvent.setup()
    render(<FinancePage />)
    expect(await screen.findByText('Пока нет счетов')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Транзакции' }))
    expect(screen.getByRole('tab', { name: 'Операции' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Отчёты' }))
    expect(await screen.findByText('Доходы и расходы по времени')).toBeInTheDocument()
  })

  it('creates an account through the real form and refreshes the overview', async () => {
    const user = userEvent.setup()
    render(<FinancePage />)
    await screen.findByRole('heading', { name: 'Личные финансы' })
    await user.click(screen.getByRole('button', { name: 'Счета' }))
    await user.click(screen.getByRole('button', { name: 'Новый счёт' }))
    await user.type(screen.getByRole('textbox', { name: 'Название' }), 'Карта')
    await user.click(screen.getByRole('button', { name: 'Создать счёт' }))
    await waitFor(() =>
      expect(mocks.createAccount).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Карта', currencyCode: 'TJS', initialBalanceMinor: 0 })
      )
    )
  })

  it('disables account deletion while history exists and exposes critical clear action', async () => {
    const user = userEvent.setup()
    mocks.getDashboard.mockResolvedValue({
      ...emptyDashboard,
      totalBalanceMinor: account.balanceMinor,
      balancesByCurrency: [
        {
          currencyCode: 'TJS',
          balanceMinor: account.balanceMinor,
          convertedBalanceMinor: account.balanceMinor,
          hasRate: true
        }
      ],
      accounts: [account]
    })
    render(<FinancePage />)
    await screen.findByRole('heading', { name: 'Личные финансы' })
    await user.click(screen.getByRole('button', { name: 'Счета' }))
    await user.click(screen.getByRole('button', { name: /Карта/ }))
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Очистить историю' }))
    expect(screen.getByRole('heading', { name: 'Очистить историю счёта?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Очистить историю' })).toBeDisabled()
  })
})
