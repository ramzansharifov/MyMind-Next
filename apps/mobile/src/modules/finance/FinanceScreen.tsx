import { useCallback, useMemo, useState } from 'react'
import { Alert, FlatList, ScrollView, View } from 'react-native'
import type {
  FinanceAccountSummary,
  FinanceLimitStatus,
  FinanceTagSummary,
  FinanceTemplate,
  FinanceTransaction
} from '@mymind/contracts/finance'
import { formatMoneyMinor } from '@mymind/core/finance-money'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import { FormSheet } from '../../shared/ui/FormSheet'
import type { FormSpec } from '../../shared/ui/form-model'
import {
  Button,
  EmptyState,
  ErrorState,
  Label,
  LoadingState,
  Row
} from '../../shared/ui/primitives'
import {
  accountForm,
  baseCurrencyForm,
  exchangeRateForm,
  limitForm,
  tagForm,
  templateForm,
  transactionForm
} from './finance-forms'

type Tab =
  'home' | 'transactions' | 'accounts' | 'tags' | 'limits' | 'templates' | 'reports' | 'rates'

function startOfDaysAgo(days: number): number {
  const value = new Date()
  value.setHours(0, 0, 0, 0)
  value.setDate(value.getDate() - days)
  return value.getTime()
}

function endOfToday(): number {
  const value = new Date()
  value.setHours(23, 59, 59, 999)
  return value.getTime()
}

function operationTitle(transaction: FinanceTransaction): string {
  if (transaction.type === 'transfer') {
    const source = transaction.entries.find((entry) => entry.signedAmountMinor < 0)
    const destination = transaction.entries.find((entry) => entry.signedAmountMinor > 0)
    return `${source?.accountName ?? 'Счёт'} → ${destination?.accountName ?? 'Счёт'}`
  }
  return transaction.tagNameSnapshot ?? (transaction.type === 'income' ? 'Доход' : 'Расход')
}

function operationSubtitle(transaction: FinanceTransaction): string {
  if (transaction.type === 'transfer') {
    const source = transaction.entries.find((entry) => entry.signedAmountMinor < 0)
    const destination = transaction.entries.find((entry) => entry.signedAmountMinor > 0)
    const amounts = [
      source
        ? formatMoneyMinor(Math.abs(source.signedAmountMinor), source.accountCurrencyCode)
        : null,
      destination
        ? formatMoneyMinor(destination.signedAmountMinor, destination.accountCurrencyCode)
        : null
    ]
      .filter(Boolean)
      .join(' → ')
    return `${amounts} · ${new Date(transaction.occurredAt).toLocaleDateString('ru-RU')}`
  }
  const entry = transaction.entries[0]
  const amount = entry
    ? formatMoneyMinor(Math.abs(entry.signedAmountMinor), entry.accountCurrencyCode)
    : '—'
  return `${transaction.type === 'income' ? '+' : '−'}${amount} · ${new Date(transaction.occurredAt).toLocaleDateString('ru-RU')}${transaction.comment ? ` · ${transaction.comment}` : ''}`
}

