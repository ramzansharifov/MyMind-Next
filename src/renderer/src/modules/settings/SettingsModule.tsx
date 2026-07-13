import { useSystemHealth } from '../../shared/hooks/use-system-health'
import { SettingsPage } from './SettingsPage'

export function SettingsModule(): React.JSX.Element {
  const systemHealth = useSystemHealth()

  return (
    <SettingsPage
      health={systemHealth.health}
      error={systemHealth.error}
      isLoading={systemHealth.isLoading}
    />
  )
}
