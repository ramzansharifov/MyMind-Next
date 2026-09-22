import type { StyleProp, ViewStyle } from 'react-native'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpRight,
  BookHeart,
  BrainCircuit,
  BarChart3,
  Braces,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheckBig,
  CircleHelp,
  Disc3,
  Download,
  Film,
  Folder,
  Heart,
  House,
  Info,
  KeyRound,
  ListTodo,
  Menu,
  MoreHorizontal,
  MoveRight,
  Notebook,
  Pencil,
  Play,
  Plus,
  Repeat2,
  RotateCcw,
  Search,
  Settings,
  Tag,
  Trash2,
  Utensils,
  Wallet,
  X,
  type LucideIcon
} from 'lucide-react-native'

export type AppIconName =
  | 'brand'
  | 'home'
  | 'notes'
  | 'tasks'
  | 'habits'
  | 'movies'
  | 'menu'
  | 'more'
  | 'music'
  | 'calendar'
  | 'chart'
  | 'circle'
  | 'completed'
  | 'diary'
  | 'download'
  | 'nutrition'
  | 'finance'
  | 'income'
  | 'expense'
  | 'transfer'
  | 'passwords'
  | 'settings'
  | 'search'
  | 'add'
  | 'edit'
  | 'delete'
  | 'back'
  | 'forward'
  | 'down'
  | 'up'
  | 'clock'
  | 'copy'
  | 'move'
  | 'reset'
  | 'check'
  | 'skip'
  | 'close'
  | 'folder'
  | 'tag'
  | 'info'
  | 'help'
  | 'json'
  | 'favorite'
  | 'play'

const icons: Record<AppIconName, LucideIcon> = {
  brand: BrainCircuit,
  home: House,
  notes: Notebook,
  tasks: ListTodo,
  habits: Repeat2,
  movies: Film,
  menu: Menu,
  more: MoreHorizontal,
  music: Disc3,
  calendar: CalendarDays,
  chart: BarChart3,
  circle: Circle,
  completed: CircleCheckBig,
  diary: BookHeart,
  download: Download,
  nutrition: Utensils,
  finance: Wallet,
  income: ArrowDownLeft,
  expense: ArrowUpRight,
  transfer: ArrowRightLeft,
  passwords: KeyRound,
  settings: Settings,
  search: Search,
  add: Plus,
  edit: Pencil,
  delete: Trash2,
  back: ChevronLeft,
  forward: ChevronRight,
  down: ChevronDown,
  up: ChevronUp,
  clock: Clock3,
  copy: Copy,
  move: MoveRight,
  reset: RotateCcw,
  check: Check,
  skip: ArrowRight,
  close: X,
  folder: Folder,
  tag: Tag,
  info: Info,
  help: CircleHelp,
  json: Braces,
  favorite: Heart,
  play: Play
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
