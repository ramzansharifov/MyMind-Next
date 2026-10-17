import { Component, type ErrorInfo, type ReactNode } from 'react'

export class ModuleErrorBoundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: '' }
  static getDerivedStateFromError(error: Error): { error: string } {
    return { error: error.message }
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('MyMind PWA module error', error, info.componentStack)
  }
  render(): ReactNode {
    return this.state.error ? (
      <div role="alert">
        <h2>Не удалось открыть раздел</h2>
        <p>{this.state.error}</p>
        <p>Локальные данные сохранены. Можно перейти в другой раздел через меню.</p>
      </div>
    ) : (
      this.props.children
    )
  }
}
