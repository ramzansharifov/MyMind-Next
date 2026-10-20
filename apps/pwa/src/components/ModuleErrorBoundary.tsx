import { Component, type ErrorInfo, type ReactNode } from 'react'
import { View } from 'react-native'
import { ErrorState, Label } from '../../../mobile/src/shared/ui/primitives'

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
      <View style={{ padding: 12, gap: 8 }}>
        <ErrorState message={`Не удалось открыть раздел: ${this.state.error}`} />
        <Label muted>Данные не удалены. Можно перейти в другой раздел через меню.</Label>
      </View>
    ) : (
      this.props.children
    )
  }
}
