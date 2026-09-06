import type {
  FinanceAccountSummary,
  FinanceExchangeRate,
  FinanceLimitStatus,
  FinanceTagSummary,
  FinanceTemplate,
  FinanceTransaction
} from '@mymind/contracts/finance'
import type { FinanceRepository } from '@mymind/persistence/finance'
import {
  FINANCE_RATE_SCALE,
  formatMinorPlain,
  parseMoneyToMinor
} from '@mymind/core/finance-money'
import * as validation from '@mymind/core/validation/finance'
import { choiceField, textField, type FormField, type FormSpec } from '../../shared/ui/form-model'

function localDateKey(timestamp = Date.now()): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function localTimeKey(timestamp = Date.now()): string {
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function timestampFrom(date: unknown, time: unknown): number {
  const value = new Date(`${String(date)}T${String(time || '12:00')}:00`)
  if (Number.isNaN(value.getTime())) throw new Error('Укажите корректные дату и время')
  return value.getTime()
}

function multipleField(
  key: string,
  label: string,
  choices: readonly { value: string; label: string }[]
): FormField {
  return { key, label, kind: 'multiple', choices }
}

export function accountForm(
  api: FinanceRepository,
  account?: FinanceAccountSummary
): FormSpec {
  return {
    title: account ? 'Изменить счёт' : 'Новый счёт',
    initial: {
      name: account?.name ?? '',
      currencyCode: account?.currencyCode ?? 'TJS',
      initialBalance: account ? '' : '0',
      icon: account?.icon ?? 'wallet'
    },
    fields: [
      textField('name', 'Название'),
      textField(
        'currencyCode',
        'Валюта',
        'text',
        account?.transactionCount ? 'После появления операций валюту изменить нельзя.' : 'Например: TJS, USD, EUR.'
      ),
      ...(account ? [] : [textField('initialBalance', 'Начальный баланс')]),
      choiceField('icon', 'Иконка', [
        { value: 'wallet', label: 'Кошелёк' },
        { value: 'credit-card', label: 'Карта' },
        { value: 'banknote', label: 'Наличные' },
        { value: 'landmark', label: 'Банк' },
        { value: 'piggy-bank', label: 'Накопления' }
      ])
    ],
    save(values) {
      const currencyCode = String(values.currencyCode).trim().toUpperCase()
      if (account) {
        api.updateAccount(
          validation.updateFinanceAccountInputSchema.parse({
            id: account.id,
            name: values.name,
            icon: values.icon,
            currencyCode
          })
        )
      } else {
        api.createAccount(
          validation.createFinanceAccountInputSchema.parse({
            name: values.name,
            currencyCode,
            initialBalanceMinor: parseMoneyToMinor(String(values.initialBalance), currencyCode),
            icon: values.icon
          })
        )
      }
    }
  }
}

export function tagForm(api: FinanceRepository, tag?: FinanceTagSummary): FormSpec {
  return {
    title: tag ? 'Изменить тег' : 'Новый тег',
    initial: {
      name: tag?.name ?? '',
      type: tag?.type ?? 'expense',
      icon: tag?.icon ?? 'tag'
    },
    fields: [
      textField('name', 'Название'),
      choiceField('type', 'Тип', [
        { value: 'expense', label: 'Расход' },
        { value: 'income', label: 'Доход' },
        { value: 'both', label: 'Оба' }
      ]),
      choiceField('icon', 'Иконка', [
        { value: 'tag', label: 'Тег' },
        { value: 'utensils', label: 'Еда' },
        { value: 'shopping-cart', label: 'Покупки' },
        { value: 'car', label: 'Транспорт' },
        { value: 'home', label: 'Дом' },
        { value: 'briefcase', label: 'Работа' },
        { value: 'gift', label: 'Подарок' }
      ])
    ],
    save(values) {
      const input = { name: values.name, type: values.type, icon: values.icon }
      if (tag) api.updateTag(validation.updateFinanceTagInputSchema.parse({ id: tag.id, ...input }))
      else api.createTag(validation.createFinanceTagInputSchema.parse(input))
    }
  }
}

function transactionInitial(transaction?: FinanceTransaction) {
  const sourceEntry = transaction?.entries.find((entry) => entry.signedAmountMinor < 0)
  const destinationEntry = transaction?.entries.find((entry) => entry.signedAmountMinor > 0)
  const singleEntry = transaction?.entries[0]
  const occurredAt = transaction?.occurredAt ?? Date.now()
  const amountMinor = transaction?.type === 'income' || transaction?.type === 'expense'
    ? Math.abs(singleEntry?.signedAmountMinor ?? 0)
    : Math.abs(sourceEntry?.signedAmountMinor ?? 0)
  const currency = singleEntry?.accountCurrencyCode ?? sourceEntry?.accountCurrencyCode ?? 'TJS'
  return {
    type: transaction?.type === 'transfer' ? 'transfer' : transaction?.type === 'income' ? 'income' : 'expense',
    accountId: singleEntry?.accountId ?? null,
    sourceAccountId: sourceEntry?.accountId ?? null,
    destinationAccountId: destinationEntry?.accountId ?? null,
    amount: amountMinor ? formatMinorPlain(amountMinor, currency) : '',
    destinationAmount:
      destinationEntry && destinationEntry.signedAmountMinor
        ? formatMinorPlain(
            destinationEntry.signedAmountMinor,
            destinationEntry.accountCurrencyCode
          )
        : '',
    tagId: transaction?.tagId ?? null,
    templateId: transaction?.templateId ?? null,
    date: localDateKey(occurredAt),
    time: localTimeKey(occurredAt),
    comment: transaction?.comment ?? ''
  }
}

export function transactionForm(
  api: FinanceRepository,
  accounts: FinanceAccountSummary[],
  tags: FinanceTagSummary[],
  templates: FinanceTemplate[],
  transaction?: FinanceTransaction
): FormSpec {
  const initial = transactionInitial(transaction)
  return {
    title: transaction ? 'Изменить операцию' : 'Новая операция',
    initial,
    fields: [
      choiceField('type', 'Тип операции', [
        { value: 'expense', label: 'Расход' },
        { value: 'income', label: 'Доход' },
        { value: 'transfer', label: 'Перевод' }
      ]),
      choiceField(
        'accountId',
        'Счёт для дохода/расхода',
        accounts.map((account) => ({ value: account.id, label: `${account.name} · ${account.currencyCode}` }))
      ),
      choiceField(
        'sourceAccountId',
        'Счёт списания для перевода',
        accounts.map((account) => ({ value: account.id, label: `${account.name} · ${account.currencyCode}` }))
      ),
      choiceField(
        'destinationAccountId',
        'Счёт зачисления для перевода',
        accounts.map((account) => ({ value: account.id, label: `${account.name} · ${account.currencyCode}` }))
      ),
      textField('amount', 'Сумма / сумма списания', 'text', 'Денежная сумма вводится строкой и сохраняется только в минимальных единицах.'),
      textField('destinationAmount', 'Сумма зачисления при переводе'),
      choiceField(
        'tagId',
        'Тег',
        tags.map((tag) => ({ value: tag.id, label: `${tag.name} · ${tag.type === 'income' ? 'доход' : tag.type === 'expense' ? 'расход' : 'оба'}` }))
      ),
      choiceField('templateId', 'Шаблон', [
        { value: null, label: 'Без шаблона' },
        ...templates.map((template) => ({ value: template.id, label: template.name }))
      ]),
      textField('date', 'Дата', 'text', 'ГГГГ-ММ-ДД'),
      textField('time', 'Время', 'text', 'ЧЧ:ММ'),
      textField('comment', 'Комментарий', 'multiline')
    ],
    save(values) {
      const type = String(values.type)
      const occurredAt = timestampFrom(values.date, values.time)
      const templateId = values.templateId === null ? null : String(values.templateId)
      if (type === 'transfer') {
        const sourceAccount = accounts.find((account) => account.id === values.sourceAccountId)
        const destinationAccount = accounts.find((account) => account.id === values.destinationAccountId)
        if (!sourceAccount || !destinationAccount) throw new Error('Выберите оба счёта перевода')
        const sourceAmountMinor = parseMoneyToMinor(String(values.amount), sourceAccount.currencyCode)
        const destinationAmountMinor = parseMoneyToMinor(
          String(values.destinationAmount || values.amount),
          destinationAccount.currencyCode
        )
        const payload = validation.createFinanceTransactionInputSchema.parse({
          type: 'transfer',
          sourceAccountId: sourceAccount.id,
          destinationAccountId: destinationAccount.id,
          sourceAmountMinor,
          destinationAmountMinor,
          occurredAt,
          comment: values.comment,
          templateId
        })
        if (transaction) api.updateTransaction({ id: transaction.id, transaction: payload })
        else api.createTransaction(payload)
        return
      }
      const account = accounts.find((item) => item.id === values.accountId)
      if (!account) throw new Error('Выберите счёт')
      const payload = validation.createFinanceTransactionInputSchema.parse({
        type,
        accountId: account.id,
        amountMinor: parseMoneyToMinor(String(values.amount), account.currencyCode),
        tagId: values.tagId,
        occurredAt,
        comment: values.comment,
        templateId
      })
      if (transaction) api.updateTransaction({ id: transaction.id, transaction: payload })
      else api.createTransaction(payload)
    }
  }
}

export function limitForm(
  api: FinanceRepository,
  accounts: FinanceAccountSummary[],
  tags: FinanceTagSummary[],
  baseCurrency: string,
  limit?: FinanceLimitStatus
): FormSpec {
  return {
    title: limit ? 'Изменить лимит' : 'Новый лимит',
    initial: {
      amount: limit ? formatMinorPlain(limit.amountMinor, limit.currencyCode) : '',
      accountIds: limit?.accountIds ?? [],
      tagId: limit?.tagId ?? tags.find((tag) => tag.type !== 'income')?.id ?? null,
      periodType: limit?.periodType ?? 'month',
      warningPercent: limit?.warningPercent ?? 80,
      state: limit?.state ?? 'active'
    },
    fields: [
      textField('amount', 'Лимит'),
      multipleField(
        'accountIds',
        'Счета (пусто = все счета одной валюты)',
        accounts.map((account) => ({ value: account.id, label: `${account.name} · ${account.currencyCode}` }))
      ),
      choiceField(
        'tagId',
        'Расходный тег',
        tags
          .filter((tag) => tag.type !== 'income')
          .map((tag) => ({ value: tag.id, label: tag.name }))
      ),
      choiceField('periodType', 'Период', [
        { value: 'day', label: 'День' },
        { value: 'week', label: 'Неделя' },
        { value: 'month', label: 'Месяц' },
        { value: 'year', label: 'Год' }
      ]),
      textField('warningPercent', 'Предупреждение, %', 'number'),
      choiceField('state', 'Состояние', [
        { value: 'active', label: 'Активен' },
        { value: 'paused', label: 'Пауза' }
      ])
    ],
    save(values) {
      const accountIds = values.accountIds as string[]
      const selectedCurrency = accountIds.length
        ? accounts.find((account) => account.id === accountIds[0])?.currencyCode ?? baseCurrency
        : baseCurrency
      const payload = {
        amountMinor: parseMoneyToMinor(String(values.amount), selectedCurrency),
        currencyCode: selectedCurrency,
        accountIds,
        tagId: values.tagId,
        periodType: values.periodType,
        warningPercent: values.warningPercent,
        state: values.state
      }
      if (limit) api.updateLimit(validation.updateFinanceLimitInputSchema.parse({ id: limit.id, ...payload }))
      else api.createLimit(validation.createFinanceLimitInputSchema.parse(payload))
    }
  }
}

export function templateForm(
  api: FinanceRepository,
  accounts: FinanceAccountSummary[],
  tags: FinanceTagSummary[],
  template?: FinanceTemplate
): FormSpec {
  const source = template?.sourceAccountId
    ? accounts.find((account) => account.id === template.sourceAccountId)
    : undefined
  const destination = template?.destinationAccountId
    ? accounts.find((account) => account.id === template.destinationAccountId)
    : undefined
  return {
    title: template ? 'Изменить шаблон' : 'Новый шаблон',
    initial: {
      name: template?.name ?? '',
      type: template?.type ?? 'expense',
      sourceAccountId: template?.sourceAccountId ?? accounts[0]?.id ?? null,
      destinationAccountId: template?.destinationAccountId ?? accounts[1]?.id ?? null,
      tagId: template?.tagId ?? tags.find((tag) => tag.type !== 'income')?.id ?? null,
      sourceAmount: template
        ? formatMinorPlain(template.sourceAmountMinor, source?.currencyCode ?? 'TJS')
        : '',
      destinationAmount:
        template?.destinationAmountMinor !== null && template?.destinationAmountMinor !== undefined
          ? formatMinorPlain(template.destinationAmountMinor, destination?.currencyCode ?? 'TJS')
          : '',
      comment: template?.comment ?? ''
    },
    fields: [
      textField('name', 'Название'),
      choiceField('type', 'Тип', [
        { value: 'expense', label: 'Расход' },
        { value: 'income', label: 'Доход' },
        { value: 'transfer', label: 'Перевод' }
      ]),
      choiceField(
        'sourceAccountId',
        'Счёт / счёт списания',
        accounts.map((account) => ({ value: account.id, label: `${account.name} · ${account.currencyCode}` }))
      ),
      choiceField(
        'destinationAccountId',
        'Счёт зачисления',
        accounts.map((account) => ({ value: account.id, label: `${account.name} · ${account.currencyCode}` }))
      ),
      choiceField(
        'tagId',
        'Тег',
        tags.map((tag) => ({ value: tag.id, label: tag.name }))
      ),
      textField('sourceAmount', 'Сумма / сумма списания'),
      textField('destinationAmount', 'Сумма зачисления'),
      textField('comment', 'Комментарий', 'multiline')
    ],
    save(values) {
      const type = String(values.type) as 'income' | 'expense' | 'transfer'
      const sourceAccount = accounts.find((account) => account.id === values.sourceAccountId)
      if (!sourceAccount) throw new Error('Выберите счёт')
      const isTransfer = type === 'transfer'
      const destinationAccount = isTransfer
        ? accounts.find((account) => account.id === values.destinationAccountId)
        : undefined
      if (isTransfer && !destinationAccount) throw new Error('Выберите счёт зачисления')
      const payload = {
        name: values.name,
        type,
        sourceAccountId: sourceAccount.id,
        destinationAccountId: destinationAccount?.id ?? null,
        tagId: isTransfer ? null : values.tagId,
        sourceAmountMinor: parseMoneyToMinor(String(values.sourceAmount), sourceAccount.currencyCode),
        destinationAmountMinor: destinationAccount
          ? parseMoneyToMinor(
              String(values.destinationAmount || values.sourceAmount),
              destinationAccount.currencyCode
            )
          : null,
        comment: values.comment
      }
      if (template) api.updateTemplate(validation.updateFinanceTemplateInputSchema.parse({ id: template.id, ...payload }))
      else api.createTemplate(validation.createFinanceTemplateInputSchema.parse(payload))
    }
  }
}

export function exchangeRateForm(
  api: FinanceRepository,
  baseCurrency: string,
  rate?: FinanceExchangeRate
): FormSpec {
  return {
    title: rate ? 'Изменить курс' : 'Новый курс',
    initial: {
      currencyCode: rate?.currencyCode ?? 'USD',
      rate: rate ? String(rate.rateScaled / FINANCE_RATE_SCALE) : ''
    },
    fields: [
      textField('currencyCode', 'Валюта'),
      textField('rate', `1 единица валюты в ${baseCurrency}`)
    ],
    save(values) {
      const numericRate = Number(String(values.rate).replace(',', '.'))
      if (!Number.isFinite(numericRate) || numericRate <= 0) throw new Error('Укажите положительный курс')
      api.upsertExchangeRate(
        validation.upsertFinanceExchangeRateInputSchema.parse({
          currencyCode: String(values.currencyCode).trim().toUpperCase(),
          rateScaled: Math.round(numericRate * FINANCE_RATE_SCALE)
        })
      )
    }
  }
}

export function baseCurrencyForm(api: FinanceRepository, current: string): FormSpec {
  return {
    title: 'Основная валюта',
    initial: { baseCurrencyCode: current },
    fields: [
      textField(
        'baseCurrencyCode',
        'Код валюты',
        'text',
        'При смене основной валюты сохранённые ручные курсы сбрасываются.'
      )
    ],
    save(values) {
      api.setBaseCurrency(
        validation.setFinanceBaseCurrencyInputSchema.parse({
          baseCurrencyCode: String(values.baseCurrencyCode).trim().toUpperCase()
        })
      )
    }
  }
}
