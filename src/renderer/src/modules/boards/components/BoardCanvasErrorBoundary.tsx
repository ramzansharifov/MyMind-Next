import { TriangleAlert } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface BoardCanvasErrorBoundaryProps {
  children: ReactNode
  resetKey: string
  reload?: () => void
}

interface BoardCanvasErrorBoundaryState {
  error: Error | null
}

export class BoardCanvasErrorBoundary extends Component<
  BoardCanvasErrorBoundaryProps,
  BoardCanvasErrorBoundaryState
> {
  state: BoardCanvasErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoardCanvasErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('Ошибка редактора доски', error, info.componentStack)
      return
    }

    console.error('Ошибка редактора доски')
  }

  componentDidUpdate(previousProps: BoardCanvasErrorBoundaryProps): void {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <section
        role="alert"
        aria-label="Ошибка редактора доски"
        className="flex h-full min-h-0 items-center justify-center bg-[var(--app-workspace)] p-8"
      >
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-5 text-center">
          <TriangleAlert aria-hidden="true" className="mx-auto size-6 text-red-300" />
          <p className="mt-3 text-sm font-medium text-[var(--app-text)]">
            Не удалось загрузить редактор доски
          </p>
          <p className="mt-1 text-xs leading-5 text-red-200/75">
            Дерево и управление досками продолжают работать. Перезапустите приложение и попробуйте
            снова.
          </p>
          {import.meta.env.DEV && (
            <p className="mt-2 font-mono text-[11px] break-words text-red-200/60">
              {this.state.error.name}: {this.state.error.message}
            </p>
          )}
          <button
            type="button"
            className="mt-4 rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white"
            onClick={() => {
              const reload = this.props.reload ?? (() => window.location.reload())
              reload()
            }}
          >
            Перезагрузить приложение
          </button>
        </div>
      </section>
    )
  }
}
