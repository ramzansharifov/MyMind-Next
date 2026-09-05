import { createContext, useContext, type ReactNode } from 'react'

import './RichTextCapabilities.css'

const RichTextInternalLinksContext = createContext(true)

export function RichTextInternalLinksProvider({
  enabled,
  children
}: {
  enabled: boolean
  children: ReactNode
}): React.JSX.Element {
  return (
    <RichTextInternalLinksContext.Provider value={enabled}>
      <div
        className="contents"
        data-rich-text-internal-links={enabled ? 'enabled' : 'disabled'}
      >
        {children}
      </div>
    </RichTextInternalLinksContext.Provider>
  )
}

export function useRichTextInternalLinksEnabled(): boolean {
  return useContext(RichTextInternalLinksContext)
}
