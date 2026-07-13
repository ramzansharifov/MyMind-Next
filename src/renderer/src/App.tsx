import { useState } from 'react'

import { AppShell } from './app/AppShell'
import { type AppViewId } from './app/navigation'
import { SettingsPage } from './modules/settings/SettingsPage'
import { StudyPage } from './modules/study/StudyPage'
import { useSystemHealth } from './shared/hooks/use-system-health'
import { AppearanceProvider } from './app/appearance/AppearanceProvider'

function AppContent(): React.JSX.Element {
  const [activeView, setActiveView] = useState<AppViewId>('study')
  const systemHealth = useSystemHealth()

  return (
    <AppShell activeView={activeView} onViewChange={setActiveView}>
      {activeView === 'study' && <StudyPage />}

      {activeView === 'settings' && (
        <SettingsPage
          health={systemHealth.health}
          error={systemHealth.error}
          isLoading={systemHealth.isLoading}
        />
      )}
    </AppShell>
  )
}

function App(): React.JSX.Element {
  return (
    <AppearanceProvider>
      <AppContent />
    </AppearanceProvider>
  )
}

export default App
