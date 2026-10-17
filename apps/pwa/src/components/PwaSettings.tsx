import { useState } from 'react'
import type { AppearancePreferences } from '@mymind/contracts/preferences'
import type { PwaDatabase } from '../storage/database'
import { exportBackup, restoreBackup } from '../storage/backup'
import { download, pickFile, pickDirectory } from '../platform/files'
import { importDesktopLibrary } from '../storage/desktop-import'
import type { usePwa } from './usePwa'
import type { MobileServices } from '../../../mobile/src/app/services'
import { MobileProfileSyncSettings } from '../../../mobile/src/app/MobileProfileSyncSettings'
import { enableReminders } from '../reminders/scheduler'
import { notifyDataChanged } from '../../../mobile/src/app/changes'
import { reminderCalendar } from '../reminders/calendar-export'

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
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [confirmRestore, setConfirmRestore] = useState<'backup' | 'desktop' | null>(null)
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
  return (
    <div className="settings">
      <section>
        <h2>Профиль и синхронизация</h2>
        <p>
          Профиль хранится на устройстве. Для синхронизации с desktop запустите локальный сервис
          MyMind на компьютере и включите синхронизацию в desktop. Логин и пароль профиля должны
          совпадать на обоих устройствах.
        </p>
        <details>
          <summary>Открыть профиль и LAN-синхронизацию</summary>
          <fieldset disabled={busy} inert={busy} style={{ border: 0, padding: 0, marginTop: 16 }}>
            <MobileProfileSyncSettings />
          </fieldset>
        </details>
      </section>
      <section>
        <h2>Напоминания</h2>
        <button
          disabled={busy}
          onClick={() => {
            download(reminderCalendar(services), 'MyMind-reminders.ics')
            setMessage(
              'Файл календаря подготовлен. Импортируйте его в календарь телефона для офлайн-уведомлений.'
            )
          }}
        >
          Передать напоминания в календарь телефона
        </button>
        <p>
          Напоминания календаря и привычек показываются в браузере и на главной. Пропущенные
          напоминания восстанавливаются после открытия приложения. Когда PWA полностью закрыта,
          локальный таймер браузера не работает.
        </p>
        <button
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
        >
          {remindersEnabled ? 'Выключить напоминания' : 'Включить напоминания'}
        </button>
      </section>
      <section>
        <h2>На вашем устройстве</h2>
        <p>
          Записи, вложения и зашифрованное хранилище паролей сохраняются в этом браузере. Учётная
          запись и удалённая база не нужны.
        </p>
        <p>Очистка данных сайта удалит локальную библиотеку. Сохраняйте резервные копии в файлы.</p>
        <button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              download(
                await exportBackup(db),
                `MyMind-${new Date().toISOString().slice(0, 10)}.mymindbackup`
              )
              setMessage('Резервная копия подготовлена для скачивания.')
            })
          }
        >
          Скачать резервную копию
        </button>
        <button disabled={busy} onClick={() => setConfirmRestore('backup')}>
          Восстановить из файла
        </button>
        <button disabled={busy} onClick={() => setConfirmRestore('desktop')}>
          Перенести desktop-библиотеку
        </button>
        {confirmRestore ? (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="restore-title"
            className="restore-dialog"
          >
            <h3 id="restore-title">Заменить текущие данные?</h3>
            {confirmRestore === 'desktop' ? (
              <p>
                Полностью закройте desktop MyMind. Выберите его папку библиотеки с
                data/mymind.sqlite и Attachments. Исходные файлы останутся на месте.
              </p>
            ) : null}
            <p>
              Сначала скачайте резервную копию. После проверки выбранный файл заменит записи и
              вложения PWA. Данные установленных мобильных приложений сохранятся.
            </p>
            <button autoFocus disabled={busy} onClick={() => setConfirmRestore(null)}>
              Отмена
            </button>
            <button
              disabled={busy}
              onClick={() =>
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
                  setMessage(
                    confirmRestore === 'desktop'
                      ? 'Desktop-библиотека перенесена. Исходные файлы сохранены.'
                      : 'Резервная копия восстановлена.'
                  )
                })
              }
            >
              {confirmRestore === 'desktop'
                ? 'Выбрать папку MyMind и перенести'
                : 'Выбрать файл и восстановить'}
            </button>
          </div>
        ) : null}
        <p className="hint">
          Поддерживается формат .mymindbackup текущей мобильной версии. Файлы проверяются потоково.
          Автоматического доступа к данным установленного приложения у браузера нет.
        </p>
      </section>
      <section>
        <h2>Оформление</h2>
        <label>
          Тема{' '}
          <select
            disabled={busy}
            value={appearance.theme}
            onChange={(event) =>
              save({ ...appearance, theme: event.target.value as AppearancePreferences['theme'] })
            }
          >
            <option value="system">Как в системе</option>
            <option value="light">Светлая</option>
            <option value="dark">Тёмная</option>
          </select>
        </label>
        <label>
          Акцент{' '}
          <select
            disabled={busy}
            value={appearance.accent}
            onChange={(event) =>
              save({ ...appearance, accent: event.target.value as AppearancePreferences['accent'] })
            }
          >
            <option value="violet">Фиолетовый</option>
            <option value="blue">Синий</option>
            <option value="emerald">Зелёный</option>
            <option value="amber">Янтарный</option>
            <option value="rose">Розовый</option>
          </select>
        </label>
      </section>
      <section>
        <h2>Установка и офлайн</h2>
        <p>
          {pwa.offlineReady
            ? 'Приложение подготовлено для работы без интернета.'
            : 'Офлайн-копия ещё не готова. Она создаётся при первом запуске production-сборки с интернетом.'}
        </p>
        {pwa.canInstall ? (
          <button onClick={() => void run(pwa.install)}>Установить MyMind</button>
        ) : (
          <p>
            На iPhone: откройте сайт в Safari → «Поделиться» → «На экран Домой». На Android
            используйте пункт установки в меню браузера.
          </p>
        )}
        <button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await pwa.checkForUpdates()
              setMessage('Проверка обновлений завершена.')
            })
          }
        >
          Проверить обновления
        </button>
        {pwa.updateReady ? (
          <p>Обновление загружено. Закройте все окна MyMind и откройте приложение снова.</p>
        ) : null}
        {pwa.error ? <p role="alert">Офлайн-режим: {pwa.error}</p> : null}
        <button
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
        >
          Запросить постоянное хранение
        </button>
      </section>
      <section>
        <h2>Переход на PWA</h2>
        <p>
          Эта версия работает параллельно с Android, iOS и desktop. База хранится в браузере;
          локальный LAN-сервис передаёт зашифрованные сообщения синхронизации без хранения базы на
          сервере.
        </p>
      </section>
      {busy ? <p role="status">Подождите, выполняется операция…</p> : null}
      {message ? <p role="status">{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  )
}
