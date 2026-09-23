import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppState, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import {
  Heart,
  KeyRound,
  MoreHorizontal,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon
} from 'lucide-react-native'
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
import { useConfirmation } from '../../shared/ui/ConfirmationProvider'
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

const PASSWORD_TABS: ReadonlyArray<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: 'items', label: 'Хранилище', icon: KeyRound },
  { id: 'favorites', label: 'Избранное', icon: Heart },
  { id: 'security', label: 'Безопасность', icon: ShieldCheck }
]

type IdleGlobal = typeof globalThis & {
  requestIdleCallback?: (callback: () => void) => number
}

function runWhenIdle(callback: () => void): void {
  const requestIdle = (globalThis as IdleGlobal).requestIdleCallback
  if (typeof requestIdle === 'function') {
    requestIdle(callback)
    return
  }
  setTimeout(callback, 0)
}

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
    <View
      style={{
        minWidth: 140,
        flexGrow: 1,
        flexBasis: '46%',
        minHeight: 76,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 14,
        backgroundColor: theme.surface
      }}
    >
      <Text style={{ color: theme.muted, fontSize: 10.5, lineHeight: 15 }}>{label}</Text>
      <Text
        style={{
          marginTop: 7,
          color: valueColor,
          fontSize: 20,
          lineHeight: 24,
          fontWeight: '700'
        }}
      >
        {value}
      </Text>
    </View>
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
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingTop: 12, paddingBottom: 48, gap: 16 }}
    >
      <View
        style={{
          gap: 14,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface,
          borderRadius: 18,
          padding: 18
        }}
      >
        <Label title>{status.initialized ? 'Хранилище заблокировано' : 'Защитите хранилище'}</Label>
        <Label muted>
          {status.initialized
            ? 'Введите мастер-пароль. Ключ существует только в памяти до блокировки приложения.'
            : 'Создайте мастер-пароль минимум из 12 символов. Он не сохраняется в открытом виде и не может быть восстановлен.'}
        </Label>
        <TextInput
          value={masterPassword}
          onChangeText={setMasterPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Мастер-пароль"
          placeholder="Мастер-пароль"
          placeholderTextColor={theme.muted}
          style={{
            minHeight: 52,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            backgroundColor: theme.raised,
            color: theme.text,
            paddingHorizontal: 14,
            fontSize: 16
          }}
        />
        {!status.initialized ? (
          <TextInput
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Повторите мастер-пароль"
            placeholder="Повторите мастер-пароль"
            placeholderTextColor={theme.muted}
            style={{
              minHeight: 52,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              backgroundColor: theme.raised,
              color: theme.text,
              paddingHorizontal: 14,
              fontSize: 16
            }}
          />
        ) : null}
        {error ? <ErrorState message={error} /> : null}
        <Button
          label={
            working ? 'Проверка…' : status.initialized ? 'Разблокировать' : 'Создать хранилище'
          }
          selected
          disabled={working}
          onPress={() => void submit()}
        />
      </View>
    </ScrollView>
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
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') lock()
    })
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
      await Linking.openURL(website)
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
    runWhenIdle(action)
  }

  if (!status.unlocked) {
    return <VaultGate api={api} status={status} unlocked={refresh} />
  }

  if (loading && !overview) return <LoadingState />
  if (!overview)
    return <ErrorState message={error || 'Не удалось открыть хранилище'} retry={refresh} />

  let content: React.JSX.Element
  if (tab === 'security') {
    content = (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96, gap: 16 }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <SecurityMetric label="Всего" value={securitySummary.total} />
          <SecurityMetric label="Слабые" value={securitySummary.weak} tone="danger" />
          <SecurityMetric label="Повторы" value={securitySummary.reused} tone="warning" />
          <SecurityMetric label="Старые" value={securitySummary.old} tone="warning" />
        </View>

        <View
          style={{
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 16,
            backgroundColor: theme.surface
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
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
            </View>
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
                Защита хранилища
              </Text>
              <Text style={{ marginTop: 3, color: theme.muted, fontSize: 11.5, lineHeight: 17 }}>
                Шифрование, автоблокировка и очистка скопированных секретов включены.
              </Text>
            </View>
          </View>
        </View>

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
                onPress={() => openItem(item)}
              />
            ))
        ) : (
          <EmptyState text="Проблем безопасности не найдено." />
        )}
      </ScrollView>
    )
  } else {
    content = (
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 96 }}>
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
                onPress={() => openItem(item)}
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
                              onPress: () => void copyField(item, 'username')
                            }
                          ]
                        : []),
                      {
                        key: 'copy-password',
                        label: 'Скопировать пароль',
                        icon: 'copy',
                        onPress: () => void copyField(item, 'password')
                      },
                      ...(item.website
                        ? [
                            {
                              key: 'website',
                              label: 'Открыть сайт',
                              icon: 'forward' as const,
                              onPress: () => void openWebsite(item)
                            }
                          ]
                        : []),
                      {
                        key: 'edit',
                        label: 'Изменить',
                        icon: 'edit',
                        onPress: () => openItem(item)
                      },
                      {
                        key: 'delete',
                        label: 'Удалить',
                        icon: 'delete',
                        danger: true,
                        onPress: () => deleteItem(item)
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
      </ScrollView>
    )
  }

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      <View style={{ gap: 10, paddingBottom: 12 }}>
        <SwipeTabBar
          items={PASSWORD_TABS}
          value={tab}
          onChange={changeTab}
          feedback={swipeTabFeedback}
          search={tab === 'security' ? undefined : { value: query, onChangeText: setQuery }}
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
              <View
                style={{
                  width: 1,
                  height: 26,
                  marginHorizontal: 2,
                  backgroundColor: theme.border
                }}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Фильтры. Группа: ${activeGroupLabel}`}
                accessibilityState={{ selected: filtersActive }}
                onPress={() => setFiltersOpen(true)}
                style={({ pressed }) => ({
                  position: 'relative',
                  flex: 1,
                  minWidth: 0,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor: filtersActive
                    ? theme.accent + '18'
                    : pressed
                      ? theme.raised
                      : 'transparent',
                  opacity: pressed ? 0.72 : 1
                })}
              >
                <SlidersHorizontal
                  size={19}
                  strokeWidth={filtersActive ? 2.4 : 2}
                  color={filtersActive ? theme.accent : theme.muted}
                />
                {filtersActive ? (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      top: 7,
                      right: 10,
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: theme.accent
                    }}
                  />
                ) : null}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Действия хранилища"
                onPress={() => setToolsOpen(true)}
                style={({ pressed }) => ({
                  flex: 1,
                  minWidth: 0,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor: pressed ? theme.raised : 'transparent',
                  opacity: pressed ? 0.72 : 1
                })}
              >
                <MoreHorizontal size={19} color={theme.muted} />
              </Pressable>
            </>
          }
        />

        {error ? <ErrorState message={error} retry={refresh} /> : null}
      </View>

      <SwipeableTabContent
        tabs={PASSWORD_TAB_IDS}
        value={tab}
        onChange={changeTab}
        onSwipeChange={showSwipeTabFeedback}
        disabled={loading}
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
            onPress: () => openItem()
          },
          {
            key: 'group',
            label: 'Новая группа',
            description: 'Создать группу для доступов',
            icon: 'folder',
            onPress: () => editGroup()
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
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24, gap: 12 }}>
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

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button
              label="Сбросить"
              icon="reset"
              onPress={() => {
                setGroupFilter(undefined)
                setTypeFilter('all')
                setIssueFilter('all')
              }}
            />
            <Button
              label="Группы"
              icon="folder"
              onPress={() => {
                setFiltersOpen(false)
                runWhenIdle(() => setGroupsOpen(true))
              }}
            />
          </View>
        </ScrollView>
      </AppDialog>

      <AppDialog
        open={toolsOpen}
        onOpenChange={setToolsOpen}
        title="Хранилище"
        description="Служебные действия"
        icon="passwords"
        presentation="sheet"
      >
        <View style={{ padding: 12, paddingBottom: 20, gap: 6 }}>
          <WorkspaceNodeCard
            title="Генератор паролей"
            subtitle="Создать стойкий пароль и скопировать его"
            leadingIcon="passwords"
            onPress={() => openTool(() => setGeneratorOpen(true))}
          />
          <WorkspaceNodeCard
            title="Сменить мастер-пароль"
            subtitle="Обновить ключ доступа к хранилищу"
            leadingIcon="edit"
            onPress={() => openTool(() => setChangeMasterOpen(true))}
          />
          <WorkspaceNodeCard
            title="Заблокировать"
            subtitle="Закрыть хранилище и очистить секрет из памяти"
            leadingIcon="close"
            onPress={() => openTool(lock)}
          />
        </View>
      </AppDialog>

      <AppDialog
        open={groupsOpen}
        onOpenChange={setGroupsOpen}
        title="Группы"
        description="Фильтр и управление группами хранилища"
        icon="folder"
        presentation="sheet"
      >
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
          <WorkspaceNodeCard
            title="Все записи"
            subtitle={`${overview.items.length} записей`}
            leadingIcon="passwords"
            selected={groupFilter === undefined}
            onPress={() => {
              setGroupFilter(undefined)
              setGroupsOpen(false)
            }}
          />
          <WorkspaceNodeCard
            title="Без группы"
            subtitle={`${overview.items.filter((item) => item.groupId === null).length} записей`}
            leadingIcon="folder"
            selected={groupFilter === null}
            onPress={() => {
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
              onPress={() => {
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
                      onPress: () => {
                        setGroupsOpen(false)
                        editGroup(group)
                      }
                    },
                    {
                      label: 'Удалить',
                      icon: 'delete',
                      danger: true,
                      onPress: () => {
                        setGroupsOpen(false)
                        deleteGroup(group)
                      }
                    }
                  ]}
                />
              }
            />
          ))}
          <View style={{ marginTop: 8, alignItems: 'flex-start' }}>
            <Button
              label="Новая группа"
              icon="add"
              primary
              onPress={() => {
                setGroupsOpen(false)
                editGroup()
              }}
            />
          </View>
        </ScrollView>
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
    </View>
  )
}
