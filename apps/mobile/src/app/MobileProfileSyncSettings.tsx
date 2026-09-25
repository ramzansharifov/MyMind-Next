import { useEffect, useMemo, useState } from 'react'
import { Switch, Text, TextInput, View } from 'react-native'
import {
  MOBILE_SYNC_MODULES,
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
import type { MobileSyncPreview } from '../shared/sync/lanSyncClient'

const modulePresentation: Record<
  MobileSyncModule,
  { label: string; description: string; icon: AppIconName }
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
  const [preview, setPreview] = useState<MobileSyncPreview | null>(null)
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
      setMessage(
        `Подключено к «${device.deviceName}». Проверьте модули перед синхронизацией.`
      )
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
    <View style={{ gap: 14 }}>
      <WorkspacePanel
        title="Профиль"
        description="Локальный профиль связывает ваши устройства. Пароль остаётся только у вас."
        icon="settings"
      >
        <View style={{ gap: 12 }}>
          {profile ? (
            <View
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
              <View
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
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>
                  {profile.name?.trim() || profile.login}
                </Text>
                <Text style={{ marginTop: 3, color: theme.muted, fontSize: 12 }}>
                  @{profile.login} · локальный профиль
                </Text>
              </View>
            </View>
          ) : null}

          <View style={{ gap: 6 }}>
            <Label title>Логин *</Label>
            <TextInput
              value={login}
              editable={!busy}
              autoCapitalize="none"
              autoCorrect={false}
              style={inputStyle}
              onChangeText={setLogin}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Label title>{profile ? 'Новый пароль для смены данных' : 'Пароль *'}</Label>
            <TextInput
              value={password}
              editable={!busy}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={inputStyle}
              onChangeText={setPassword}
            />
          </View>
          <View style={{ gap: 6 }}>
            <Label title>Имя</Label>
            <TextInput value={name} editable={!busy} style={inputStyle} onChangeText={setName} />
          </View>
          <View style={{ gap: 8 }}>
            <Label title>Пол</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button
                label="Не указан"
                selected={gender === null}
                disabled={Boolean(busy)}
                onPress={() => setGender(null)}
              />
              <Button
                label="Мужской"
                selected={gender === 'male'}
                disabled={Boolean(busy)}
                onPress={() => setGender('male')}
              />
              <Button
                label="Женский"
                selected={gender === 'female'}
                disabled={Boolean(busy)}
                onPress={() => setGender('female')}
              />
            </View>
          </View>

          {!profile ? (
            <Button
              label={busy === 'profile' ? 'Создание…' : 'Создать профиль'}
              primary
              disabled={Boolean(busy)}
              onPress={() => void createProfile()}
            />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button
                label="Сохранить имя и пол"
                icon="check"
                primary
                disabled={Boolean(busy)}
                onPress={() => void saveProfile()}
              />
              <Button
                label="Сменить логин / пароль"
                icon="passwords"
                disabled={Boolean(busy) || !password}
                onPress={() => void replaceCredentials()}
              />
            </View>
          )}

          <Label muted>
            Пароль не сохраняется в базе и не отправляется компьютеру. Устройства подтверждают
            одинаковый пароль через защищённый challenge-response.
          </Label>
        </View>
      </WorkspacePanel>

      {profile ? (
        <WorkspacePanel
          title="Синхронизация по локальной сети"
          description="Найдите компьютер, подключитесь и выберите данные для текущего обмена."
          icon="download"
        >
          <View style={{ gap: 12 }}>
            <View style={{ gap: 6 }}>
              <Label title>IP компьютера — необязательно</Label>
              <TextInput
                value={manualHost}
                editable={!busy}
                placeholder="Например, 192.168.1.25"
                placeholderTextColor={theme.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
                style={inputStyle}
                onChangeText={setManualHost}
              />
              <Label muted>
                Обычно MyMind находит компьютер сам. Ручной IP нужен только если локальная сеть
                блокирует автоматический поиск.
              </Label>
            </View>

            <Button
              label={busy === 'scan' ? 'Ищем компьютеры…' : 'Найти компьютеры MyMind'}
              icon="search"
              primary
              disabled={Boolean(busy)}
              onPress={() => void scan()}
            />

            {devices.length ? (
              <View style={{ gap: 4 }}>
                <Label title>Компьютеры</Label>
                {devices.map((device) => (
                  <WorkspaceNodeCard
                    key={device.deviceId}
                    title={device.deviceName}
                    subtitle={`${device.host}:${device.port} · ${device.modules.length} мобильных модулей`}
                    leadingIcon="brand"
                    selected={selectedDeviceId === device.deviceId}
                    onPress={() => void connect(device)}
                  />
                ))}
              </View>
            ) : null}

            {busy === 'preview' && selectedDevice ? (
              <View
                style={{
                  padding: 14,
                  borderWidth: 1,
                  borderColor: theme.accent + '32',
                  borderRadius: 16,
                  backgroundColor: theme.accent + '0B'
                }}
              >
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>
                  Подключаемся к «{selectedDevice.deviceName}»…
                </Text>
                <Text style={{ marginTop: 4, color: theme.muted, fontSize: 12, lineHeight: 18 }}>
                  Проверяем профиль и собираем сводку данных на телефоне и компьютере.
                </Text>
              </View>
            ) : null}

            {preview && selectedDevice ? (
              <View style={{ gap: 12 }}>
                <View
                  style={{
                    height: 1,
                    marginVertical: 2,
                    backgroundColor: theme.border
                  }}
                />

                <View style={{ gap: 5 }}>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>
                    Что синхронизировать
                  </Text>
                  <Text style={{ color: theme.muted, fontSize: 12.5, lineHeight: 18 }}>
                    Включены все доступные мобильные модули. Выключите ненужные — выбор действует
                    только для этого запуска.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    label="Выбрать всё"
                    compact
                    disabled={Boolean(busy) || selectedModules.size === preview.modules.length}
                    onPress={() =>
                      setSelectedModules(new Set(preview.modules.map((item) => item.module)))
                    }
                  />
                  <Button
                    label="Снять всё"
                    compact
                    disabled={Boolean(busy) || selectedModules.size === 0}
                    onPress={() => setSelectedModules(new Set())}
                  />
                </View>

                <View style={{ gap: 8 }}>
                  {preview.modules.map((item) => {
                    const meta = modulePresentation[item.module]
                    const enabled = selectedModules.has(item.module)
                    return (
                      <View
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
                        <View
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
                        </View>

                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
                            {meta.label}
                          </Text>
                          <Text
                            style={{
                              marginTop: 2,
                              color: theme.muted,
                              fontSize: 11.5,
                              lineHeight: 16
                            }}
                          >
                            {meta.description}
                          </Text>
                          <Text
                            style={{
                              marginTop: 6,
                              color: enabled ? theme.text : theme.muted,
                              fontSize: 11.5,
                              lineHeight: 16
                            }}
                          >
                            Телефон: {item.phone.records} · Компьютер: {item.computer.records}
                            {item.phone.deleted || item.computer.deleted
                              ? ` · удалений: ${item.phone.deleted + item.computer.deleted}`
                              : ''}
                          </Text>
                        </View>

                        <Switch
                          accessibilityLabel={`Синхронизация модуля «${meta.label}»`}
                          value={enabled}
                          disabled={Boolean(busy)}
                          onValueChange={() => toggleModule(item.module)}
                          trackColor={{
                            false: theme.border,
                            true: theme.accent + '75'
                          }}
                          thumbColor={enabled ? theme.accent : theme.muted}
                        />
                      </View>
                    )
                  })}
                </View>

                <Button
                  label={
                    busy === 'sync'
                      ? 'Синхронизация…'
                      : `Синхронизировать · ${selectedModules.size} из ${preview.modules.length}`
                  }
                  icon="download"
                  primary
                  disabled={Boolean(busy) || selectedModules.size === 0}
                  onPress={() => void runSync()}
                />

                <View
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
                  <Text style={{ flex: 1, color: theme.muted, fontSize: 11.5, lineHeight: 17 }}>
                    Здесь отображаются только модули, которые существуют на телефоне. Desktop-only
                    разделы не могут попасть в мобильную синхронизацию. Для паролей дополнительно
                    действует защита совместимости vault.
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </WorkspacePanel>
      ) : null}

      {error ? <ErrorState message={error} /> : null}
      {message ? (
        <Text style={{ color: theme.text, fontSize: 13, lineHeight: 19 }}>{message}</Text>
      ) : null}
    </View>
  )
}

export const MOBILE_PROFILE_SYNC_MODULES = MOBILE_SYNC_MODULES
