import { useEffect, useState } from 'react'
import { BackHandler, ScrollView, View } from 'react-native'
import type { AppearancePreferences } from '@mymind/contracts/preferences'
import type { MobileServices } from '../../../mobile/src/app/services'
import { MobileProfileSyncSettings } from '../../../mobile/src/app/MobileProfileSyncSettings'
import { WorkspaceNodeCard, WorkspacePanel } from '../../../mobile/src/shared/ui/Workspace'
import { Button, ErrorState, Label } from '../../../mobile/src/shared/ui/primitives'
import { AppDialog } from '../../../mobile/src/shared/ui/AppDialog'
import { notifyDataChanged } from '../../../mobile/src/app/changes'
import type { PwaDatabase } from '../storage/database'
import { exportBackup, restoreBackup } from '../storage/backup'
import { download, pickFile, pickDirectory } from '../platform/files'
import { importDesktopLibrary } from '../storage/desktop-import'
import { enableReminders } from '../reminders/scheduler'
import { reminderCalendar } from '../reminders/calendar-export'
import type { usePwa } from './usePwa'
import packageInfo from '../../package.json'
const { version } = packageInfo

type Page = 'overview' | 'profile' | 'appearance' | 'reminders' | 'updates' | 'data'
const themeNames = { system: 'Как в системе', light: 'Светлая', dark: 'Тёмная' }
const accentNames = {
  violet: 'Фиолетовый',
  blue: 'Синий',
  emerald: 'Зелёный',
  amber: 'Янтарный',
  rose: 'Розовый'
}
interface Props {
  services: MobileServices
  db: PwaDatabase
  appearance: AppearancePreferences
  save(value: AppearancePreferences): void
  pwa: ReturnType<typeof usePwa>
  busy: boolean
  setBusy(value: boolean): void
  restored(): Promise<void>
}
export function PwaSettings({
  services,
  db,
  appearance,
  save,
  pwa,
  busy,
  setBusy,
  restored
}: Props): React.JSX.Element {
  const [page, setPage] = useState<Page>('overview')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [confirmRestore, setConfirmRestore] = useState<'backup' | 'desktop' | null>(null)
  const [remindersEnabled, setRemindersEnabled] = useState(
    () => services.settings.get('reminders.enabled') === 'true'
  )
  useEffect(() => {
    if (page === 'overview') return
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!busy) {
        if (confirmRestore) setConfirmRestore(null)
        else setPage('overview')
      }
      return true
    })
    return () => back.remove()
  }, [busy, page, confirmRestore])
  const run = async (operation: () => Promise<void>): Promise<void> => {
    if (busy) return
    setBusy(true)
    setMessage('')
    setError('')
    try {
      await operation()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }
  const changePage = (value: Page): void => {
    if (!busy) {
      setPage(value)
      setError('')
      setMessage('')
    }
  }
  const backup = (): void => {
    void run(async () => {
      download(
        await exportBackup(db),
        `MyMind-${new Date().toISOString().slice(0, 10)}.mymindbackup`
      )
      setMessage('Резервная копия подготовлена для скачивания.')
    })
  }
  const restore = (): void => {
    void run(async () => {
      if (confirmRestore === 'desktop') {
        const files = await pickDirectory()
        if (!files.length) return
        await importDesktopLibrary(db, files)
      } else {
        const file = await pickFile('.mymindbackup')
        if (!file) return
        await restoreBackup(db, file)
      }
      await restored()
      setConfirmRestore(null)
      setMessage('Данные восстановлены. Исходные файлы сохранены.')
    })
  }
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32, gap: 12 }}>
      {page !== 'overview' ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button
            label="Назад к настройкам"
            icon="back"
            disabled={busy}
            onPress={() => changePage('overview')}
          />
        </View>
      ) : null}
      {page === 'overview' ? (
        <View style={{ gap: 10 }}>
          <WorkspaceNodeCard
            title="Профиль и синхронизация"
            subtitle="Локальный профиль · синхронизация с компьютером по LAN"
            leadingIcon="settings"
            onPress={() => changePage('profile')}
          />
          <WorkspaceNodeCard
            title="Внешний вид"
            subtitle={`${themeNames[appearance.theme]} · ${accentNames[appearance.accent]}`}
            leadingIcon="settings"
            onPress={() => changePage('appearance')}
          />
          <WorkspaceNodeCard
            title="Напоминания"
            subtitle="Календарь и привычки · системные уведомления"
            leadingIcon="calendar"
            onPress={() => changePage('reminders')}
          />
          <WorkspaceNodeCard
            title="Обновления"
            subtitle={pwa.updateReady ? 'Обновление загружено' : `Установлена v${version}`}
            leadingIcon="download"
            onPress={() => changePage('updates')}
          />
          <WorkspaceNodeCard
            title="Локальные данные"
            subtitle="Backup, проверка копии и безопасное восстановление"
            leadingIcon="folder"
            onPress={() => changePage('data')}
          />
          <WorkspacePanel>
            <Label muted>
              MyMind хранит записи и вложения на этом устройстве. Для профиля и синхронизации
              удалённая база данных не используется.
            </Label>
          </WorkspacePanel>
        </View>
      ) : null}
      {page === 'profile' ? (
        <div inert={busy}>
          <MobileProfileSyncSettings />
        </div>
      ) : null}
      {page === 'appearance' ? (
        <WorkspacePanel
          title="Внешний вид"
          description="Тема и акцентный цвет приложения."
          icon="settings"
        >
          <View style={{ gap: 22 }}>
            <View style={{ gap: 10 }}>
              <Label title>Оформление</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(Object.keys(themeNames) as Array<keyof typeof themeNames>).map((value) => (
                  <Button
                    key={value}
                    label={themeNames[value]}
                    selected={appearance.theme === value}
                    disabled={busy}
                    onPress={() => save({ ...appearance, theme: value })}
                  />
                ))}
              </View>
            </View>
            <View style={{ gap: 10 }}>
              <Label title>Акцентный цвет</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {(Object.keys(accentNames) as Array<keyof typeof accentNames>).map((value) => (
                  <Button
                    key={value}
                    label={accentNames[value]}
                    selected={appearance.accent === value}
                    disabled={busy}
                    onPress={() => save({ ...appearance, accent: value })}
                  />
                ))}
              </View>
            </View>
          </View>
        </WorkspacePanel>
      ) : null}
      {page === 'reminders' ? (
        <WorkspacePanel
          title="Напоминания"
          description="Системные уведомления календаря и привычек."
          icon="calendar"
        >
          <View style={{ gap: 14 }}>
            <Label muted>
              При открытом приложении уведомления появляются в системе и на главной. Когда PWA
              полностью закрыта, браузер не выполняет локальные таймеры; пропущенные напоминания
              появятся при следующем открытии.
            </Label>
            <Button
              label={remindersEnabled ? 'Выключить напоминания' : 'Включить напоминания'}
              selected={remindersEnabled}
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  if (remindersEnabled) {
                    services.settings.set('reminders.enabled', 'false')
                    await db.flush()
                  } else await enableReminders(services, db)
                  setRemindersEnabled(!remindersEnabled)
                  notifyDataChanged()
                })
              }
            />
            <Button
              label="Передать напоминания в календарь телефона"
              icon="calendar"
              disabled={busy}
              onPress={() => {
                download(reminderCalendar(services), 'MyMind-reminders.ics')
                setMessage('Импортируйте файл в календарь телефона для офлайн-уведомлений.')
              }}
            />
          </View>
        </WorkspacePanel>
      ) : null}
      {page === 'data' ? (
        <WorkspacePanel
          title="Локальные данные"
          description="Резервное копирование и восстановление локального пространства MyMind."
          icon="folder"
        >
          <View style={{ gap: 12 }}>
            <Label muted>
              Один файл содержит базу MyMind и вложения. Хранилище паролей остаётся зашифрованным.
              Очистка данных сайта удаляет локальную библиотеку — сохраняйте резервные копии.
            </Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button
                label="Создать backup"
                accessibilityLabel="Скачать резервную копию"
                primary
                disabled={busy}
                onPress={backup}
              />
              <Button
                label="Восстановить из файла"
                danger
                disabled={busy}
                onPress={() => setConfirmRestore('backup')}
              />
              <Button
                label="Перенести desktop-библиотеку"
                icon="folder"
                disabled={busy}
                onPress={() => setConfirmRestore('desktop')}
              />
              <Button
                label="Запросить постоянное хранение"
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    const granted = await navigator.storage?.persist?.()
                    setMessage(
                      granted
                        ? 'Браузер разрешил постоянное хранение.'
                        : 'Браузер управляет хранением автоматически. Сохраняйте резервные копии.'
                    )
                  })
                }
              />
            </View>
          </View>
        </WorkspacePanel>
      ) : null}
      {page === 'updates' ? (
        <WorkspacePanel title="Обновления" description={`MyMind v${version} · PWA`} icon="download">
          <View style={{ gap: 14 }}>
            <Label muted>
              {pwa.offlineReady
                ? 'Приложение подготовлено для работы без интернета.'
                : 'Для офлайн-работы дождитесь загрузки приложения при подключении к интернету.'}
            </Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {pwa.canInstall ? (
                <Button
                  label="Установить MyMind"
                  primary
                  disabled={busy}
                  onPress={() => void run(pwa.install)}
                />
              ) : null}
              <Button
                label="Проверить обновления"
                icon="download"
                disabled={busy}
                onPress={() =>
                  void run(async () => {
                    await pwa.checkForUpdates()
                    setMessage('Проверка обновлений завершена.')
                  })
                }
              />
            </View>
            {!pwa.canInstall ? (
              <Label muted>
                На Android: меню Chrome → установка приложения. На iPhone: Safari → «Поделиться» →
                «На экран Домой».
              </Label>
            ) : null}
            {pwa.updateReady ? (
              <Label muted>
                Обновление загружено. Закройте все окна MyMind и откройте приложение снова.
              </Label>
            ) : null}
            {pwa.error ? <ErrorState message={pwa.error} /> : null}
          </View>
        </WorkspacePanel>
      ) : null}
      {error ? <ErrorState message={error} /> : null}
      {message ? (
        <View accessibilityLiveRegion="polite">
          <Label muted>{message}</Label>
        </View>
      ) : null}
      <AppDialog
        open={confirmRestore !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirmRestore(null)
        }}
        title="Заменить текущие данные?"
        tone="warning"
        busy={busy}
        footer={
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button label="Отмена" disabled={busy} onPress={() => setConfirmRestore(null)} />
            <Button
              label={
                confirmRestore === 'desktop'
                  ? 'Выбрать папку MyMind и перенести'
                  : 'Выбрать файл и восстановить'
              }
              danger
              disabled={busy}
              onPress={restore}
            />
          </View>
        }
      >
        <Label muted>
          {confirmRestore === 'desktop'
            ? 'Полностью закройте desktop MyMind и выберите папку библиотеки с data/mymind.sqlite и Attachments.'
            : 'Сначала сохраните резервную копию. После проверки выбранный файл заменит записи и вложения PWA.'}{' '}
          Данные установленных мобильных приложений сохранятся.
        </Label>
      </AppDialog>
    </ScrollView>
  )
}
