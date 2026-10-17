import type { ReactNode } from 'react'
import { RichTextInternalLinksContext } from './rich-text-capabilities-context'

import './RichTextCapabilities.css'

export function RichTextInternalLinksProvider({
  enabled,
  children
}: {
  enabled: boolean
  children: ReactNode
}): React.JSX.Element {
  return (
    <RichTextInternalLinksContext.Provider value={enabled}>
      <div className="contents" data-rich-text-internal-links={enabled ? 'enabled' : 'disabled'}>
        {children}
      </div>
    </RichTextInternalLinksContext.Provider>
  )
}
