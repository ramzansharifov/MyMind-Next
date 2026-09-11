import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppState, Linking, ScrollView, TextInput, View } from 'react-native'
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
import { ActionMenu } from '../../shared/ui/ActionMenu'
import { WorkspaceNodeCard } from '../../shared/ui/Workspace'
import { VisualIconBadge } from '../../shared/ui/VisualPickers'
import { GROUP_COLOR_CHOICES, PASSWORD_GROUP_ICON_CHOICES } from '../../shared/ui/visual-options'
import { useConfirmation } from '../../shared/ui/ConfirmationProvider'
import { useToast } from '../../shared/ui/ToastProvider'
import { colorField, iconField, messageFor, textField, type FormSpec } from '../../shared/ui/form-model'
import {
  Button,
  EmptyState,
  ErrorState,
  Label,
  LoadingState,
  Row,
  SearchField
} from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { ChangeMasterPasswordModal } from './ChangeMasterPasswordModal'
import { PasswordGeneratorModal } from './PasswordGeneratorModal'
import { PasswordItemEditor } from './PasswordItemEditor'
import { passwordClipboard } from './passwordClipboard'

type Tab = 'items' | 'favorites' | 'groups' | 'security'

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
  return [
    item.username,
    group,
    item.type === 'login' ? 'Логин' : 'Пароль',
    item.favorite ? 'Избранное' : '',
    ...item.securityIssues.map((issue) => securityLabels[issue])
  ]
    .filter(Boolean)
    .join(' · ')
}

export function PasswordsScreen(): React.JSX.Element {
  const { passwords: api } = useServices()
  const confirm = useConfirmation()
  const toast = useToast()
  const [status, setStatus] = useState<PasswordVaultStatus>(() => api.getPasswordVaultStatus())
  const [overview, setOverview] = useState<PasswordsOverview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('items')
  const [query, setQuery] = useState('')
  const [groupFilter, setGroupFilter] = useState<string | null | undefined>(undefined)
  const [form, setForm] = useState<FormSpec | null>(null)
  const [editingItem, setEditingItem] = useState<PasswordItemRecord | null | undefined>(undefined)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [changeMasterOpen, setChangeMasterOpen] = useState(false)

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
      if (!normalizedQuery) return true
      return `${item.title} ${item.username} ${item.website} ${item.tags.join(' ')}`
        .toLocaleLowerCase('ru-RU')
        .includes(normalizedQuery)
    })
  }, [groupFilter, overview, query, tab])

  if (!status.unlocked) {
    return <VaultGate api={api} status={status} unlocked={refresh} />
  }

  if (loading && !overview) return <LoadingState />
  if (!overview)
    return <ErrorState message={error || 'Не удалось открыть хранилище'} retry={refresh} />

  let content: React.JSX.Element
  if (tab === 'groups') {
    content = (
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ marginBottom: 12, alignItems: 'flex-start' }}>
          <Button label="+ Группа" selected onPress={() => editGroup()} />
        </View>
        {overview.groups.length ? (
          overview.groups.map((group) => (
            <WorkspaceNodeCard
              key={group.id}
              title={group.name}
              subtitle={`${overview.items.filter((item) => item.groupId === group.id).length} записей`}
              leading={<VisualIconBadge value={group.icon} colorKey={group.color} />}
              onPress={() => {
                setGroupFilter(group.id)
                setTab('items')
              }}
              action={
                <ActionMenu
                  title={group.name}
                  items={[
                    { label: 'Изменить', icon: 'edit', onPress: () => editGroup(group) },
                    {
                      label: 'Удалить',
                      icon: 'delete',
                      danger: true,
                      onPress: () => deleteGroup(group)
                    }
                  ]}
                />
              }
            />
          ))
        ) : (
          <EmptyState text="Групп пока нет." />
        )}
      </ScrollView>
    )
  } else if (tab === 'security') {
    content = (
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Row
          title={`${overview.security.total} записей`}
          subtitle={`${overview.security.weak} слабых · ${overview.security.reused} повторяющихся · ${overview.security.old} давно не менялись`}
        />
        {overview.security.issues.length ? (
          overview.security.issues.map((issue) => {
            const item = overview.items.find((candidate) => candidate.id === issue.itemId)
            return (
              <Row
                key={issue.itemId}
                title={issue.title}
                subtitle={[issue.username, ...issue.issues.map((value) => securityLabels[value])]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() => item && openItem(item)}
              />
            )
          })
        ) : (
          <EmptyState text="Проблем безопасности не найдено." />
        )}
      </ScrollView>
    )
  } else {
    content = (
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ alignItems: 'flex-start', marginBottom: 12 }}>
          <Button label="+ Запись" selected onPress={() => openItem()} />
        </View>
        {filteredItems.length ? (
          filteredItems.map((item) => (
            <WorkspaceNodeCard
              key={item.id}
              title={`${item.favorite ? '♥ ' : ''}${item.title}`}
              subtitle={itemSubtitle(item, overview)}
              leadingIcon="passwords"
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
                    { key: 'edit', label: 'Изменить', icon: 'edit', onPress: () => openItem(item) },
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
          ))
        ) : (
          <EmptyState
            text={tab === 'favorites' ? 'Избранных записей пока нет.' : 'Записей пока нет.'}
          />
        )}
      </ScrollView>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 10, paddingBottom: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {[
            { key: 'items' as const, label: 'Все' },
            { key: 'favorites' as const, label: 'Избранное' },
            { key: 'groups' as const, label: 'Группы' },
            { key: 'security' as const, label: 'Безопасность' }
          ].map((item) => (
            <Button
              key={item.key}
              label={item.label}
              selected={tab === item.key}
              onPress={() => setTab(item.key)}
            />
          ))}
        </ScrollView>

        {(tab === 'items' || tab === 'favorites') && (
          <>
            <SearchField value={query} onChangeText={setQuery} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              <Button
                label="Все группы"
                selected={groupFilter === undefined}
                onPress={() => setGroupFilter(undefined)}
              />
              <Button
                label="Без группы"
                selected={groupFilter === null}
                onPress={() => setGroupFilter(null)}
              />
              {overview.groups.map((group) => (
                <Button
                  key={group.id}
                  label={group.name}
                  selected={groupFilter === group.id}
                  onPress={() => setGroupFilter(group.id)}
                />
              ))}
            </ScrollView>
          </>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label="Генератор" onPress={() => setGeneratorOpen(true)} />
          <Button label="Сменить мастер-пароль" onPress={() => setChangeMasterOpen(true)} />
          <Button label="Заблокировать" onPress={lock} />
        </View>
        {error ? <ErrorState message={error} retry={refresh} /> : null}
      </View>

      <View style={{ flex: 1 }}>{content}</View>
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
