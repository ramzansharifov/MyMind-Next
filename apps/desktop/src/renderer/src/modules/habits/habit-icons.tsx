import {
  BookOpen,
  Brain,
  Briefcase,
  Code2,
  Droplet,
  Dumbbell,
  Folder,
  HeartPulse,
  Home,
  Leaf,
  Moon,
  Music2,
  Sparkles,
  Sun,
  User,
  Wallet,
  type LucideIcon
} from 'lucide-react'
import type { HabitGroupIcon } from '../../../../shared/contracts/habits'

const iconByName: Record<HabitGroupIcon, LucideIcon> = {
  folder: Folder,
  sparkles: Sparkles,
  dumbbell: Dumbbell,
  'book-open': BookOpen,
  'heart-pulse': HeartPulse,
  brain: Brain,
  droplet: Droplet,
  moon: Moon,
  sun: Sun,
  leaf: Leaf,
  music: Music2,
  briefcase: Briefcase,
  home: Home,
  wallet: Wallet,
  code: Code2,
  user: User
}

export function HabitGroupIconGlyph({
  icon,
  className
}: {
  icon: HabitGroupIcon
  className?: string
}): React.JSX.Element {
  const Icon = iconByName[icon]
  return <Icon aria-hidden="true" className={className} />
}
