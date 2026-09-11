import type { StyleProp, ViewStyle } from 'react-native'
import {
  ArrowLeft,
  ArrowRight,
  BookHeart,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Disc3,
  Dumbbell,
  Film,
  Folder,
  GraduationCap,
  House,
  Info,
  KeyRound,
  ListTodo,
  MoreHorizontal,
  MoveRight,
  Notebook,
  Pencil,
  Plus,
  Presentation,
  Repeat2,
  RotateCcw,
  Search,
  Settings,
  Trash2,
  Utensils,
  Wallet,
  X,
  type LucideIcon
} from 'lucide-react-native'

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
  | 'down'
  | 'clock'
  | 'copy'
  | 'move'
  | 'reset'
  | 'check'
  | 'skip'
  | 'close'
  | 'folder'
  | 'info'
  | 'help'

const icons: Record<AppIconName, LucideIcon> = {
  home: House,
  study: GraduationCap,
  boards: Presentation,
  notes: Notebook,
  tasks: ListTodo,
  habits: Repeat2,
  more: MoreHorizontal,
  movies: Film,
  music: Disc3,
  calendar: CalendarDays,
  diary: BookHeart,
  workouts: Dumbbell,
  nutrition: Utensils,
  finance: Wallet,
  passwords: KeyRound,
  settings: Settings,
  search: Search,
  add: Plus,
  edit: Pencil,
  delete: Trash2,
  back: ChevronLeft,
  forward: ChevronRight,
  down: ChevronDown,
  clock: Clock3,
  copy: Copy,
  move: MoveRight,
  reset: RotateCcw,
  check: Check,
  skip: ArrowRight,
  close: X,
  folder: Folder,
  info: Info,
  help: CircleHelp
}

export function AppIcon({
  name,
  size = 18,
  color,
  strokeWidth = 2,
  style
}: {
  name: AppIconName
  size?: number
  color: string
  strokeWidth?: number
  style?: StyleProp<ViewStyle>
}): React.JSX.Element {
  const Icon = icons[name]
  return (
    <Icon
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      style={style}
    />
  )
}

export const BackIcon = ArrowLeft
