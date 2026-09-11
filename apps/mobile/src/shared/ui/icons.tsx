import { Text, type TextStyle } from 'react-native'

export type AppIconName =
  | 'home'
  | 'study'
  | 'boards'
  | 'notes'
  | 'tasks'
  | 'habits'
  | 'more'
  | 'movies'
  | 'music'
  | 'calendar'
  | 'diary'
  | 'workouts'
  | 'nutrition'
  | 'finance'
  | 'passwords'
  | 'settings'
  | 'search'
  | 'add'
  | 'edit'
  | 'delete'
  | 'back'
  | 'forward'
  | 'move'
  | 'reset'
  | 'check'
  | 'skip'
  | 'close'
  | 'folder'
  | 'info'

const glyphs: Record<AppIconName, string> = {
  home: '⌂',
  study: '◇',
  boards: '▦',
  notes: '▤',
  tasks: '✓',
  habits: '↻',
  more: '•••',
  movies: '▷',
  music: '♪',
  calendar: '◫',
  diary: '♡',
  workouts: '◆',
  nutrition: '◌',
  finance: '$',
  passwords: '⌘',
  settings: '⚙',
  search: '⌕',
  add: '+',
  edit: '✎',
  delete: '×',
  back: '‹',
  forward: '›',
  move: '↗',
  reset: '↺',
  check: '✓',
  skip: '→',
  close: '×',
  folder: '□',
  info: 'i'
}

export function AppIcon({
  name,
  size = 18,
  color,
  style
}: {
  name: AppIconName
  size?: number
  color: string
  style?: TextStyle
}): React.JSX.Element {
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          minWidth: size * 1.25,
          color,
          fontSize: size,
          lineHeight: Math.round(size * 1.15),
          fontWeight: '700',
          textAlign: 'center',
          includeFontPadding: false
        },
        style
      ]}
    >
      {glyphs[name]}
    </Text>
  )
}
