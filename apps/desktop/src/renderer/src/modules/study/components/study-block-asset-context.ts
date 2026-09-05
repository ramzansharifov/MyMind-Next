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

export interface SaveRecordedAudioInput {
  nodeId: string
  data: Uint8Array
  mimeType: 'audio/webm' | 'audio/ogg' | 'audio/mp4'
}

export interface StudyBlockAssetClient {
  importAsset(input: ImportStudyAssetInput): Promise<StudyLocalAsset | null>
  saveRecordedAudio?(input: SaveRecordedAudioInput): Promise<StudyLocalAsset>
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
