import { useEffect, useState } from 'react'

import type { SystemHealth } from '../../../../shared/contracts/system'

interface SystemHealthState {
  health: SystemHealth | null
  error: string | null
  isLoading: boolean
}

export function useSystemHealth(): SystemHealthState {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const checkSystemHealth = async (): Promise<void> => {
      try {
        const api = window.api

        if (!api?.system || typeof api.system.getHealth !== 'function') {
          throw new Error('Preload API is unavailable')
        }

        const result = await api.system.getHealth()

        if (mounted) {
          setHealth(result)
        }
      } catch (reason: unknown) {
        if (!mounted) {
          return
        }

        setError(reason instanceof Error ? reason.message : 'Unknown startup error')
      }
    }

    void checkSystemHealth()

    return () => {
      mounted = false
    }
  }, [])

  return {
    health,
    error,
    isLoading: health === null && error === null
  }
}
