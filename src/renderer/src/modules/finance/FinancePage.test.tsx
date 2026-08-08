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
  deleteTemplate: vi.fn(),
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
  currencyCode: 'TJS',
  initialBalanceMinor: 100_00,
  balanceMinor: 80_00,
  icon: 'credit-card' as const,
  transactionCount: 1,
  lastTransactionAt: 100,
  periodChangeMinor: -20_00,
  createdAt: 1,
  updatedAt: 1
}

const incomeTag = {
  id: 'salary',
  name: 'Зарплата',
  type: 'income' as const,
  icon: 'tag' as const,
  color: '#34d399',
  transactionCount: 0,
  totalAmountMinor: 0,
  averageAmountMinor: 0,
  linkedLimitCount: 0,
  sharePercent: 0,
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
  recentTransactions: []
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
  mocks.createTag.mockResolvedValue(incomeTag)
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
  it('renders the shared module hero and separate finance workspace pages', async () => {
    render(<FinancePage />)
    expect(await screen.findByRole('heading', { name: 'Финансы' })).toBeInTheDocument()
    expect(document.querySelector('[data-finance-hero]')).toBeInTheDocument()
    expect(document.querySelector('[data-finance-navigation]')).toBeInTheDocument()
    expect(document.querySelector('[data-finance-header-actions]')).toBeInTheDocument()
    for (const label of [
      'Главная',
      'Транзакции',
      'Шаблоны',
      'Лимиты',
      'Счета',
      'Теги',
      'Отчёты'
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    for (const label of ['Доход', 'Расход', 'Перевод']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: 'Обновить' })).not.toBeInTheDocument()
    expect(document.querySelector('[data-module-sidebar]')).not.toBeInTheDocument()
    expect(mocks.listExchangeRates).not.toHaveBeenCalled()
  })

  it('keeps transactions, templates and limits on separate top-level pages', async () => {
    const user = userEvent.setup()
    render(<FinancePage />)
    await screen.findByText('Пока нет счетов')

    await user.click(screen.getByRole('button', { name: 'Транзакции' }))
    expect(screen.getByRole('heading', { name: 'Фильтры' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Операции' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Шаблоны/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Шаблоны' }))
    expect(screen.getByRole('heading', { name: 'Шаблоны' })).toBeInTheDocument()
    expect(screen.getByText('Шаблонов пока нет')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Лимиты' }))
    expect(screen.getByRole('heading', { name: 'Лимиты' })).toBeInTheDocument()
    expect(screen.getByText('Лимитов пока нет')).toBeInTheDocument()
  })

  it('moves page-level create actions into the finance header and swaps them by tab', async () => {
    const user = userEvent.setup()
    render(<FinancePage />)
    await screen.findByText('Пока нет счетов')

    const headerActions = (): HTMLElement => {
      const element = document.querySelector('[data-finance-header-actions]')
      expect(element).not.toBeNull()
      return element as HTMLElement
    }

    for (const label of ['Доход', 'Расход', 'Перевод']) {
      expect(headerActions()).toContainElement(screen.getByRole('button', { name: label }))
    }

    await user.click(screen.getByRole('button', { name: 'Шаблоны' }))
    expect(screen.getAllByRole('button', { name: 'Новый шаблон' })).toHaveLength(1)
    expect(headerActions()).toContainElement(screen.getByRole('button', { name: 'Новый шаблон' }))
    expect(screen.queryByRole('button', { name: 'Создать шаблон' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Лимиты' }))
    expect(screen.getAllByRole('button', { name: 'Новый лимит' })).toHaveLength(1)
    expect(headerActions()).toContainElement(screen.getByRole('button', { name: 'Новый лимит' }))
    expect(screen.queryByRole('button', { name: 'Создать лимит' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Счета' }))
    expect(screen.getAllByRole('button', { name: 'Новый счёт' })).toHaveLength(1)
    expect(headerActions()).toContainElement(screen.getByRole('button', { name: 'Новый счёт' }))
    expect(screen.queryByRole('button', { name: 'Валюты и курсы' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Создать счёт' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Теги' }))
    expect(screen.getAllByRole('button', { name: 'Новый тег' })).toHaveLength(1)
    expect(headerActions()).toContainElement(screen.getByRole('button', { name: 'Новый тег' }))
    expect(screen.queryByRole('button', { name: 'Создать тег' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Отчёты' }))
    expect(document.querySelector('[data-finance-header-actions]')).not.toBeInTheDocument()
  })

  it('renders accounts and tags inside standard section blocks', async () => {
    const user = userEvent.setup()
    render(<FinancePage />)
    await screen.findByText('Пока нет счетов')

    await user.click(screen.getByRole('button', { name: 'Счета' }))
    expect(screen.getByRole('heading', { name: 'Счета' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Новый счёт' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Фильтр валюты' })).not.toBeInTheDocument()
    expect(screen.queryByText('Все валюты')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Теги' }))
    expect(screen.getByRole('heading', { name: 'Теги' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Новый тег' })).toBeInTheDocument()
  })

  it('switches to reports', async () => {
    const user = userEvent.setup()
    render(<FinancePage />)
    await screen.findByText('Пока нет счетов')
    await user.click(screen.getByRole('button', { name: 'Отчёты' }))
    expect(await screen.findByText('Доходы и расходы по времени')).toBeInTheDocument()
  })

  it('creates an account without exposing or sending a color', async () => {
    const user = userEvent.setup()
    render(<FinancePage />)
    await screen.findByRole('heading', { name: 'Финансы' })
    await user.click(screen.getByRole('button', { name: 'Счета' }))
    await user.click(screen.getByRole('button', { name: 'Новый счёт' }))

    expect(screen.queryByText('Тип')).not.toBeInTheDocument()
    expect(screen.queryByText('Цвет')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Цвет счёта' })).not.toBeInTheDocument()
    const currencyInput = screen.getByRole('textbox', { name: 'Валюта' })
    expect(currencyInput).toHaveValue('')

    await user.type(screen.getByRole('textbox', { name: 'Название' }), 'Карта')
    await user.type(currencyInput, 'tjs')
    await user.click(screen.getByRole('button', { name: 'Создать счёт' }))

    await waitFor(() =>
      expect(mocks.createAccount).toHaveBeenCalledWith({
        name: 'Карта',
        currencyCode: 'TJS',
        initialBalanceMinor: 0,
        icon: 'wallet'
      })
    )
  })

  it('creates a tag without exposing or sending a color', async () => {
    const user = userEvent.setup()
    render(<FinancePage />)
    await screen.findByRole('heading', { name: 'Финансы' })
    await user.click(screen.getByRole('button', { name: 'Теги' }))
    await user.click(screen.getByRole('button', { name: 'Новый тег' }))

    expect(screen.queryByText('Цвет')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Цвет тега' })).not.toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Название' }), 'Зарплата')
    await user.click(screen.getByRole('radio', { name: /Доходы/ }))
    await user.click(screen.getByRole('button', { name: 'Создать тег' }))

    await waitFor(() =>
      expect(mocks.createTag).toHaveBeenCalledWith({
        name: 'Зарплата',
        type: 'income',
        icon: 'tag'
      })
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
    await screen.findByRole('heading', { name: 'Финансы' })
    await user.click(screen.getByRole('button', { name: 'Счета' }))
    await user.click(screen.getByRole('button', { name: /Карта/ }))
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Очистить историю' }))
    expect(screen.getByRole('heading', { name: 'Очистить историю счёта?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Очистить историю' })).toBeDisabled()
  })
})
