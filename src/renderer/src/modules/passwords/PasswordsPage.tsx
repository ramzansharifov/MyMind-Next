import { Tooltip } from '../../shared/ui/tooltip'
import * as Popover from '@radix-ui/react-popover'
import {
  ClipboardCopy,
  FolderPlus,
  Heart,
  Inbox,
  KeyRound,
  LockKeyhole,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  ShieldCheck,
  Star,
  Trash2,
  UserRound,
  X
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type {
  CreatePasswordGroupInput,
  CreatePasswordItemInput,
  PasswordGroupRecord,
  PasswordItemRecord,
  PasswordItemSummary,
  PasswordItemType,
  PasswordSecurityIssue,
  PasswordVaultStatus,
  UpdatePasswordGroupInput,
  UpdatePasswordItemInput
} from '../../../../shared/contracts/passwords'
import { cn } from '../../shared/lib/cn'
import { AppSelect } from '../../shared/ui/AppSelect'
import { DeleteConfirmationDialog } from '../../shared/ui/DeleteConfirmationDialog'
import { ModuleHeader } from '../../shared/ui/ModuleHeader'
import { StandardModulePage } from '../../shared/ui/StandardModulePage'
import { passwordsClient } from './api/passwords-client'
import { ChangeMasterPasswordDialog } from './components/ChangeMasterPasswordDialog'
import { PasswordDetailDialog } from './components/PasswordDetailDialog'
import { PasswordGroupDialog } from './components/PasswordGroupDialog'
import { PasswordItemDialog } from './components/PasswordItemDialog'
import {
  PASSWORD_TYPE_OPTIONS,
  PasswordGroupIconGlyph,
  passwordGroupColorClasses,
  passwordIssueClassName,
  passwordIssueLabel,
  passwordStrengthClassName,
  passwordStrengthLabel,
  passwordTypeLabel
} from './password-options'

type PasswordView = 'all' | 'favorites' | 'security'
type PasswordGroupFilter = 'all' | 'ungrouped' | string
type PasswordTypeFilter = 'all' | PasswordItemType
type PasswordIssueFilter = 'all' | PasswordSecurityIssue

interface PasswordsPageProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

const AUTO_LOCK_MS = 5 * 60 * 1000
let mountedPasswordPages = 0

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Не удалось выполнить действие'
}

function VaultGate({
  initialized,
  busy,
  error,
  onSetup,
  onUnlock
}: {
  initialized: boolean
  busy: boolean
  error: string | null
  onSetup: (masterPassword: string) => Promise<void>
  onUnlock: (masterPassword: string) => Promise<void>
}): React.JSX.Element {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  const setupValid = password.length >= 12 && password === confirmation
  const unlockValid = password.length > 0

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (busy || (initialized ? !unlockValid : !setupValid)) return
    await (initialized ? onUnlock(password) : onSetup(password))
    setPassword('')
    setConfirmation('')
  }

  return (
    <StandardModulePage contentClassName="flex min-h-full items-center justify-center">
      <section className="relative isolate w-full max-w-xl overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] p-7 shadow-[var(--app-shadow-card)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 right-0 -z-10 size-72 rounded-full bg-violet-500/12 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 -left-20 -z-10 size-72 rounded-full bg-violet-900/10 blur-3xl"
        />

        <span className="flex size-14 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-300 shadow-inner shadow-violet-500/5">
          {initialized ? <LockKeyhole className="size-7" /> : <ShieldCheck className="size-7" />}
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-[var(--app-text)]">
          {initialized ? 'Хранилище заблокировано' : 'Настройте хранилище паролей'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--app-muted)]">
          {initialized
            ? 'Введите мастер-пароль. Он используется только для открытия локального зашифрованного хранилища.'
            : 'Создайте отдельный мастер-пароль. Он не сохраняется в открытом виде и потребуется для доступа к записям.'}
        </p>

        <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[var(--app-muted)]">Мастер-пароль</span>
            <input
              autoFocus
              type="password"
              value={password}
              minLength={initialized ? 1 : 12}
              maxLength={256}
              autoComplete={initialized ? 'current-password' : 'new-password'}
              placeholder={initialized ? 'Введите мастер-пароль' : 'Минимум 12 символов'}
              className="h-12 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {!initialized && (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-[var(--app-muted)]">
                Повторите мастер-пароль
              </span>
              <input
                type="password"
                value={confirmation}
                autoComplete="new-password"
                className="h-12 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
                onChange={(event) => setConfirmation(event.target.value)}
              />
              {confirmation && password !== confirmation && (
                <span className="block text-xs text-amber-300">Пароли не совпадают.</span>
              )}
            </label>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {!initialized && (
            <div className="rounded-xl border border-amber-400/15 bg-amber-500/[0.06] px-4 py-3 text-xs leading-5 text-amber-100/80">
              Если мастер-пароль будет утерян, расшифровать записи без него нельзя. Сохраните его в
              надёжном месте.
            </div>
          )}

          <button
            type="submit"
            disabled={busy || (initialized ? !unlockValid : !setupValid)}
            className="h-11 w-full rounded-xl bg-violet-500 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? 'Проверяем…' : initialized ? 'Разблокировать' : 'Создать хранилище'}
          </button>
        </form>
      </section>
    </StandardModulePage>
  )
}

