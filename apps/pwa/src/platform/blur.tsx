import type { CSSProperties } from 'react'
import { View, StyleSheet, type ViewProps } from 'react-native'

export function BlurTargetView(props: ViewProps): React.JSX.Element {
  return <View {...props} />
}
export function BlurView({
  children,
  style,
  tint = 'default',
  intensity = 50
}: ViewProps & {
  tint?: 'default' | 'light' | 'dark'
  intensity?: number
  blurTarget?: unknown
  blurMethod?: string
}): React.JSX.Element {
  const blur = `blur(${Math.max(0, Math.min(100, intensity)) / 5}px)`
  return (
    <div
      aria-hidden
      style={
        {
          ...StyleSheet.flatten(style),
          pointerEvents: 'none',
          backdropFilter: blur,
          WebkitBackdropFilter: blur,
          backgroundColor: tint === 'light' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'
        } as CSSProperties
      }
    >
      {children}
    </div>
  )
}
