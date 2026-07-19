import { TriangleAlert } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface AppErrorBoundaryProps {
  children: ReactNode
  scope: string
  resetKey?: string
  reload?: () => void
}

interface AppErrorBoundaryState {
  error: Error | null
  errorId: string | null
  componentStack: string | null
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null,
    errorId: null,
    componentStack: null
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      error,
      errorId: createErrorId(),
      componentStack: null
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const errorId = this.state.errorId ?? createErrorId()
    const label = `Ошибка интерфейса (${this.props.scope}) [${errorId}]`

    if (import.meta.env.DEV) {
      console.error(label, error, info.componentStack)
    } else {
      console.error(label)
    }

    this.setState({
      errorId,
      componentStack: info.componentStack ?? null
    })
  }

  componentDidUpdate(previousProps: AppErrorBoundaryProps): void {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.reset()
    }
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children

    const lazyImportFailed = isLazyImportError(this.state.error)
    const diagnostics = createDiagnostics(
      this.props.scope,
      this.state.errorId,
      this.state.error,
      this.state.componentStack
    )

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
          {this.state.errorId && (
            <p className="mt-3 font-mono text-[11px] text-[var(--app-muted)]">
              Код ошибки: {this.state.errorId}
            </p>
          )}
          {import.meta.env.DEV && (
            <pre className="mt-4 max-h-44 overflow-auto rounded-lg bg-black/25 p-3 text-left text-[11px] leading-4 whitespace-pre-wrap text-red-200/75">
              {diagnostics}
            </pre>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white"
              onClick={() => {
                if (lazyImportFailed) {
                  const reload = this.props.reload ?? (() => window.location.reload())
                  reload()
                  return
                }

                this.reset()
              }}
            >
              {lazyImportFailed ? 'Перезагрузить приложение' : 'Повторить'}
            </button>
            {import.meta.env.DEV && (
              <button
                type="button"
                className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm font-medium text-[var(--app-text)]"
                onClick={() => {
                  void copyDiagnosticText(diagnostics)
                }}
              >
                Скопировать диагностику
              </button>
            )}
          </div>
        </div>
      </section>
    )
  }

  private reset(): void {
    this.setState({
      error: null,
      errorId: null,
      componentStack: null
    })
  }
}

export function isLazyImportError(error: Error): boolean {
  const message = `${error.name} ${error.message}`.toLowerCase()

  return (
    message.includes('chunkloaderror') ||
    message.includes('loading chunk') ||
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('failed to load module script')
  )
}

function createErrorId(): string {
  const randomId = globalThis.crypto?.randomUUID?.()
  return randomId ? `ui-${randomId}` : `ui-${Date.now().toString(36)}`
}

function createDiagnostics(
  scope: string,
  errorId: string | null,
  error: Error,
  componentStack: string | null
): string {
  return [
    `scope: ${scope}`,
    `errorId: ${errorId ?? 'unknown'}`,
    `name: ${error.name}`,
    `message: ${error.message}`,
    `stack:\n${error.stack ?? '(нет)'}`,
    `componentStack:\n${componentStack ?? '(нет)'}`
  ].join('\n\n')
}

async function copyDiagnosticText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}