export function FinanceScreen(): React.JSX.Element {
  const { finance: api } = useServices()
  const state = useCollection(
    useCallback(() => {
      const dashboard = api.getDashboard()
      const accounts = api.listAccounts()
      const tags = api.listTags()
      const limits = api.listLimits()
      const templates = api.listTemplates()
      const rates = api.listExchangeRates()
      const transactions = api.listTransactions({
        limit: 100,
        offset: 0,
        includeSystem: false,
        sort: 'date-desc'
      }).items
      const report = api.getReport({ dateFrom: startOfDaysAgo(29), dateTo: endOfToday() })
      return { dashboard, accounts, tags, limits, templates, rates, transactions, report }
    }, [api])
  )
  const [tab, setTab] = useState<Tab>('home')
  const [form, setForm] = useState<FormSpec | null>(null)

  const openForm = (next: FormSpec): void => {
    setForm({
      ...next,
      save: async (values) => {
        await next.save(values)
        state.refresh()
      }
    })
  }

  const data = state.data
  const accounts = useMemo(() => data?.accounts ?? [], [data?.accounts])
  const tags = useMemo(() => data?.tags ?? [], [data?.tags])
  const limits = useMemo(() => data?.limits ?? [], [data?.limits])
  const templates = useMemo(() => data?.templates ?? [], [data?.templates])
  const transactions = useMemo(() => data?.transactions ?? [], [data?.transactions])
  const rates = useMemo(() => data?.rates ?? [], [data?.rates])

  if (state.loading) return <LoadingState />
  if (!data)
    return (
      <ErrorState message={state.error || 'Не удалось загрузить финансы'} retry={state.refresh} />
    )

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'home', label: 'Обзор' },
    { key: 'transactions', label: 'Операции' },
    { key: 'accounts', label: 'Счета' },
    { key: 'tags', label: 'Теги' },
    { key: 'limits', label: 'Лимиты' },
    { key: 'templates', label: 'Шаблоны' },
    { key: 'reports', label: 'Отчёт' },
    { key: 'rates', label: 'Валюты' }
  ]

  const header = (
    <View style={{ gap: 10, paddingBottom: 12 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {tabs.map((item) => (
          <Button
            key={item.key}
            label={item.label}
            selected={tab === item.key}
            onPress={() => setTab(item.key)}
          />
        ))}
      </ScrollView>
      {state.error ? <ErrorState message={state.error} retry={state.refresh} /> : null}
    </View>
  )

  const deleteTransaction = (transaction: FinanceTransaction): void => {
    state.confirmDelete(
      `Удалить операцию «${operationTitle(transaction)}»?`,
      () => {
        api.deleteTransaction({ id: transaction.id })
      },
      'Баланс счёта будет пересчитан по оставшимся операциям.'
    )
  }

  const clearHistory = (account: FinanceAccountSummary): void => {
    Alert.alert(
      `Очистить историю «${account.name}»?`,
      `Текущий баланс ${formatMoneyMinor(account.balanceMinor, account.currencyCode)} станет новым начальным балансом. Связанные переводы будут компенсированы на других счетах.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: () =>
            state.mutate(() => {
              api.clearAccountHistory({
                accountId: account.id,
                expectedBalanceMinor: account.balanceMinor,
                confirmation: 'ОЧИСТИТЬ'
              })
            })
        }
      ]
    )
  }

  const renderTransaction = ({ item }: { item: FinanceTransaction }): React.JSX.Element => (
    <Row
      title={operationTitle(item)}
      subtitle={operationSubtitle(item)}
      onPress={() => openForm(transactionForm(api, accounts, tags, templates, item))}
      onLongPress={() => deleteTransaction(item)}
    >
      <Button
        label="Изменить"
        onPress={() => openForm(transactionForm(api, accounts, tags, templates, item))}
      />
      <Button label="Удалить" danger onPress={() => deleteTransaction(item)} />
    </Row>
  )

  const renderAccount = ({ item }: { item: FinanceAccountSummary }): React.JSX.Element => (
    <Row
      title={`${item.name} · ${formatMoneyMinor(item.balanceMinor, item.currencyCode)}`}
      subtitle={`${item.transactionCount} операций${item.periodChangeMinor ? ` · изменение ${formatMoneyMinor(item.periodChangeMinor, item.currencyCode)}` : ''}`}
      onPress={() => openForm(accountForm(api, item))}
    >
      <Button label="Изменить" onPress={() => openForm(accountForm(api, item))} />
      {item.transactionCount > 0 ? (
        <Button label="Очистить историю" danger onPress={() => clearHistory(item)} />
      ) : (
        <Button
          label="Удалить"
          danger
          onPress={() =>
            state.confirmDelete(`Удалить счёт «${item.name}»?`, () => {
              api.deleteAccount({ id: item.id })
            })
          }
        />
      )}
    </Row>
  )

  const renderTag = ({ item }: { item: FinanceTagSummary }): React.JSX.Element => (
    <Row
      title={item.name}
      subtitle={`${item.type === 'income' ? 'Доход' : item.type === 'expense' ? 'Расход' : 'Доход и расход'} · ${item.transactionCount} операций`}
      onPress={() => openForm(tagForm(api, item))}
    >
      <Button label="Изменить" onPress={() => openForm(tagForm(api, item))} />
      <Button
        label="Удалить"
        danger
        disabled={item.transactionCount > 0 || item.linkedLimitCount > 0}
        onPress={() =>
          state.confirmDelete(`Удалить тег «${item.name}»?`, () => {
            api.deleteTag({ id: item.id })
          })
        }
      />
    </Row>
  )

  const renderLimit = ({ item }: { item: FinanceLimitStatus }): React.JSX.Element => (
    <Row
      title={`${item.tagId ? (tags.find((tag) => tag.id === item.tagId)?.name ?? 'Лимит') : 'Лимит'} · ${formatMoneyMinor(item.amountMinor, item.currencyCode)}`}
      subtitle={`${formatMoneyMinor(item.spentMinor, item.currencyCode)} использовано · ${Math.round(item.usagePercent)}% · ${item.state === 'active' ? 'активен' : 'пауза'}`}
      onPress={() =>
        openForm(limitForm(api, accounts, tags, data.dashboard.settings.baseCurrencyCode, item))
      }
    >
      <Button
        label="Изменить"
        onPress={() =>
          openForm(limitForm(api, accounts, tags, data.dashboard.settings.baseCurrencyCode, item))
        }
      />
      <Button
        label={item.state === 'active' ? 'Пауза' : 'Возобновить'}
        onPress={() =>
          state.mutate(() => {
            api.setLimitState({ id: item.id, state: item.state === 'active' ? 'paused' : 'active' })
          })
        }
      />
      <Button
        label="Удалить"
        danger
        onPress={() =>
          state.confirmDelete('Удалить лимит?', () => {
            api.deleteLimit({ id: item.id })
          })
        }
      />
    </Row>
  )

  const renderTemplate = ({ item }: { item: FinanceTemplate }): React.JSX.Element => (
    <Row
      title={item.name}
      subtitle={`${item.type === 'income' ? 'Доход' : item.type === 'expense' ? 'Расход' : 'Перевод'} · ${item.comment || 'без комментария'}`}
      onPress={() => openForm(templateForm(api, accounts, tags, item))}
    >
      <Button label="Изменить" onPress={() => openForm(templateForm(api, accounts, tags, item))} />
      <Button
        label="Удалить"
        danger
        onPress={() =>
          state.confirmDelete(`Удалить шаблон «${item.name}»?`, () => {
            api.deleteTemplate({ id: item.id })
          })
        }
      />
    </Row>
  )

  let content: React.JSX.Element
  if (tab === 'home') {
    const dashboard = data.dashboard
    content = (
      <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
        <Row
          title={formatMoneyMinor(dashboard.totalBalanceMinor, dashboard.settings.baseCurrencyCode)}
          subtitle={
            dashboard.totalBalanceComplete
              ? 'Общий баланс'
              : `Общий баланс неполный · нет курсов: ${dashboard.missingRateCurrencies.join(', ')}`
          }
        />
        <Row
          title={`Доходы: ${formatMoneyMinor(dashboard.incomeMinor, dashboard.settings.baseCurrencyCode)}`}
          subtitle={`Расходы: ${formatMoneyMinor(dashboard.expenseMinor, dashboard.settings.baseCurrencyCode)} · чистый поток ${formatMoneyMinor(dashboard.netMinor, dashboard.settings.baseCurrencyCode)}`}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            label="+ Операция"
            selected
            onPress={() => openForm(transactionForm(api, accounts, tags, templates))}
            disabled={!accounts.length || !tags.length}
          />
          <Button label="+ Счёт" onPress={() => openForm(accountForm(api))} />
          <Button label="+ Тег" onPress={() => openForm(tagForm(api))} />
        </View>
        <Label>Счета</Label>
        {accounts.length ? (
          accounts
            .slice(0, 4)
            .map((account) => <View key={account.id}>{renderAccount({ item: account })}</View>)
        ) : (
          <EmptyState text="Создайте первый счёт." />
        )}
        <Label>Последние операции</Label>
        {dashboard.recentTransactions.length ? (
          dashboard.recentTransactions.map((transaction) => (
            <View key={transaction.id}>{renderTransaction({ item: transaction })}</View>
          ))
        ) : (
          <EmptyState text="Операций пока нет." />
        )}
      </ScrollView>
    )
  } else if (tab === 'transactions') {
    content = (
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={{ paddingBottom: 12 }}>
            <Button
              label="+ Операция"
              selected
              disabled={!accounts.length || !tags.length}
              onPress={() => openForm(transactionForm(api, accounts, tags, templates))}
            />
          </View>
        }
        ListEmptyComponent={<EmptyState text="Операций пока нет." />}
        renderItem={renderTransaction}
        refreshing={state.loading}
        onRefresh={state.refresh}
      />
    )
  } else if (tab === 'accounts') {
    content = (
      <FlatList
        data={accounts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={{ paddingBottom: 12 }}>
            <Button label="+ Счёт" selected onPress={() => openForm(accountForm(api))} />
          </View>
        }
        ListEmptyComponent={<EmptyState text="Создайте первый счёт." />}
        renderItem={renderAccount}
      />
    )
  } else if (tab === 'tags') {
    content = (
      <FlatList
        data={tags}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={{ paddingBottom: 12 }}>
            <Button label="+ Тег" selected onPress={() => openForm(tagForm(api))} />
          </View>
        }
        ListEmptyComponent={<EmptyState text="Создайте первый тег." />}
        renderItem={renderTag}
      />
    )
  } else if (tab === 'limits') {
    content = (
      <FlatList
        data={limits}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={{ paddingBottom: 12 }}>
            <Button
              label="+ Лимит"
              selected
              disabled={!accounts.length || !tags.some((tag) => tag.type !== 'income')}
              onPress={() =>
                openForm(limitForm(api, accounts, tags, data.dashboard.settings.baseCurrencyCode))
              }
            />
          </View>
        }
        ListEmptyComponent={<EmptyState text="Лимитов пока нет." />}
        renderItem={renderLimit}
      />
    )
  } else if (tab === 'templates') {
    content = (
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={{ paddingBottom: 12 }}>
            <Button
              label="+ Шаблон"
              selected
              disabled={!accounts.length || !tags.length}
              onPress={() => openForm(templateForm(api, accounts, tags))}
            />
          </View>
        }
        ListEmptyComponent={<EmptyState text="Шаблонов пока нет." />}
        renderItem={renderTemplate}
      />
    )
  } else if (tab === 'reports') {
    const report = data.report
    content = (
      <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
        <Row
          title="Последние 30 дней"
          subtitle={`${report.operationCount} операций · ${report.currencyCode}`}
        />
        <Row
          title={`Доходы ${formatMoneyMinor(report.incomeMinor, report.currencyCode)}`}
          subtitle={`Расходы ${formatMoneyMinor(report.expenseMinor, report.currencyCode)} · чистый поток ${formatMoneyMinor(report.netMinor, report.currencyCode)}`}
        />
        <Row
          title={`Средний расход ${formatMoneyMinor(report.averageExpenseMinor, report.currencyCode)}`}
          subtitle={`Крупнейший расход ${formatMoneyMinor(report.largestExpenseMinor, report.currencyCode)}`}
        />
        {report.missingRateCurrencies.length ? (
          <ErrorState message={`Не хватает курсов: ${report.missingRateCurrencies.join(', ')}`} />
        ) : null}
        <Label>Расходы по тегам</Label>
        {report.expenseByTag.length ? (
          report.expenseByTag
            .slice(0, 10)
            .map((item) => (
              <Row
                key={`${item.tagId ?? 'none'}:${item.label}`}
                title={item.label}
                subtitle={`${formatMoneyMinor(item.amountMinor, report.currencyCode)} · ${Math.round(item.sharePercent)}%`}
              />
            ))
        ) : (
          <EmptyState text="Нет расходов за выбранный период." />
        )}
        <Label>Переводы</Label>
        {report.transferFlows.length ? (
          report.transferFlows
            .slice(0, 10)
            .map((flow) => (
              <Row
                key={`${flow.sourceAccountId}:${flow.destinationAccountId}:${flow.sourceCurrencyCode}:${flow.destinationCurrencyCode}`}
                title={`${flow.sourceAccountName} → ${flow.destinationAccountName}`}
                subtitle={`${flow.count} переводов · ${formatMoneyMinor(flow.sourceAmountMinor, flow.sourceCurrencyCode)} → ${formatMoneyMinor(flow.destinationAmountMinor, flow.destinationCurrencyCode)}`}
              />
            ))
        ) : (
          <EmptyState text="Переводов за период нет." />
        )}
      </ScrollView>
    )
  } else {
    const base = data.dashboard.settings.baseCurrencyCode
    content = (
      <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 40 }}>
        <Row
          title={`Основная валюта · ${base}`}
          subtitle="Все сводные показатели конвертируются в неё."
          onPress={() => openForm(baseCurrencyForm(api, base))}
        />
        <Button
          label="+ Ручной курс"
          selected
          onPress={() => openForm(exchangeRateForm(api, base))}
        />
        {rates.map((rate) => (
          <Row
            key={rate.currencyCode}
            title={`${rate.currencyCode} → ${rate.baseCurrencyCode}`}
            subtitle={`Курс: ${rate.rateScaled / 1_000_000}`}
            onPress={() => openForm(exchangeRateForm(api, base, rate))}
          >
            {rate.currencyCode !== base ? (
              <Button
                label="Удалить"
                danger
                onPress={() =>
                  state.confirmDelete(`Удалить курс ${rate.currencyCode}?`, () => {
                    api.deleteExchangeRate({ currencyCode: rate.currencyCode })
                  })
                }
              />
            ) : null}
          </Row>
        ))}
      </ScrollView>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      {header}
      <View style={{ flex: 1 }}>{content}</View>
      {form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
    </View>
  )
}
