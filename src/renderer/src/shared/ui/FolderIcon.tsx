import {
  Archive,
  Atom,
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
  Cloud,
  Code2,
  Compass,
  Database,
  Dna,
  DollarSign,
  Download,
  Dumbbell,
  Files,
  FlaskConical,
  Folder,
  FolderOpen,
  Gamepad2,
  Globe,
  GraduationCap,
  HeartPulse,
  Home,
  Landmark,
  Languages,
  Lightbulb,
  ListChecks,
  Mail,
  Map,
  Microscope,
  Music2,
  Network,
  Notebook,
  Palette,
  PenTool,
  Rocket,
  Scale,
  Shield,
  ShoppingCart,
  Star,
  Sun,
  Target,
  Trophy,
  User,
  Users,
  type LucideIcon
} from 'lucide-react'

import type { StudyFolderIconName } from '../../../../shared/contracts/study'

interface FolderIconProps {
  name?: StudyFolderIconName
  expanded?: boolean
  className?: string
}

export const FOLDER_ICON_SIDEBAR_CLASS_NAME = 'size-4 shrink-0'

const folderIcons: Record<Exclude<StudyFolderIconName, 'folder'>, LucideIcon> = {
  book: BookOpen,
  graduation: GraduationCap,
  science: FlaskConical,
  calculator: Calculator,
  code: Code2,
  languages: Languages,
  history: Landmark,
  microscope: Microscope,
  art: Palette,
  music: Music2,
  work: Briefcase,
  archive: Archive,
  physics: Atom,
  brain: Brain,
  organization: Building2,
  photography: Camera,
  finance: DollarSign,
  biology: Dna,
  geography: Globe,
  medicine: HeartPulse,
  ideas: Lightbulb,
  travel: Map,
  notes: Notebook,
  design: PenTool,
  projects: Rocket,
  law: Scale,
  favorites: Star,
  goals: Target,
  personal: User,
  documents: Files,
  downloads: Download,
  team: Users,
  weather: Sun,
  sport: Dumbbell,
  reminders: Bell,
  bookmarks: Bookmark,
  resources: Box,
  calendar: Calendar,
  cloud: Cloud,
  direction: Compass,
  database: Database,
  games: Gamepad2,
  home: Home,
  mail: Mail,
  network: Network,
  security: Shield,
  shopping: ShoppingCart,
  achievements: Trophy,
  checklist: ListChecks
}

export function FolderIcon({
  name = 'folder',
  expanded = false,
  className
}: FolderIconProps): React.JSX.Element {
  if (name === 'folder') {
    const Icon = expanded ? FolderOpen : Folder

    return (
      <Icon
        aria-hidden="true"
        data-folder-icon-state={expanded ? 'open' : 'closed'}
        className={className}
      />
    )
  }

  const Icon = folderIcons[name]

  return <Icon aria-hidden="true" data-folder-icon-name={name} className={className} />
}
