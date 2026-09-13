import { View } from 'react-native'
import Svg, { Line, Polygon } from 'react-native-svg'
import type { StudyBlock } from '@mymind/contracts/study'

import { useTheme } from './theme'

type DividerBlock = Extract<StudyBlock, { type: 'divider' }>
type DividerSpacing = 'none' | 'read' | 'edit'

export function StudyDividerBlock({
  block,
  spacing = 'read'
}: {
  block: DividerBlock
  spacing?: DividerSpacing
}): React.JSX.Element {
  const theme = useTheme()
  const variant = block.variant ?? 'solid'
  const thickness = Math.max(1, Math.min(12, block.thickness ?? 1))
  const color =
    !block.color || block.color.toLowerCase() === '#6d5dfc' ? theme.accent : block.color
  const paddingVertical = spacing === 'edit' ? 32 : spacing === 'read' ? 16 : 0

  return (
    <View
      accessibilityRole="none"
      style={{
        width: '100%',
        minHeight: thickness + paddingVertical * 2,
        justifyContent: 'center',
        paddingVertical
      }}
    >
      {variant === 'tapered' ? (
        <Svg width="100%" height={thickness} viewBox="0 0 100 100" preserveAspectRatio="none">
          <Polygon
            points="0,50 18,40 38,16 50,0 62,16 82,40 100,50 82,60 62,84 50,100 38,84 18,60"
            fill={color}
          />
        </Svg>
      ) : variant === 'dashed' || variant === 'dotted' ? (
        <Svg width="100%" height={Math.max(thickness, 2)} viewBox="0 0 100 2" preserveAspectRatio="none">
          <Line
            x1="0"
            y1="1"
            x2="100"
            y2="1"
            stroke={color}
            strokeWidth={thickness}
            strokeDasharray={variant === 'dashed' ? '6 5' : '1 4'}
            strokeLinecap={variant === 'dotted' ? 'round' : 'butt'}
            vectorEffect="non-scaling-stroke"
          />
        </Svg>
      ) : (
        <View
          style={{
            width: '100%',
            height: thickness,
            borderRadius: 999,
            backgroundColor: color
          }}
        />
      )}
    </View>
  )
}
