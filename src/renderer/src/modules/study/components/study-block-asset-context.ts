import { createContext, useContext } from 'react'

import type {
  ImportStudyAssetInput,
  OpenStudyAssetInput,
  StudyLocalAsset
} from '../../../../../shared/contracts/study'
import { studyClient } from '../api/study-client'

export interface StudyBlockEditorCapabilities {
  internalLinks?: boolean
}

export interface StudyBlockAssetClient {
  importAsset(input: ImportStudyAssetInput): Promise<StudyLocalAsset | null>
  openAsset(input: OpenStudyAssetInput): Promise<void>
  capabilities?: StudyBlockEditorCapabilities
}

const defaultStudyBlockAssetClient: StudyBlockAssetClient = {
  importAsset: studyClient.importAsset,
  openAsset: studyClient.openAsset
}

export const StudyBlockAssetContext = createContext<StudyBlockAssetClient>(
  defaultStudyBlockAssetClient
)

export function useStudyBlockAssetClient(): StudyBlockAssetClient {
  return useContext(StudyBlockAssetContext)
}
