import { useEffect, useState } from 'react'

import type { SystemHealth } from '../../shared/contracts/system'

function App(): React.JSX.Element {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    window.api.system
      .getHealth()
      .then((result) => {
        if (mounted) {
          setHealth(result)
        }
      })
      .catch((reason: unknown) => {
        if (!mounted) {
          return
        }

        setError(reason instanceof Error ? reason.message : 'Unknown startup error')
      })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100">
      <section className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
        <p className="text-sm font-medium text-violet-400">MyMind Next</p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Local-first personal OS</h1>

        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Electron, React, TypeScript, Tailwind, Drizzle and SQLite are ready.
        </p>

        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          {error && <p className="text-sm text-red-400">Database error: {error}</p>}

          {!health && !error && <p className="text-sm text-zinc-400">Checking local database…</p>}

          {health && (
            <div>
              <p className="text-sm font-medium text-emerald-400">Database ready</p>
              <p className="mt-1 text-sm text-zinc-500">SQLite {health.sqliteVersion}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
