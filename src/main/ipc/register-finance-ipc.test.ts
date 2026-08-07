import { beforeEach, describe, expect, it, vi } from 'vitest'

import { FINANCE_IPC_CHANNELS } from '../../shared/contracts/finance'

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  removeHandler: vi.fn(),
  run: vi.fn((operation: () => unknown) => operation()),
  createAccount: vi.fn(),
  createTransaction: vi.fn(),
  getDashboard: vi.fn()
}))

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle, removeHandler: mocks.removeHandler }
}))
vi.mock('../services/main-operation-tracker', () => ({ mainOperationTracker: { run: mocks.run } }))
vi.mock('../services/finance.service', () => ({
  financeService: {
    getSettings: vi.fn(),
    setBaseCurrency: vi.fn(),
    listExchangeRates: vi.fn(),
    upsertExchangeRate: vi.fn(),
    deleteExchangeRate: vi.fn(),
    listAccounts: vi.fn(),
    getAccount: vi.fn(),
    createAccount: mocks.createAccount,
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
    clearAccountHistory: vi.fn(),
    listTransactions: vi.fn(),
    getTransaction: vi.fn(),
    createTransaction: mocks.createTransaction,
    updateTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
    listTags: vi.fn(),
    getTag: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
    listLimits: vi.fn(),
    createLimit: vi.fn(),
    updateLimit: vi.fn(),
    setLimitState: vi.fn(),
    deleteLimit: vi.fn(),
    previewExpenseImpact: vi.fn(),
    listTemplates: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    setTemplateState: vi.fn(),
    deleteTemplate: vi.fn(),
    useTemplate: vi.fn(),
    snoozeTemplate: vi.fn(),
    skipTemplate: vi.fn(),
    getDashboard: mocks.getDashboard,
    getReport: vi.fn()
  }
}))

import { registerFinanceIpcHandlers } from './register-finance-ipc'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('registerFinanceIpcHandlers', () => {
  it('replaces and registers every typed finance channel', () => {
    registerFinanceIpcHandlers()
    expect(mocks.removeHandler.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(FINANCE_IPC_CHANNELS)
    )
    expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(FINANCE_IPC_CHANNELS)
    )
  })

  it('validates payloads and executes handlers through MainOperationTracker', () => {
    registerFinanceIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === FINANCE_IPC_CHANNELS.createAccount
    )?.[1]
    const input = {
      name: 'Карта',
      currencyCode: 'tjs',
      initialBalanceMinor: 0,
      icon: 'credit-card',
      color: '#8b5cf6'
    }
    handler({}, input)
    expect(mocks.run).toHaveBeenCalled()
    expect(mocks.createAccount).toHaveBeenCalledWith({ ...input, currencyCode: 'TJS' })
    expect(() => handler({}, { ...input, initialBalanceMinor: 1.5 })).toThrow()
  })

  it('keeps adjustment operations inaccessible to public transaction creation', () => {
    registerFinanceIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === FINANCE_IPC_CHANNELS.createTransaction
    )?.[1]
    expect(() => handler({}, { type: 'adjustment', accountId: 'a', amountMinor: 1 })).toThrow()
    expect(mocks.createTransaction).not.toHaveBeenCalled()
  })
})
