import { useEffect, useState } from 'react'

interface InstallEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwa(): {
  offlineReady: boolean
  online: boolean
  updateReady: boolean
  error: string
  canInstall: boolean
  install(): Promise<void>
  checkForUpdates(): Promise<void>
} {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>()
  const [offlineReady, setOfflineReady] = useState(false)
  const [updateReady, setUpdateReady] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [error, setError] = useState('')
  useEffect(() => {
    const install = (event: Event): void => {
      event.preventDefault()
      setInstallEvent(event as InstallEvent)
    }
    const installed = (): void => setInstallEvent(null)
    const status = (): void => setOnline(navigator.onLine)
    window.addEventListener('beforeinstallprompt', install)
    window.addEventListener('appinstalled', installed)
    window.addEventListener('online', status)
    window.addEventListener('offline', status)
    return () => {
      window.removeEventListener('beforeinstallprompt', install)
      window.removeEventListener('appinstalled', installed)
      window.removeEventListener('online', status)
      window.removeEventListener('offline', status)
    }
  }, [])
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    let active = true
    const cleanups: Array<() => void> = []
    void navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((value) => {
        if (!active) return
        setRegistration(value)
        const refresh = (): void => {
          if (active) {
            setOfflineReady(Boolean(value.active))
            setUpdateReady(Boolean(value.waiting))
          }
        }
        const watch = (): void => {
          const worker = value.installing
          if (worker) {
            worker.addEventListener('statechange', refresh)
            cleanups.push(() => worker.removeEventListener('statechange', refresh))
          }
          refresh()
        }
        value.addEventListener('updatefound', watch)
        navigator.serviceWorker.addEventListener('controllerchange', refresh)
        cleanups.push(
          () => value.removeEventListener('updatefound', watch),
          () => navigator.serviceWorker.removeEventListener('controllerchange', refresh)
        )
        watch()
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason))
      })
    return () => {
      active = false
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [])

  return {
    offlineReady,
    online,
    updateReady,
    error,
    canInstall: installEvent !== null,
    async install() {
      if (!installEvent) return
      await installEvent.prompt()
      await installEvent.userChoice
      setInstallEvent(null)
    },
    async checkForUpdates() {
      if (!registration)
        throw new Error(
          'Проверка обновлений доступна в production-сборке после регистрации офлайн-режима.'
        )
      await registration.update()
    }
  }
}
