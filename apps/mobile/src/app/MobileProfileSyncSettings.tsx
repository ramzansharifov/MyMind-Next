import { useEffect, useMemo, useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import {
  type LanSyncDevice,
  type LocalProfile,
  type ProfileGender,
  type SyncModule,
  type SyncResult
} from '@mymind/contracts/profile-sync'

import { notifyDataChanged } from './changes'
import { useServices } from './context'
import { Button, ErrorState, Label } from '../shared/ui/primitives'
import { WorkspaceNodeCard, WorkspacePanel } from '../shared/ui/Workspace'
import { useTheme } from '../shared/ui/theme'
import { messageFor } from '../shared/ui/form-model'
import { MOBILE_SYNC_MODULES } from '../shared/sync/lanSyncClient'

type MobileSyncModule = Exclude<SyncModule, 'workouts'>

const moduleLabels: Record<MobileSyncModule, string> = {
  notes: 'Заметки',
  tasks: 'Задачи',
  habits: 'Привычки',
  movies: 'Фильмы',
  music: 'Музыка',
  calendar: 'Календарь',
  diary: 'Дневник',
  nutrition: 'Питание',
  finance: 'Финансы',
  passwords: 'Пароли'
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
  const [selectedModules, setSelectedModules] = useState<Set<MobileSyncModule>>(() => new Set())
  const [busy, setBusy] = useState<'profile' | 'scan' | 'sync' | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const current = profileApi.getProfile()
    setProfile(current)
    setLogin(current?.login ?? '')
    setName(current?.name ?? '')
    setGender(current?.gender ?? null)
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
    try {
      const found = await lanSync.discover(manualHost)
      setDevices(found)
      setSelectedDeviceId((current) =>
        found.some((device) => device.deviceId === current) ? current : (found[0]?.deviceId ?? null)
      )
      setMessage(
        found.length
          ? `Найдено устройств MyMind: ${found.length}.`
          : 'В этой локальной сети устройства MyMind не найдены.'
      )
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setBusy(null)
    }
  }

  const runSync = async (modules: readonly SyncModule[]): Promise<void> => {
    if (busy || !selectedDevice) return
    setBusy('sync')
    setError('')
    setMessage('')
    try {
      const result = await lanSync.sync(selectedDevice, modules)
      notifyDataChanged()
      setMessage(resultText(result))
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
    minHeight: 44,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: theme.text,
    backgroundColor: theme.background
  } as const

  return (
    <View style={{ gap: 14 }}>
      <WorkspacePanel
        title="Профиль"
        description="Профиль нужен только для связи ваших устройств. Обязательны логин и пароль."
        icon="settings"
      >
        <View style={{ gap: 12 }}>
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
                primary
                disabled={Boolean(busy)}
                onPress={() => void saveProfile()}
              />
              <Button
                label="Сменить логин / пароль"
                disabled={Boolean(busy) || !password}
                onPress={() => void replaceCredentials()}
              />
            </View>
          )}

          <Label muted>
            Пароль не сохраняется в базе и не отправляется компьютеру. Оба устройства доказывают,
            что знают одинаковый пароль, с помощью криптографического challenge-response.
          </Label>
        </View>
      </WorkspacePanel>

      {profile ? (
        <WorkspacePanel
          title="Синхронизация по локальной сети"
          description="Телефон и компьютер должны находиться в одной Wi-Fi / LAN сети."
          icon="settings"
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
                Обычно MyMind найдёт компьютер автоматически. IP нужен только если сеть блокирует
                автоматический поиск. Если компьютер не находится, проверьте, что Windows разрешил
                MyMind доступ к частной сети в брандмауэре.
              </Label>
            </View>

            <Button
              label={busy === 'scan' ? 'Ищем устройства…' : 'Найти компьютеры MyMind'}
              primary
              disabled={Boolean(busy)}
              onPress={() => void scan()}
            />

            {devices.map((device) => (
              <WorkspaceNodeCard
                key={device.deviceId}
                title={device.deviceName}
                subtitle={`${device.host}:${device.port} · ${device.modules.length} общих модулей`}
                leadingIcon="settings"
                selected={selectedDeviceId === device.deviceId}
                onPress={() => setSelectedDeviceId(device.deviceId)}
              />
            ))}

            {selectedDevice ? (
              <View style={{ gap: 12 }}>
                <View
                  style={{
                    height: 1,
                    backgroundColor: theme.border,
                    marginVertical: 2
                  }}
                />
                <Label title>Что синхронизировать</Label>
                <Label muted>
                  Для одного модуля просто выберите его ниже. Можно выбрать несколько, а для полного
                  обмена используйте отдельную кнопку «Синхронизировать все данные».
                </Label>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {MOBILE_SYNC_MODULES.filter((module) =>
                    selectedDevice.modules.includes(module)
                  ).map((module) => (
                    <Button
                      key={module}
                      label={moduleLabels[module]}
                      selected={selectedModules.has(module)}
                      disabled={Boolean(busy)}
                      onPress={() => toggleModule(module)}
                    />
                  ))}
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Button
                    label={busy === 'sync' ? 'Синхронизация…' : 'Синхронизировать выбранные'}
                    primary
                    disabled={Boolean(busy) || selectedModules.size === 0}
                    onPress={() =>
                      void runSync(
                        MOBILE_SYNC_MODULES.filter(
                          (module) =>
                            selectedModules.has(module) && selectedDevice.modules.includes(module)
                        )
                      )
                    }
                  />
                  <Button
                    label="Синхронизировать все данные"
                    disabled={Boolean(busy)}
                    onPress={() =>
                      void runSync(
                        MOBILE_SYNC_MODULES.filter((module) =>
                          selectedDevice.modules.includes(module)
                        )
                      )
                    }
                  />
                </View>

                <Label muted>
                  «Обучение», «Доски» и «Тренировки» являются desktop-only и здесь намеренно
                  отсутствуют. Если хранилища паролей создавались независимо, MyMind остановит
                  синхронизацию паролей вместо риска повредить vault.
                </Label>
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