export function PasswordsPage({
  resourceId,
  onResourceHandled
}: PasswordsPageProps): React.JSX.Element {
  const [vaultStatus, setVaultStatus] = useState<PasswordVaultStatus | null>(null)
  const [groups, setGroups] = useState<PasswordGroupRecord[]>([])
  const [items, setItems] = useState<PasswordItemSummary[]>([])
  const [view, setView] = useState<PasswordView>('all')
  const [groupFilter, setGroupFilter] = useState<PasswordGroupFilter>('all')
  const [typeFilter, setTypeFilter] = useState<PasswordTypeFilter>('all')
  const [issueFilter, setIssueFilter] = useState<PasswordIssueFilter>('all')
  const [query, setQuery] = useState('')
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PasswordItemRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<PasswordItemRecord | null>(null)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<PasswordGroupRecord | null>(null)
  const [changeMasterOpen, setChangeMasterOpen] = useState(false)
  const [deleteItemTarget, setDeleteItemTarget] = useState<PasswordItemSummary | null>(null)
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<PasswordGroupRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handledResourceIdRef = useRef<string | null>(null)
  const lastActivityRef = useRef(Date.now())

  const loadOverview = useCallback(async (): Promise<void> => {
    try {
      const overview = await passwordsClient.listOverview()
      setGroups(overview.groups)
      setItems(overview.items)
      setError(null)
    } catch (reason) {
      const message = errorMessage(reason)
      setError(message)
      if (message.includes('заблокировано')) {
        setVaultStatus((current) => (current ? { ...current, unlocked: false } : current))
        setGroups([])
        setItems([])
      }
    }
  }, [])

  useEffect(() => {
    mountedPasswordPages += 1
    return () => {
      mountedPasswordPages -= 1
      window.setTimeout(() => {
        if (mountedPasswordPages === 0) void passwordsClient.lockVault()
      }, 0)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      void passwordsClient
        .getVaultStatus()
        .then(async (status) => {
          if (cancelled) return
          setVaultStatus(status)
          if (status.unlocked) await loadOverview()
        })
        .catch((reason) => {
          if (!cancelled) setError(errorMessage(reason))
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false)
        })
    })
    return () => {
      cancelled = true
    }
  }, [loadOverview])

  useEffect(() => {
    if (!vaultStatus?.unlocked) return
    lastActivityRef.current = Date.now()
    const markActivity = (): void => {
      lastActivityRef.current = Date.now()
    }
    const interval = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current < AUTO_LOCK_MS) return
      void passwordsClient.lockVault().then((status) => {
        setVaultStatus(status)
        setGroups([])
        setItems([])
        setSelectedItem(null)
        setEditingItem(null)
        setDetailOpen(false)
        setItemDialogOpen(false)
      })
    }, 15_000)
    window.addEventListener('pointerdown', markActivity)
    window.addEventListener('keydown', markActivity)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('pointerdown', markActivity)
      window.removeEventListener('keydown', markActivity)
    }
  }, [vaultStatus?.unlocked])

  useEffect(() => {
    if (!resourceId) {
      handledResourceIdRef.current = null
      return
    }
    if (!vaultStatus?.unlocked || handledResourceIdRef.current === resourceId) return
    handledResourceIdRef.current = resourceId
    if (items.some((item) => item.id === resourceId)) {
      void openItem(resourceId)
    }
    onResourceHandled?.()
  }, [items, onResourceHandled, resourceId, vaultStatus?.unlocked])

  const groupById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups])
  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>()
    let ungrouped = 0
    for (const item of items) {
      if (item.groupId === null) ungrouped += 1
      else counts.set(item.groupId, (counts.get(item.groupId) ?? 0) + 1)
    }
    return { counts, ungrouped }
  }, [items])

  const baseFilteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru-RU')
    return items.filter((item) => {
      if (groupFilter === 'ungrouped' && item.groupId !== null) return false
      if (groupFilter !== 'all' && groupFilter !== 'ungrouped' && item.groupId !== groupFilter) {
        return false
      }
      if (typeFilter !== 'all' && item.type !== typeFilter) return false
      if (issueFilter !== 'all' && !item.securityIssues.includes(issueFilter)) return false
      if (view === 'favorites' && !item.favorite) return false
      if (!normalized) return true
      const groupName = item.groupId ? (groupById.get(item.groupId)?.name ?? '') : ''
      return [item.title, item.username, item.website, item.tags.join(' '), groupName]
        .join(' ')
        .toLocaleLowerCase('ru-RU')
        .includes(normalized)
    })
  }, [groupById, groupFilter, issueFilter, items, query, typeFilter, view])

  const groupScopedItems = useMemo(
    () =>
      items.filter((item) => {
        if (groupFilter === 'ungrouped') return item.groupId === null
        if (groupFilter !== 'all') return item.groupId === groupFilter
        return true
      }),
    [groupFilter, items]
  )

  const securityStats = useMemo(
    () => ({
      total: groupScopedItems.length,
      weak: groupScopedItems.filter((item) => item.securityIssues.includes('weak')).length,
      reused: groupScopedItems.filter((item) => item.securityIssues.includes('reused')).length,
      old: groupScopedItems.filter((item) => item.securityIssues.includes('old')).length
    }),
    [groupScopedItems]
  )

  const activeLibraryFilterCount = Number(typeFilter !== 'all') + Number(issueFilter !== 'all')

  const selectedGroupForNewItem =
    groupFilter !== 'all' && groupFilter !== 'ungrouped' && groupById.has(groupFilter)
      ? groupFilter
      : null

  async function setupVault(masterPassword: string): Promise<void> {
    setIsBusy(true)
    setError(null)
    try {
      const status = await passwordsClient.setupVault({ masterPassword })
      setVaultStatus(status)
      await loadOverview()
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsBusy(false)
    }
  }

  async function unlockVault(masterPassword: string): Promise<void> {
    setIsBusy(true)
    setError(null)
    try {
      const status = await passwordsClient.unlockVault({ masterPassword })
      setVaultStatus(status)
      lastActivityRef.current = Date.now()
      await loadOverview()
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsBusy(false)
    }
  }

  async function lockVault(): Promise<void> {
    setIsBusy(true)
    try {
      const status = await passwordsClient.lockVault()
      setVaultStatus(status)
      setGroups([])
      setItems([])
      setSelectedItem(null)
      setEditingItem(null)
      setDetailOpen(false)
      setItemDialogOpen(false)
      setError(null)
    } finally {
      setIsBusy(false)
    }
  }

  async function saveGroup(
    input: CreatePasswordGroupInput | UpdatePasswordGroupInput
  ): Promise<void> {
    setIsBusy(true)
    setError(null)
    try {
      const saved =
        'id' in input
          ? await passwordsClient.updateGroup(input)
          : await passwordsClient.createGroup(input)
      await loadOverview()
      if (!('id' in input)) setGroupFilter(saved.id)
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsBusy(false)
    }
  }

  async function saveItem(input: CreatePasswordItemInput | UpdatePasswordItemInput): Promise<void> {
    setIsBusy(true)
    setError(null)
    try {
      const saved =
        'id' in input
          ? await passwordsClient.updateItem(input)
          : await passwordsClient.createItem(input)
      await loadOverview()
      setSelectedItem(saved)
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsBusy(false)
    }
  }

  async function openItem(id: string): Promise<void> {
    setError(null)
    try {
      const item = await passwordsClient.getItem({ id })
      setSelectedItem(item)
      setDetailOpen(true)
    } catch (reason) {
      setError(errorMessage(reason))
    }
  }

  async function editItem(id: string): Promise<void> {
    setError(null)
    try {
      const item = await passwordsClient.getItem({ id })
      setEditingItem(item)
      setDetailOpen(false)
      setItemDialogOpen(true)
    } catch (reason) {
      setError(errorMessage(reason))
    }
  }

  async function copyField(itemId: string, field: 'username' | 'password'): Promise<void> {
    try {
      await passwordsClient.copyItemField({ id: itemId, field })
    } catch (reason) {
      setError(errorMessage(reason))
    }
  }

  async function confirmDeleteItem(): Promise<void> {
    if (!deleteItemTarget) return
    setIsDeleting(true)
    setError(null)
    try {
      await passwordsClient.deleteItem({ id: deleteItemTarget.id })
      if (selectedItem?.id === deleteItemTarget.id) {
        setSelectedItem(null)
        setDetailOpen(false)
      }
      setDeleteItemTarget(null)
      await loadOverview()
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsDeleting(false)
    }
  }

  async function confirmDeleteGroup(): Promise<void> {
    if (!deleteGroupTarget) return
    setIsDeleting(true)
    setError(null)
    try {
      await passwordsClient.deleteGroup({ id: deleteGroupTarget.id })
      if (groupFilter === deleteGroupTarget.id) setGroupFilter('ungrouped')
      setDeleteGroupTarget(null)
      await loadOverview()
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsDeleting(false)
    }
  }

  async function changeMasterPassword(
    currentMasterPassword: string,
    newMasterPassword: string
  ): Promise<void> {
    setIsBusy(true)
    setError(null)
    try {
      const status = await passwordsClient.changeMasterPassword({
        currentMasterPassword,
        newMasterPassword
      })
      setVaultStatus(status)
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsBusy(false)
    }
  }

  if (isLoading || vaultStatus === null) {
    return (
      <StandardModulePage>
        <div className="flex min-h-[70vh] items-center justify-center text-sm text-[var(--app-muted)]">
          Загружаем хранилище…
        </div>
      </StandardModulePage>
    )
  }

  if (!vaultStatus.initialized || !vaultStatus.unlocked) {
    return (
      <VaultGate
        initialized={vaultStatus.initialized}
        busy={isBusy}
        error={error}
        onSetup={setupVault}
        onUnlock={unlockVault}
      />
    )
  }

  return (
    <StandardModulePage>
      <ModuleHeader
        icon={KeyRound}
        title="Пароли"
        description="Локальное зашифрованное хранилище логинов, паролей и секретных данных."
        actions={
          <>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
              onClick={() => void lockVault()}
            >
              <LockKeyhole className="size-4" /> Заблокировать
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
              onClick={() => {
                setEditingGroup(null)
                setGroupDialogOpen(true)
              }}
            >
              <FolderPlus className="size-4" /> Новая группа
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400"
              onClick={() => {
                setEditingItem(null)
                setItemDialogOpen(true)
              }}
            >
              <Plus className="size-4" /> Новая запись
            </button>
          </>
        }
      >
        <div
          className={cn(
            'grid gap-3',
            view === 'security'
              ? 'grid-cols-1'
              : 'grid-cols-[minmax(0,1fr)_auto] max-[1120px]:grid-cols-1'
          )}
        >
          {view !== 'security' && (
            <label className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 focus-within:border-violet-500/45 focus-within:bg-[var(--app-surface)] focus-within:ring-2 focus-within:ring-violet-500/10">
              <Search className="size-4 shrink-0 text-[var(--app-muted)]" />
              <input
                value={query}
                type="search"
                aria-label="Поиск по паролям"
                placeholder="Название, логин, сайт или тег…"
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/65"
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <Tooltip content="Очистить поиск" side="top">
                  <button
                    type="button"
                    aria-label="Очистить поиск"
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--app-text)]"
                    onClick={() => setQuery('')}
                  >
                    <X className="size-4" />
                  </button>
                </Tooltip>
              )}
            </label>
          )}

          <div
            className={cn(
              'flex min-w-0 items-stretch gap-2 max-[760px]:flex-col',
              view !== 'security' && 'max-[1120px]:w-full'
            )}
          >
            <div
              role="tablist"
              aria-label="Разделы паролей"
              className={cn(
                'flex min-h-12 min-w-0 items-center gap-1 overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1.5',
                view === 'security' ? 'w-fit max-w-full' : 'max-[1120px]:flex-1'
              )}
            >
              {[
                { id: 'all' as const, label: 'Хранилище', icon: KeyRound },
                { id: 'favorites' as const, label: 'Избранное', icon: Heart },
                { id: 'security' as const, label: 'Безопасность', icon: ShieldCheck }
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={view === tab.id}
                    className={
                      view === tab.id
                        ? 'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-violet-500 px-3.5 text-sm font-semibold text-white'
                        : 'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                    }
                    onClick={() => setView(tab.id)}
                  >
                    <Icon className="size-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {view !== 'security' && (
              <Popover.Root>
                <Popover.Trigger asChild>
                  <button
                    type="button"
                    aria-label="Фильтры хранилища"
                    className={
                      activeLibraryFilterCount > 0
                        ? 'inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 text-sm font-semibold text-violet-200 transition-colors hover:bg-violet-500/15'
                        : 'inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                    }
                  >
                    <SlidersHorizontal className="size-4" />
                    Фильтры
                    {activeLibraryFilterCount > 0 && (
                      <span className="flex min-w-5 items-center justify-center rounded-md bg-violet-400/15 px-1.5 text-[11px] text-violet-100">
                        {activeLibraryFilterCount}
                      </span>
                    )}
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    align="end"
                    sideOffset={8}
                    collisionPadding={12}
                    className="z-[70] w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-4 shadow-2xl outline-none"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-sm font-semibold text-[var(--app-text)]">
                          Фильтры хранилища
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                          Фильтруйте записи по типу и состоянию безопасности.
                        </p>
                      </div>
                      <Tooltip content="Закрыть фильтры" side="top">
                        <Popover.Close asChild>
                          <button
                            type="button"
                            aria-label="Закрыть фильтры"
                            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                          >
                            <X className="size-4" />
                          </button>
                        </Popover.Close>
                      </Tooltip>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <span className="block text-xs font-medium text-[var(--app-muted)]">
                          Тип
                        </span>
                        <AppSelect
                          ariaLabel="Фильтр по типу записи"
                          value={typeFilter}
                          options={[{ value: 'all', label: 'Все типы' }, ...PASSWORD_TYPE_OPTIONS]}
                          onValueChange={(value) => setTypeFilter(value as PasswordTypeFilter)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <span className="block text-xs font-medium text-[var(--app-muted)]">
                          Безопасность
                        </span>
                        <AppSelect
                          ariaLabel="Фильтр по безопасности"
                          value={issueFilter}
                          options={[
                            { value: 'all', label: 'Любая безопасность' },
                            { value: 'weak', label: 'Слабые' },
                            { value: 'reused', label: 'Повторяющиеся' },
                            { value: 'old', label: 'Старые пароли' }
                          ]}
                          onValueChange={(value) => setIssueFilter(value as PasswordIssueFilter)}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--app-border)] pt-3">
                      <span className="text-[11px] text-[var(--app-muted)]">
                        Изменения применяются сразу
                      </span>
                      <button
                        type="button"
                        disabled={activeLibraryFilterCount === 0}
                        className="h-8 rounded-lg px-2.5 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:cursor-default disabled:opacity-40"
                        onClick={() => {
                          setTypeFilter('all')
                          setIssueFilter('all')
                        }}
                      >
                        Сбросить
                      </button>
                    </div>
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            )}
          </div>
        </div>
      </ModuleHeader>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <span>{error}</span>
          <Tooltip content="Закрыть ошибку" side="top">
            <button
              type="button"
              aria-label="Закрыть ошибку"
              className="flex size-7 items-center justify-center rounded-lg hover:bg-red-500/10"
              onClick={() => setError(null)}
            >
              <X className="size-4" />
            </button>
          </Tooltip>
        </div>
      )}


      <div className="mt-5 grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="self-start rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-[var(--app-shadow-card)] lg:sticky lg:top-5">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-semibold tracking-[0.12em] text-[var(--app-muted)] uppercase">
              Группы
            </span>
            <Tooltip content="Создать группу" side="top">
              <button
                type="button"
                aria-label="Создать группу"
                className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={() => {
                  setEditingGroup(null)
                  setGroupDialogOpen(true)
                }}
              >
                <Plus className="size-4" />
              </button>
            </Tooltip>
          </div>

          <div className="mt-2 space-y-1">
            <button
              type="button"
              className={cn(
                'flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm',
                groupFilter === 'all'
                  ? 'bg-violet-500/12 font-semibold text-violet-200'
                  : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
              )}
              onClick={() => setGroupFilter('all')}
            >
              <KeyRound className="size-4" />
              <span className="min-w-0 flex-1 truncate text-left">Все записи</span>
              <span className="text-xs opacity-70">{items.length}</span>
            </button>
            <button
              type="button"
              className={cn(
                'flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm',
                groupFilter === 'ungrouped'
                  ? 'bg-violet-500/12 font-semibold text-violet-200'
                  : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
              )}
              onClick={() => setGroupFilter('ungrouped')}
            >
              <Inbox className="size-4" />
              <span className="min-w-0 flex-1 truncate text-left">Без группы</span>
              <span className="text-xs opacity-70">{groupCounts.ungrouped}</span>
            </button>
          </div>

          {groups.length > 0 && <div className="my-3 border-t border-[var(--app-border)]" />}

          <div className="space-y-1">
            {groups.map((group) => {
              const color = passwordGroupColorClasses[group.color]
              const selected = groupFilter === group.id
              return (
                <div
                  key={group.id}
                  className={cn(
                    'group flex items-center rounded-xl',
                    selected && 'bg-[var(--app-control)]'
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      'flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 text-sm',
                      selected
                        ? 'font-semibold text-[var(--app-text)]'
                        : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                    )}
                    onClick={() => setGroupFilter(group.id)}
                  >
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-lg border',
                        color.soft,
                        color.text,
                        color.border
                      )}
                    >
                      <PasswordGroupIconGlyph icon={group.icon} className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left">{group.name}</span>
                    <span className="text-xs opacity-60">
                      {groupCounts.counts.get(group.id) ?? 0}
                    </span>
                  </button>
                  <div
                    className={cn(
                      'mr-1 flex shrink-0 items-center',
                      selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    )}
                  >
                    <Tooltip content={`Изменить группу «${group.name}»`} side="top">
                      <button
                        type="button"
                        aria-label={`Изменить группу «${group.name}»`}
                        className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                        onClick={() => {
                          setEditingGroup(group)
                          setGroupDialogOpen(true)
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    </Tooltip>
                    <Tooltip content={`Удалить группу «${group.name}»`} side="top">
                      <button
                        type="button"
                        aria-label={`Удалить группу «${group.name}»`}
                        className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                        onClick={() => setDeleteGroupTarget(group)}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          {view !== 'security' ? (
            <>
              {baseFilteredItems.length === 0 ? (
                <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 text-center">
                  <span className="flex size-14 items-center justify-center rounded-2xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
                    <KeyRound className="size-7" />
                  </span>
                  <h2 className="mt-4 text-lg font-semibold text-[var(--app-text)]">
                    {items.length === 0 ? 'Хранилище пока пустое' : 'Ничего не найдено'}
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-[var(--app-muted)]">
                    {items.length === 0
                      ? 'Добавьте первый аккаунт или отдельный пароль. Все секретные данные будут сохранены в зашифрованном виде.'
                      : 'Измените группу, фильтры или строку поиска.'}
                  </p>
                  {items.length === 0 && (
                    <button
                      type="button"
                      className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400"
                      onClick={() => {
                        setEditingItem(null)
                        setItemDialogOpen(true)
                      }}
                    >
                      <Plus className="size-4" /> Новая запись
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
                  <div className="divide-y divide-[var(--app-border)]">
                    {baseFilteredItems.map((item) => {
                      const group = item.groupId ? (groupById.get(item.groupId) ?? null) : null
                      return (
                        <article
                          key={item.id}
                          className="group/item flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--app-control-hover)]"
                        >
                          <Tooltip content={`Открыть ${item.title}`} side="top">
                            <button
                              type="button"
                              aria-label={`Открыть ${item.title}`}
                              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300"
                              onClick={() => void openItem(item.id)}
                            >
                              {item.type === 'login' ? (
                                <UserRound className="size-4" />
                              ) : (
                                <KeyRound className="size-4" />
                              )}
                            </button>
                          </Tooltip>
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => void openItem(item.id)}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-semibold text-[var(--app-text)]">
                                {item.title}
                              </span>
                              {item.favorite && (
                                <Star className="size-3.5 fill-amber-300 text-amber-300" />
                              )}
                              <span
                                className={cn(
                                  'rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
                                  passwordStrengthClassName(item.strength)
                                )}
                              >
                                {passwordStrengthLabel(item.strength)}
                              </span>
                            </div>
                            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--app-muted)]">
                              {item.username && (
                                <span className="max-w-[260px] truncate">{item.username}</span>
                              )}
                              {item.website && (
                                <span className="max-w-[260px] truncate">{item.website}</span>
                              )}
                              <span>{passwordTypeLabel(item.type)}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {group &&
                                (() => {
                                  const color = passwordGroupColorClasses[group.color]
                                  return (
                                    <span
                                      className={cn(
                                        'inline-flex h-6 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-medium',
                                        color.soft,
                                        color.text,
                                        color.border
                                      )}
                                    >
                                      <PasswordGroupIconGlyph
                                        icon={group.icon}
                                        className="size-3"
                                      />
                                      {group.name}
                                    </span>
                                  )
                                })()}
                              {item.securityIssues.map((issue) => (
                                <span
                                  key={issue}
                                  className={cn(
                                    'inline-flex h-6 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium',
                                    passwordIssueClassName(issue)
                                  )}
                                >
                                  <ShieldAlert className="size-3" />
                                  {passwordIssueLabel(issue)}
                                </span>
                              ))}
                            </div>
                          </button>
                          <div className="flex shrink-0 items-center gap-1">
                            {item.username && (
                              <Tooltip content={`Скопировать логин «${item.title}»`} side="top">
                                <button
                                  type="button"
                                  aria-label={`Скопировать логин «${item.title}»`}
                                  className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control)] hover:text-[var(--app-text)]"
                                  onClick={() => void copyField(item.id, 'username')}
                                >
                                  <UserRound className="size-3.5" />
                                </button>
                              </Tooltip>
                            )}
                            <Tooltip content={`Скопировать пароль «${item.title}»`} side="top">
                              <button
                                type="button"
                                aria-label={`Скопировать пароль «${item.title}»`}
                                className="flex size-8 items-center justify-center rounded-lg text-violet-300 hover:bg-violet-500/10"
                                onClick={() => void copyField(item.id, 'password')}
                              >
                                <ClipboardCopy className="size-3.5" />
                              </button>
                            </Tooltip>
                            <Tooltip content={`Изменить «${item.title}»`} side="top">
                              <button
                                type="button"
                                aria-label={`Изменить «${item.title}»`}
                                className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] opacity-0 group-hover/item:opacity-100 hover:bg-[var(--app-control)] hover:text-[var(--app-text)] focus:opacity-100"
                                onClick={() => void editItem(item.id)}
                              >
                                <Pencil className="size-3.5" />
                              </button>
                            </Tooltip>
                            <Tooltip content={`Удалить «${item.title}»`} side="top">
                              <button
                                type="button"
                                aria-label={`Удалить «${item.title}»`}
                                className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] opacity-0 group-hover/item:opacity-100 hover:bg-red-500/10 hover:text-red-300 focus:opacity-100"
                                onClick={() => setDeleteItemTarget(item)}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </Tooltip>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: 'Всего',
                    value: securityStats.total,
                    icon: KeyRound,
                    tone: 'text-violet-300'
                  },
                  {
                    label: 'Слабые',
                    value: securityStats.weak,
                    icon: ShieldAlert,
                    tone: 'text-rose-300'
                  },
                  {
                    label: 'Повторяются',
                    value: securityStats.reused,
                    icon: ClipboardCopy,
                    tone: 'text-orange-300'
                  },
                  {
                    label: 'Старше 180 дней',
                    value: securityStats.old,
                    icon: LockKeyhole,
                    tone: 'text-amber-300'
                  }
                ].map((stat) => {
                  const Icon = stat.icon
                  return (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-[var(--app-muted)]">
                          {stat.label}
                        </span>
                        <Icon className={cn('size-4', stat.tone)} />
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-[var(--app-text)]">
                        {stat.value}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--app-text)]">
                      Защита хранилища
                    </h2>
                    <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--app-muted)]">
                      Секретные поля и названия групп хранятся зашифрованными. Модуль автоматически
                      блокируется через 5 минут бездействия и при уходе со страницы. Скопированный
                      секрет очищается из буфера обмена через 30 секунд, если вы не заменили его
                      другим содержимым.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                    onClick={() => setChangeMasterOpen(true)}
                  >
                    <ShieldCheck className="size-4" /> Сменить мастер-пароль
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
                <div className="flex items-center gap-2 border-b border-[var(--app-border)] px-4 py-3">
                  <ShieldAlert className="size-4 text-violet-300" />
                  <h2 className="text-sm font-semibold text-[var(--app-text)]">Требуют внимания</h2>
                  <span className="ml-auto rounded-lg bg-[var(--app-control)] px-2 py-0.5 text-xs text-[var(--app-muted)]">
                    {groupScopedItems.filter((item) => item.securityIssues.length > 0).length}
                  </span>
                </div>
                {groupScopedItems.filter((item) => item.securityIssues.length > 0).length === 0 ? (
                  <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
                    <ShieldCheck className="size-8 text-emerald-300" />
                    <h3 className="mt-3 text-sm font-semibold text-[var(--app-text)]">
                      Явных проблем не найдено
                    </h3>
                    <p className="mt-1 text-xs text-[var(--app-muted)]">
                      В выбранной группе нет слабых, повторяющихся или давно не обновлявшихся
                      паролей.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--app-border)]">
                    {groupScopedItems
                      .filter((item) => item.securityIssues.length > 0)
                      .map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-[var(--app-control-hover)]"
                          onClick={() => void openItem(item.id)}
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300">
                            <ShieldAlert className="size-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-[var(--app-text)]">
                              {item.title}
                            </span>
                            {item.username && (
                              <span className="mt-0.5 block truncate text-xs text-[var(--app-muted)]">
                                {item.username}
                              </span>
                            )}
                          </span>
                          <span className="flex flex-wrap justify-end gap-1.5">
                            {item.securityIssues.map((issue) => (
                              <span
                                key={issue}
                                className={cn(
                                  'rounded-lg border px-2 py-1 text-[11px] font-medium',
                                  passwordIssueClassName(issue)
                                )}
                              >
                                {passwordIssueLabel(issue)}
                              </span>
                            ))}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <PasswordItemDialog
        open={itemDialogOpen}
        item={editingItem}
        groups={groups}
        initialGroupId={selectedGroupForNewItem}
        busy={isBusy}
        onOpenChange={(open) => {
          setItemDialogOpen(open)
          if (!open) setEditingItem(null)
        }}
        onSave={saveItem}
      />

      <PasswordGroupDialog
        open={groupDialogOpen}
        group={editingGroup}
        busy={isBusy}
        onOpenChange={(open) => {
          setGroupDialogOpen(open)
          if (!open) setEditingGroup(null)
        }}
        onSave={saveGroup}
      />

      <PasswordDetailDialog
        open={detailOpen}
        item={selectedItem}
        group={selectedItem?.groupId ? (groupById.get(selectedItem.groupId) ?? null) : null}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setSelectedItem(null)
        }}
        onEdit={() => {
          if (!selectedItem) return
          setEditingItem(selectedItem)
          setDetailOpen(false)
          setItemDialogOpen(true)
        }}
        onCopy={async (field) => {
          if (selectedItem) await copyField(selectedItem.id, field)
        }}
        onOpenWebsite={async () => {
          if (!selectedItem) return
          try {
            await passwordsClient.openWebsite({ id: selectedItem.id })
          } catch (reason) {
            setError(errorMessage(reason))
          }
        }}
      />

      <ChangeMasterPasswordDialog
        open={changeMasterOpen}
        busy={isBusy}
        onOpenChange={setChangeMasterOpen}
        onChangePassword={changeMasterPassword}
      />

      <DeleteConfirmationDialog
        open={deleteItemTarget !== null}
        title="Удалить запись?"
        subject={deleteItemTarget?.title}
        description="Запись и все зашифрованные данные внутри неё будут окончательно удалены."
        notice="Отменить это действие после удаления нельзя"
        isSubmitting={isDeleting}
        error={error}
        onOpenChange={(open) => {
          if (!open) setDeleteItemTarget(null)
        }}
        onConfirm={confirmDeleteItem}
      />

      <DeleteConfirmationDialog
        open={deleteGroupTarget !== null}
        title="Удалить группу?"
        subject={deleteGroupTarget?.name}
        description="Записи сохранятся и будут перенесены в «Без группы»."
        notice="Сами пароли не удаляются"
        isSubmitting={isDeleting}
        error={error}
        onOpenChange={(open) => {
          if (!open) setDeleteGroupTarget(null)
        }}
        onConfirm={confirmDeleteGroup}
      />
    </StandardModulePage>
  )
}
