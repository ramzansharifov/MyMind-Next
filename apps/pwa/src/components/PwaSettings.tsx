import { useState } from 'react'
import type { AppearancePreferences } from '@mymind/contracts/preferences'
import type { ClientServices } from '../client/app/services'
import { SettingsScreen } from '../client/app/SettingsScreen'
import { WorkspacePanel } from '../client/shared/ui/Workspace'
import { Button, ErrorState, Label } from '../client/shared/ui/primitives'
import { useConfirmation } from '../client/shared/ui/confirmation-context'
import { notifyDataChanged } from '../client/app/changes'
import type { PwaDatabase } from '../storage/database'
import { exportBackup, restoreBackup, verifyBackup } from '../storage/backup'
import { backupSummary } from '../storage/backup-summary'
import { download, pickFile, pickDirectory } from '../platform/files'
import { importDesktopLibrary } from '../storage/desktop-import'
import { enableReminders } from '../reminders/scheduler'
import { reminderCalendar } from '../reminders/calendar-export'
import type { usePwa } from './usePwa'
import packageInfo from '../../package.json'
interface Props {
  services: ClientServices
  db: PwaDatabase
  appearance: AppearancePreferences
  save(value: AppearancePreferences): void
  pwa: ReturnType<typeof usePwa>
  busy: boolean
  setBusy(value: boolean): void
  restored(): Promise<void>
}
/** Browser capabilities plug into the Android settings screen, without copying its UI. */
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
  const confirm = useConfirmation()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [remindersEnabled, setRemindersEnabled] = useState(
    () => services.settings.get('reminders.enabled') === 'true'
  )
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
  const feedback = (
    <>
      {error ? <ErrorState message={error} /> : null}
      {message ? (
        <div className="ui-stack" aria-live={'polite'}>
          <Label muted>{message}</Label>
        </div>
      ) : null}
    </>
  )
  return (
    <SettingsScreen
      appearance={appearance}
      save={save}
      disabled={busy}
      exportBackup={async () => {
        setBusy(true)
        try {
          const blob = await exportBackup(db)
          const summary = await verifyBackup(db, blob)
          download(blob, `MyMind-${new Date().toISOString().slice(0, 10)}.mymindbackup`)
          return summary
        } finally {
          setBusy(false)
        }
      }}
      restoreNotice="Перед заменой MyMind проверит целостность копии. База и вложения заменяются одной транзакцией; при ошибке текущие данные сохраняются."
      restoreBackup={async () => {
        const file = await pickFile('.mymindbackup')
        if (!file) return { restored: false, createdAt: 0, files: 0, bytes: 0 }
        setBusy(true)
        try {
          const summary = await backupSummary(file)
          await restoreBackup(db, file)
          await restored()
          return { ...summary, restored: true }
        } finally {
          setBusy(false)
        }
      }}
      updatesSubtitle={
        pwa.updateReady ? 'Обновление загружено' : `Установлена v${packageInfo.version}`
      }
      reminders={
        <div
          className="ui-stack"
          style={{
            gap: 12,
            marginBottom: 24
          }}
        >
          <Label title>Напоминания</Label>
          <Label muted>
            При открытом приложении уведомления появляются в системе и на главной. Когда PWA
            полностью закрыта, браузер не выполняет локальные таймеры; пропущенные напоминания
            появятся при следующем открытии.
          </Label>
          <Button
            label={remindersEnabled ? 'Выключить напоминания' : 'Включить напоминания'}
            selected={remindersEnabled}
            disabled={busy}
            onClick={() =>
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
            onClick={() => {
              download(reminderCalendar(services), 'MyMind-reminders.ics')
              setMessage('Импортируйте файл в календарь телефона для офлайн-уведомлений.')
            }}
          />
          {feedback}
        </div>
      }
      dataExtras={
        <>
          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8
            }}
          >
            <Button
              label="Проверить резервную копию"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const file = await pickFile('.mymindbackup')
                  if (!file) return
                  const summary = await verifyBackup(db, file)
                  setMessage(
                    `Резервная копия проверена: ${summary.files} вложений, ${(
                      summary.bytes /
                      (1024 * 1024)
                    ).toFixed(1)} МБ. Данные приложения не изменены.`
                  )
                })
              }
            />
            <Button
              label="Перенести desktop-библиотеку"
              icon="folder"
              disabled={busy}
              onClick={() =>
                void confirm({
                  title: 'Перенести desktop-библиотеку?',
                  description:
                    'Текущие данные PWA будут заменены. Полностью закройте desktop MyMind и выберите папку библиотеки с data/mymind.sqlite и Attachments. Исходная библиотека сохраняется.',
                  confirmLabel: 'Выбрать папку MyMind и перенести',
                  tone: 'warning',
                  onConfirm: async () => {
                    setBusy(true)
                    try {
                      const files = await pickDirectory()
                      if (!files.length) return
                      await importDesktopLibrary(db, files)
                      await restored()
                    } finally {
                      setBusy(false)
                    }
                  }
                })
              }
            />
            <Button
              label="Запросить постоянное хранение"
              disabled={busy}
              onClick={() =>
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
          </div>
          <Label muted>
            Очистка данных сайта удаляет локальную библиотеку — сохраняйте резервные копии.
          </Label>
          {feedback}
        </>
      }
      updates={
        <WorkspacePanel
          title="Обновления"
          description={`MyMind v${packageInfo.version} · PWA`}
          icon="download"
        >
          <div
            className="ui-stack"
            style={{
              gap: 14
            }}
          >
            <Label muted>
              {pwa.offlineReady
                ? 'Приложение подготовлено для работы без интернета.'
                : 'Для офлайн-работы дождитесь загрузки приложения при подключении к интернету.'}
            </Label>
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              {pwa.canInstall ? (
                <Button
                  label="Установить MyMind"
                  primary
                  disabled={busy}
                  onClick={() => void run(pwa.install)}
                />
              ) : null}
              <Button
                label="Проверить обновления"
                icon="download"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await pwa.checkForUpdates()
                    setMessage('Проверка обновлений завершена.')
                  })
                }
              />
            </div>
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
            {feedback}
          </div>
        </WorkspacePanel>
      }
    />
  )
}
