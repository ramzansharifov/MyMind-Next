import { useCallback, useMemo, useState } from 'react'
import { FlatList, ScrollView, View } from 'react-native'
import { BarChart3, Copy, Gauge, Home, Landmark, ReceiptText, Tags } from 'lucide-react-native'
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
import { ModuleTabs } from '../../shared/ui/ModuleTabs'
import { ActionMenu } from '../../shared/ui/ActionMenu'
import { WorkspaceNodeCard, WorkspacePanel, WorkspaceStatCard } from '../../shared/ui/Workspace'
import { MobileCreateAction, type MobileCreateActionItem } from '../../shared/ui/MobileCreateAction'
import { VisualIconBadge } from '../../shared/ui/VisualPickers'
import type { FormSpec } from '../../shared/ui/form-model'
import {
  EmptyState,
  ErrorState,
  LoadingState
} from '../../shared/ui/primitives'
import {
  accountForm,
  limitForm,
  tagForm,
  templateForm,
  transactionForm
} from './finance-forms'
import { FinanceReportsView } from './FinanceReportsView'
import { useConfirmation } from '../../shared/ui/ConfirmationProvider'

type Tab = 'home' | 'transactions' | 'templates' | 'limits' | 'accounts' | 'tags' | 'reports'

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
  const confirm = useConfirmation()
  const state = useCollection(
    useCallback(() => {
      const dashboard = api.getDashboard()
      return {
        dashboard,
        accounts: api.listAccounts(),
        tags: api.listTags(),
        limits: api.listLimits(),
        templates: api.listTemplates(),
        transactions: api.listTransactions({
          limit: 100,
          offset: 0,
          includeSystem: false,
          sort: 'date-desc'
        }).items
      }
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

  if (state.loading) return <LoadingState />
  if (!data) {
    return (
      <ErrorState message={state.error || 'Не удалось загрузить финансы'} retry={state.refresh} />
    )
  }

  const tabs = [
    { id: 'home' as const, label: 'Главная', icon: Home },
    { id: 'transactions' as const, label: 'Транзакции', icon: ReceiptText },
    { id: 'templates' as const, label: 'Шаблоны', icon: Copy },
    { id: 'limits' as const, label: 'Лимиты', icon: Gauge },
    { id: 'accounts' as const, label: 'Счета', icon: Landmark },
    { id: 'tags' as const, label: 'Теги', icon: Tags },
    { id: 'reports' as const, label: 'Отчёты', icon: BarChart3 }
  ]

  const header = (
    <View style={{ gap: 10, paddingBottom: 12 }}>
      <ModuleTabs items={tabs} value={tab} onChange={setTab} />
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
    void confirm({
      title: `Очистить историю «${account.name}»?`,
      description: `Текущий баланс ${formatMoneyMinor(account.balanceMinor, account.currencyCode)} станет новым начальным балансом. Связанные переводы будут компенсированы на других счетах.`,
      confirmLabel: 'Очистить',
      submittingLabel: 'Очищаем…',
      tone: 'danger',
      onConfirm: () => {
        state.mutate(() => {
          api.clearAccountHistory({
            accountId: account.id,
            expectedBalanceMinor: account.balanceMinor,
            confirmation: 'ОЧИСТИТЬ'
          })
        }, 'История счёта очищена')
      }
    })
  }

  const renderTransaction = ({ item }: { item: FinanceTransaction }): React.JSX.Element => (
    <WorkspaceNodeCard
      title={operationTitle(item)}
      subtitle={operationSubtitle(item)}
      onPress={() => openForm(transactionForm(api, accounts, tags, templates, item))}
      onLongPress={() => deleteTransaction(item)}
      action={
        <ActionMenu
          title={operationTitle(item)}
          items={[
            {
              label: 'Изменить',
              icon: 'edit',
              onPress: () => openForm(transactionForm(api, accounts, tags, templates, item))
            },
            {
              label: 'Удалить',
              icon: 'delete',
              danger: true,
              onPress: () => deleteTransaction(item)
            }
          ]}
        />
      }
    />
  )

  const renderAccount = ({ item }: { item: FinanceAccountSummary }): React.JSX.Element => (
    <WorkspaceNodeCard
      title={`${item.name} · ${formatMoneyMinor(item.balanceMinor, item.currencyCode)}`}
      subtitle={`${item.transactionCount} операций${item.periodChangeMinor ? ` · изменение ${formatMoneyMinor(item.periodChangeMinor, item.currencyCode)}` : ''}`}
      leading={<VisualIconBadge value={item.icon} />}
      onPress={() => openForm(accountForm(api, item))}
      action={
        <ActionMenu
          title={item.name}
          items={[
            { label: 'Изменить', icon: 'edit', onPress: () => openForm(accountForm(api, item)) },
            item.transactionCount > 0
              ? {
                  key: 'clear',
                  label: 'Очистить историю',
                  icon: 'reset',
                  danger: true,
                  onPress: () => clearHistory(item)
                }
              : {
                  key: 'delete',
                  label: 'Удалить',
                  icon: 'delete',
                  danger: true,
                  onPress: () =>
                    state.confirmDelete(`Удалить счёт «${item.name}»?`, () => {
                      api.deleteAccount({ id: item.id })
                    })
                }
          ]}
        />
      }
    />
  )

  const renderTag = ({ item }: { item: FinanceTagSummary }): React.JSX.Element => (
    <WorkspaceNodeCard
      title={item.name}
      subtitle={`${item.type === 'income' ? 'Доход' : item.type === 'expense' ? 'Расход' : 'Доход и расход'} · ${item.transactionCount} операций`}
      leading={<VisualIconBadge value={item.icon} />}
      onPress={() => openForm(tagForm(api, item))}
      action={
        <ActionMenu
          title={item.name}
          items={[
            { label: 'Изменить', icon: 'edit', onPress: () => openForm(tagForm(api, item)) },
            {
              label: 'Удалить',
              icon: 'delete',
              danger: true,
              disabled: item.transactionCount > 0 || item.linkedLimitCount > 0,
              onPress: () =>
                state.confirmDelete(`Удалить тег «${item.name}»?`, () => {
                  api.deleteTag({ id: item.id })
                })
            }
          ]}
        />
      }
    />
  )

  const renderLimit = ({ item }: { item: FinanceLimitStatus }): React.JSX.Element => (
    <WorkspaceNodeCard
      title={`${item.tagId ? (tags.find((tag) => tag.id === item.tagId)?.name ?? 'Лимит') : 'Лимит'} · ${formatMoneyMinor(item.amountMinor, item.currencyCode)}`}
      subtitle={`${formatMoneyMinor(item.spentMinor, item.currencyCode)} использовано · ${Math.round(item.usagePercent)}% · ${item.state === 'active' ? 'активен' : 'пауза'}`}
      onPress={() =>
        openForm(limitForm(api, accounts, tags, data.dashboard.settings.baseCurrencyCode, item))
      }
      action={
        <ActionMenu
          title="Лимит"
          items={[
            {
              label: 'Изменить',
              icon: 'edit',
              onPress: () =>
                openForm(
                  limitForm(api, accounts, tags, data.dashboard.settings.baseCurrencyCode, item)
                )
            },
            {
              label: item.state === 'active' ? 'Поставить на паузу' : 'Возобновить',
              icon: 'reset',
              onPress: () =>
                state.mutate(() => {
                  api.setLimitState({
                    id: item.id,
                    state: item.state === 'active' ? 'paused' : 'active'
                  })
                })
            },
            {
              label: 'Удалить',
              icon: 'delete',
              danger: true,
              onPress: () =>
                state.confirmDelete('Удалить лимит?', () => {
                  api.deleteLimit({ id: item.id })
                })
            }
          ]}
        />
      }
    />
  )

  const renderTemplate = ({ item }: { item: FinanceTemplate }): React.JSX.Element => (
    <WorkspaceNodeCard
      title={item.name}
      subtitle={`${item.type === 'income' ? 'Доход' : item.type === 'expense' ? 'Расход' : 'Перевод'} · ${item.comment || 'без комментария'}`}
      onPress={() => openForm(templateForm(api, accounts, tags, item))}
      action={
        <ActionMenu
          title={item.name}
          items={[
            {
              label: 'Изменить',
              icon: 'edit',
              onPress: () => openForm(templateForm(api, accounts, tags, item))
            },
            {
              label: 'Удалить',
              icon: 'delete',
              danger: true,
              onPress: () =>
                state.confirmDelete(`Удалить шаблон «${item.name}»?`, () => {
                  api.deleteTemplate({ id: item.id })
                })
            }
          ]}
        />
      }
    />
  )

  let content: React.JSX.Element
  if (tab === 'home') {
    const dashboard = data.dashboard
    content = (
      <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 96 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <WorkspaceStatCard
            label="Общий баланс"
            icon="finance"
            value={formatMoneyMinor(
              dashboard.totalBalanceMinor,
              dashboard.settings.baseCurrencyCode
            )}
            detail={
              dashboard.totalBalanceComplete
                ? 'Все счета учтены'
                : `Нет курсов: ${dashboard.missingRateCurrencies.join(', ')}`
            }
          />
          <WorkspaceStatCard
            label="Чистый поток"
            icon="finance"
            value={formatMoneyMinor(dashboard.netMinor, dashboard.settings.baseCurrencyCode)}
            detail={`Доходы ${formatMoneyMinor(dashboard.incomeMinor, dashboard.settings.baseCurrencyCode)} · расходы ${formatMoneyMinor(dashboard.expenseMinor, dashboard.settings.baseCurrencyCode)}`}
          />
        </View>
        <WorkspacePanel title="Счета" icon="finance">
          {accounts.length ? (
            accounts
              .slice(0, 4)
              .map((account) => <View key={account.id}>{renderAccount({ item: account })}</View>)
          ) : (
            <EmptyState text="Создайте первый счёт." />
          )}
        </WorkspacePanel>
        <WorkspacePanel title="Последние операции" icon="finance">
          {dashboard.recentTransactions.length ? (
            dashboard.recentTransactions.map((transaction) => (
              <View key={transaction.id}>{renderTransaction({ item: transaction })}</View>
            ))
          ) : (
            <EmptyState text="Операций пока нет." />
          )}
        </WorkspacePanel>
      </ScrollView>
    )
  } else if (tab === 'transactions') {
    content = (
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 96 }}
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
        contentContainerStyle={{ paddingBottom: 96 }}
        ListEmptyComponent={<EmptyState text="Создайте первый счёт." />}
        renderItem={renderAccount}
      />
    )
  } else if (tab === 'tags') {
    content = (
      <FlatList
        data={tags}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 96 }}
        ListEmptyComponent={<EmptyState text="Создайте первый тег." />}
        renderItem={renderTag}
      />
    )
  } else if (tab === 'limits') {
    content = (
      <FlatList
        data={limits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 96 }}
        ListEmptyComponent={<EmptyState text="Лимитов пока нет." />}
        renderItem={renderLimit}
      />
    )
  } else if (tab === 'templates') {
    content = (
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 96 }}
        ListEmptyComponent={<EmptyState text="Шаблонов пока нет." />}
        renderItem={renderTemplate}
      />
    )
  } else {
    content = (
      <FinanceReportsView
        api={api}
        accounts={accounts}
        tags={tags}
        baseCurrencyCode={data.dashboard.settings.baseCurrencyCode}
      />
    )
  }

  const createActions: MobileCreateActionItem[] =
    tab === 'home'
      ? [
          {
            key: 'transaction',
            label: 'Новая операция',
            description: 'Доход, расход или перевод',
            icon: 'finance',
            disabled: !accounts.length || !tags.length,
            onPress: () => openForm(transactionForm(api, accounts, tags, templates))
          },
          {
            key: 'account',
            label: 'Новый счёт',
            description: 'Карта, наличные или другой счёт',
            icon: 'finance',
            onPress: () => openForm(accountForm(api))
          },
          {
            key: 'tag',
            label: 'Новый тег',
            description: 'Категория доходов и расходов',
            icon: 'folder',
            onPress: () => openForm(tagForm(api))
          }
        ]
      : tab === 'transactions'
        ? [
            {
              key: 'transaction',
              label: 'Новая операция',
              description: 'Доход, расход или перевод',
              icon: 'finance',
              disabled: !accounts.length || !tags.length,
              onPress: () => openForm(transactionForm(api, accounts, tags, templates))
            }
          ]
        : tab === 'accounts'
          ? [
              {
                key: 'account',
                label: 'Новый счёт',
                description: 'Добавить новый финансовый счёт',
                icon: 'finance',
                onPress: () => openForm(accountForm(api))
              }
            ]
          : tab === 'tags'
            ? [
                {
                  key: 'tag',
                  label: 'Новый тег',
                  description: 'Добавить категорию для операций',
                  icon: 'folder',
                  onPress: () => openForm(tagForm(api))
                }
              ]
            : tab === 'limits'
              ? [
                  {
                    key: 'limit',
                    label: 'Новый лимит',
                    description: 'Ограничить расходы по категории',
                    icon: 'finance',
                    disabled: !accounts.length || !tags.some((tag) => tag.type !== 'income'),
                    onPress: () =>
                      openForm(
                        limitForm(api, accounts, tags, data.dashboard.settings.baseCurrencyCode)
                      )
                  }
                ]
              : tab === 'templates'
                ? [
                    {
                      key: 'template',
                      label: 'Новый шаблон',
                      description: 'Сохранить часто используемую операцию',
                      icon: 'finance',
                      disabled: !accounts.length || !tags.length,
                      onPress: () => openForm(templateForm(api, accounts, tags))
                    }
                  ]
                : []

  return (
    <View style={{ flex: 1 }}>
      {header}
      <View style={{ flex: 1 }}>{content}</View>
      <MobileCreateAction actions={createActions} />
      {form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
    </View>
  )
}
