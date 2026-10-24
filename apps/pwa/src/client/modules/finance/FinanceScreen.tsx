import { FittedText } from '../../../ui/FittedText'
import type { PointerEvent } from 'react'
import { motionValue, mapValue, motion } from 'framer-motion'
import {
  Action,
  useViewport,
  playMotion,
  motionStep,
  stopMotion,
  DragState,
  horizontalDrag,
  RefreshRegion
} from '../../../ui/browser'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  BarChart3,
  Copy,
  Eye,
  EyeOff,
  Gauge,
  Home,
  Landmark,
  ReceiptText,
  Tags,
  Wallet,
  type LucideIcon
} from 'lucide-react'
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
import { MobileCreateAction, type MobileCreateActionItem } from '../../shared/ui/MobileCreateAction'
import { VisualIconBadge, VisualIconGlyph } from '../../shared/ui/VisualPickers'
import type { FormSpec } from '../../shared/ui/form-model'
import { ErrorState, LoadingState } from '../../shared/ui/primitives'
import { accountForm } from './finance-forms'
import { FinanceReportsView } from './FinanceReportsView'
import { FinanceQuickTransactionFlow } from './FinanceQuickTransactionFlow'
import { MobileFinanceTransactionSheet } from './MobileFinanceTransactionSheet'
import { MobileFinanceTemplateSheet } from './MobileFinanceTemplateSheet'
import { MobileFinanceTagSheet } from './MobileFinanceTagSheet'
import { MobileFinanceLimitSheet } from './MobileFinanceLimitSheet'
import { MobileFinanceTransactionDetailSheet } from './MobileFinanceTransactionDetailSheet'
import { MobileFinanceTemplateDetailSheet } from './MobileFinanceTemplateDetailSheet'
import { MobileFinanceAccountDetailSheet } from './MobileFinanceAccountDetailSheet'
import { MobileFinanceTagDetailSheet } from './MobileFinanceTagDetailSheet'
import { MobileFinanceLimitDetailSheet } from './MobileFinanceLimitDetailSheet'
import { financeOperationTone, financeTagTone } from './finance-semantic-colors'
import {
  adjacentFinanceTab,
  financeSwipeDirection,
  type FinanceTab,
  type FinanceTabSwipeDirection
} from './finance-tab-navigation'
import { useConfirmation } from '../../shared/ui/confirmation-context'
import { useTheme } from '../../shared/ui/theme'
import { SwipeTabBar } from '../../shared/ui/SwipeTabBar'
import { useSwipeTabFeedback } from '../../shared/ui/useSwipeTabFeedback'
const FINANCE_PRIVACY_SETTING_KEY = 'finance.amounts-hidden'
const FINANCE_TABS: ReadonlyArray<{
  id: FinanceTab
  label: string
  icon: LucideIcon
}> = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'templates', label: 'Шаблоны', icon: Copy },
  { id: 'accounts', label: 'Счета', icon: Landmark },
  { id: 'transactions', label: 'Транзакции', icon: ReceiptText },
  { id: 'tags', label: 'Теги', icon: Tags },
  { id: 'limits', label: 'Лимиты', icon: Gauge },
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
    <div
      className="ui-stack"
      aria-label={`${label}: ${value}`}
      style={{
        minWidth: 0,
        flex: '1 1 0%',
        minHeight: 76,
        paddingInline: 11,
        paddingBlock: 10,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 14,
        backgroundColor: theme.surface
      }}
    >
      <span
        className="ui-text"
        data-lines={1}
        style={{
          color: theme.muted,
          fontSize: 10.5,
          lineHeight: '15px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 1
        }}
      >
        {label}
      </span>
      <FittedText
        minScale={0.72}
        className="ui-text"
        data-lines={1}
        style={{
          marginTop: 7,
          color: valueColor,
          fontSize: 16,
          lineHeight: '21px',
          fontWeight: 700,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 1
        }}
      >
        {value}
      </FittedText>
    </div>
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
    <div
      className="ui-stack"
      style={{
        gap: 8
      }}
    >
      <div
        className="ui-stack"
        style={{
          minHeight: 30,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8
        }}
      >
        <div
          className="ui-stack"
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
        </div>
        <span
          className="ui-text"
          style={{
            flex: '1 1 0%',
            color: theme.text,
            fontSize: 14,
            lineHeight: '19px',
            fontWeight: 700
          }}
        >
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}
function FinanceEmpty({ text, icon: Icon }: { text: string; icon: LucideIcon }): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        minHeight: 66,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        paddingInline: 13,
        paddingBlock: 11,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: theme.border,
        borderRadius: 14,
        backgroundColor: theme.surface
      }}
    >
      <div
        className="ui-stack"
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
      </div>
      <span
        className="ui-text"
        style={{
          flex: '1 1 0%',
          color: theme.muted,
          fontSize: 12.5,
          lineHeight: '18px'
        }}
      >
        {text}
      </span>
    </div>
  )
}
function FinanceListCard({
  title,
  titleColor,
  subtitle,
  subtitleColor,
  rightPrimary,
  rightPrimaryColor,
  rightSecondary,
  rightSecondaryColor,
  leading,
  accessibilityLabel,
  onClick
}: {
  title: string
  titleColor?: string
  subtitle?: string
  subtitleColor?: string
  rightPrimary?: string
  rightPrimaryColor?: string
  rightSecondary?: string
  rightSecondaryColor?: string
  leading?: ReactNode
  accessibilityLabel: string
  onClick(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Action
      role={'button'}
      aria-label={accessibilityLabel}
      onClick={onClick}
      style={{
        minHeight: 78,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        paddingInline: 12,
        paddingBlock: 11,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface,
        opacity: 1
      }}
      pressedStyle={{
        backgroundColor: theme.raised,
        opacity: 0.78
      }}
    >
      {leading}
      <div
        className="ui-stack"
        style={{
          minWidth: 0,
          flex: '1 1 0%'
        }}
      >
        <FittedText
          minScale={0.76}
          className="ui-text"
          data-lines={1}
          style={{
            color: titleColor ?? theme.text,
            fontSize: 14,
            lineHeight: '19px',
            fontWeight: 800,
            fontVariant: 'tabular-nums',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 1
          }}
        >
          {title}
        </FittedText>
        {subtitle ? (
          <span
            className="ui-text"
            data-lines={1}
            style={{
              marginTop: 4,
              color: subtitleColor ?? theme.muted,
              fontSize: 10.5,
              lineHeight: '14px',
              fontWeight: subtitleColor ? '700' : '500',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 1
            }}
          >
            {subtitle}
          </span>
        ) : null}
      </div>
      {rightPrimary || rightSecondary ? (
        <div
          className="ui-stack"
          style={{
            maxWidth: '42%',
            alignItems: 'flex-end'
          }}
        >
          {rightPrimary ? (
            <FittedText
              minScale={0.76}
              className="ui-text"
              data-lines={1}
              style={{
                color: rightPrimaryColor ?? theme.text,
                fontSize: 12.5,
                lineHeight: '17px',
                fontWeight: 800,
                fontVariant: 'tabular-nums',
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1
              }}
            >
              {rightPrimary}
            </FittedText>
          ) : null}
          {rightSecondary ? (
            <span
              className="ui-text"
              data-lines={1}
              style={{
                marginTop: 4,
                color: rightSecondaryColor ?? theme.muted,
                fontSize: 9.5,
                lineHeight: '13px',
                fontWeight: rightSecondaryColor ? '700' : '500',
                textAlign: 'right',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1
              }}
            >
              {rightSecondary}
            </span>
          ) : null}
        </div>
      ) : null}
    </Action>
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
export function FinanceScreen(): React.JSX.Element {
  const { finance: api, settings } = useServices()
  const confirm = useConfirmation()
  const theme = useTheme()
  const { width: screenWidth } = useViewport()
  const [tabTranslateX] = useState(() => motionValue(0))
  const [swipeAnimating, setSwipeAnimating] = useState(false)
  const [swipeTabFeedback, showSwipeTabFeedback] = useSwipeTabFeedback<FinanceTab>()
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
  const [tab, setTab] = useState<FinanceTab>('home')
  const [form, setForm] = useState<FormSpec | null>(null)
  const [quickTransactionType, setQuickTransactionType] =
    useState<FinanceUserTransactionType | null>(null)
  const [transactionSheet, setTransactionSheet] = useState<{
    type: FinanceUserTransactionType
    transaction: FinanceTransaction | null
    template: FinanceTemplate | null
  } | null>(null)
  const [templateSheet, setTemplateSheet] = useState<FinanceTemplate | 'new' | null>(null)
  const [tagSheet, setTagSheet] = useState<FinanceTagSummary | 'new' | null>(null)
  const [limitSheet, setLimitSheet] = useState<FinanceLimitStatus | 'new' | null>(null)
  const [transactionDetail, setTransactionDetail] = useState<FinanceTransaction | null>(null)
  const [templateDetail, setTemplateDetail] = useState<FinanceTemplate | null>(null)
  const [accountDetail, setAccountDetail] = useState<FinanceAccountSummary | null>(null)
  const [tagDetail, setTagDetail] = useState<FinanceTagSummary | null>(null)
  const [limitDetail, setLimitDetail] = useState<FinanceLimitStatus | null>(null)
  const [balanceHidden, setBalanceHidden] = useState(
    () => settings.get(FINANCE_PRIVACY_SETTING_KEY) === 'true'
  )
  const tabPageWidth = Math.max(screenWidth - 28, 280)
  const toggleBalancePrivacy = useCallback((): void => {
    setBalanceHidden((hidden) => {
      const next = !hidden
      settings.set(FINANCE_PRIVACY_SETTING_KEY, String(next))
      return next
    })
  }, [settings])
  const resetSwipePosition = useCallback((): void => {
    playMotion(
      motionStep(tabTranslateX, 0, {
        damping: 24,
        stiffness: 260,
        mass: 0.72,
        type: 'spring'
      })
    )
  }, [tabTranslateX])
  const switchTab = useCallback(
    (nextTab: FinanceTab): void => {
      if (nextTab === tab || swipeAnimating) return
      stopMotion(tabTranslateX)
      tabTranslateX.set(0)
      setTab(nextTab)
    },
    [swipeAnimating, tab, tabTranslateX]
  )
  const completeSwipe = useCallback(
    (nextTab: FinanceTab, direction: FinanceTabSwipeDirection): void => {
      if (nextTab === tab || swipeAnimating) {
        resetSwipePosition()
        return
      }
      setSwipeAnimating(true)
      const exitX = direction === 'next' ? -tabPageWidth : tabPageWidth
      const enterX = direction === 'next' ? tabPageWidth : -tabPageWidth
      playMotion(
        motionStep(tabTranslateX, exitX, {
          duration: 135 / 1000,
          ease: 'easeOut',
          type: 'tween'
        }),
        ({ finished }) => {
          if (!finished) {
            setSwipeAnimating(false)
            resetSwipePosition()
            return
          }
          setTab(nextTab)
          showSwipeTabFeedback(nextTab, direction)
          tabTranslateX.set(enterX)
          requestAnimationFrame(() => {
            playMotion(
              motionStep(tabTranslateX, 0, {
                duration: 190 / 1000,
                ease: 'easeOut',
                type: 'tween'
              }),
              () => {
                setSwipeAnimating(false)
              }
            )
          })
        }
      )
    },
    [resetSwipePosition, showSwipeTabFeedback, swipeAnimating, tab, tabPageWidth, tabTranslateX]
  )
  const tabSwipeResponder = useMemo(() => {
    const shouldClaimHorizontalSwipe = (
      _event: PointerEvent<HTMLElement>,
      gesture: DragState
    ): boolean => {
      if (swipeAnimating || gesture.numberActiveTouches !== 1) return false
      const horizontal = Math.abs(gesture.dx)
      const vertical = Math.abs(gesture.dy)
      return horizontal >= 10 && horizontal > vertical * 1.35
    }
    return horizontalDrag({
      shouldStart: shouldClaimHorizontalSwipe,
      onStart: () => {
        stopMotion(tabTranslateX)
      },
      onMove: (_event, gesture) => {
        if (swipeAnimating) return
        const direction: FinanceTabSwipeDirection = gesture.dx < 0 ? 'next' : 'previous'
        const nextTab = adjacentFinanceTab(tab, direction)
        const atEdge = nextTab === tab
        const raw = atEdge ? gesture.dx * 0.18 : gesture.dx
        const clamped = Math.max(-tabPageWidth, Math.min(tabPageWidth, raw))
        tabTranslateX.set(clamped)
      },
      onEnd: (_event, gesture) => {
        if (swipeAnimating) return
        const direction = financeSwipeDirection(gesture.dx, gesture.dy, gesture.vx)
        if (!direction) {
          resetSwipePosition()
          return
        }
        const nextTab = adjacentFinanceTab(tab, direction)
        if (nextTab === tab) {
          resetSwipePosition()
          return
        }
        completeSwipe(nextTab, direction)
      },
      onCancel: () => {
        if (!swipeAnimating) resetSwipePosition()
      }
    })
  }, [completeSwipe, resetSwipePosition, swipeAnimating, tab, tabPageWidth, tabTranslateX])
  const tabSwipeOpacity = mapValue(tabTranslateX, [-tabPageWidth, 0, tabPageWidth], [0.9, 1, 0.9], {
    clamp: true
  })
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
    transaction: FinanceTransaction | null = null,
    template: FinanceTemplate | null = null
  ): void => {
    setTransactionSheet({ type, transaction, template })
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
    <div
      className="ui-stack"
      style={{
        gap: 10,
        paddingBottom: 12
      }}
    >
      <SwipeTabBar
        items={FINANCE_TABS}
        value={tab}
        onChange={switchTab}
        feedback={swipeTabFeedback}
        renderIcon={(item, selected) => {
          const Icon = item.icon
          return (
            <Icon
              size={18}
              strokeWidth={selected ? 2.4 : 2}
              color={selected ? theme.accent : theme.muted}
            />
          )
        }}
      />
      {state.error ? <ErrorState message={state.error} retry={state.refresh} /> : null}
    </div>
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
  const renderTransaction = ({ item }: { item: FinanceTransaction }): React.JSX.Element => {
    const outgoing = item.entries.find((entry) => entry.signedAmountMinor < 0)
    const primary = item.type === 'transfer' ? outgoing : item.entries[0]
    const displayType = item.type === 'adjustment' ? 'expense' : transactionType(item)
    const tone = financeOperationTone(displayType, theme.accent)
    const amount = primary
      ? `${primary.signedAmountMinor > 0 ? '+' : primary.signedAmountMinor < 0 ? '−' : ''}${formatMoneyMinor(Math.abs(primary.signedAmountMinor), primary.accountCurrencyCode)}`
      : '—'
    const title = operationTitle(item)
    const date = new Date(item.occurredAt).toLocaleDateString('ru-RU')
    const typeLabel =
      item.type === 'income'
        ? 'Доход'
        : item.type === 'expense'
          ? 'Расход'
          : item.type === 'transfer'
            ? 'Перевод'
            : 'Корректировка'
    return (
      <FinanceListCard
        title={amount}
        titleColor={tone}
        subtitle={title}
        rightPrimary={date}
        rightSecondary={typeLabel}
        rightSecondaryColor={tone}
        accessibilityLabel={`${amount}, ${title}, ${date}`}
        onClick={() => setTransactionDetail(item)}
      />
    )
  }
  const renderAccount = ({ item }: { item: FinanceAccountSummary }): React.JSX.Element => (
    <FinanceListCard
      leading={<VisualIconBadge value={item.icon} size={40} />}
      title={item.name}
      subtitle={`${item.currencyCode} · ${item.transactionCount} операций`}
      rightPrimary={formatMoneyMinor(item.balanceMinor, item.currencyCode)}
      rightPrimaryColor={item.balanceMinor < 0 ? theme.error : theme.text}
      rightSecondary="Баланс"
      accessibilityLabel={`${item.name}, ${formatMoneyMinor(item.balanceMinor, item.currencyCode)}`}
      onClick={() => setAccountDetail(item)}
    />
  )
  const renderTag = ({ item }: { item: FinanceTagSummary }): React.JSX.Element => {
    const tone = financeTagTone(item.type, theme.accent)
    const typeLabel =
      item.type === 'income' ? 'Доход' : item.type === 'expense' ? 'Расход' : 'Доход и расход'
    return (
      <FinanceListCard
        leading={
          <div
            className="ui-stack"
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: tone + '45',
              backgroundColor: tone + '16'
            }}
          >
            <VisualIconGlyph value={item.icon} size={18} color={tone} />
          </div>
        }
        title={item.name}
        subtitle={typeLabel}
        subtitleColor={tone}
        rightPrimary={String(item.transactionCount)}
        rightSecondary={item.linkedLimitCount ? `${item.linkedLimitCount} лимитов` : 'операций'}
        accessibilityLabel={`${item.name}, ${typeLabel}, ${item.transactionCount} операций`}
        onClick={() => setTagDetail(item)}
      />
    )
  }
  const renderLimit = ({ item }: { item: FinanceLimitStatus }): React.JSX.Element => {
    const tagName = item.tagId
      ? (tags.find((tag) => tag.id === item.tagId)?.name ?? 'Лимит')
      : 'Лимит'
    const usageTone =
      item.usagePercent >= 100 ? theme.error : item.warningReached ? '#fbbf24' : theme.accent
    return (
      <FinanceListCard
        title={tagName}
        subtitle={`${formatMoneyMinor(item.spentMinor, item.currencyCode)} из ${formatMoneyMinor(item.amountMinor, item.currencyCode)}`}
        rightPrimary={`${Math.round(item.usagePercent)}%`}
        rightPrimaryColor={usageTone}
        rightSecondary={item.state === 'active' ? 'Активен' : 'На паузе'}
        rightSecondaryColor={item.state === 'active' ? theme.accent : '#fbbf24'}
        accessibilityLabel={`${tagName}, использовано ${Math.round(item.usagePercent)} процентов`}
        onClick={() => setLimitDetail(item)}
      />
    )
  }
  const renderTemplate = ({ item }: { item: FinanceTemplate }): React.JSX.Element => {
    const source = accounts.find((account) => account.id === item.sourceAccountId)
    const destination = accounts.find((account) => account.id === item.destinationAccountId)
    const tag = tags.find((entry) => entry.id === item.tagId)
    const tone = financeOperationTone(item.type, theme.accent)
    const typeLabel =
      item.type === 'income' ? 'Доход' : item.type === 'expense' ? 'Расход' : 'Перевод'
    const amount = source
      ? formatMoneyMinor(item.sourceAmountMinor, source.currencyCode)
      : 'Счёт недоступен'
    const meta =
      item.type === 'transfer'
        ? `${source?.name ?? 'Счёт'} → ${destination?.name ?? 'Счёт'}`
        : [source?.name, tag?.name].filter(Boolean).join(' · ')
    return (
      <FinanceListCard
        title={item.name}
        subtitle={meta || 'Без привязки'}
        rightPrimary={amount}
        rightSecondary={typeLabel}
        rightSecondaryColor={tone}
        accessibilityLabel={`${item.name}, ${amount}, ${typeLabel}`}
        onClick={() => setTemplateDetail(item)}
      />
    )
  }
  let content: React.JSX.Element
  if (tab === 'home') {
    const dashboard = data.dashboard
    const activeLimits = limits.filter((limit) => limit.state === 'active')
    const currency = dashboard.settings.baseCurrencyCode
    content = (
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            gap: 18,
            paddingBottom: 96
          }}
        >
          {header}
          <div
            className="ui-stack"
            style={{
              padding: 16,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 18,
              backgroundColor: theme.surface
            }}
          >
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12
              }}
            >
              <div
                className="ui-stack"
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
              </div>
              <div
                className="ui-stack"
                style={{
                  flex: '1 1 0%',
                  minWidth: 0
                }}
              >
                <span
                  className="ui-text"
                  style={{
                    color: theme.muted,
                    fontSize: 11.5,
                    lineHeight: '16px'
                  }}
                >
                  Общий баланс
                </span>
                <FittedText
                  minScale={0.7}
                  className="ui-text"
                  data-lines={1}
                  aria-label={balanceHidden ? 'Общий баланс скрыт' : 'Общий баланс'}
                  style={{
                    marginTop: 2,
                    color: theme.text,
                    fontSize: 26,
                    lineHeight: '32px',
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 1
                  }}
                >
                  {balanceHidden
                    ? '******'
                    : formatMoneyMinor(dashboard.totalBalanceMinor, currency)}
                </FittedText>
              </div>
              <Action
                role={'button'}
                aria-label={balanceHidden ? 'Показать финансовые суммы' : 'Скрыть финансовые суммы'}
                onClick={toggleBalancePrivacy}
                style={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 12,
                  backgroundColor: theme.background,
                  opacity: 1
                }}
                pressedStyle={{
                  backgroundColor: theme.raised,
                  opacity: 0.72
                }}
              >
                {balanceHidden ? (
                  <EyeOff size={18} color={theme.muted} />
                ) : (
                  <Eye size={18} color={theme.muted} />
                )}
              </Action>
            </div>
            <span
              className="ui-text"
              data-lines={2}
              style={{
                marginTop: 10,
                color: theme.muted,
                fontSize: 11,
                lineHeight: '16px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2
              }}
            >
              {dashboard.totalBalanceComplete
                ? 'Все счета учтены'
                : `Нет курсов: ${dashboard.missingRateCurrencies.join(', ')}`}
            </span>
          </div>

          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              gap: 8
            }}
          >
            <FinanceMetric
              label="Доходы"
              value={balanceHidden ? '******' : formatMoneyMinor(dashboard.incomeMinor, currency)}
              tone="accent"
            />
            <FinanceMetric
              label="Расходы"
              value={balanceHidden ? '******' : formatMoneyMinor(dashboard.expenseMinor, currency)}
              tone="danger"
            />
            <FinanceMetric
              label="Итог"
              value={balanceHidden ? '******' : formatMoneyMinor(dashboard.netMinor, currency)}
            />
          </div>

          <FinanceSection title="Счета" icon={Landmark}>
            {accounts.length ? (
              accounts.slice(0, 4).map((account) => (
                <div className="ui-stack" key={account.id}>
                  {renderAccount({ item: account })}
                </div>
              ))
            ) : (
              <FinanceEmpty text="Создайте первый счёт." icon={Landmark} />
            )}
          </FinanceSection>

          <FinanceSection title="Активные лимиты" icon={Gauge}>
            {activeLimits.length ? (
              activeLimits.slice(0, 4).map((limit) => (
                <div className="ui-stack" key={limit.id}>
                  {renderLimit({ item: limit })}
                </div>
              ))
            ) : (
              <FinanceEmpty text="Активных лимитов пока нет." icon={Gauge} />
            )}
          </FinanceSection>

          <FinanceSection title="Последние операции" icon={ReceiptText}>
            {dashboard.recentTransactions.length ? (
              dashboard.recentTransactions.map((transaction) => (
                <div className="ui-stack" key={transaction.id}>
                  {renderTransaction({ item: transaction })}
                </div>
              ))
            ) : (
              <FinanceEmpty text="Операций пока нет." icon={ReceiptText} />
            )}
          </FinanceSection>
        </div>
      </div>
    )
  } else if (tab === 'transactions') {
    content = (
      <RefreshRegion className="ui-scroll" onRefresh={state.refresh} busy={state.loading}>
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 96
          }}
        >
          {header}
          <div className="ui-stack ui-list" style={{}}>
            {transactions.length > 0 ? (
              transactions.map((item) => (
                <div className="ui-stack ui-list-item" key={((item) => item.id)(item)}>
                  {renderTransaction({ item })}
                </div>
              ))
            ) : (
              <FinanceEmpty text="Операций пока нет." icon={ReceiptText} />
            )}
          </div>
        </div>
      </RefreshRegion>
    )
  } else if (tab === 'accounts') {
    content = (
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 96
          }}
        >
          {header}
          <div className="ui-stack ui-list" style={{}}>
            {accounts.length > 0 ? (
              accounts.map((item) => (
                <div className="ui-stack ui-list-item" key={((item) => item.id)(item)}>
                  {renderAccount({ item })}
                </div>
              ))
            ) : (
              <FinanceEmpty text="Создайте первый счёт." icon={Landmark} />
            )}
          </div>
        </div>
      </div>
    )
  } else if (tab === 'tags') {
    content = (
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 96
          }}
        >
          {header}
          <div className="ui-stack ui-list" style={{}}>
            {tags.length > 0 ? (
              tags.map((item) => (
                <div className="ui-stack ui-list-item" key={((item) => item.id)(item)}>
                  {renderTag({ item })}
                </div>
              ))
            ) : (
              <FinanceEmpty text="Создайте первый тег." icon={Tags} />
            )}
          </div>
        </div>
      </div>
    )
  } else if (tab === 'limits') {
    content = (
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 96
          }}
        >
          {header}
          <div className="ui-stack ui-list" style={{}}>
            {limits.length > 0 ? (
              limits.map((item) => (
                <div className="ui-stack ui-list-item" key={((item) => item.id)(item)}>
                  {renderLimit({ item })}
                </div>
              ))
            ) : (
              <FinanceEmpty text="Лимитов пока нет." icon={Gauge} />
            )}
          </div>
        </div>
      </div>
    )
  } else if (tab === 'templates') {
    content = (
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 96
          }}
        >
          {header}
          <div className="ui-stack ui-list" style={{}}>
            {templates.length > 0 ? (
              templates.map((item) => (
                <div className="ui-stack ui-list-item" key={((item) => item.id)(item)}>
                  {renderTemplate({ item })}
                </div>
              ))
            ) : (
              <FinanceEmpty text="Шаблонов пока нет." icon={Copy} />
            )}
          </div>
        </div>
      </div>
    )
  } else {
    content = (
      <FinanceReportsView
        api={api}
        accounts={accounts}
        tags={tags}
        baseCurrencyCode={data.dashboard.settings.baseCurrencyCode}
        header={header}
      />
    )
  }
  const transactionActions: MobileCreateActionItem[] = [
    {
      key: 'income',
      label: 'Доход',
      description: 'Зачислить деньги на выбранный счёт',
      icon: 'income',
      color: financeOperationTone('income', theme.accent),
      disabled:
        !accounts.length || !tags.some((tag) => tag.type === 'income' || tag.type === 'both'),
      onClick: () => openTransaction('income'),
      onHoldSelect: () => setQuickTransactionType('income')
    },
    {
      key: 'expense',
      label: 'Расход',
      description: 'Записать расход со счёта и выбрать тег',
      icon: 'expense',
      color: financeOperationTone('expense', theme.accent),
      disabled:
        !accounts.length || !tags.some((tag) => tag.type === 'expense' || tag.type === 'both'),
      onClick: () => openTransaction('expense'),
      onHoldSelect: () => setQuickTransactionType('expense')
    },
    {
      key: 'transfer',
      label: 'Перевод',
      description: 'Перевести деньги между двумя счетами',
      icon: 'transfer',
      color: financeOperationTone('transfer', theme.accent),
      disabled: accounts.length < 2,
      onClick: () => openTransaction('transfer'),
      onHoldSelect: () => setQuickTransactionType('transfer')
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
            onClick: () => openForm(accountForm(api))
          },
          {
            key: 'tag',
            label: 'Новый тег',
            description: 'Категория доходов и расходов',
            icon: 'tag',
            onClick: () => setTagSheet('new')
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
                onClick: () => openForm(accountForm(api))
              }
            ]
          : tab === 'tags'
            ? [
                {
                  key: 'tag',
                  label: 'Новый тег',
                  description: 'Добавить категорию для операций',
                  icon: 'tag',
                  onClick: () => setTagSheet('new')
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
                    onClick: () => setLimitSheet('new')
                  }
                ]
              : tab === 'templates'
                ? [
                    {
                      key: 'template',
                      label: 'Новый шаблон',
                      description: 'Сохранить часто используемую операцию',
                      icon: 'copy',
                      disabled: !accounts.length,
                      onClick: () => setTemplateSheet('new')
                    }
                  ]
                : []
  return (
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%'
      }}
    >
      {null}
      <div
        className="ui-stack"
        style={{
          flex: '1 1 0%',
          overflow: 'hidden'
        }}
      >
        <motion.div
          className="ui-stack"
          style={{
            flex: '1 1 0%',
            opacity: tabSwipeOpacity,
            x: tabTranslateX
          }}
          {...tabSwipeResponder.pointerHandlers}
        >
          {content}
        </motion.div>
      </div>
      <MobileCreateAction actions={createActions} iconOnly confirmHoldSelection />
      {quickTransactionType ? (
        <FinanceQuickTransactionFlow
          type={quickTransactionType}
          api={api}
          accounts={accounts}
          tags={tags}
          onClose={() => setQuickTransactionType(null)}
          onSaved={state.refresh}
        />
      ) : null}
      {transactionDetail ? (
        <MobileFinanceTransactionDetailSheet
          transaction={transactionDetail}
          onClose={() => setTransactionDetail(null)}
          onEdit={() => {
            const transaction = transactionDetail
            setTransactionDetail(null)
            openTransaction(transactionType(transaction), transaction)
          }}
          onDelete={() => {
            const transaction = transactionDetail
            setTransactionDetail(null)
            requestAnimationFrame(() => deleteTransaction(transaction))
          }}
        />
      ) : null}
      {templateDetail ? (
        <MobileFinanceTemplateDetailSheet
          template={templateDetail}
          accounts={accounts}
          tags={tags}
          onClose={() => setTemplateDetail(null)}
          onUse={() => {
            const template = templateDetail
            setTemplateDetail(null)
            requestAnimationFrame(() => openTransaction(template.type, null, template))
          }}
          onEdit={() => {
            const template = templateDetail
            setTemplateDetail(null)
            setTemplateSheet(template)
          }}
          onDelete={() => {
            const template = templateDetail
            setTemplateDetail(null)
            requestAnimationFrame(() =>
              state.confirmDelete(`Удалить шаблон «${template.name}»?`, () => {
                api.deleteTemplate({ id: template.id })
              })
            )
          }}
        />
      ) : null}
      {accountDetail ? (
        <MobileFinanceAccountDetailSheet
          api={api}
          account={accountDetail}
          onClose={() => setAccountDetail(null)}
          onEdit={() => {
            const account = accountDetail
            setAccountDetail(null)
            openForm(accountForm(api, account))
          }}
          onClearHistory={() => {
            const account = accountDetail
            setAccountDetail(null)
            requestAnimationFrame(() => clearHistory(account))
          }}
          onDelete={() => {
            const account = accountDetail
            setAccountDetail(null)
            requestAnimationFrame(() =>
              state.confirmDelete(`Удалить счёт «${account.name}»?`, () => {
                api.deleteAccount({ id: account.id })
              })
            )
          }}
        />
      ) : null}
      {tagDetail ? (
        <MobileFinanceTagDetailSheet
          tag={tagDetail}
          onClose={() => setTagDetail(null)}
          onEdit={() => {
            const tag = tagDetail
            setTagDetail(null)
            setTagSheet(tag)
          }}
          onDelete={() => {
            const tag = tagDetail
            setTagDetail(null)
            requestAnimationFrame(() =>
              state.confirmDelete(`Удалить тег «${tag.name}»?`, () => {
                api.deleteTag({ id: tag.id })
              })
            )
          }}
        />
      ) : null}
      {limitDetail ? (
        <MobileFinanceLimitDetailSheet
          limit={limitDetail}
          accounts={accounts}
          tags={tags}
          onClose={() => setLimitDetail(null)}
          onEdit={() => {
            const limit = limitDetail
            setLimitDetail(null)
            setLimitSheet(limit)
          }}
          onToggleState={() => {
            const limit = limitDetail
            setLimitDetail(null)
            requestAnimationFrame(() =>
              state.mutate(() => {
                api.setLimitState({
                  id: limit.id,
                  state: limit.state === 'active' ? 'paused' : 'active'
                })
              })
            )
          }}
          onDelete={() => {
            const limit = limitDetail
            setLimitDetail(null)
            requestAnimationFrame(() =>
              state.confirmDelete('Удалить лимит?', () => {
                api.deleteLimit({ id: limit.id })
              })
            )
          }}
        />
      ) : null}
      {form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
      {transactionSheet ? (
        <MobileFinanceTransactionSheet
          api={api}
          accounts={accounts}
          tags={tags}
          initialType={transactionSheet.type}
          transaction={transactionSheet.transaction}
          template={transactionSheet.template}
          onClose={() => setTransactionSheet(null)}
          onSaved={state.refresh}
        />
      ) : null}
      {templateSheet ? (
        <MobileFinanceTemplateSheet
          api={api}
          accounts={accounts}
          tags={tags}
          template={templateSheet === 'new' ? null : templateSheet}
          onClose={() => setTemplateSheet(null)}
          onSaved={state.refresh}
        />
      ) : null}
      {tagSheet ? (
        <MobileFinanceTagSheet
          api={api}
          tag={tagSheet === 'new' ? null : tagSheet}
          onClose={() => setTagSheet(null)}
          onSaved={state.refresh}
        />
      ) : null}
      {limitSheet ? (
        <MobileFinanceLimitSheet
          api={api}
          accounts={accounts}
          tags={tags}
          limit={limitSheet === 'new' ? null : limitSheet}
          onClose={() => setLimitSheet(null)}
          onSaved={state.refresh}
        />
      ) : null}
    </div>
  )
}
