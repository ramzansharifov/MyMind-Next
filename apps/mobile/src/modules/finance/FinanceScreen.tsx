import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native'
import {
  BarChart3,
  Copy,
  Gauge,
  Home,
  Landmark,
  ReceiptText,
  Tags,
  Wallet,
  type LucideIcon
} from 'lucide-react-native'
import type {
  FinanceAccountSummary,
  FinanceLimitStatus,
  FinanceTagSummary,
  FinanceTemplate,
  FinanceTransaction,
  FinanceUserTransactionType
} from '@mymind/contracts/finance'
import { formatMoneyMinor } from '@mymind/core/finance-money'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import { FormSheet } from '../../shared/ui/FormSheet'
import { ActionMenu } from '../../shared/ui/ActionMenu'
import { WorkspaceNodeCard } from '../../shared/ui/Workspace'
import { MobileCreateAction, type MobileCreateActionItem } from '../../shared/ui/MobileCreateAction'
import { VisualIconBadge } from '../../shared/ui/VisualPickers'
import type { FormSpec } from '../../shared/ui/form-model'
import { ErrorState, LoadingState } from '../../shared/ui/primitives'
import { accountForm, limitForm, tagForm, templateForm } from './finance-forms'
import { FinanceReportsView } from './FinanceReportsView'
import { MobileFinanceTransactionSheet } from './MobileFinanceTransactionSheet'
import { useConfirmation } from '../../shared/ui/ConfirmationProvider'
import { useTheme } from '../../shared/ui/theme'
import { useToast } from '../../shared/ui/toast-context'

type Tab = 'home' | 'transactions' | 'templates' | 'limits' | 'accounts' | 'tags' | 'reports'

const FINANCE_TABS: ReadonlyArray<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'transactions', label: 'Транзакции', icon: ReceiptText },
  { id: 'templates', label: 'Шаблоны', icon: Copy },
  { id: 'limits', label: 'Лимиты', icon: Gauge },
  { id: 'accounts', label: 'Счета', icon: Landmark },
  { id: 'tags', label: 'Теги', icon: Tags },
  { id: 'reports', label: 'Отчёты', icon: BarChart3 }
]

function FinanceMetric({
  label,
  value,
  tone = 'default'
}: {
  label: string
  value: string
  tone?: 'default' | 'accent' | 'danger'
}): React.JSX.Element {
  const theme = useTheme()
  const valueColor = tone === 'accent' ? theme.accent : tone === 'danger' ? theme.error : theme.text

  return (
    <View
      accessibilityLabel={`${label}: ${value}`}
      style={{
        minWidth: 0,
        flex: 1,
        minHeight: 76,
        paddingHorizontal: 11,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 14,
        backgroundColor: theme.surface
      }}
    >
      <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 10.5, lineHeight: 15 }}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={{
          marginTop: 7,
          color: valueColor,
          fontSize: 16,
          lineHeight: 21,
          fontWeight: '700'
        }}
      >
        {value}
      </Text>
    </View>
  )
}

