import { useViewport, Action } from '../../../ui/browser'
import {
  Archive,
  Atom,
  Banknote,
  Bell,
  Bookmark,
  BookOpen,
  Box,
  Brain,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  Camera,
  Car,
  CircleDollarSign,
  Cloud,
  Code2,
  Coins,
  Compass,
  CreditCard,
  Database,
  Dna,
  Download,
  Droplet,
  Dumbbell,
  Files,
  FlaskConical,
  Folder,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  HeartPulse,
  Home,
  KeyRound,
  Landmark,
  Languages,
  Leaf,
  Lightbulb,
  ListChecks,
  Mail,
  Map,
  Microscope,
  Moon,
  Music2,
  Network,
  Notebook,
  Palette,
  PenTool,
  PiggyBank,
  Plane,
  Receipt,
  Repeat2,
  Rocket,
  Scale,
  Shield,
  ShoppingCart,
  Sparkles,
  Star,
  Sun,
  Tag,
  Target,
  TrendingUp,
  Trophy,
  User,
  Users,
  Utensils,
  Wallet,
  type LucideIcon
} from 'lucide-react'
import type { VisualIconFamily } from './visual-options'
import { AppIcon } from './icons'
import { groupColorValue } from './visual-colors'
import { useTheme } from './theme'
const visualIcons: Record<string, LucideIcon> = {
  folder: Folder,
  book: BookOpen,
  'book-open': BookOpen,
  graduation: GraduationCap,
  'graduation-cap': GraduationCap,
  science: FlaskConical,
  calculator: Calculator,
  code: Code2,
  languages: Languages,
  history: Landmark,
  landmark: Landmark,
  microscope: Microscope,
  art: Palette,
  music: Music2,
  work: Briefcase,
  briefcase: Briefcase,
  archive: Archive,
  physics: Atom,
  brain: Brain,
  organization: Building2,
  photography: Camera,
  finance: Wallet,
  wallet: Wallet,
  biology: Dna,
  geography: Globe,
  globe: Globe,
  medicine: HeartPulse,
  'heart-pulse': HeartPulse,
  ideas: Lightbulb,
  travel: Map,
  notes: Notebook,
  design: PenTool,
  projects: Rocket,
  rocket: Rocket,
  law: Scale,
  favorites: Star,
  goals: Target,
  reminders: Bell,
  bell: Bell,
  bookmarks: Bookmark,
  resources: Box,
  calendar: Calendar,
  cloud: Cloud,
  direction: Compass,
  database: Database,
  games: Gamepad2,
  gamepad: Gamepad2,
  home: Home,
  mail: Mail,
  network: Network,
  security: Shield,
  shield: Shield,
  shopping: ShoppingCart,
  'shopping-cart': ShoppingCart,
  achievements: Trophy,
  checklist: ListChecks,
  personal: User,
  user: User,
  documents: Files,
  downloads: Download,
  team: Users,
  weather: Sun,
  sport: Dumbbell,
  dumbbell: Dumbbell,
  sparkles: Sparkles,
  droplet: Droplet,
  moon: Moon,
  sun: Sun,
  leaf: Leaf,
  plane: Plane,
  'key-round': KeyRound,
  'credit-card': CreditCard,
  banknote: Banknote,
  'piggy-bank': PiggyBank,
  coins: Coins,
  utensils: Utensils,
  car: Car,
  gift: Gift,
  receipt: Receipt,
  'circle-dollar-sign': CircleDollarSign,
  'trending-up': TrendingUp,
  'repeat-2': Repeat2,
  tag: Tag
}
export function VisualIconGlyph({
  value,
  size = 20,
  color,
  strokeWidth = 2
}: {
  family?: VisualIconFamily
  value: string
  size?: number
  color: string
  strokeWidth?: number
}): React.JSX.Element {
  const Icon = visualIcons[value] ?? Folder
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />
}
export function VisualIconBadge({
  value,
  colorKey,
  size = 38
}: {
  family?: VisualIconFamily
  value: string
  colorKey?: string | null
  size?: number
}): React.JSX.Element {
  const theme = useTheme()
  const color = groupColorValue(colorKey, theme.accent)
  return (
    <div
      className="ui-stack"
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: Math.round(size * 0.31),
        borderWidth: 1,
        borderColor: color + '42',
        backgroundColor: color + '16'
      }}
    >
      <VisualIconGlyph value={value} size={Math.round(size * 0.47)} color={color} />
    </div>
  )
}
export function AppIconGrid({
  value,
  choices,
  onChange,
  disabled = false
}: {
  family: VisualIconFamily
  value: string
  choices: readonly {
    value: string | null
    label: string
  }[]
  onChange(value: string): void
  disabled?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  const { width } = useViewport()
  const columns = width < 380 ? 4 : 5
  const gap = 8
  const available = Math.min(width - 64, 500)
  const tile = Math.max(52, Math.floor((available - gap * (columns - 1)) / columns))
  const selected = choices.find((choice) => choice.value === value)
  return (
    <div
      className="ui-stack"
      style={{
        gap: 10
      }}
    >
      <div
        className="ui-stack"
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: gap
        }}
      >
        {choices.map((choice) => {
          if (choice.value === null) return null
          const active = choice.value === value
          return (
            <Action
              key={choice.value}
              role={'button'}
              aria-label={`Иконка: ${choice.label}`}
              aria-selected={active}
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => onChange(choice.value as string)}
              style={{
                width: tile,
                height: tile,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 15,
                borderWidth: 1,
                borderColor: active ? theme.accent + '85' : theme.border,
                backgroundColor: active ? theme.accent + '18' : theme.surface,
                opacity: disabled ? 0.42 : 1
              }}
              pressedStyle={{
                backgroundColor: active ? theme.accent + '18' : theme.raised,
                opacity: disabled ? 0.42 : 0.74
              }}
            >
              <VisualIconGlyph
                value={choice.value}
                size={22}
                color={active ? theme.accent : theme.muted}
                strokeWidth={active ? 2.4 : 2}
              />
            </Action>
          )
        })}
      </div>
      <div
        className="ui-stack"
        style={{
          minHeight: 42,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
          paddingInline: 11,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 13,
          backgroundColor: theme.surface
        }}
      >
        <VisualIconGlyph value={value} size={17} color={theme.accent} />
        <span
          className="ui-text"
          style={{
            flex: '1 1 0%',
            color: theme.muted,
            fontSize: 12.5
          }}
        >
          {selected?.label ?? value}
        </span>
        <AppIcon name="check" size={15} color={theme.accent} />
      </div>
    </div>
  )
}
export function AppColorGrid({
  value,
  choices,
  onChange,
  disabled = false
}: {
  value: string
  choices: readonly {
    value: string | null
    label: string
  }[]
  onChange(value: string): void
  disabled?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        gap: 9
      }}
    >
      <div
        className="ui-stack"
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8
        }}
      >
        {choices.map((choice) => {
          if (choice.value === null) return null
          const active = choice.value === value
          const color = groupColorValue(choice.value, theme.accent)
          return (
            <Action
              key={choice.value}
              role={'button'}
              aria-label={`Цвет: ${choice.label}`}
              aria-selected={active}
              aria-disabled={disabled}
              disabled={disabled}
              onClick={() => onChange(choice.value as string)}
              style={{
                width: 48,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 14,
                borderWidth: active ? 2 : 1,
                borderColor: active ? color : theme.border,
                backgroundColor: theme.surface,
                opacity: disabled ? 0.42 : 1
              }}
              pressedStyle={{
                opacity: disabled ? 0.42 : 0.72
              }}
            >
              <div
                className="ui-stack"
                style={{
                  width: 24,
                  height: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  backgroundColor: color
                }}
              >
                {active ? <AppIcon name="check" size={14} color="#ffffff" strokeWidth={3} /> : null}
              </div>
            </Action>
          )
        })}
      </div>
    </div>
  )
}
export function VisualGroupPreview({
  title,
  icon,
  colorKey,
  description
}: {
  family: VisualIconFamily
  title: string
  icon: string
  colorKey?: string | null
  description: string
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 15,
        backgroundColor: theme.surface
      }}
    >
      <VisualIconBadge value={icon} colorKey={colorKey} />
      <div
        className="ui-stack"
        style={{
          flex: '1 1 0%',
          minWidth: 0
        }}
      >
        <span
          className="ui-text"
          data-lines={1}
          style={{
            color: theme.text,
            fontSize: 14,
            lineHeight: '19px',
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 1
          }}
        >
          {title.trim() || 'Название группы'}
        </span>
        <span
          className="ui-text"
          style={{
            marginTop: 2,
            color: theme.muted,
            fontSize: 11.5,
            lineHeight: '16px'
          }}
        >
          {description}
        </span>
      </div>
    </div>
  )
}
