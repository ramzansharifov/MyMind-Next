import type { ReactNode } from 'react'

import { StudyBlockAssetContext, type StudyBlockAssetClient } from './study-block-asset-context'

export function StudyBlockAssetProvider({
  client,
  children
}: {
  client: StudyBlockAssetClient
  children: ReactNode
}): React.JSX.Element {
  return (
    <StudyBlockAssetContext.Provider value={client}>{children}</StudyBlockAssetContext.Provider>
  )
}
