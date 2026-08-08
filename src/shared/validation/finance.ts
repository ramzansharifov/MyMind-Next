import { z } from 'zod'

import {
  FINANCE_ICON_NAMES,
  FINANCE_LIMIT_PERIOD_TYPES,
  FINANCE_LIMIT_STATES,
  FINANCE_TAG_TYPES,
  FINANCE_TRANSACTION_SORTS,
  FINANCE_TRANSACTION_TYPES,
  FINANCE_USER_TRANSACTION_TYPES
} from '../contracts/finance'
import { FINANCE_MAX_MINOR } from '../finance-money'

const FINANCE_SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/
const FINANCE_CURRENCY_PATTERN = /^[A-Z]{3}$/

export const financeSafeIdSchema = z
  .string()
  .trim()
  .regex(FINANCE_SAFE_ID_PATTERN, 'Некорректный идентификатор')
export const financeCurrencyCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(FINANCE_CURRENCY_PATTERN, 'Код валюты должен состоять из трёх латинских букв')
export const financeIconNameSchema = z.enum(FINANCE_ICON_NAMES)
export const financeTransactionTypeSchema = z.enum(FINANCE_TRANSACTION_TYPES)
export const financeUserTransactionTypeSchema = z.enum(FINANCE_USER_TRANSACTION_TYPES)
export const financeTagTypeSchema = z.enum(FINANCE_TAG_TYPES)
export const financeLimitPeriodTypeSchema = z.enum(FINANCE_LIMIT_PERIOD_TYPES)
export const financeLimitStateSchema = z.enum(FINANCE_LIMIT_STATES)
export const financeTransactionSortSchema = z.enum(FINANCE_TRANSACTION_SORTS)

export const financeMinorAmountSchema = z
  .number()
  .int('Денежная сумма должна быть целым числом в минимальных единицах')
  .safe('Денежная сумма выходит за безопасный диапазон')
  .min(-FINANCE_MAX_MINOR)
  .max(FINANCE_MAX_MINOR)

export const financePositiveMinorAmountSchema = financeMinorAmountSchema.positive(
  'Сумма должна быть больше нуля'
)

export const financeTimestampSchema = z.number().int().safe().nonnegative()
export const financeNameSchema = z.string().trim().min(1).max(120)
export const financeCommentSchema = z.string().trim().max(1_000).default('')
export const financeRateScaledSchema = z
  .number()
  .int('Курс должен быть целым масштабированным значением')
  .safe()
  .positive('Курс должен быть больше нуля')
  .max(1_000_000_000_000)

export const financePeriodSchema = z
  .object({
    from: financeTimestampSchema,
    to: financeTimestampSchema
  })
  .superRefine((period, context) => {
    if (period.from > period.to) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: 'Конец периода не может быть раньше начала'
      })
    }
  })

export const setFinanceBaseCurrencyInputSchema = z.object({
  baseCurrencyCode: financeCurrencyCodeSchema
})

export const upsertFinanceExchangeRateInputSchema = z.object({
  currencyCode: financeCurrencyCodeSchema,
  rateScaled: financeRateScaledSchema
})

export const deleteFinanceExchangeRateInputSchema = z.object({
  currencyCode: financeCurrencyCodeSchema
})

export const createFinanceAccountInputSchema = z
  .object({
    name: financeNameSchema,
    currencyCode: financeCurrencyCodeSchema,
    initialBalanceMinor: financeMinorAmountSchema,
    icon: financeIconNameSchema
  })
  .strict()

export const updateFinanceAccountInputSchema = z
  .object({
    id: financeSafeIdSchema,
    name: financeNameSchema,
    icon: financeIconNameSchema,
    currencyCode: financeCurrencyCodeSchema.optional()
  })
  .strict()

export const deleteFinanceAccountInputSchema = z.object({
  id: financeSafeIdSchema
})

export const clearFinanceAccountHistoryInputSchema = z.object({
  accountId: financeSafeIdSchema,
  expectedBalanceMinor: financeMinorAmountSchema,
  confirmation: z.literal('ОЧИСТИТЬ', {
    error: 'Для подтверждения введите «ОЧИСТИТЬ»'
  })
})

export const createFinanceTagInputSchema = z
  .object({
    name: financeNameSchema,
    type: financeTagTypeSchema,
    icon: financeIconNameSchema
  })
  .strict()

