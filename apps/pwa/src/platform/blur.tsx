import { View, type ViewProps } from 'react-native'

export function BlurTargetView(props: ViewProps): React.JSX.Element {
  return <View {...props} />
}
export function BlurView({ children, style }: ViewProps): React.JSX.Element {
  return <View style={[{ backgroundColor: 'rgba(20, 18, 30, 0.94)' }, style]}>{children}</View>
}
