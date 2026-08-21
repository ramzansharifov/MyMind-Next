import type { ReactNode } from 'react'

import { RichTextInternalLinksProvider } from './rich-text/RichTextCapabilities'
import { StudyBlockAssetContext, type StudyBlockAssetClient } from './study-block-asset-context'

export function StudyBlockAssetProvider({
  client,
  children
}: {
  client: StudyBlockAssetClient
  children: ReactNode
}): React.JSX.Element {
  return (
    <StudyBlockAssetContext.Provider value={client}>
      <RichTextInternalLinksProvider enabled={client.capabilities?.internalLinks !== false}>
        {children}
      </RichTextInternalLinksProvider>
    </StudyBlockAssetContext.Provider>
  )
}
