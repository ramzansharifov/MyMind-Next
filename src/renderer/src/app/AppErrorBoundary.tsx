import { Component, type ErrorInfo, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'

interface AppErrorBoundaryProps {
  children: ReactNode
  scope: string
  resetKey?: string
  reload?: () => void
}

interface AppErrorBoundaryState {
  error: Error | null
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error(`Ошибка интерфейса (${this.props.scope})`, error, info.componentStack)
      return
    }

    console.error(`Ошибка интерфейса (${this.props.scope})`)
  }

  componentDidUpdate(previousProps: AppErrorBoundaryProps): void {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children

    const lazyImportFailed = isLazyImportError(this.state.error)

    return (
      <section
        role="alert"
        className="flex h-full items-center justify-center bg-[var(--app-workspace)] p-6 text-[var(--app-text)]"
      >
        <div className="max-w-md rounded-2xl border border-red-500/25 bg-[var(--app-surface)] p-6 text-center">
          <TriangleAlert aria-hidden className="mx-auto size-8 text-red-400" />
          <h1 className="mt-3 text-lg font-semibold">Не удалось открыть раздел</h1>
          <p className="mt-2 text-sm text-[var(--app-muted)]">
            Ошибка изолирована. Попробуйте восстановить раздел или перейти в другой модуль.
          </p>
          <button
            type="button"
            className="mt-5 rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white"
            onClick={() => {
              if (lazyImportFailed) {
                const reload = this.props.reload ?? (() => window.location.reload())
                reload()
                return
              }

              this.setState({ error: null })
            }}
          >
            {lazyImportFailed ? 'Перезагрузить приложение' : 'Повторить'}
          </button>
        </div>
      </section>
    )
  }
}

export function isLazyImportError(error: Error): boolean {
  const message = `${error.name} ${error.message}`.toLowerCase()

  return (
    message.includes('chunkloaderror') ||
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('importing a module script failed')
  )
}
