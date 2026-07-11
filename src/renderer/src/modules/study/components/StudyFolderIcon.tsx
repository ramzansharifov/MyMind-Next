import {
  BookOpen,
  Briefcase,
  Calculator,
  Code2,
  FlaskConical,
  Folder,
  FolderOpen,
  GraduationCap,
  Landmark,
  Languages,
  Microscope,
  Music2,
  Palette,
  type LucideIcon
} from 'lucide-react'

import type { StudyFolderIconName } from '../../../../../shared/contracts/study'

interface StudyFolderIconProps {
  name?: StudyFolderIconName
  expanded?: boolean
  className?: string
}

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
  work: Briefcase
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
