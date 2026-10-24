import { TextControl, Toggle } from '../../ui/browser'
import { useEffect, useMemo, useState } from 'react'
import {
  type LanSyncDevice,
  type LocalProfile,
  type MobileSyncModule,
  type ProfileGender,
  type SyncResult
} from '@mymind/contracts/profile-sync'
import { notifyDataChanged } from './changes'
import { useServices } from './context'
import { Button, ErrorState, Label } from '../shared/ui/primitives'
import { WorkspaceNodeCard, WorkspacePanel } from '../shared/ui/Workspace'
import { AppIcon, type AppIconName } from '../shared/ui/icons'
import { useTheme } from '../shared/ui/theme'
import { messageFor } from '../shared/ui/form-model'
import type { SyncPreview } from '../../sync/types'
const modulePresentation: Record<
  MobileSyncModule,
  {
    label: string
    description: string
    icon: AppIconName
  }
> = {
  notes: {
    label: 'Заметки',
    description: 'Заметки, группы и вложения',
    icon: 'notes'
  },
  tasks: {
    label: 'Задачи',
    description: 'Задачи и группы задач',
    icon: 'tasks'
  },
  habits: {
    label: 'Привычки',
    description: 'Привычки, группы и отметки выполнения',
    icon: 'habits'
  },
  movies: {
    label: 'Фильмы',
    description: 'Фильмы, сериалы и их данные',
    icon: 'movies'
  },
  music: {
    label: 'Музыка',
    description: 'Треки, плейлисты и состав плейлистов',
    icon: 'music'
  },
  calendar: {
    label: 'Календарь',
    description: 'События, повторения и напоминания',
    icon: 'calendar'
  },
  diary: {
    label: 'Дневник',
    description: 'Дневники, дни и записи',
    icon: 'diary'
  },
  nutrition: {
    label: 'Питание',
    description: 'Продукты, рецепты, дневник, вода и цели',
    icon: 'nutrition'
  },
  finance: {
    label: 'Финансы',
    description: 'Счета, операции, шаблоны, теги, лимиты и курсы',
    icon: 'finance'
  },
  passwords: {
    label: 'Пароли',
    description: 'Хранилище, группы и записи паролей',
    icon: 'passwords'
  }
}
function resultText(result: SyncResult): string {
  const received = result.modules.reduce((sum, module) => sum + module.received, 0)
  const sent = result.modules.reduce((sum, module) => sum + module.sent, 0)
  const deleted = result.modules.reduce((sum, module) => sum + module.deleted, 0)
  const conflicts = result.modules.reduce((sum, module) => sum + module.conflicts, 0)
  return `Готово: получено ${received}, отправлено ${sent}, удалений ${deleted}, конфликтов ${conflicts}.`
}
export function MobileProfileSyncSettings(): React.JSX.Element {
  const theme = useTheme()
  const { profile: profileApi, lanSync } = useServices()
  const [profile, setProfile] = useState<LocalProfile | null>(() => profileApi.getProfile())
  const [login, setLogin] = useState(profile?.login ?? '')
  const [password, setPassword] = useState('')
  const [name, setName] = useState(profile?.name ?? '')
  const [gender, setGender] = useState<ProfileGender>(profile?.gender ?? null)
  const [manualHost, setManualHost] = useState('')
  const [devices, setDevices] = useState<LanSyncDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [preview, setPreview] = useState<SyncPreview | null>(null)
  const [selectedModules, setSelectedModules] = useState<Set<MobileSyncModule>>(() => new Set())
  const [busy, setBusy] = useState<'profile' | 'scan' | 'preview' | 'sync' | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (!active) return
      const current = profileApi.getProfile()
      setProfile(current)
      setLogin(current?.login ?? '')
      setName(current?.name ?? '')
      setGender(current?.gender ?? null)
    })
    return () => {
      active = false
    }
  }, [profileApi])
  const selectedDevice = useMemo(
    () => devices.find((device) => device.deviceId === selectedDeviceId) ?? null,
    [devices, selectedDeviceId]
  )
  const createProfile = async (): Promise<void> => {
    if (busy) return
    setBusy('profile')
    setError('')
    setMessage('')
    try {
      const created = await profileApi.createProfile({
        login,
        password,
        name: name || null,
        gender
      })
      setProfile(created)
      setPassword('')
      setMessage('Профиль создан. Создайте на компьютере профиль с тем же логином и паролем.')
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setBusy(null)
    }
  }
  const saveProfile = async (): Promise<void> => {
    if (busy || !profile) return
    setBusy('profile')
    setError('')
    setMessage('')
    try {
      const updated = profileApi.updateProfile({ name: name || null, gender })
      setProfile(updated)
      setMessage('Имя и пол сохранены.')
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setBusy(null)
    }
  }
  const replaceCredentials = async (): Promise<void> => {
    if (busy || !profile) return
    if (!password) {
      setError('Введите новый пароль.')
      return
    }
    setBusy('profile')
    setError('')
    setMessage('')
    try {
      const updated = await profileApi.replaceCredentials({ login, password })
      setProfile(updated)
      setPassword('')
      setMessage('Логин и пароль синхронизации обновлены.')
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setBusy(null)
    }
  }
  const scan = async (): Promise<void> => {
    if (busy || !profile) return
    setBusy('scan')
    setError('')
    setMessage('')
    setPreview(null)
    setSelectedModules(new Set())
    setSelectedDeviceId(null)
    try {
      const found = await lanSync.discover(manualHost)
      setDevices(found)
      setMessage(
        found.length
          ? `Найдено компьютеров MyMind: ${found.length}. Выберите компьютер для подключения.`
          : 'В этой локальной сети компьютеры MyMind не найдены.'
      )
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setBusy(null)
    }
  }
  const connect = async (device: LanSyncDevice): Promise<void> => {
    if (busy) return
    setSelectedDeviceId(device.deviceId)
    setPreview(null)
    setSelectedModules(new Set())
    setBusy('preview')
    setError('')
    setMessage('')
    try {
      const next = await lanSync.preview(device)
      setPreview(next)
      setSelectedModules(new Set(next.modules.map((item) => item.module)))
      setMessage(`Подключено к «${device.deviceName}». Проверьте модули перед синхронизацией.`)
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setBusy(null)
    }
  }
  const runSync = async (): Promise<void> => {
    if (busy || !selectedDevice || !preview) return
    const modules = preview.modules
      .map((item) => item.module)
      .filter((module) => selectedModules.has(module))
    if (modules.length === 0) {
      setError('Выберите хотя бы один модуль для этой синхронизации.')
      return
    }
    setBusy('sync')
    setError('')
    setMessage('')
    try {
      const result = await lanSync.sync(selectedDevice, modules)
      notifyDataChanged()
      setMessage(resultText(result))
      const refreshed = await lanSync.preview(selectedDevice)
      setPreview(refreshed)
      setSelectedModules(new Set(refreshed.modules.map((item) => item.module)))
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setBusy(null)
    }
  }
  const toggleModule = (module: MobileSyncModule): void => {
    setSelectedModules((current) => {
      const next = new Set(current)
      if (next.has(module)) next.delete(module)
      else next.add(module)
      return next
    })
  }
  const inputStyle = {
    minHeight: 46,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingHorizontal: 13,
    color: theme.text,
    backgroundColor: theme.background
  } as const
  return (
    <div
      className="ui-stack"
      style={{
        gap: 14
      }}
    >
      <WorkspacePanel
        title="Профиль"
        description="Локальный профиль связывает ваши устройства. Пароль остаётся только у вас."
        icon="settings"
      >
        <div
          className="ui-stack"
          style={{
            gap: 12
          }}
        >
          {profile ? (
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.accent + '28',
                borderRadius: 16,
                backgroundColor: theme.accent + '0D'
              }}
            >
              <div
                className="ui-stack"
                style={{
                  width: 44,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 14,
                  backgroundColor: theme.accent + '18'
                }}
              >
                <AppIcon name="brand" size={21} color={theme.accent} />
              </div>
              <div
                className="ui-stack"
                style={{
                  flex: '1 1 0%',
                  minWidth: 0
                }}
              >
                <span
                  className="ui-text"
                  style={{
                    color: theme.text,
                    fontSize: 15,
                    fontWeight: 700
                  }}
                >
                  {profile.name?.trim() || profile.login}
                </span>
                <span
                  className="ui-text"
                  style={{
                    marginTop: 3,
                    color: theme.muted,
                    fontSize: 12
                  }}
                >
                  @{profile.login} · локальный профиль
                </span>
              </div>
            </div>
          ) : null}

          <div
            className="ui-stack"
            style={{
              gap: 6
            }}
          >
            <Label title>Логин *</Label>
            <TextControl
              value={login}
              aria-label={'Логин профиля'}
              disabled={!!busy}
              autoCapitalize={'none'}
              autoCorrect={'off'}
              style={inputStyle}
              onValueChange={setLogin}
            ></TextControl>
          </div>
          <div
            className="ui-stack"
            style={{
              gap: 6
            }}
          >
            <Label title>{profile ? 'Новый пароль для смены данных' : 'Пароль *'}</Label>
            <TextControl
              value={password}
              aria-label={'Пароль профиля'}
              disabled={!!busy}
              type={'password'}
              autoCapitalize={'none'}
              autoCorrect={'off'}
              style={inputStyle}
              onValueChange={setPassword}
            ></TextControl>
          </div>
          <div
            className="ui-stack"
            style={{
              gap: 6
            }}
          >
            <Label title>Имя</Label>
            <TextControl
              aria-label={'Имя профиля'}
              value={name}
              disabled={!!busy}
              style={inputStyle}
              onValueChange={setName}
            ></TextControl>
          </div>
          <div
            className="ui-stack"
            style={{
              gap: 8
            }}
          >
            <Label title>Пол</Label>
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              <Button
                label="Не указан"
                selected={gender === null}
                disabled={Boolean(busy)}
                onClick={() => setGender(null)}
              />
              <Button
                label="Мужской"
                selected={gender === 'male'}
                disabled={Boolean(busy)}
                onClick={() => setGender('male')}
              />
              <Button
                label="Женский"
                selected={gender === 'female'}
                disabled={Boolean(busy)}
                onClick={() => setGender('female')}
              />
            </div>
          </div>

          {!profile ? (
            <Button
              label={busy === 'profile' ? 'Создание…' : 'Создать профиль'}
              primary
              disabled={Boolean(busy)}
              onClick={() => void createProfile()}
            />
          ) : (
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              <Button
                label="Сохранить имя и пол"
                icon="check"
                primary
                disabled={Boolean(busy)}
                onClick={() => void saveProfile()}
              />
              <Button
                label="Сменить логин / пароль"
                icon="passwords"
                disabled={Boolean(busy) || !password}
                onClick={() => void replaceCredentials()}
              />
            </div>
          )}

          <Label muted>
            Пароль не сохраняется в базе и не отправляется компьютеру. Устройства подтверждают
            одинаковый пароль через защищённый challenge-response.
          </Label>
        </div>
      </WorkspacePanel>

      {profile ? (
        <WorkspacePanel
          title="Синхронизация по локальной сети"
          description="Найдите компьютер, подключитесь и выберите данные для текущего обмена."
          icon="download"
        >
          <div
            className="ui-stack"
            style={{
              gap: 12
            }}
          >
            <div
              className="ui-stack"
              style={{
                gap: 6
              }}
            >
              <Label title>IP компьютера — необязательно</Label>
              <TextControl
                value={manualHost}
                disabled={!!busy}
                placeholder={'Например, 192.168.1.25'}
                placeholderColor={theme.muted}
                autoCapitalize={'none'}
                autoCorrect={'off'}
                inputMode={'text'}
                style={inputStyle}
                onValueChange={setManualHost}
              ></TextControl>
              <Label muted>
                Обычно MyMind находит компьютер сам. Ручной IP нужен только если локальная сеть
                блокирует автоматический поиск.
              </Label>
            </div>

            <Button
              label={busy === 'scan' ? 'Ищем компьютеры…' : 'Найти компьютеры MyMind'}
              icon="search"
              primary
              disabled={Boolean(busy)}
              onClick={() => void scan()}
            />

            {devices.length ? (
              <div
                className="ui-stack"
                style={{
                  gap: 4
                }}
              >
                <Label title>Компьютеры</Label>
                {devices.map((device) => (
                  <WorkspaceNodeCard
                    key={device.deviceId}
                    title={device.deviceName}
                    subtitle={`${device.host}:${device.port} · ${device.modules.length} мобильных модулей`}
                    leadingIcon="brand"
                    selected={selectedDeviceId === device.deviceId}
                    onClick={() => void connect(device)}
                  />
                ))}
              </div>
            ) : null}

            {busy === 'preview' && selectedDevice ? (
              <div
                className="ui-stack"
                style={{
                  padding: 14,
                  borderWidth: 1,
                  borderColor: theme.accent + '32',
                  borderRadius: 16,
                  backgroundColor: theme.accent + '0B'
                }}
              >
                <span
                  className="ui-text"
                  style={{
                    color: theme.text,
                    fontSize: 13,
                    fontWeight: 600
                  }}
                >
                  Подключаемся к «{selectedDevice.deviceName}»…
                </span>
                <span
                  className="ui-text"
                  style={{
                    marginTop: 4,
                    color: theme.muted,
                    fontSize: 12,
                    lineHeight: '18px'
                  }}
                >
                  Проверяем профиль и собираем сводку данных на телефоне и компьютере.
                </span>
              </div>
            ) : null}

            {preview && selectedDevice ? (
              <div
                className="ui-stack"
                style={{
                  gap: 12
                }}
              >
                <div
                  className="ui-stack"
                  style={{
                    height: 1,
                    marginBlock: 2,
                    backgroundColor: theme.border
                  }}
                ></div>

                <div
                  className="ui-stack"
                  style={{
                    gap: 5
                  }}
                >
                  <span
                    className="ui-text"
                    style={{
                      color: theme.text,
                      fontSize: 16,
                      fontWeight: 700
                    }}
                  >
                    Что синхронизировать
                  </span>
                  <span
                    className="ui-text"
                    style={{
                      color: theme.muted,
                      fontSize: 12.5,
                      lineHeight: '18px'
                    }}
                  >
                    Включены все доступные мобильные модули. Выключите ненужные — выбор действует
                    только для этого запуска.
                  </span>
                </div>

                <div
                  className="ui-stack"
                  style={{
                    flexDirection: 'row',
                    gap: 8
                  }}
                >
                  <Button
                    label="Выбрать всё"
                    compact
                    disabled={Boolean(busy) || selectedModules.size === preview.modules.length}
                    onClick={() =>
                      setSelectedModules(new Set(preview.modules.map((item) => item.module)))
                    }
                  />
                  <Button
                    label="Снять всё"
                    compact
                    disabled={Boolean(busy) || selectedModules.size === 0}
                    onClick={() => setSelectedModules(new Set())}
                  />
                </div>

                <div
                  className="ui-stack"
                  style={{
                    gap: 8
                  }}
                >
                  {preview.modules.map((item) => {
                    const meta = modulePresentation[item.module]
                    const enabled = selectedModules.has(item.module)
                    return (
                      <div
                        className="ui-stack"
                        key={item.module}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          padding: 13,
                          borderWidth: 1,
                          borderColor: enabled ? theme.accent + '45' : theme.border,
                          borderRadius: 16,
                          backgroundColor: enabled ? theme.accent + '0B' : theme.surface,
                          opacity: enabled ? 1 : 0.72
                        }}
                      >
                        <div
                          className="ui-stack"
                          style={{
                            width: 42,
                            height: 42,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 13,
                            backgroundColor: enabled ? theme.accent + '16' : theme.raised
                          }}
                        >
                          <AppIcon
                            name={meta.icon}
                            size={19}
                            color={enabled ? theme.accent : theme.muted}
                          />
                        </div>

                        <div
                          className="ui-stack"
                          style={{
                            flex: '1 1 0%',
                            minWidth: 0
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
                            {meta.label}
                          </span>
                          <span
                            className="ui-text"
                            style={{
                              marginTop: 2,
                              color: theme.muted,
                              fontSize: 11.5,
                              lineHeight: '16px'
                            }}
                          >
                            {meta.description}
                          </span>
                          <span
                            className="ui-text"
                            style={{
                              marginTop: 6,
                              color: enabled ? theme.text : theme.muted,
                              fontSize: 11.5,
                              lineHeight: '16px'
                            }}
                          >
                            Телефон: {item.phone.records} · Компьютер: {item.computer.records}
                            {item.phone.deleted || item.computer.deleted
                              ? ` · удалений: ${item.phone.deleted + item.computer.deleted}`
                              : ''}
                          </span>
                        </div>

                        <Toggle
                          aria-label={`Синхронизация модуля «${meta.label}»`}
                          checked={enabled}
                          disabled={Boolean(busy)}
                          onValueChange={() => toggleModule(item.module)}
                          trackColors={{
                            false: theme.border,
                            true: theme.accent + '75'
                          }}
                          thumbColor={enabled ? theme.accent : theme.muted}
                        ></Toggle>
                      </div>
                    )
                  })}
                </div>

                <Button
                  label={
                    busy === 'sync'
                      ? 'Синхронизация…'
                      : `Синхронизировать · ${selectedModules.size} из ${preview.modules.length}`
                  }
                  icon="download"
                  primary
                  disabled={Boolean(busy) || selectedModules.size === 0}
                  onClick={() => void runSync()}
                />

                <div
                  className="ui-stack"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 9,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 14,
                    backgroundColor: theme.background
                  }}
                >
                  <AppIcon name="info" size={17} color={theme.accent} />
                  <span
                    className="ui-text"
                    style={{
                      flex: '1 1 0%',
                      color: theme.muted,
                      fontSize: 11.5,
                      lineHeight: '17px'
                    }}
                  >
                    Здесь отображаются только модули, которые существуют на телефоне. Desktop-only
                    разделы не могут попасть в мобильную синхронизацию. Для паролей дополнительно
                    действует защита совместимости vault.
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </WorkspacePanel>
      ) : null}

      {error ? <ErrorState message={error} /> : null}
      {message ? (
        <span
          className="ui-text"
          style={{
            color: theme.text,
            fontSize: 13,
            lineHeight: '19px'
          }}
        >
          {message}
        </span>
      ) : null}
    </div>
  )
}