export const updateFinanceTagInputSchema = z
  .object({
    id: financeSafeIdSchema,
    name: financeNameSchema,
    type: financeTagTypeSchema,
    icon: financeIconNameSchema
  })
  .strict()

export const deleteFinanceTagInputSchema = z.object({
  id: financeSafeIdSchema
})

const financeTransactionCommonSchema = z.object({
  occurredAt: financeTimestampSchema,
  comment: financeCommentSchema,
  templateId: financeSafeIdSchema.nullable().optional()
})

export const createFinanceIncomeExpenseInputSchema = financeTransactionCommonSchema.extend({
  type: z.enum(['income', 'expense']),
  accountId: financeSafeIdSchema,
  amountMinor: financePositiveMinorAmountSchema,
  tagId: financeSafeIdSchema
})

export const createFinanceTransferInputSchema = financeTransactionCommonSchema
  .extend({
    type: z.literal('transfer'),
    sourceAccountId: financeSafeIdSchema,
    destinationAccountId: financeSafeIdSchema,
    sourceAmountMinor: financePositiveMinorAmountSchema,
    destinationAmountMinor: financePositiveMinorAmountSchema,
    exchangeRateScaled: financeRateScaledSchema.nullable().optional()
  })
  .superRefine((input, context) => {
    if (input.sourceAccountId === input.destinationAccountId) {
      context.addIssue({
        code: 'custom',
        path: ['destinationAccountId'],
        message: 'Счета перевода должны отличаться'
      })
    }
  })

export const createFinanceTransactionInputSchema = z.discriminatedUnion('type', [
  createFinanceIncomeExpenseInputSchema,
  createFinanceTransferInputSchema
])

export const updateFinanceTransactionInputSchema = z.object({
  id: financeSafeIdSchema,
  transaction: createFinanceTransactionInputSchema
})

export const deleteFinanceTransactionInputSchema = z.object({
  id: financeSafeIdSchema
})

export const internalFinanceAdjustmentInputSchema = z.object({
  accountId: financeSafeIdSchema,
  signedAmountMinor: financeMinorAmountSchema.refine((value) => value !== 0, {
    message: 'Корректировка не может быть нулевой'
  }),
  occurredAt: financeTimestampSchema,
  reason: z.string().trim().min(1).max(500)
})

export const financeTransactionFiltersSchema = z
  .object({
    types: z.array(financeTransactionTypeSchema).max(FINANCE_TRANSACTION_TYPES.length).optional(),
    accountIds: z.array(financeSafeIdSchema).max(100).optional(),
    tagId: financeSafeIdSchema.nullable().optional(),
    currencyCode: financeCurrencyCodeSchema.optional(),
    dateFrom: financeTimestampSchema.optional(),
    dateTo: financeTimestampSchema.optional(),
    minAmountMinor: financePositiveMinorAmountSchema.optional(),
    maxAmountMinor: financePositiveMinorAmountSchema.optional(),
    search: z.string().trim().max(200).optional(),
    templateOnly: z.boolean().optional(),
    includeSystem: z.boolean().optional(),
    sort: financeTransactionSortSchema.optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).max(1_000_000).optional()
  })
  .superRefine((filters, context) => {
    if (
      filters.dateFrom !== undefined &&
      filters.dateTo !== undefined &&
      filters.dateFrom > filters.dateTo
    ) {
      context.addIssue({
        code: 'custom',
        path: ['dateTo'],
        message: 'Конечная дата должна быть не раньше начальной'
      })
    }

    if (
      filters.minAmountMinor !== undefined &&
      filters.maxAmountMinor !== undefined &&
      filters.minAmountMinor > filters.maxAmountMinor
    ) {
      context.addIssue({
        code: 'custom',
        path: ['maxAmountMinor'],
        message: 'Максимальная сумма должна быть не меньше минимальной'
      })
    }
  })

const financeLimitBaseSchema = z
  .object({
    amountMinor: financePositiveMinorAmountSchema,
    currencyCode: financeCurrencyCodeSchema,
    accountIds: z.array(financeSafeIdSchema).max(100),
    tagId: financeSafeIdSchema,
    periodType: financeLimitPeriodTypeSchema,
    warningPercent: z.number().int().min(1).max(100),
    state: financeLimitStateSchema.optional()
  })
  .superRefine((input, context) => {
    if (new Set(input.accountIds).size !== input.accountIds.length) {
      context.addIssue({
        code: 'custom',
        path: ['accountIds'],
        message: 'Счета лимита не должны повторяться'
      })
    }
  })

