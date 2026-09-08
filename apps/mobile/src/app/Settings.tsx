import { useState } from 'react'
import { Alert, FlatList, View } from 'react-native'
import type { AppearancePreferences } from '@mymind/contracts/preferences'
import type { MobileBackupSummary, MobileRestoreResult } from '../shared/backup/mobileBackup'
import { Button, ErrorState, Label } from '../shared/ui/primitives'
import { messageFor } from '../shared/ui/form-model'
import { ReminderSettings } from './ReminderSettings'

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
  const [busy, setBusy] = useState<'export' | 'restore' | null>(null)
  const [backupError, setBackupError] = useState('')
  const [backupMessage, setBackupMessage] = useState('')
  const names = {
    violet: 'Фиолетовый',
    blue: 'Синий',
    emerald: 'Изумрудный',
    amber: 'Янтарный',
    rose: 'Розовый'
  }

  const runExport = async (): Promise<void> => {
    if (busy) return
    setBusy('export')
    setBackupError('')
    setBackupMessage('')
    try {
      const result = await exportBackup()
      setBackupMessage(
        `Резервная копия подготовлена: ${result.files} файлов, ${Math.max(1, Math.round(result.bytes / 1024))} КБ.`
      )
    } catch (reason) {
      setBackupError(messageFor(reason))
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
        setBackupMessage(
          `Данные восстановлены из копии от ${new Date(result.createdAt).toLocaleString('ru-RU')}.`
        )
      }
    } catch (reason) {
      setBackupError(messageFor(reason))
    } finally {
      setBusy(null)
    }
  }

  const confirmRestore = (): void => {
    if (busy) return
    Alert.alert(
      'Восстановить резервную копию?',
      'Текущие локальные данные будут заменены данными из выбранного файла. Перед заменой MyMind проверит целостность копии и создаст внутреннюю точку отката.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выбрать файл',
          style: 'destructive',
          onPress: () => {
            void runRestore()
          }
        }
      ]
    )
  }

  return (
    <FlatList
      ListFooterComponent={
        <View style={{ gap: 28, paddingBottom: 32 }}>
          <View style={{ gap: 12 }}>
            <Label title>Резервная копия</Label>
            <Label muted>
              Один локальный файл содержит базу MyMind, вложения обучения и заметок, а также
              фотографии прогресса тренировок. Хранилище паролей остаётся зашифрованным — открытые
              пароли и ключ разблокировки в backup не записываются.
            </Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button
                label={busy === 'export' ? 'Подготовка…' : 'Создать backup'}
                selected
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
          <ReminderSettings disabled={busy !== null} />
        </View>
      }
      data={[{ id: 'theme' }, { id: 'accent' }]}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ gap: 12, marginBottom: 28 }}>
          <Label title>{item.id === 'theme' ? 'Оформление' : 'Акцентный цвет'}</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {item.id === 'theme'
              ? (['system', 'light', 'dark'] as const).map((theme) => (
                  <Button
                    key={theme}
                    label={{ system: 'Системное', light: 'Светлое', dark: 'Тёмное' }[theme]}
                    selected={appearance.theme === theme}
                    disabled={busy !== null}
                    onPress={() => save({ ...appearance, theme })}
                  />
                ))
              : (Object.keys(names) as (keyof typeof names)[]).map((accent) => (
                  <Button
                    key={accent}
                    label={names[accent]}
                    selected={appearance.accent === accent}
                    disabled={busy !== null}
                    onPress={() => save({ ...appearance, accent })}
                  />
                ))}
          </View>
        </View>
      )}
    />
  )
}
