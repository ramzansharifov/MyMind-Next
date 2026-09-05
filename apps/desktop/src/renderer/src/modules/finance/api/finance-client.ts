import type {
  ClearFinanceAccountHistoryInput,
  CreateFinanceAccountInput,
  CreateFinanceLimitInput,
  CreateFinanceTagInput,
  CreateFinanceTemplateInput,
  CreateFinanceTransactionInput,
  DeleteFinanceAccountInput,
  DeleteFinanceExchangeRateInput,
  DeleteFinanceLimitInput,
  DeleteFinanceTagInput,
  DeleteFinanceTemplateInput,
  DeleteFinanceTransactionInput,
  FinanceAccountSummary,
  FinanceApi,
  FinanceDashboard,
  FinanceExchangeRate,
  FinanceLimitImpact,
  FinanceLimitStatus,
  FinancePeriod,
  FinanceReportFilters,
  FinanceSettings,
  FinanceTagSummary,
  FinanceTemplate,
  FinanceTransaction,
  FinanceTransactionFilters,
  FinanceTransactionPage,
  PreviewFinanceExpenseInput,
  SetFinanceBaseCurrencyInput,
  SetFinanceLimitStateInput,
  UpdateFinanceAccountInput,
  UpdateFinanceLimitInput,
  UpdateFinanceTagInput,
  UpdateFinanceTemplateInput,
  UpdateFinanceTransactionInput,
  UpsertFinanceExchangeRateInput
} from '../../../../../shared/contracts/finance'
import type { FinanceReportAnalytics } from '../../../../../shared/contracts/finance-report-analytics'

function getFinanceApi(): FinanceApi {
  if (!window.api?.finance) {
    throw new Error('Finance API is not available')
  }
  return window.api.finance
}

export const financeClient = {
  getSettings(): Promise<FinanceSettings> {
    return getFinanceApi().getSettings()
  },
  setBaseCurrency(input: SetFinanceBaseCurrencyInput): Promise<FinanceSettings> {
    return getFinanceApi().setBaseCurrency(input)
  },
  listExchangeRates(): Promise<FinanceExchangeRate[]> {
    return getFinanceApi().listExchangeRates()
  },
  upsertExchangeRate(input: UpsertFinanceExchangeRateInput): Promise<FinanceExchangeRate> {
    return getFinanceApi().upsertExchangeRate(input)
  },
  deleteExchangeRate(input: DeleteFinanceExchangeRateInput): Promise<boolean> {
    return getFinanceApi().deleteExchangeRate(input)
  },
  listAccounts(period?: FinancePeriod): Promise<FinanceAccountSummary[]> {
    return getFinanceApi().listAccounts(period)
  },
  getAccount(id: string, period?: FinancePeriod): Promise<FinanceAccountSummary> {
    return getFinanceApi().getAccount(id, period)
  },
  createAccount(input: CreateFinanceAccountInput): Promise<FinanceAccountSummary> {
    return getFinanceApi().createAccount(input)
  },
  updateAccount(input: UpdateFinanceAccountInput): Promise<FinanceAccountSummary> {
    return getFinanceApi().updateAccount(input)
  },
  deleteAccount(input: DeleteFinanceAccountInput): Promise<boolean> {
    return getFinanceApi().deleteAccount(input)
  },
  clearAccountHistory(input: ClearFinanceAccountHistoryInput) {
    return getFinanceApi().clearAccountHistory(input)
  },
  listTransactions(filters: FinanceTransactionFilters): Promise<FinanceTransactionPage> {
    return getFinanceApi().listTransactions(filters)
  },
  getTransaction(id: string): Promise<FinanceTransaction> {
    return getFinanceApi().getTransaction(id)
  },
  createTransaction(input: CreateFinanceTransactionInput): Promise<FinanceTransaction> {
    return getFinanceApi().createTransaction(input)
  },
  updateTransaction(input: UpdateFinanceTransactionInput): Promise<FinanceTransaction> {
    return getFinanceApi().updateTransaction(input)
  },
  deleteTransaction(input: DeleteFinanceTransactionInput): Promise<boolean> {
    return getFinanceApi().deleteTransaction(input)
  },
  listTags(): Promise<FinanceTagSummary[]> {
    return getFinanceApi().listTags()
  },
  createTag(input: CreateFinanceTagInput): Promise<FinanceTagSummary> {
    return getFinanceApi().createTag(input)
  },
  updateTag(input: UpdateFinanceTagInput): Promise<FinanceTagSummary> {
    return getFinanceApi().updateTag(input)
  },
  deleteTag(input: DeleteFinanceTagInput): Promise<boolean> {
    return getFinanceApi().deleteTag(input)
  },
  listLimits(at?: number): Promise<FinanceLimitStatus[]> {
    return getFinanceApi().listLimits(at)
  },
  createLimit(input: CreateFinanceLimitInput): Promise<FinanceLimitStatus> {
    return getFinanceApi().createLimit(input)
  },
  updateLimit(input: UpdateFinanceLimitInput): Promise<FinanceLimitStatus> {
    return getFinanceApi().updateLimit(input)
  },
  setLimitState(input: SetFinanceLimitStateInput): Promise<FinanceLimitStatus> {
    return getFinanceApi().setLimitState(input)
  },
  deleteLimit(input: DeleteFinanceLimitInput): Promise<boolean> {
    return getFinanceApi().deleteLimit(input)
  },
  previewExpenseImpact(input: PreviewFinanceExpenseInput): Promise<FinanceLimitImpact> {
    return getFinanceApi().previewExpenseImpact(input)
  },
  listTemplates(): Promise<FinanceTemplate[]> {
    return getFinanceApi().listTemplates()
  },
  createTemplate(input: CreateFinanceTemplateInput): Promise<FinanceTemplate> {
    return getFinanceApi().createTemplate(input)
  },
  updateTemplate(input: UpdateFinanceTemplateInput): Promise<FinanceTemplate> {
    return getFinanceApi().updateTemplate(input)
  },
  deleteTemplate(input: DeleteFinanceTemplateInput): Promise<boolean> {
    return getFinanceApi().deleteTemplate(input)
  },
  getDashboard(period?: FinancePeriod): Promise<FinanceDashboard> {
    return getFinanceApi().getDashboard(period)
  },
  async getReport(filters: FinanceReportFilters): Promise<FinanceReportAnalytics> {
    const report = await getFinanceApi().getReport(filters)
    return report as FinanceReportAnalytics
  }
}
