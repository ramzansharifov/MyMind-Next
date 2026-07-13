import {
  Archive,
  Atom,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  Calculator,
  Camera,
  Code2,
  Dna,
  DollarSign,
  Dumbbell,
  FlaskConical,
  Folder,
  FolderOpen,
  Globe,
  GraduationCap,
  HeartPulse,
  Landmark,
  Languages,
  Lightbulb,
  Map,
  Microscope,
  Music2,
  Notebook,
  Palette,
  PenTool,
  Rocket,
  Scale,
  Star,
  Target,
  type LucideIcon
} from 'lucide-react'

import type { StudyFolderIconName } from '../../../../../shared/contracts/study'

interface StudyFolderIconProps {
  name?: StudyFolderIconName
  expanded?: boolean
  className?: string
}

export const STUDY_FOLDER_ICON_SIDEBAR_CLASS_NAME = 'size-4 shrink-0'

const studyFolderIcons: Record<Exclude<StudyFolderIconName, 'folder'>, LucideIcon> = {
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
  sport: Dumbbell
}

export function StudyFolderIcon({
  name = 'folder',
  expanded = false,
  className
}: StudyFolderIconProps): React.JSX.Element {
  if (name === 'folder') {
    const Icon = expanded ? FolderOpen : Folder

    return <Icon aria-hidden="true" className={className} />
  }

  const Icon = studyFolderIcons[name]

  return <Icon aria-hidden="true" className={className} />
}
