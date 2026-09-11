import { Pressable, Text, View, useWindowDimensions } from 'react-native'
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
} from 'lucide-react-native'
import type { VisualIconFamily } from './visual-options'
import { AppIcon } from './icons'
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

export function groupColorValue(value: string | null | undefined, accent: string): string {
  if (!value || value === 'accent') return accent
  const colors: Record<string, string> = {
    violet: '#a78bfa',
    blue: '#60a5fa',
    cyan: '#22d3ee',
    emerald: '#34d399',
    amber: '#fbbf24',
    orange: '#fb923c',
    rose: '#fb7185',
    pink: '#f472b6'
  }
  return colors[value] ?? accent
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
    <View
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
    </View>
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
  choices: readonly { value: string | null; label: string }[]
  onChange(value: string): void
  disabled?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  const { width } = useWindowDimensions()
  const columns = width < 380 ? 4 : 5
  const gap = 8
  const available = Math.min(width - 64, 500)
  const tile = Math.max(52, Math.floor((available - gap * (columns - 1)) / columns))
  const selected = choices.find((choice) => choice.value === value)

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
        {choices.map((choice) => {
          if (choice.value === null) return null
          const active = choice.value === value
          return (
            <Pressable
              key={choice.value}
              accessibilityRole="button"
              accessibilityLabel={`Иконка: ${choice.label}`}
              accessibilityState={{ selected: active, disabled }}
              disabled={disabled}
              onPress={() => onChange(choice.value as string)}
              style={({ pressed }) => ({
                width: tile,
                height: tile,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 15,
                borderWidth: 1,
                borderColor: active ? theme.accent + '85' : theme.border,
                backgroundColor: active
                  ? theme.accent + '18'
                  : pressed
                    ? theme.raised
                    : theme.surface,
                opacity: disabled ? 0.42 : pressed ? 0.74 : 1
              })}
            >
              <VisualIconGlyph
                value={choice.value}
                size={22}
                color={active ? theme.accent : theme.muted}
                strokeWidth={active ? 2.4 : 2}
              />
            </Pressable>
          )
        })}
      </View>
      <View
        style={{
          minHeight: 42,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
          paddingHorizontal: 11,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 13,
          backgroundColor: theme.surface
        }}
      >
        <VisualIconGlyph value={value} size={17} color={theme.accent} />
        <Text style={{ flex: 1, color: theme.muted, fontSize: 12.5 }}>
          {selected?.label ?? value}
        </Text>
        <AppIcon name="check" size={15} color={theme.accent} />
      </View>
    </View>
  )
}

export function AppColorGrid({
  value,
  choices,
  onChange,
  disabled = false
}: {
  value: string
  choices: readonly { value: string | null; label: string }[]
  onChange(value: string): void
  disabled?: boolean
}): React.JSX.Element {
  const theme = useTheme()

  return (
    <View style={{ gap: 9 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {choices.map((choice) => {
          if (choice.value === null) return null
          const active = choice.value === value
          const color = groupColorValue(choice.value, theme.accent)
          return (
            <Pressable
              key={choice.value}
              accessibilityRole="button"
              accessibilityLabel={`Цвет: ${choice.label}`}
              accessibilityState={{ selected: active, disabled }}
              disabled={disabled}
              onPress={() => onChange(choice.value as string)}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 14,
                borderWidth: active ? 2 : 1,
                borderColor: active ? color : theme.border,
                backgroundColor: theme.surface,
                opacity: disabled ? 0.42 : pressed ? 0.72 : 1
              })}
            >
              <View
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
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
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
    <View
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
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{ color: theme.text, fontSize: 14, lineHeight: 19, fontWeight: '700' }}
        >
          {title.trim() || 'Название группы'}
        </Text>
        <Text style={{ marginTop: 2, color: theme.muted, fontSize: 11.5, lineHeight: 16 }}>
          {description}
        </Text>
      </View>
    </View>
  )
}
