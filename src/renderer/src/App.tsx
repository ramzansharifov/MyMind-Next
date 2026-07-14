import { Suspense, useState } from 'react'

import { AppShell } from './app/AppShell'
import { AppErrorBoundary } from './app/AppErrorBoundary'
import { getAppModule } from './app/module-registry'
import { type AppViewId } from './app/navigation'
import { AppearanceProvider } from './app/appearance/AppearanceProvider'

function AppContent(): React.JSX.Element {
  const [activeView, setActiveView] = useState<AppViewId>('study')
  const activeModule = getAppModule(activeView)
  const ActiveModule = activeModule.component

  return (
    <AppShell activeView={activeView} onViewChange={setActiveView}>
      <AppErrorBoundary scope={activeModule.id} resetKey={activeModule.id}>
        <Suspense fallback={<AppViewLoadingFallback label={activeModule.loadingLabel} />}>
          <ActiveModule />
        </Suspense>
      </AppErrorBoundary>
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
    <AppErrorBoundary scope="приложение">
      <AppearanceProvider>
        <AppContent />
      </AppearanceProvider>
    </AppErrorBoundary>
  )
}

export default App
