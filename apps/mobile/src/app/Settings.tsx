import { useEffect, useState } from 'react'
import { BackHandler, ScrollView, Text, View } from 'react-native'
import type { AppearancePreferences } from '@mymind/contracts/preferences'

import type { MobileBackupSummary, MobileRestoreResult } from '../shared/backup/mobileBackup'
import { Button, ErrorState, Label } from '../shared/ui/primitives'
import { messageFor } from '../shared/ui/form-model'
import { WorkspaceNodeCard, WorkspacePanel } from '../shared/ui/Workspace'
import { useTheme } from '../shared/ui/theme'
import { ReminderSettings } from './ReminderSettings'
import { useConfirmation } from '../shared/ui/ConfirmationProvider'
import { useToast } from '../shared/ui/ToastProvider'

type SettingsPage = 'overview' | 'appearance' | 'reminders' | 'data'

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

export function Settings({
  appearance,
  save,
  exportBackup,
  restoreBackup
}: {
  appearance: AppearancePreferences
  save(value: AppearancePreferences): void
  exportBackup(): Promise<MobileBackupSummary>
  restoreBackup(): Promise<MobileRestoreResult>
}): React.JSX.Element {
  const theme = useTheme()
  const confirm = useConfirmation()
  const toast = useToast()
  const [page, setPage] = useState<SettingsPage>('overview')
  const [busy, setBusy] = useState<'export' | 'restore' | null>(null)
  const [backupError, setBackupError] = useState('')
  const [backupMessage, setBackupMessage] = useState('')

  useEffect(() => {
    if (page === 'overview') return undefined
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
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
      const message = `Резервная копия подготовлена: ${result.files} файлов, ${Math.max(
        1,
        Math.round(result.bytes / 1024)
      )} КБ.`
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
        const message = `Данные восстановлены из копии от ${new Date(
          result.createdAt
        ).toLocaleString('ru-RU')}.`
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
      description:
        'Текущие локальные данные будут заменены данными из выбранного файла. Перед заменой MyMind проверит целостность копии и создаст внутреннюю точку отката.',
      confirmLabel: 'Выбрать файл',
      submittingLabel: 'Проверяем…',
      tone: 'warning',
      notice: 'Перед заменой MyMind проверит целостность копии и создаст внутреннюю точку отката.',
      onConfirm: runRestore
    })
  }

  const back = page !== 'overview' ? (
    <View style={{ marginBottom: 12, alignItems: 'flex-start' }}>
      <Button label="Назад к настройкам" icon="back" onPress={() => setPage('overview')} />
    </View>
  ) : null

  if (page === 'appearance') {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {back}
        <WorkspacePanel
          title="Внешний вид"
          description="Тема и акцентный цвет приложения."
          icon="settings"
        >
          <View style={{ gap: 22 }}>
            <View style={{ gap: 10 }}>
              <Label title>Оформление</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(['system', 'light', 'dark'] as const).map((value) => (
                  <Button
                    key={value}
                    label={themeNames[value]}
                    selected={appearance.theme === value}
                    disabled={busy !== null}
                    onPress={() => save({ ...appearance, theme: value })}
                  />
                ))}
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <Label title>Акцентный цвет</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(Object.keys(accentNames) as Array<keyof typeof accentNames>).map((accent) => (
                  <Button
                    key={accent}
                    label={accentNames[accent]}
                    selected={appearance.accent === accent}
                    disabled={busy !== null}
                    onPress={() => save({ ...appearance, accent })}
                  />
                ))}
              </View>
            </View>
          </View>
        </WorkspacePanel>
      </ScrollView>
    )
  }

  if (page === 'reminders') {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {back}
        <WorkspacePanel
          title="Напоминания"
          description="Системные уведомления календаря и привычек."
          icon="calendar"
        >
          <ReminderSettings disabled={busy !== null} />
        </WorkspacePanel>
      </ScrollView>
    )
  }

  if (page === 'data') {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {back}
        <WorkspacePanel
          title="Локальные данные"
          description="Резервное копирование и восстановление локального пространства MyMind."
          icon="folder"
        >
          <View style={{ gap: 12 }}>
            <Label muted>
              Один локальный файл содержит базу MyMind, вложения обучения и заметок, а также
              фотографии прогресса тренировок. Хранилище паролей остаётся зашифрованным — открытые
              пароли и ключ разблокировки в backup не записываются.
            </Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button
                label={busy === 'export' ? 'Подготовка…' : 'Создать backup'}
                primary
                disabled={busy !== null}
                onPress={() => void runExport()}
              />
              <Button
                label={busy === 'restore' ? 'Проверка и восстановление…' : 'Восстановить из файла'}
                danger
                disabled={busy !== null}
                onPress={confirmRestore}
              />
            </View>
            {backupError ? <ErrorState message={backupError} /> : null}
            {backupMessage ? <Label muted>{backupMessage}</Label> : null}
          </View>
        </WorkspacePanel>
      </ScrollView>
    )
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={{ gap: 10 }}>
        <WorkspaceNodeCard
          title="Внешний вид"
          subtitle={`${themeNames[appearance.theme]} · ${accentNames[appearance.accent]}`}
          leadingIcon="settings"
          onPress={() => setPage('appearance')}
        />
        <WorkspaceNodeCard
          title="Напоминания"
          subtitle="Календарь и привычки · системные уведомления телефона"
          leadingIcon="calendar"
          onPress={() => setPage('reminders')}
        />
        <WorkspaceNodeCard
          title="Локальные данные"
          subtitle="Backup, проверка копии и безопасное восстановление"
          leadingIcon="folder"
          onPress={() => setPage('data')}
        />

        <View
          style={{
            marginTop: 8,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 16,
            backgroundColor: theme.surface
          }}
        >
          <Text style={{ color: theme.muted, fontSize: 12, lineHeight: 19 }}>
            Настройки, зависящие от Electron — перенос папки хранения и встроенное окно ИИ-чата —
            не показываются на Android. Мобильные данные остаются локальными и управляются через
            резервные копии.
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}
