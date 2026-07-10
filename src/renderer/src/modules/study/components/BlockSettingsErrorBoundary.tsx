import { Component, type ReactNode } from 'react'

interface BlockSettingsErrorBoundaryProps {
  children: ReactNode
}

interface BlockSettingsErrorBoundaryState {
  hasError: boolean
}

export class BlockSettingsErrorBoundary extends Component<
  BlockSettingsErrorBoundaryProps,
  BlockSettingsErrorBoundaryState
> {
  state: BlockSettingsErrorBoundaryState = {
    hasError: false
  }

  static getDerivedStateFromError(): BlockSettingsErrorBoundaryState {
    return {
      hasError: true
    }
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false
    })
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <aside className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-4">
        <p className="text-sm font-medium text-red-300">Не удалось открыть настройки блока</p>

        <p className="mt-2 text-xs leading-5 text-red-200/70">
          Сам редактор продолжает работать. Попробуй повторно открыть панель.
        </p>

        <button
          type="button"
          className="mt-4 rounded-lg border border-red-500/25 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-500/10"
          onClick={this.handleRetry}
        >
          Повторить
        </button>
      </aside>
    )
  }
}
