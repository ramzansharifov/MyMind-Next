import { useContext, useMemo, type ReactNode } from 'react'

import { RichTextInternalLinksProvider } from './rich-text/RichTextCapabilities'
import { StudyBlockAssetContext, type StudyBlockAssetClient } from './study-block-asset-context'

export function StudyBlockAssetProvider({
  client,
  children
}: {
  client: StudyBlockAssetClient
  children: ReactNode
}): React.JSX.Element {
  const parent = useContext(StudyBlockAssetContext)
  const resolvedClient = useMemo(() => ({ ...client, resolveAssetUri: client.resolveAssetUri ?? parent.resolveAssetUri }), [client, parent.resolveAssetUri])
  return (
    <StudyBlockAssetContext.Provider value={resolvedClient}>
      <RichTextInternalLinksProvider enabled={client.capabilities?.internalLinks !== false}>
        {children}
      </RichTextInternalLinksProvider>
    </StudyBlockAssetContext.Provider>
  )
}
