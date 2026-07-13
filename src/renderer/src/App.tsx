import { lazy, Suspense, useState } from 'react'

import { AppShell } from './app/AppShell'
import { type AppViewId } from './app/navigation'
import { StudyPage } from './modules/study/StudyPage'
import { useSystemHealth } from './shared/hooks/use-system-health'
import { AppearanceProvider } from './app/appearance/AppearanceProvider'

const SettingsPage = lazy(() =>
  import('./modules/settings/SettingsPage').then((module) => ({
    default: module.SettingsPage
  }))
)

function AppContent(): React.JSX.Element {
  const [activeView, setActiveView] = useState<AppViewId>('study')
  const systemHealth = useSystemHealth()

  return (
    <AppShell activeView={activeView} onViewChange={setActiveView}>
      {activeView === 'study' && <StudyPage />}

      {activeView === 'settings' && (
        <Suspense fallback={<AppViewLoadingFallback label="Загрузка настроек" />}>
          <SettingsPage
            health={systemHealth.health}
            error={systemHealth.error}
            isLoading={systemHealth.isLoading}
          />
        </Suspense>
      )}
    </AppShell>
  )
}

function AppViewLoadingFallback({ label }: { label: string }): React.JSX.Element {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex h-full items-center justify-center bg-[var(--app-workspace)]"
    >
      <div className="grid w-full max-w-sm gap-3 px-6">
        <div className="h-7 w-2/3 animate-pulse rounded-lg bg-white/[0.07]" />
        <div className="h-24 animate-pulse rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]" />
      </div>
    </div>
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
