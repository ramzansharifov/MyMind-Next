import type { ReactNode } from 'react'

import '../assets/workspace-layout.css'

export type AppWorkspaceLayout = 'standard' | 'study' | 'boards'

interface WorkspaceLayoutProps {
  layout: AppWorkspaceLayout
  children: ReactNode
}

export function WorkspaceLayout({ layout, children }: WorkspaceLayoutProps): React.JSX.Element {
  return (
    <div
      data-workspace-layout={layout}
      className="h-full min-h-0 w-full overflow-hidden bg-[var(--app-workspace)]"
    >
      {children}
    </div>
  )
}