function FinanceSection({
  title,
  icon: Icon,
  children
}: {
  title: string
  icon: LucideIcon
  children: ReactNode
}): React.JSX.Element {
  const theme = useTheme()

  return (
    <View style={{ gap: 8 }}>
      <View style={{ minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View
          style={{
            width: 28,
            height: 28,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 9,
            backgroundColor: theme.accent + '10'
          }}
        >
          <Icon size={14} color={theme.accent} />
        </View>
        <Text
          style={{ flex: 1, color: theme.text, fontSize: 14, lineHeight: 19, fontWeight: '700' }}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  )
}

function FinanceEmpty({ text, icon: Icon }: { text: string; icon: LucideIcon }): React.JSX.Element {
  const theme = useTheme()

  return (
    <View
      style={{
        minHeight: 66,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        paddingHorizontal: 13,
        paddingVertical: 11,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme.border,
        borderRadius: 14,
        backgroundColor: theme.surface
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 11,
          backgroundColor: theme.accent + '0D'
        }}
      >
        <Icon size={16} color={theme.muted} />
      </View>
      <Text style={{ flex: 1, color: theme.muted, fontSize: 12.5, lineHeight: 18 }}>{text}</Text>
    </View>
  )
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
  const confirm = useConfirmation()
  const theme = useTheme()
  const toast = useToast()
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
  const [transactionSheet, setTransactionSheet] = useState<{
    type: FinanceUserTransactionType
    transaction: FinanceTransaction | null
  } | null>(null)

  const openForm = (next: FormSpec): void => {
    setForm({
      ...next,
      save: async (values) => {
        await next.save(values)
        state.refresh()
      }
    })
  }

  const openTransaction = (
    type: FinanceUserTransactionType,
    transaction: FinanceTransaction | null = null
  ): void => {
    setTransactionSheet({ type, transaction })
  }

  const transactionType = (transaction: FinanceTransaction): FinanceUserTransactionType =>
    transaction.type === 'income'
      ? 'income'
      : transaction.type === 'transfer'
        ? 'transfer'
        : 'expense'

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

  const header = (
    <View style={{ gap: 10, paddingBottom: 12 }}>
      <View
        accessibilityRole="tablist"
        style={{
          minHeight: 50,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          padding: 4,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 16,
          backgroundColor: theme.surface
        }}
      >
        {FINANCE_TABS.map((item) => {
          const selected = tab === item.id
          const Icon = item.icon

          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected }}
              onPress={() => {
                if (selected) return
                setTab(item.id)
                toast.info(item.label, 'finance-tab')
              }}
              style={({ pressed }) => ({
                flex: 1,
                minWidth: 0,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: selected
                  ? theme.accent + '18'
                  : pressed
                    ? theme.raised
                    : 'transparent',
                opacity: pressed ? 0.72 : 1
              })}
            >
              <Icon
                size={18}
                strokeWidth={selected ? 2.4 : 2}
                color={selected ? theme.accent : theme.muted}
              />
            </Pressable>
          )
        })}
      </View>
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
      onPress={() => openTransaction(transactionType(item), item)}
      onLongPress={() => deleteTransaction(item)}
      action={
        <ActionMenu
          title={operationTitle(item)}
          items={[
            {
              label: 'Изменить',
              icon: 'edit',
              onPress: () => openTransaction(transactionType(item), item)
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
    const activeLimits = limits.filter((limit) => limit.state === 'active')
    const currency = dashboard.settings.baseCurrencyCode
    content = (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 18, paddingBottom: 96 }}
      >
        <View
          style={{
            padding: 16,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 18,
            backgroundColor: theme.surface
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                flexShrink: 0,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.accent + '26',
                backgroundColor: theme.accent + '12'
              }}
            >
              <Wallet size={20} color={theme.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: theme.muted, fontSize: 11.5, lineHeight: 16 }}>
                Общий баланс
              </Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={{
                  marginTop: 2,
                  color: theme.text,
                  fontSize: 26,
                  lineHeight: 32,
                  fontWeight: '700'
                }}
              >
                {formatMoneyMinor(dashboard.totalBalanceMinor, currency)}
              </Text>
            </View>
          </View>
          <Text
            numberOfLines={2}
            style={{ marginTop: 10, color: theme.muted, fontSize: 11, lineHeight: 16 }}
          >
            {dashboard.totalBalanceComplete
              ? 'Все счета учтены'
              : `Нет курсов: ${dashboard.missingRateCurrencies.join(', ')}`}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <FinanceMetric
            label="Доходы"
            value={formatMoneyMinor(dashboard.incomeMinor, currency)}
            tone="accent"
          />
          <FinanceMetric
            label="Расходы"
            value={formatMoneyMinor(dashboard.expenseMinor, currency)}
            tone="danger"
          />
          <FinanceMetric label="Итог" value={formatMoneyMinor(dashboard.netMinor, currency)} />
        </View>

        <FinanceSection title="Счета" icon={Landmark}>
          {accounts.length ? (
            accounts
              .slice(0, 4)
              .map((account) => <View key={account.id}>{renderAccount({ item: account })}</View>)
          ) : (
            <FinanceEmpty text="Создайте первый счёт." icon={Landmark} />
          )}
        </FinanceSection>

        <FinanceSection title="Активные лимиты" icon={Gauge}>
          {activeLimits.length ? (
            activeLimits
              .slice(0, 4)
              .map((limit) => <View key={limit.id}>{renderLimit({ item: limit })}</View>)
          ) : (
            <FinanceEmpty text="Активных лимитов пока нет." icon={Gauge} />
          )}
        </FinanceSection>

        <FinanceSection title="Последние операции" icon={ReceiptText}>
          {dashboard.recentTransactions.length ? (
            dashboard.recentTransactions.map((transaction) => (
              <View key={transaction.id}>{renderTransaction({ item: transaction })}</View>
            ))
          ) : (
            <FinanceEmpty text="Операций пока нет." icon={ReceiptText} />
          )}
        </FinanceSection>
      </ScrollView>
    )
  } else if (tab === 'transactions') {
    content = (
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 96 }}
        ListEmptyComponent={<FinanceEmpty text="Операций пока нет." icon={ReceiptText} />}
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
        ListEmptyComponent={<FinanceEmpty text="Создайте первый счёт." icon={Landmark} />}
        renderItem={renderAccount}
      />
    )
  } else if (tab === 'tags') {
    content = (
      <FlatList
        data={tags}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 96 }}
        ListEmptyComponent={<FinanceEmpty text="Создайте первый тег." icon={Tags} />}
        renderItem={renderTag}
      />
    )
  } else if (tab === 'limits') {
    content = (
      <FlatList
        data={limits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 96 }}
        ListEmptyComponent={<FinanceEmpty text="Лимитов пока нет." icon={Gauge} />}
        renderItem={renderLimit}
      />
    )
  } else if (tab === 'templates') {
    content = (
      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 96 }}
        ListEmptyComponent={<FinanceEmpty text="Шаблонов пока нет." icon={Copy} />}
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

  const transactionActions: MobileCreateActionItem[] = [
    {
      key: 'income',
      label: 'Доход',
      description: 'Зачислить деньги на выбранный счёт',
      icon: 'income',
      disabled:
        !accounts.length || !tags.some((tag) => tag.type === 'income' || tag.type === 'both'),
      onPress: () => openTransaction('income')
    },
    {
      key: 'expense',
      label: 'Расход',
      description: 'Записать расход со счёта и выбрать тег',
      icon: 'expense',
      disabled:
        !accounts.length || !tags.some((tag) => tag.type === 'expense' || tag.type === 'both'),
      onPress: () => openTransaction('expense')
    },
    {
      key: 'transfer',
      label: 'Перевод',
      description: 'Перевести деньги между двумя счетами',
      icon: 'transfer',
      disabled: accounts.length < 2,
      onPress: () => openTransaction('transfer')
    }
  ]

  const createActions: MobileCreateActionItem[] =
    tab === 'home'
      ? [
          ...transactionActions,
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
        ? transactionActions
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
      <MobileCreateAction actions={createActions} iconOnly />
      {form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
      {transactionSheet ? (
        <MobileFinanceTransactionSheet
          api={api}
          accounts={accounts}
          tags={tags}
          initialType={transactionSheet.type}
          transaction={transactionSheet.transaction}
          onClose={() => setTransactionSheet(null)}
          onSaved={state.refresh}
        />
      ) : null}
    </View>
  )
}
