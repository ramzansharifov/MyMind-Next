import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

interface StandardModulePageProps {
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function StandardModulePage({
  children,
  className,
  contentClassName
}: StandardModulePageProps): React.JSX.Element {
  return (
    <div
      data-standard-module-page
      className={cn(
        'h-full min-h-0 overflow-y-auto bg-[var(--app-workspace)] px-8 py-7',
        'max-[700px]:px-4 max-[700px]:py-5',
        className
      )}
    >
      <div
        data-standard-module-container
        className={cn('mx-auto w-full max-w-[1440px]', contentClassName)}
      >
        {children}
      </div>
    </div>
  )
}
