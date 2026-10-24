import { subscribeBack } from '../../ui/browser'
import { useEffect, useState, type ReactNode } from 'react'
import type { AppearancePreferences } from '@mymind/contracts/preferences'
import type { BackupSummary, RestoreResult } from '../shared/backup/types'
import { Button, ErrorState, Label } from '../shared/ui/primitives'
import { messageFor } from '../shared/ui/form-model'
import { WorkspaceNodeCard, WorkspacePanel } from '../shared/ui/Workspace'
import { useTheme } from '../shared/ui/theme'
import { useConfirmation } from '../shared/ui/confirmation-context'
import { useToast } from '../shared/ui/toast-context'
import { MobileProfileSyncSettings } from './MobileProfileSyncSettings'
type SettingsPage = 'overview' | 'profile-sync' | 'appearance' | 'reminders' | 'updates' | 'data'
const accentNames = {
  violet: 'Фиолетовый',
  blue: 'Синий',
  emerald: 'Изумрудный',
  amber: 'Янтарный',
  rose: 'Розовый'
} as const
const themeNames = {
  system: 'Как в системе',
  light: 'Светлая',
  dark: 'Тёмная'
} as const
export function SettingsScreen({
  appearance,
  reminders,
  updates,
  updatesSubtitle,
  dataExtras,
  disabled = false,
  restoreNotice = 'Перед заменой MyMind проверит целостность копии и создаст внутреннюю точку отката.',
  save,
  exportBackup,
  restoreBackup
}: {
  appearance: AppearancePreferences
  reminders: ReactNode
  updates: ReactNode
  updatesSubtitle: string
  dataExtras?: ReactNode
  disabled?: boolean
  restoreNotice?: string
  save(value: AppearancePreferences): void
  exportBackup(): Promise<BackupSummary>
  restoreBackup(): Promise<RestoreResult>
}): React.JSX.Element {
  const theme = useTheme()
  const confirm = useConfirmation()
  const toast = useToast()
  const [page, setPage] = useState<SettingsPage>('overview')
  const [operation, setBusy] = useState<'export' | 'restore' | null>(null)
  const busy = operation ?? (disabled ? 'platform' : null)
  const [backupError, setBackupError] = useState('')
  const [backupMessage, setBackupMessage] = useState('')
  useEffect(() => {
    if (page === 'overview') return undefined
    const subscription = subscribeBack(() => {
      if (!busy) setPage('overview')
      return true
    })
    return () => subscription.remove()
  }, [busy, page])
  const runExport = async (): Promise<void> => {
    if (busy) return
    setBusy('export')
    setBackupError('')
    setBackupMessage('')
    try {
      const result = await exportBackup()
      const message = `Резервная копия подготовлена: ${result.files} файлов, ${Math.max(1, Math.round(result.bytes / 1024))} КБ.`
      setBackupMessage(message)
      toast.success(message, 'backup-export')
    } catch (reason) {
      const message = messageFor(reason)
      setBackupError(message)
      toast.error(message, 'backup-export')
    } finally {
      setBusy(null)
    }
  }
  const runRestore = async (): Promise<void> => {
    if (busy) return
    setBusy('restore')
    setBackupError('')
    setBackupMessage('')
    try {
      const result = await restoreBackup()
      if (result.restored) {
        const message = `Данные восстановлены из копии от ${new Date(result.createdAt).toLocaleString('ru-RU')}.`
        setBackupMessage(message)
        toast.success(message, 'backup-restore')
      }
    } catch (reason) {
      const message = messageFor(reason)
      setBackupError(message)
      toast.error(message, 'backup-restore')
      throw reason
    } finally {
      setBusy(null)
    }
  }
  const confirmRestore = (): void => {
    if (busy) return
    void confirm({
      title: 'Восстановить резервную копию?',
      description: `Текущие локальные данные будут заменены данными из выбранного файла. ${restoreNotice}`,
      confirmLabel: 'Выбрать файл',
      submittingLabel: 'Проверяем…',
      tone: 'warning',
      notice: restoreNotice,
      onConfirm: runRestore
    })
  }
  const back =
    page !== 'overview' ? (
      <div
        className="ui-stack"
        style={{
          marginBottom: 12,
          alignItems: 'flex-start'
        }}
      >
        <Button label="Назад к настройкам" icon="back" onClick={() => setPage('overview')} />
      </div>
    ) : null
  if (page === 'profile-sync') {
    return (
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 32
          }}
        >
          {back}
          <MobileProfileSyncSettings />
        </div>
      </div>
    )
  }
  if (page === 'appearance') {
    return (
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 32
          }}
        >
          {back}
          <WorkspacePanel
            title="Внешний вид"
            description="Тема и акцентный цвет приложения."
            icon="settings"
          >
            <div
              className="ui-stack"
              style={{
                gap: 22
              }}
            >
              <div
                className="ui-stack"
                style={{
                  gap: 10
                }}
              >
                <Label title>Оформление</Label>
                <div
                  className="ui-stack"
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8
                  }}
                >
                  {(['system', 'light', 'dark'] as const).map((value) => (
                    <Button
                      key={value}
                      label={themeNames[value]}
                      selected={appearance.theme === value}
                      disabled={busy !== null}
                      onClick={() => save({ ...appearance, theme: value })}
                    />
                  ))}
                </div>
              </div>

              <div
                className="ui-stack"
                style={{
                  gap: 10
                }}
              >
                <Label title>Акцентный цвет</Label>
                <div
                  className="ui-stack"
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8
                  }}
                >
                  {(Object.keys(accentNames) as Array<keyof typeof accentNames>).map((accent) => (
                    <Button
                      key={accent}
                      label={accentNames[accent]}
                      selected={appearance.accent === accent}
                      disabled={busy !== null}
                      onClick={() => save({ ...appearance, accent })}
                    />
                  ))}
                </div>
              </div>
            </div>
          </WorkspacePanel>
        </div>
      </div>
    )
  }
  if (page === 'reminders') {
    return (
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 32
          }}
        >
          {back}
          <WorkspacePanel
            title="Напоминания"
            description="Системные уведомления календаря и привычек."
            icon="calendar"
          >
            {reminders}
          </WorkspacePanel>
        </div>
      </div>
    )
  }
  if (page === 'updates') {
    return (
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 32
          }}
        >
          {back}
          {updates}
        </div>
      </div>
    )
  }
  if (page === 'data') {
    return (
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 32
          }}
        >
          {back}
          <WorkspacePanel
            title="Локальные данные"
            description="Резервное копирование и восстановление локального пространства MyMind."
            icon="folder"
          >
            <div
              className="ui-stack"
              style={{
                gap: 12
              }}
            >
              <Label muted>
                Один локальный файл содержит базу MyMind, вложения заметок и другие локальные файлы
                приложения. Хранилище паролей остаётся зашифрованным — открытые пароли и ключ
                разблокировки в backup не записываются.
              </Label>
              <div
                className="ui-stack"
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8
                }}
              >
                <Button
                  label={busy === 'export' ? 'Подготовка…' : 'Создать backup'}
                  primary
                  disabled={busy !== null}
                  onClick={() => void runExport()}
                />
                <Button
                  label={
                    busy === 'restore' ? 'Проверка и восстановление…' : 'Восстановить из файла'
                  }
                  danger
                  disabled={busy !== null}
                  onClick={confirmRestore}
                />
              </div>
              {backupError ? <ErrorState message={backupError} /> : null}
              {backupMessage ? <Label muted>{backupMessage}</Label> : null}
              {dataExtras}
            </div>
          </WorkspacePanel>
        </div>
      </div>
    )
  }
  return (
    <div className="ui-scroll">
      <div
        className="ui-stack ui-scroll-content"
        style={{
          paddingBottom: 32
        }}
      >
        <div
          className="ui-stack"
          style={{
            gap: 10
          }}
        >
          <WorkspaceNodeCard
            title="Профиль и синхронизация"
            subtitle="Локальный профиль · синхронизация с компьютером по LAN"
            leadingIcon="settings"
            onClick={() => setPage('profile-sync')}
          />
          <WorkspaceNodeCard
            title="Внешний вид"
            subtitle={`${themeNames[appearance.theme]} · ${accentNames[appearance.accent]}`}
            leadingIcon="settings"
            onClick={() => setPage('appearance')}
          />
          <WorkspaceNodeCard
            title="Напоминания"
            subtitle="Календарь и привычки · системные уведомления телефона"
            leadingIcon="calendar"
            onClick={() => setPage('reminders')}
          />
          <WorkspaceNodeCard
            title="Обновления"
            subtitle={updatesSubtitle}
            leadingIcon="download"
            onClick={() => setPage('updates')}
          />
          <WorkspaceNodeCard
            title="Локальные данные"
            subtitle="Backup, проверка копии и безопасное восстановление"
            leadingIcon="folder"
            onClick={() => setPage('data')}
          />

          <div
            className="ui-stack"
            style={{
              marginTop: 8,
              padding: 14,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 16,
              backgroundColor: theme.surface
            }}
          >
            <span
              className="ui-text"
              style={{
                color: theme.muted,
                fontSize: 12,
                lineHeight: '19px'
              }}
            >
              MyMind не использует облако для профиля и синхронизации: данные передаются напрямую
              между вашими устройствами в одной локальной сети. Перенос папки хранения и встроенное
              окно ИИ-чата остаются функциями desktop.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
