import {
  BookHeart,
  BookOpen,
  Briefcase,
  Coffee,
  Feather,
  Heart,
  Leaf,
  Lightbulb,
  NotebookPen,
  Sparkles,
  type LucideIcon
} from 'lucide-react'

import type { DiaryIconName } from '../../../../../shared/contracts/diary'

const icons: Record<DiaryIconName, LucideIcon> = {
  'book-heart': BookHeart,
  'book-open': BookOpen,
  'notebook-pen': NotebookPen,
  feather: Feather,
  heart: Heart,
  briefcase: Briefcase,
  lightbulb: Lightbulb,
  sparkles: Sparkles,
  leaf: Leaf,
  coffee: Coffee
}

export function DiaryIcon({
  name,
  className
}: {
  name: DiaryIconName
  className?: string
}): React.JSX.Element {
  const Icon = icons[name]
  return <Icon aria-hidden="true" className={className} />
}
