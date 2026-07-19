import { cn } from '../lib/cn'

export function getModuleSidebarLayoutClassName(collapsed: boolean): string {
  return cn(
    'grid h-full min-h-0 overflow-hidden',
    'transition-[grid-template-columns] duration-200 ease-out',
    'motion-reduce:transition-none',
    collapsed ? 'grid-cols-[64px_minmax(0,1fr)]' : 'grid-cols-[280px_minmax(0,1fr)]'
  )
}
