import { Text, View } from 'react-native'

import type { MobileUpdaterController } from './useMobileUpdater'
import { Button, ErrorState, Label } from '../shared/ui/primitives'
import { WorkspacePanel } from '../shared/ui/Workspace'
import { useTheme } from '../shared/ui/theme'

function formatBytes(value: number | null): string {
  if (!value || value <= 0) return '—'
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} МБ`
  if (value >= 1024) return `${Math.round(value / 1024)} КБ`
  return `${value} Б`
}

function statusText(updater: MobileUpdaterController): string {
  const { status } = updater
  switch (status.phase) {
    case 'checking':
      return 'Проверяем наличие новой версии…'
    case 'available':
      return status.available
        ? `Доступна версия ${status.available.version}`
        : 'Доступно обновление'
    case 'downloading':
      return `Скачивание обновления: ${Math.round(status.percent ?? 0)}%`
    case 'installing':
      return 'Системный установщик Android открыт.'
    case 'up-to-date':
      return 'Установлена последняя доступная версия.'
    case 'unsupported':
      return 'APK-обновления доступны только в Android-версии MyMind.'
    case 'error':
      return 'Не удалось выполнить обновление.'
    default:
      return 'MyMind автоматически проверяет новые версии после запуска.'
  }
}

export function MobileUpdateSettings({
  updater
}: {
  updater: MobileUpdaterController
}): React.JSX.Element {
  const theme = useTheme()
  const { status } = updater
  const busy = status.phase === 'checking' || status.phase === 'downloading'

  return (
    <WorkspacePanel
      title="Обновления"
      description="Новые Android-версии MyMind загружаются только после вашего подтверждения."
      icon="download"
    >
      <View style={{ gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Label title>Текущая версия</Label>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>
            v{status.currentVersion}
          </Text>
        </View>

        <View
          style={{
            gap: 6,
            padding: 12,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            backgroundColor: theme.background
          }}
        >
          <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>
            {statusText(updater)}
          </Text>

          {status.phase === 'downloading' ? (
            <>
              <View
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: Math.round(status.percent ?? 0)
                }}
                style={{
                  height: 7,
                  overflow: 'hidden',
                  borderRadius: 999,
                  backgroundColor: theme.border
                }}
              >
                <View
                  style={{
                    width: `${Math.max(0, Math.min(100, status.percent ?? 0))}%`,
                    height: '100%',
                    borderRadius: 999,
                    backgroundColor: theme.accent
                  }}
                />
              </View>
              <Text style={{ color: theme.muted, fontSize: 11 }}>
                {formatBytes(status.transferred)} / {formatBytes(status.total)}
              </Text>
            </>
          ) : null}

          {status.available ? (
            <Text style={{ color: theme.muted, fontSize: 11 }}>
              APK: {formatBytes(status.available.size)}
            </Text>
          ) : null}

          {status.lastCheckedAt ? (
            <Text style={{ color: theme.muted, fontSize: 11 }}>
              Последняя проверка: {new Date(status.lastCheckedAt).toLocaleString('ru-RU')}
            </Text>
          ) : null}
        </View>

        {status.error ? <ErrorState message={status.error} /> : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {status.phase === 'available' ? (
            <Button
              label="Обновить"
              icon="download"
              primary
              disabled={busy}
              onPress={() => void updater.update()}
            />
          ) : null}

          <Button
            label={status.phase === 'checking' ? 'Проверяем…' : 'Проверить обновления'}
            icon="reset"
            disabled={busy || status.phase === 'unsupported'}
            onPress={() => void updater.check()}
          />
        </View>

        <Label muted>
          MyMind проверяет GitHub Releases примерно через 15 секунд после запуска и затем раз в 4
          часа. APK не скачивается автоматически. После загрузки Android откроет системный
          установщик; при первом обновлении система может попросить разрешить установку приложений
          из MyMind.
        </Label>
      </View>
    </WorkspacePanel>
  )
}