export const createFinanceLimitInputSchema = financeLimitBaseSchema
export const updateFinanceLimitInputSchema = financeLimitBaseSchema.safeExtend({
  id: financeSafeIdSchema,
  state: financeLimitStateSchema
})

export const setFinanceLimitStateInputSchema = z.object({
  id: financeSafeIdSchema,
  state: financeLimitStateSchema
})

export const deleteFinanceLimitInputSchema = z.object({
  id: financeSafeIdSchema
})

export const previewFinanceExpenseInputSchema = z.object({
  accountId: financeSafeIdSchema,
  tagId: financeSafeIdSchema,
  amountMinor: financePositiveMinorAmountSchema,
  occurredAt: financeTimestampSchema,
  excludeTransactionId: financeSafeIdSchema.nullable().optional()
})

const financeTemplateBaseSchema = z
  .object({
    name: financeNameSchema,
    type: financeUserTransactionTypeSchema,
    sourceAccountId: financeSafeIdSchema.nullable(),
    destinationAccountId: financeSafeIdSchema.nullable(),
    tagId: financeSafeIdSchema.nullable(),
    sourceAmountMinor: financePositiveMinorAmountSchema,
    destinationAmountMinor: financePositiveMinorAmountSchema.nullable(),
    comment: financeCommentSchema
  })
  .superRefine((input, context) => {
    if (input.type === 'transfer') {
      if (input.sourceAccountId === null || input.destinationAccountId === null) {
        context.addIssue({
          code: 'custom',
          path: ['destinationAccountId'],
          message: 'Для перевода нужны оба счёта'
        })
      }
      if (input.sourceAccountId !== null && input.sourceAccountId === input.destinationAccountId) {
        context.addIssue({
          code: 'custom',
          path: ['destinationAccountId'],
          message: 'Счета перевода должны отличаться'
        })
      }
      if (input.destinationAmountMinor === null) {
        context.addIssue({
          code: 'custom',
          path: ['destinationAmountMinor'],
          message: 'Для перевода требуется сумма зачисления'
        })
      }
      if (input.tagId !== null) {
        context.addIssue({
          code: 'custom',
          path: ['tagId'],
          message: 'Перевод не использует пользовательский тег'
        })
      }
    } else {
      if (input.sourceAccountId === null) {
        context.addIssue({
          code: 'custom',
          path: ['sourceAccountId'],
          message: 'Для дохода или расхода требуется счёт'
        })
      }
      if (input.destinationAccountId !== null || input.destinationAmountMinor !== null) {
        context.addIssue({
          code: 'custom',
          path: ['destinationAccountId'],
          message: 'Второй счёт используется только для перевода'
        })
      }
      if (input.tagId === null) {
        context.addIssue({
          code: 'custom',
          path: ['tagId'],
          message: 'Для дохода или расхода требуется тег'
        })
      }
    }
  })

export const createFinanceTemplateInputSchema = financeTemplateBaseSchema
export const updateFinanceTemplateInputSchema = financeTemplateBaseSchema.safeExtend({
  id: financeSafeIdSchema
})

export const deleteFinanceTemplateInputSchema = z.object({
  id: financeSafeIdSchema
})

export const financeReportFiltersSchema = z
  .object({
    dateFrom: financeTimestampSchema,
    dateTo: financeTimestampSchema,
    types: z.array(financeTransactionTypeSchema).optional(),
    accountIds: z.array(financeSafeIdSchema).max(100).optional(),
    tagId: financeSafeIdSchema.nullable().optional(),
    currencyCode: financeCurrencyCodeSchema.optional(),
    minAmountMinor: financePositiveMinorAmountSchema.optional(),
    maxAmountMinor: financePositiveMinorAmountSchema.optional(),
    templateOnly: z.boolean().optional()
  })
  .superRefine((filters, context) => {
    if (filters.dateFrom > filters.dateTo) {
      context.addIssue({
        code: 'custom',
        path: ['dateTo'],
        message: 'Конечная дата должна быть не раньше начальной'
      })
    }
    if (
      filters.minAmountMinor !== undefined &&
      filters.maxAmountMinor !== undefined &&
      filters.minAmountMinor > filters.maxAmountMinor
    ) {
      context.addIssue({
        code: 'custom',
        path: ['maxAmountMinor'],
        message: 'Максимальная сумма должна быть не меньше минимальной'
      })
    }
  })
