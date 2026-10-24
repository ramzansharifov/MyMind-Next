import type { NoteVoiceRecordingMimeType } from '@mymind/contracts/notes'
import type { StudyAssetKind, StudyDocument, StudyLocalAsset } from '@mymind/contracts/study'

export interface DocumentAssetStore {
  importAsset(ownerId: string, kind: StudyAssetKind): Promise<StudyLocalAsset | null>
  saveRecordedAudio(
    ownerId: string,
    input: { uri: string; mimeType: NoteVoiceRecordingMimeType }
  ): Promise<StudyLocalAsset>
  validateDocumentAssets(ownerId: string, document: StudyDocument): Promise<void>
  duplicateDocumentAssets(
    sourceOwnerId: string,
    targetOwnerId: string,
    document: StudyDocument
  ): Promise<StudyDocument>
  cleanupDocumentAssets(ownerId: string, document: StudyDocument): Promise<void>
  removeAssetsForOwners(ownerIds: string[]): Promise<void>
  reconcileDocuments(documents: ReadonlyMap<string, StudyDocument>): Promise<void>
  resolveAssetUri(asset: StudyLocalAsset): string | null
  openAsset(asset: StudyLocalAsset): Promise<void>
}
