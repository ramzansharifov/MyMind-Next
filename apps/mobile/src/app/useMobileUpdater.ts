import { useCallback, useEffect, useRef, useState } from 'react'

import {
  checkRemoteMobileRelease,
  downloadAndOpenMobileUpdate,
  getInstalledMobileVersion,
  mobileUpdatesSupported
} from '../shared/update/mobileUpdate'
import {
  initialMobileUpdateStatus,
  type MobileUpdateStatus
} from '../shared/update/mobileUpdateCore'

const STARTUP_CHECK_DELAY_MS = 15_000
const PERIODIC_CHECK_MS = 4 * 60 * 60_000

function errorMessage(reason: unknown): string {
  if (reason instanceof Error && reason.name === 'AbortError') {
    return 'Проверка обновлений заняла слишком много времени'
  }
  return reason instanceof Error ? reason.message : String(reason)
}

export interface MobileUpdaterController {
  status: MobileUpdateStatus
  check(): Promise<void>
  update(): Promise<void>
}

export function useMobileUpdater(): MobileUpdaterController {
  const busyRef = useRef(false)
  const [status, setStatus] = useState<MobileUpdateStatus>(() => {
    const currentVersion = getInstalledMobileVersion()
    if (!mobileUpdatesSupported()) {
      return {
        ...initialMobileUpdateStatus(currentVersion),
        phase: 'unsupported'
      }
    }
    return initialMobileUpdateStatus(currentVersion)
  })

  const check = useCallback(async (): Promise<void> => {
    if (!mobileUpdatesSupported() || busyRef.current) return
    busyRef.current = true

    setStatus((current) => {
      if (current.phase === 'downloading' || current.phase === 'installing') return current
      return {
        ...current,
        phase: 'checking',
        percent: null,
        transferred: null,
        total: null,
        error: null
      }
    })

    const currentVersion = getInstalledMobileVersion()

    try {
      const available = await checkRemoteMobileRelease(currentVersion)
      setStatus({
        currentVersion,
        phase: available ? 'available' : 'up-to-date',
        available,
        percent: null,
        transferred: null,
        total: available?.size || null,
        lastCheckedAt: new Date().toISOString(),
        error: null
      })
    } catch (reason) {
      setStatus((current) => ({
        ...current,
        currentVersion,
        phase: 'error',
        lastCheckedAt: new Date().toISOString(),
        error: errorMessage(reason)
      }))
    } finally {
      busyRef.current = false
    }
  }, [])

  const update = useCallback(async (): Promise<void> => {
    const release = status.available
    if (!release || !mobileUpdatesSupported() || busyRef.current) return
    busyRef.current = true

    setStatus((current) => ({
      ...current,
      phase: 'downloading',
      percent: 0,
      transferred: 0,
      total: release.size || null,
      error: null
    }))

    try {
      await downloadAndOpenMobileUpdate(release, ({ transferred, total, percent }) => {
        setStatus((current) => ({
          ...current,
          phase: 'downloading',
          percent,
          transferred,
          total
        }))
      })

      setStatus((current) => ({
        ...current,
        phase: 'installing',
        percent: 100,
        transferred: current.total ?? current.transferred,
        error: null
      }))
    } catch (reason) {
      setStatus((current) => ({
        ...current,
        phase: 'error',
        error: errorMessage(reason)
      }))
    } finally {
      busyRef.current = false
    }
  }, [status.available])

  useEffect(() => {
    if (!mobileUpdatesSupported()) return undefined

    const startupTimer = setTimeout(() => {
      void check()
    }, STARTUP_CHECK_DELAY_MS)

    const periodicTimer = setInterval(() => {
      void check()
    }, PERIODIC_CHECK_MS)

    return () => {
      clearTimeout(startupTimer)
      clearInterval(periodicTimer)
    }
  }, [check])

  return { status, check, update }
}
