import { ipcMain } from 'electron'

import { FINANCE_IPC_CHANNELS } from '../../shared/contracts/finance'
import {
  clearFinanceAccountHistoryInputSchema,
  createFinanceAccountInputSchema,
  createFinanceLimitInputSchema,
  createFinanceTagInputSchema,
  createFinanceTemplateInputSchema,
  createFinanceTransactionInputSchema,
  deleteFinanceAccountInputSchema,
  deleteFinanceExchangeRateInputSchema,
  deleteFinanceLimitInputSchema,
  deleteFinanceTagInputSchema,
  deleteFinanceTemplateInputSchema,
  deleteFinanceTransactionInputSchema,
  financePeriodSchema,
  financeReportFiltersSchema,
  financeSafeIdSchema,
  financeTimestampSchema,
  financeTransactionFiltersSchema,
  previewFinanceExpenseInputSchema,
  setFinanceBaseCurrencyInputSchema,
  setFinanceLimitStateInputSchema,
  updateFinanceAccountInputSchema,
  updateFinanceLimitInputSchema,
  updateFinanceTagInputSchema,
  updateFinanceTemplateInputSchema,
  updateFinanceTransactionInputSchema,
  upsertFinanceExchangeRateInputSchema
} from '../../shared/validation/finance'
import { getFinanceReportAnalytics } from '../services/finance-report.service'
import { financeService } from '../services/finance.service'
import { mainOperationTracker } from '../services/main-operation-tracker'

export function registerFinanceIpcHandlers(): void {
  Object.values(FINANCE_IPC_CHANNELS).forEach((channel) => {
    ipcMain.removeHandler(channel)
  })

  ipcMain.handle(FINANCE_IPC_CHANNELS.getSettings, () =>
    mainOperationTracker.run(() => financeService.getSettings())
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.setBaseCurrency, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.setBaseCurrency(setFinanceBaseCurrencyInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.listExchangeRates, () =>
    mainOperationTracker.run(() => financeService.listExchangeRates())
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.upsertExchangeRate, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.upsertExchangeRate(upsertFinanceExchangeRateInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.deleteExchangeRate, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.deleteExchangeRate(deleteFinanceExchangeRateInputSchema.parse(rawInput))
    )
  )

  ipcMain.handle(FINANCE_IPC_CHANNELS.listAccounts, (_event, rawPeriod: unknown) =>
    mainOperationTracker.run(() =>
      financeService.listAccounts(
        rawPeriod === undefined ? undefined : financePeriodSchema.parse(rawPeriod)
      )
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.getAccount, (_event, rawId: unknown, rawPeriod: unknown) =>
    mainOperationTracker.run(() =>
      financeService.getAccount(
        financeSafeIdSchema.parse(rawId),
        rawPeriod === undefined ? undefined : financePeriodSchema.parse(rawPeriod)
      )
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.createAccount, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.createAccount(createFinanceAccountInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.updateAccount, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.updateAccount(updateFinanceAccountInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.deleteAccount, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.deleteAccount(deleteFinanceAccountInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.clearAccountHistory, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.clearAccountHistory(clearFinanceAccountHistoryInputSchema.parse(rawInput))
    )
  )

  ipcMain.handle(FINANCE_IPC_CHANNELS.listTransactions, (_event, rawFilters: unknown) =>
    mainOperationTracker.run(() =>
      financeService.listTransactions(financeTransactionFiltersSchema.parse(rawFilters ?? {}))
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.getTransaction, (_event, rawId: unknown) =>
    mainOperationTracker.run(() => financeService.getTransaction(financeSafeIdSchema.parse(rawId)))
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.createTransaction, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.createTransaction(createFinanceTransactionInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.updateTransaction, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.updateTransaction(updateFinanceTransactionInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.deleteTransaction, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.deleteTransaction(deleteFinanceTransactionInputSchema.parse(rawInput))
    )
  )

  ipcMain.handle(FINANCE_IPC_CHANNELS.listTags, () =>
    mainOperationTracker.run(() => financeService.listTags())
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.getTag, (_event, rawId: unknown) =>
    mainOperationTracker.run(() => financeService.getTag(financeSafeIdSchema.parse(rawId)))
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.createTag, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.createTag(createFinanceTagInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.updateTag, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.updateTag(updateFinanceTagInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.deleteTag, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.deleteTag(deleteFinanceTagInputSchema.parse(rawInput))
    )
  )

  ipcMain.handle(FINANCE_IPC_CHANNELS.listLimits, (_event, rawAt: unknown) =>
    mainOperationTracker.run(() =>
      financeService.listLimits(
        rawAt === undefined ? undefined : financeTimestampSchema.parse(rawAt)
      )
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.createLimit, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.createLimit(createFinanceLimitInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.updateLimit, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.updateLimit(updateFinanceLimitInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.setLimitState, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.setLimitState(setFinanceLimitStateInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.deleteLimit, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.deleteLimit(deleteFinanceLimitInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.previewExpenseImpact, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.previewExpenseImpact(previewFinanceExpenseInputSchema.parse(rawInput))
    )
  )

  ipcMain.handle(FINANCE_IPC_CHANNELS.listTemplates, () =>
    mainOperationTracker.run(() => financeService.listTemplates())
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.createTemplate, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.createTemplate(createFinanceTemplateInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.updateTemplate, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.updateTemplate(updateFinanceTemplateInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.deleteTemplate, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      financeService.deleteTemplate(deleteFinanceTemplateInputSchema.parse(rawInput))
    )
  )

  ipcMain.handle(FINANCE_IPC_CHANNELS.getDashboard, (_event, rawPeriod: unknown) =>
    mainOperationTracker.run(() =>
      financeService.getDashboard(
        rawPeriod === undefined ? undefined : financePeriodSchema.parse(rawPeriod)
      )
    )
  )
  ipcMain.handle(FINANCE_IPC_CHANNELS.getReport, (_event, rawFilters: unknown) =>
    mainOperationTracker.run(() =>
      getFinanceReportAnalytics(financeReportFiltersSchema.parse(rawFilters))
    )
  )
}
