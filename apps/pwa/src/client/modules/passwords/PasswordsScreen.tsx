import { subscribePageHidden } from '../../../ui/lifecycle'
import { TextControl, openExternalUrl, Action } from '../../../ui/browser'
import { runAfterInteraction } from '../../shared/ui/run-after-interaction'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Heart,
  KeyRound,
  MoreHorizontal,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon
} from 'lucide-react'
import {
  type PasswordGroupRecord,
  type PasswordItemRecord,
  type PasswordItemSummary,
  type PasswordsOverview,
  type PasswordVaultStatus
} from '@mymind/contracts/passwords'
import {
  createPasswordGroupInputSchema,
  setupPasswordVaultInputSchema,
  unlockPasswordVaultInputSchema,
  updatePasswordGroupInputSchema
} from '@mymind/core/validation/passwords'
import type { PasswordsRepository } from '@mymind/persistence/passwords'
import { useServices } from '../../app/context'
import { FormSheet } from '../../shared/ui/FormSheet'
import { AppDialog } from '../../shared/ui/AppDialog'
import { AppSelect } from '../../shared/ui/FormControls'
import { ActionMenu } from '../../shared/ui/ActionMenu'
import { WorkspaceNodeCard } from '../../shared/ui/Workspace'
import { MobileCreateAction } from '../../shared/ui/MobileCreateAction'
import { VisualIconBadge } from '../../shared/ui/VisualPickers'
import { GROUP_COLOR_CHOICES, PASSWORD_GROUP_ICON_CHOICES } from '../../shared/ui/visual-options'
import { useConfirmation } from '../../shared/ui/confirmation-context'
import { useToast } from '../../shared/ui/toast-context'
import {
  colorField,
  iconField,
  messageFor,
  textField,
  type FormSpec
} from '../../shared/ui/form-model'
import { Button, EmptyState, ErrorState, Label, LoadingState } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { SwipeableTabContent } from '../../shared/ui/SwipeableTabContent'
import { SwipeTabBar } from '../../shared/ui/SwipeTabBar'
import { useSwipeTabFeedback } from '../../shared/ui/useSwipeTabFeedback'
import { ChangeMasterPasswordModal } from './ChangeMasterPasswordModal'
import { PasswordGeneratorModal } from './PasswordGeneratorModal'
import { PasswordItemEditor } from './PasswordItemEditor'
import { passwordClipboard } from './passwordClipboard'
type Tab = 'items' | 'favorites' | 'security'
const PASSWORD_TAB_IDS = ['items', 'favorites', 'security'] as const
const PASSWORD_TABS: ReadonlyArray<{
  id: Tab
  label: string
  icon: LucideIcon
}> = [
  { id: 'items', label: 'Хранилище', icon: KeyRound },
  { id: 'favorites', label: 'Избранное', icon: Heart },
  { id: 'security', label: 'Безопасность', icon: ShieldCheck }
]
function SecurityMetric({
  label,
  value,
  tone = 'default'
}: {
  label: string
  value: number
  tone?: 'default' | 'warning' | 'danger'
}): React.JSX.Element {
  const theme = useTheme()
  const valueColor = tone === 'danger' ? theme.error : tone === 'warning' ? '#fbbf24' : theme.text
  return (
    <div
      className="ui-stack"
      style={{
        minWidth: 140,
        flexGrow: 1,
        flexBasis: '46%',
        minHeight: 76,
        paddingInline: 12,
        paddingBlock: 10,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 14,
        backgroundColor: theme.surface
      }}
    >
      <span
        className="ui-text"
        style={{
          color: theme.muted,
          fontSize: 10.5,
          lineHeight: '15px'
        }}
      >
        {label}
      </span>
      <span
        className="ui-text"
        style={{
          marginTop: 7,
          color: valueColor,
          fontSize: 20,
          lineHeight: '24px',
          fontWeight: 700
        }}
      >
        {value}
      </span>
    </div>
  )
}
const securityLabels = {
  weak: 'Слабый пароль',
  reused: 'Повторно используется',
  old: 'Давно не менялся'
} as const
function VaultGate({
  api,
  status,
  unlocked
}: {
  api: PasswordsRepository
  status: PasswordVaultStatus
  unlocked(): void
}): React.JSX.Element {
  const theme = useTheme()
  const [masterPassword, setMasterPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const submit = async (): Promise<void> => {
    if (working) return
    setWorking(true)
    try {
      if (!status.initialized) {
        if (masterPassword !== confirmation) throw new Error('Мастер-пароли не совпадают')
        await api.setupPasswordVault(setupPasswordVaultInputSchema.parse({ masterPassword }))
      } else {
        await api.unlockPasswordVault(unlockPasswordVaultInputSchema.parse({ masterPassword }))
      }
      setMasterPassword('')
      setConfirmation('')
      setError('')
      unlocked()
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setWorking(false)
    }
  }
  return (
    <div className="ui-scroll">
      <div
        className="ui-stack ui-scroll-content"
        style={{
          paddingTop: 12,
          paddingBottom: 48,
          gap: 16
        }}
      >
        <div
          className="ui-stack"
          style={{
            gap: 14,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            borderRadius: 18,
            padding: 18
          }}
        >
          <Label title>
            {status.initialized ? 'Хранилище заблокировано' : 'Защитите хранилище'}
          </Label>
          <Label muted>
            {status.initialized
              ? 'Введите мастер-пароль. Ключ существует только в памяти до блокировки приложения.'
              : 'Создайте мастер-пароль минимум из 12 символов. Он не сохраняется в открытом виде и не может быть восстановлен.'}
          </Label>
          <TextControl
            value={masterPassword}
            onValueChange={setMasterPassword}
            type={'password'}
            autoCapitalize={'none'}
            autoCorrect={'off'}
            aria-label={'Мастер-пароль'}
            placeholder={'Мастер-пароль'}
            placeholderColor={theme.muted}
            style={{
              minHeight: 52,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              backgroundColor: theme.raised,
              color: theme.text,
              paddingInline: 14,
              fontSize: 16
            }}
          ></TextControl>
          {!status.initialized ? (
            <TextControl
              value={confirmation}
              onValueChange={setConfirmation}
              type={'password'}
              autoCapitalize={'none'}
              autoCorrect={'off'}
              aria-label={'Повторите мастер-пароль'}
              placeholder={'Повторите мастер-пароль'}
              placeholderColor={theme.muted}
              style={{
                minHeight: 52,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                backgroundColor: theme.raised,
                color: theme.text,
                paddingInline: 14,
                fontSize: 16
              }}
            ></TextControl>
          ) : null}
          {error ? <ErrorState message={error} /> : null}
          <Button
            label={
              working ? 'Проверка…' : status.initialized ? 'Разблокировать' : 'Создать хранилище'
            }
            selected
            disabled={working}
            onClick={() => void submit()}
          />
        </div>
      </div>
    </div>
  )
}
function itemSubtitle(item: PasswordItemSummary, overview: PasswordsOverview): string {
  const group = overview.groups.find((candidate) => candidate.id === item.groupId)?.name
  return [item.username, group, item.type === 'login' ? 'Логин' : 'Пароль']
    .filter(Boolean)
    .join(' · ')
}
export function PasswordsScreen(): React.JSX.Element {
  const { passwords: api } = useServices()
  const confirm = useConfirmation()
  const toast = useToast()
  const theme = useTheme()
  const [status, setStatus] = useState<PasswordVaultStatus>(() => api.getPasswordVaultStatus())
  const [overview, setOverview] = useState<PasswordsOverview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('items')
  const [query, setQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState<string | null | undefined>(undefined)
  const [typeFilter, setTypeFilter] = useState<'all' | 'login' | 'password'>('all')
  const [issueFilter, setIssueFilter] = useState<'all' | 'weak' | 'reused' | 'old'>('all')
  const [form, setForm] = useState<FormSpec | null>(null)
  const [editingItem, setEditingItem] = useState<PasswordItemRecord | null | undefined>(undefined)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [changeMasterOpen, setChangeMasterOpen] = useState(false)
  const [groupsOpen, setGroupsOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [swipeTabFeedback, showSwipeTabFeedback] = useSwipeTabFeedback<Tab>()
  const [searchOpen, setSearchOpen] = useState(false)
  const changeTab = useCallback(
    (next: Tab): void => {
      if (next === tab) return
      setTab(next)
    },
    [tab]
  )
  const refresh = useCallback((): void => {
    setLoading(true)
    try {
      const nextStatus = api.getPasswordVaultStatus()
      setStatus(nextStatus)
      setOverview(nextStatus.unlocked ? api.listPasswordsOverview() : null)
      setError('')
    } catch (reason) {
      setOverview(null)
      setError(messageFor(reason))
    } finally {
      setLoading(false)
    }
  }, [api])
  const lock = useCallback((): void => {
    api.lockPasswordVault()
    setStatus(api.getPasswordVaultStatus())
    setOverview(null)
    setEditingItem(undefined)
    setGeneratorOpen(false)
    setChangeMasterOpen(false)
    setGroupsOpen(false)
    setFiltersOpen(false)
    setToolsOpen(false)
    setForm(null)
    void passwordClipboard.clearTracked()
  }, [api])
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) refresh()
    })
    const subscription = subscribePageHidden(lock)
    return () => {
      active = false
      subscription.remove()
      api.lockPasswordVault()
      void passwordClipboard.clearTracked()
    }
  }, [api, lock, refresh])
  const openItem = (summary?: PasswordItemSummary): void => {
    try {
      setEditingItem(summary ? api.getPasswordItem(summary.id) : null)
      setError('')
    } catch (reason) {
      setError(messageFor(reason))
    }
  }
  const editGroup = (group?: PasswordGroupRecord): void => {
    setForm({
      title: group ? 'Изменить группу' : 'Новая группа',
      initial: {
        name: group?.name ?? '',
        icon: group?.icon ?? 'folder',
        color: group?.color ?? 'violet'
      },
      fields: [
        textField('name', 'Название'),
        iconField('icon', 'Иконка', PASSWORD_GROUP_ICON_CHOICES, 'password'),
        colorField('color', 'Цвет', GROUP_COLOR_CHOICES)
      ],
      preview: {
        titleKey: 'name',
        iconKey: 'icon',
        colorKey: 'color',
        iconFamily: 'password',
        description: 'Так группа будет выглядеть в хранилище.'
      },
      save: (values) => {
        if (group)
          api.updatePasswordGroup(updatePasswordGroupInputSchema.parse({ ...values, id: group.id }))
        else api.createPasswordGroup(createPasswordGroupInputSchema.parse(values))
        refresh()
      }
    })
  }
  const copyField = async (
    item: PasswordItemSummary,
    field: 'username' | 'password'
  ): Promise<void> => {
    try {
      const record = api.getPasswordItem(item.id)
      const value = field === 'username' ? record.username : record.password
      if (!value) throw new Error(field === 'username' ? 'Логин не указан' : 'Пароль не указан')
      await passwordClipboard.copy(value)
      setError('')
      toast.success(field === 'username' ? 'Логин скопирован' : 'Пароль скопирован')
    } catch (reason) {
      setError(messageFor(reason))
    }
  }
  const openWebsite = async (item: PasswordItemSummary): Promise<void> => {
    try {
      const website = api.getPasswordItem(item.id).website
      if (!/^https?:\/\//i.test(website)) throw new Error('Некорректный адрес сайта')
      await openExternalUrl(website)
      setError('')
    } catch (reason) {
      setError(messageFor(reason))
    }
  }
  const deleteGroup = (group: PasswordGroupRecord): void => {
    void confirm({
      title: `Удалить группу «${group.name}»?`,
      description: 'Записи группы сохранятся, но группа будет удалена.',
      tone: 'danger',
      onConfirm: () => {
        try {
          api.deletePasswordGroup({ id: group.id })
          if (groupFilter === group.id) setGroupFilter(undefined)
          refresh()
          toast.success('Группа удалена')
        } catch (reason) {
          setError(messageFor(reason))
          throw reason
        }
      }
    })
  }
  const deleteItem = (item: PasswordItemSummary): void => {
    void confirm({
      title: `Удалить запись «${item.title}»?`,
      description: 'Запись и сохранённые в ней данные будут удалены.',
      tone: 'danger',
      onConfirm: () => {
        try {
          api.deletePasswordItem({ id: item.id })
          refresh()
          toast.success('Запись удалена')
        } catch (reason) {
          setError(messageFor(reason))
          throw reason
        }
      }
    })
  }
  const filteredItems = useMemo(() => {
    if (!overview) return []
    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')
    return overview.items.filter((item) => {
      if (tab === 'favorites' && !item.favorite) return false
      if (groupFilter !== undefined && item.groupId !== groupFilter) return false
      if (typeFilter !== 'all' && item.type !== typeFilter) return false
      if (issueFilter !== 'all' && !item.securityIssues.includes(issueFilter)) return false
      if (!normalizedQuery) return true
      return `${item.title} ${item.username} ${item.website} ${item.tags.join(' ')}`
        .toLocaleLowerCase('ru-RU')
        .includes(normalizedQuery)
    })
  }, [groupFilter, issueFilter, overview, query, tab, typeFilter])
  const groupScopedItems = useMemo(() => {
    if (!overview) return []
    return overview.items.filter((item) => {
      if (groupFilter === null) return item.groupId === null
      if (typeof groupFilter === 'string') return item.groupId === groupFilter
      return true
    })
  }, [groupFilter, overview])
  const securitySummary = useMemo(
    () => ({
      total: groupScopedItems.length,
      weak: groupScopedItems.filter((item) => item.securityIssues.includes('weak')).length,
      reused: groupScopedItems.filter((item) => item.securityIssues.includes('reused')).length,
      old: groupScopedItems.filter((item) => item.securityIssues.includes('old')).length
    }),
    [groupScopedItems]
  )
  const activeGroupLabel =
    groupFilter === undefined
      ? 'Все записи'
      : groupFilter === null
        ? 'Без группы'
        : (overview?.groups.find((group) => group.id === groupFilter)?.name ?? 'Группа')
  const filtersActive =
    groupFilter !== undefined ||
    (tab !== 'security' && (typeFilter !== 'all' || issueFilter !== 'all'))
  const groupSelectValue =
    groupFilter === undefined ? '__all__' : groupFilter === null ? '__none__' : groupFilter
  const openTool = (action: () => void): void => {
    setToolsOpen(false)
    runAfterInteraction(action)
  }
  if (!status.unlocked) {
    return <VaultGate api={api} status={status} unlocked={refresh} />
  }
  if (loading && !overview) return <LoadingState />
  if (!overview)
    return <ErrorState message={error || 'Не удалось открыть хранилище'} retry={refresh} />
  const tabHeader = (
    <>
      <div
        className="ui-stack"
        style={{
          gap: 10,
          paddingBottom: 12
        }}
      >
        <SwipeTabBar
          items={PASSWORD_TABS}
          value={tab}
          onChange={changeTab}
          feedback={swipeTabFeedback}
          search={tab === 'security' ? undefined : { value: query, onValueChange: setQuery }}
          onSearchOpenChange={setSearchOpen}
          renderIcon={(item, selected) => {
            const Icon = item.icon
            return (
              <Icon
                size={19}
                strokeWidth={selected ? 2.4 : 2}
                color={selected ? theme.accent : theme.muted}
              />
            )
          }}
          trailing={
            <>
              <div
                className="ui-stack"
                style={{
                  width: 1,
                  height: 26,
                  marginInline: 2,
                  backgroundColor: theme.border
                }}
              ></div>

              <Action
                role={'button'}
                aria-label={`Фильтры. Группа: ${activeGroupLabel}`}
                aria-selected={filtersActive}
                onClick={() => setFiltersOpen(true)}
                style={{
                  position: 'relative',
                  flex: '1 1 0%',
                  minWidth: 0,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor: filtersActive ? theme.accent + '18' : 'transparent',
                  opacity: 1
                }}
                pressedStyle={{
                  backgroundColor: filtersActive ? theme.accent + '18' : theme.raised,
                  opacity: 0.72
                }}
              >
                <SlidersHorizontal
                  size={19}
                  strokeWidth={filtersActive ? 2.4 : 2}
                  color={filtersActive ? theme.accent : theme.muted}
                />
                {filtersActive ? (
                  <div
                    className="ui-stack"
                    style={{
                      position: 'absolute',
                      top: 7,
                      right: 10,
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: theme.accent,
                      pointerEvents: 'none'
                    }}
                  ></div>
                ) : null}
              </Action>

              <Action
                role={'button'}
                aria-label={'Действия хранилища'}
                onClick={() => setToolsOpen(true)}
                style={{
                  flex: '1 1 0%',
                  minWidth: 0,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor: 'transparent',
                  opacity: 1
                }}
                pressedStyle={{
                  backgroundColor: theme.raised,
                  opacity: 0.72
                }}
              >
                <MoreHorizontal size={19} color={theme.muted} />
              </Action>
            </>
          }
        />

        {error ? <ErrorState message={error} retry={refresh} /> : null}
      </div>
    </>
  )
  let content: React.JSX.Element
  if (tab === 'security') {
    content = (
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 96,
            gap: 16
          }}
        >
          {tabHeader}
          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8
            }}
          >
            <SecurityMetric label="Всего" value={securitySummary.total} />
            <SecurityMetric label="Слабые" value={securitySummary.weak} tone="danger" />
            <SecurityMetric label="Повторы" value={securitySummary.reused} tone="warning" />
            <SecurityMetric label="Старые" value={securitySummary.old} tone="warning" />
          </div>

          <div
            className="ui-stack"
            style={{
              padding: 14,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 16,
              backgroundColor: theme.surface
            }}
          >
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10
              }}
            >
              <div
                className="ui-stack"
                style={{
                  width: 36,
                  height: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor: theme.accent + '10'
                }}
              >
                <ShieldCheck size={17} color={theme.accent} />
              </div>
              <div
                className="ui-stack"
                style={{
                  minWidth: 0,
                  flex: '1 1 0%'
                }}
              >
                <span
                  className="ui-text"
                  style={{
                    color: theme.text,
                    fontSize: 14,
                    fontWeight: 700
                  }}
                >
                  Защита хранилища
                </span>
                <span
                  className="ui-text"
                  style={{
                    marginTop: 3,
                    color: theme.muted,
                    fontSize: 11.5,
                    lineHeight: '17px'
                  }}
                >
                  Шифрование, автоблокировка и очистка скопированных секретов включены.
                </span>
              </div>
            </div>
          </div>

          {groupScopedItems.some((item) => item.securityIssues.length > 0) ? (
            groupScopedItems
              .filter((item) => item.securityIssues.length > 0)
              .map((item) => (
                <WorkspaceNodeCard
                  key={item.id}
                  title={item.title}
                  subtitle={[
                    item.username,
                    ...item.securityIssues.map((value) => securityLabels[value])
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  leadingIcon="info"
                  onClick={() => openItem(item)}
                />
              ))
          ) : (
            <EmptyState text="Проблем безопасности не найдено." />
          )}
        </div>
      </div>
    )
  } else {
    content = (
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 96
          }}
        >
          {tabHeader}
          {filteredItems.length ? (
            filteredItems.map((item) => {
              const itemGroup = item.groupId
                ? (overview.groups.find((candidate) => candidate.id === item.groupId) ?? null)
                : null
              return (
                <WorkspaceNodeCard
                  key={item.id}
                  title={item.title}
                  subtitle={itemSubtitle(item, overview)}
                  leading={
                    itemGroup ? (
                      <VisualIconBadge value={itemGroup.icon} colorKey={itemGroup.color} />
                    ) : undefined
                  }
                  leadingIcon={itemGroup ? undefined : 'passwords'}
                  onClick={() => openItem(item)}
                  action={
                    <ActionMenu
                      title={item.title}
                      items={[
                        ...(item.username
                          ? [
                              {
                                key: 'copy-login',
                                label: 'Скопировать логин',
                                icon: 'copy' as const,
                                onClick: () => void copyField(item, 'username')
                              }
                            ]
                          : []),
                        {
                          key: 'copy-password',
                          label: 'Скопировать пароль',
                          icon: 'copy',
                          onClick: () => void copyField(item, 'password')
                        },
                        ...(item.website
                          ? [
                              {
                                key: 'website',
                                label: 'Открыть сайт',
                                icon: 'forward' as const,
                                onClick: () => void openWebsite(item)
                              }
                            ]
                          : []),
                        {
                          key: 'edit',
                          label: 'Изменить',
                          icon: 'edit',
                          onClick: () => openItem(item)
                        },
                        {
                          key: 'delete',
                          label: 'Удалить',
                          icon: 'delete',
                          danger: true,
                          onClick: () => deleteItem(item)
                        }
                      ]}
                    />
                  }
                />
              )
            })
          ) : (
            <EmptyState
              text={tab === 'favorites' ? 'Избранных записей пока нет.' : 'Записей пока нет.'}
            />
          )}
        </div>
      </div>
    )
  }
  return (
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%',
        minHeight: 0
      }}
    >
      {null}

      <SwipeableTabContent
        tabs={PASSWORD_TAB_IDS}
        value={tab}
        onChange={changeTab}
        onSwipeChange={showSwipeTabFeedback}
        disabled={loading || searchOpen}
      >
        {content}
      </SwipeableTabContent>
      <MobileCreateAction
        iconOnly
        actions={[
          {
            key: 'item',
            label: 'Новая запись',
            description: 'Добавить логин или пароль',
            icon: 'passwords',
            onClick: () => openItem()
          },
          {
            key: 'group',
            label: 'Новая группа',
            description: 'Создать группу для доступов',
            icon: 'folder',
            onClick: () => editGroup()
          }
        ]}
      />
      <AppDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Фильтры"
        description="Оставьте на экране только нужные записи"
        icon="search"
        presentation="sheet"
      >
        <div className="ui-scroll">
          <div
            className="ui-stack ui-scroll-content"
            style={{
              padding: 12,
              paddingBottom: 24,
              gap: 12
            }}
          >
            <AppSelect
              label="Группа"
              value={groupSelectValue}
              choices={[
                { value: '__all__', label: 'Все записи' },
                { value: '__none__', label: 'Без группы' },
                ...overview.groups.map((group) => ({ value: group.id, label: group.name }))
              ]}
              onChange={(value) => {
                if (value === '__all__') setGroupFilter(undefined)
                else if (value === '__none__') setGroupFilter(null)
                else setGroupFilter(value)
              }}
            />

            {tab !== 'security' ? (
              <>
                <AppSelect
                  label="Тип записи"
                  value={typeFilter}
                  choices={[
                    { value: 'all', label: 'Все типы' },
                    { value: 'login', label: 'Логин' },
                    { value: 'password', label: 'Пароль' }
                  ]}
                  onChange={(value) =>
                    setTypeFilter(value === 'login' || value === 'password' ? value : 'all')
                  }
                />
                <AppSelect
                  label="Безопасность"
                  value={issueFilter}
                  choices={[
                    { value: 'all', label: 'Любая безопасность' },
                    { value: 'weak', label: 'Слабые' },
                    { value: 'reused', label: 'Повторяющиеся' },
                    { value: 'old', label: 'Старые пароли' }
                  ]}
                  onChange={(value) =>
                    setIssueFilter(
                      value === 'weak' || value === 'reused' || value === 'old' ? value : 'all'
                    )
                  }
                />
              </>
            ) : null}

            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              <Button
                label="Сбросить"
                icon="reset"
                onClick={() => {
                  setGroupFilter(undefined)
                  setTypeFilter('all')
                  setIssueFilter('all')
                }}
              />
              <Button
                label="Группы"
                icon="folder"
                onClick={() => {
                  setFiltersOpen(false)
                  runAfterInteraction(() => setGroupsOpen(true))
                }}
              />
            </div>
          </div>
        </div>
      </AppDialog>

      <AppDialog
        open={toolsOpen}
        onOpenChange={setToolsOpen}
        title="Хранилище"
        description="Служебные действия"
        icon="passwords"
        presentation="sheet"
      >
        <div
          className="ui-stack"
          style={{
            padding: 12,
            paddingBottom: 20,
            gap: 6
          }}
        >
          <WorkspaceNodeCard
            title="Генератор паролей"
            subtitle="Создать стойкий пароль и скопировать его"
            leadingIcon="passwords"
            onClick={() => openTool(() => setGeneratorOpen(true))}
          />
          <WorkspaceNodeCard
            title="Сменить мастер-пароль"
            subtitle="Обновить ключ доступа к хранилищу"
            leadingIcon="edit"
            onClick={() => openTool(() => setChangeMasterOpen(true))}
          />
          <WorkspaceNodeCard
            title="Заблокировать"
            subtitle="Закрыть хранилище и очистить секрет из памяти"
            leadingIcon="close"
            onClick={() => openTool(lock)}
          />
        </div>
      </AppDialog>

      <AppDialog
        open={groupsOpen}
        onOpenChange={setGroupsOpen}
        title="Группы"
        description="Фильтр и управление группами хранилища"
        icon="folder"
        presentation="sheet"
      >
        <div className="ui-scroll">
          <div
            className="ui-stack ui-scroll-content"
            style={{
              padding: 12,
              paddingBottom: 24
            }}
          >
            <WorkspaceNodeCard
              title="Все записи"
              subtitle={`${overview.items.length} записей`}
              leadingIcon="passwords"
              selected={groupFilter === undefined}
              onClick={() => {
                setGroupFilter(undefined)
                setGroupsOpen(false)
              }}
            />
            <WorkspaceNodeCard
              title="Без группы"
              subtitle={`${overview.items.filter((item) => item.groupId === null).length} записей`}
              leadingIcon="folder"
              selected={groupFilter === null}
              onClick={() => {
                setGroupFilter(null)
                setGroupsOpen(false)
              }}
            />
            {overview.groups.map((group) => (
              <WorkspaceNodeCard
                key={group.id}
                title={group.name}
                subtitle={`${overview.items.filter((item) => item.groupId === group.id).length} записей`}
                leading={<VisualIconBadge value={group.icon} colorKey={group.color} />}
                selected={groupFilter === group.id}
                onClick={() => {
                  setGroupFilter(group.id)
                  setGroupsOpen(false)
                }}
                action={
                  <ActionMenu
                    title={group.name}
                    items={[
                      {
                        label: 'Изменить',
                        icon: 'edit',
                        onClick: () => {
                          setGroupsOpen(false)
                          editGroup(group)
                        }
                      },
                      {
                        label: 'Удалить',
                        icon: 'delete',
                        danger: true,
                        onClick: () => {
                          setGroupsOpen(false)
                          deleteGroup(group)
                        }
                      }
                    ]}
                  />
                }
              />
            ))}
            <div
              className="ui-stack"
              style={{
                marginTop: 8,
                alignItems: 'flex-start'
              }}
            >
              <Button
                label="Новая группа"
                icon="add"
                primary
                onClick={() => {
                  setGroupsOpen(false)
                  editGroup()
                }}
              />
            </div>
          </div>
        </div>
      </AppDialog>
      {form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
      {editingItem !== undefined ? (
        <PasswordItemEditor
          api={api}
          groups={overview.groups}
          item={editingItem ?? undefined}
          close={() => setEditingItem(undefined)}
          saved={refresh}
          copy={passwordClipboard.copy}
        />
      ) : null}
      {generatorOpen ? (
        <PasswordGeneratorModal
          generate={api.generatePassword}
          close={() => setGeneratorOpen(false)}
          copy={passwordClipboard.copy}
        />
      ) : null}
      {changeMasterOpen ? (
        <ChangeMasterPasswordModal
          api={api}
          close={() => setChangeMasterOpen(false)}
          changed={refresh}
        />
      ) : null}
    </div>
  )
}
