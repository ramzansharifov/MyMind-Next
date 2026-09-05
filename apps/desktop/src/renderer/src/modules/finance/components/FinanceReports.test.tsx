import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FinanceReport } from '../../../../../shared/contracts/finance'

const mocks = vi.hoisted(() => ({
  getReport: vi.fn()
}))

vi.mock('../api/finance-client', () => ({ financeClient: mocks }))

import { FinanceReports } from './FinanceReports'

const baseReport: FinanceReport = {
  period: { from: 1, to: 2 },
  comparisonPeriod: { from: 0, to: 0 },
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
}

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => false
  })
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => undefined
  })
  Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: () => undefined
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => undefined
  })
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getReport.mockResolvedValue(baseReport)
})

async function chooseSelectOption(
  user: ReturnType<typeof userEvent.setup>,
  ariaLabel: string,
  optionLabel: string
): Promise<void> {
  await user.click(screen.getByRole('combobox', { name: ariaLabel }))
  await user.click(await screen.findByRole('option', { name: optionLabel }))
}

describe('FinanceReports', () => {
  it('loads all operations without accidentally filtering out template-based transactions', async () => {
    render(<FinanceReports accounts={[]} tags={[]} baseCurrencyCode="TJS" limitsVersion={0} />)

    await screen.findByText('Доходы и расходы по времени')
    await waitFor(() => expect(mocks.getReport).toHaveBeenCalled())
    const initialFilters = mocks.getReport.mock.calls.at(-1)?.[0]
    expect(initialFilters).toMatchObject({ currencyCode: 'TJS' })
    expect(initialFilters).not.toHaveProperty('templateOnly')
  })

  it('switches explicitly between template and manual operation sources', async () => {
    const user = userEvent.setup()
    render(<FinanceReports accounts={[]} tags={[]} baseCurrencyCode="TJS" limitsVersion={0} />)
    await screen.findByText('Доходы и расходы по времени')

    await chooseSelectOption(user, 'Источник операции', 'Из шаблонов')
    await waitFor(() =>
      expect(mocks.getReport.mock.calls.at(-1)?.[0]).toMatchObject({ templateOnly: true })
    )

    await chooseSelectOption(user, 'Источник операции', 'Созданные вручную')
    await waitFor(() =>
      expect(mocks.getReport.mock.calls.at(-1)?.[0]).toMatchObject({ templateOnly: false })
    )

    await chooseSelectOption(user, 'Источник операции', 'Все операции')
    await waitFor(() =>
      expect(mocks.getReport.mock.calls.at(-1)?.[0]).not.toHaveProperty('templateOnly')
    )
  })

  it('removes the tag filter when the report switches to transfers', async () => {
    const user = userEvent.setup()
    render(
      <FinanceReports
        accounts={[]}
        tags={[
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
          }
        ]}
        baseCurrencyCode="TJS"
        limitsVersion={0}
      />
    )
    await screen.findByText('Доходы и расходы по времени')

    await chooseSelectOption(user, 'Тег', 'Еда')
    await chooseSelectOption(user, 'Тип операции', 'Только переводы')

    await waitFor(() => {
      const filters = mocks.getReport.mock.calls.at(-1)?.[0]
      expect(filters).toMatchObject({ types: ['transfer'] })
      expect(filters).not.toHaveProperty('tagId')
    })
    expect(screen.getByRole('combobox', { name: 'Тег' })).toBeDisabled()
  })
})
