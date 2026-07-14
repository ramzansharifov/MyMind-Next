import { AlertTriangle } from 'lucide-react'
import { Suspense, useEffect, useRef, useState } from 'react'

import type { ShutdownRequest } from '../../shared/contracts/system'

import { AppShell } from './app/AppShell'
import { AppErrorBoundary } from './app/AppErrorBoundary'
import { getAppModule } from './app/module-registry'
import { type AppViewId } from './app/navigation'
import { AppearanceProvider } from './app/appearance/AppearanceProvider'
import { flushActiveStudyDraft } from './modules/study/lib/study-draft-lifecycle'

type AppFlushFailure =
  | { kind: 'view'; target: AppViewId; message: string }
  | { kind: 'shutdown'; request: ShutdownRequest; message: string }

function AppContent(): React.JSX.Element {
  const [activeView, setActiveView] = useState<AppViewId>('study')
  const [isSaving, setIsSaving] = useState(false)
  const [flushFailure, setFlushFailure] = useState<AppFlushFailure | null>(null)
  const [forceArmed, setForceArmed] = useState(false)
  const transitionPendingRef = useRef(false)
  const activeModule = getAppModule(activeView)
  const ActiveModule = activeModule.component

  async function changeView(target: AppViewId): Promise<void> {
    if (target === activeView || transitionPendingRef.current) return

    transitionPendingRef.current = true
    setIsSaving(true)

    try {
      await flushActiveStudyDraft()
      setFlushFailure(null)
      setActiveView(target)
    } catch (reason: unknown) {
      setFlushFailure({
        kind: 'view',
        target,
        message: reason instanceof Error ? reason.message : 'Не удалось сохранить изменения.'
      })
    } finally {
      transitionPendingRef.current = false
      setIsSaving(false)
    }
  }

  useEffect(
    () =>
      window.api.system.onShutdownRequested((request) => {
        transitionPendingRef.current = true
        setIsSaving(true)

        void flushActiveStudyDraft()
          .then(async () => {
            await window.api.system.respondToShutdown({ ...request, decision: 'success' })
          })
          .catch(async (reason: unknown) => {
            await window.api.system.respondToShutdown({ ...request, decision: 'failed' })
            setFlushFailure({
              kind: 'shutdown',
              request,
              message: reason instanceof Error ? reason.message : 'Не удалось сохранить изменения.'
            })
          })
          .finally(() => {
            transitionPendingRef.current = false
            setIsSaving(false)
          })
      }),
    []
  )

  return (
    <AppShell
      activeView={activeView}
      onViewChange={(view) => {
        void changeView(view)
      }}
    >
      <AppErrorBoundary scope={activeModule.id} resetKey={activeModule.id}>
        <Suspense fallback={<AppViewLoadingFallback label={activeModule.loadingLabel} />}>
          <ActiveModule />
        </Suspense>
      </AppErrorBoundary>
      {isSaving && (
        <div
          role="status"
          className="fixed right-5 bottom-5 z-[80] rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-4 py-3 text-sm shadow-2xl"
        >
          Сохраняем изменения…
        </div>
      )}
      {flushFailure && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-5 shadow-2xl">
            <div className="flex gap-3">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-red-300" />
              <div>
                <h2 className="font-semibold">Изменения не сохранены</h2>
                <p className="mt-1 text-sm text-[var(--app-muted)]">{flushFailure.message}</p>
                {forceArmed && (
                  <p className="mt-3 text-xs leading-5 text-red-200">
                    Несохранённые изменения будут потеряны. Подтвердите действие повторным нажатием.
                  </p>
                )}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm text-[var(--app-muted)]"
                onClick={() => {
                  if (flushFailure.kind === 'shutdown') {
                    void window.api.system.respondToShutdown({
                      ...flushFailure.request,
                      decision: 'cancel'
                    })
                  }
                  setFlushFailure(null)
                  setForceArmed(false)
                }}
              >
                Остаться
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--app-border)] px-3 py-2 text-sm"
                onClick={() => {
                  const failure = flushFailure
                  setFlushFailure(null)
                  if (failure.kind === 'view') {
                    void changeView(failure.target)
                  } else {
                    setIsSaving(true)
                    void flushActiveStudyDraft()
                      .then(async () => {
                        await window.api.system.respondToShutdown({
                          ...failure.request,
                          decision: 'success'
                        })
                      })
                      .catch(async (reason: unknown) => {
                        await window.api.system.respondToShutdown({
                          ...failure.request,
                          decision: 'failed'
                        })
                        setFlushFailure({
                          ...failure,
                          message: reason instanceof Error ? reason.message : failure.message
                        })
                      })
                      .finally(() => setIsSaving(false))
                  }
                }}
              >
                Повторить
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200"
                onClick={() => {
                  if (!forceArmed) {
                    setForceArmed(true)
                    return
                  }
                  if (flushFailure.kind === 'view') {
                    setActiveView(flushFailure.target)
                    setFlushFailure(null)
                  } else {
                    void window.api.system.respondToShutdown({
                      ...flushFailure.request,
                      decision: 'force'
                    })
                  }
                }}
              >
                {forceArmed
                  ? 'Подтвердить потерю'
                  : flushFailure.kind === 'shutdown'
                    ? 'Закрыть без сохранения'
                    : 'Перейти без сохранения'}
              </button>
            </div>
          </div>
        </div>
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
    <AppErrorBoundary scope="приложение">
      <AppearanceProvider>
        <AppContent />
      </AppearanceProvider>
    </AppErrorBoundary>
  )
}

export default App
