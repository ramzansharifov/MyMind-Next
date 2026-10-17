import type { StudyDocument } from '@mymind/contracts/study'
import { desktopRuntime } from './runtime'

export const validateStudyDocumentAssets = (id: string, document: StudyDocument): Promise<void> =>
  desktopRuntime().repositories.assets.validateDocumentAssets(id, document)
export const duplicateStudyAssetsForDocument = (
  source: string,
  target: string,
  document: StudyDocument
): Promise<StudyDocument> =>
  desktopRuntime().repositories.assets.duplicateDocumentAssets(source, target, document)
export async function cleanupStudyAssetsForDocument(
  id: string,
  document: StudyDocument
): Promise<void> {
  const { db, repositories } = desktopRuntime()
  await db.flush()
  await repositories.assets.cleanupDocumentAssets(id, document)
}
export async function removeStudyAssetsForMaterials(ids: string[]): Promise<void> {
  const { db, repositories } = desktopRuntime()
  await db.flush()
  await repositories.assets.removeAssetsForOwners(ids)
}
