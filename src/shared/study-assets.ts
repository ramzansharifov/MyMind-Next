import { STUDY_SAFE_ID_PATTERN } from './contracts/study'

export interface StudyAssetIdentity {
  materialId: string
  assetId: string
  fileName: string
}

export function isSafeStudyAssetFileName(value: string): boolean {
  return (
    Boolean(value) &&
    value.length <= 180 &&
    value !== '.' &&
    value !== '..' &&
    !/[\\/]/.test(value) &&
    !Array.from(value).some((character) => character.charCodeAt(0) <= 31)
  )
}

export function createCanonicalStudyAssetUrl(identity: StudyAssetIdentity): string {
  if (
    !STUDY_SAFE_ID_PATTERN.test(identity.materialId) ||
    !STUDY_SAFE_ID_PATTERN.test(identity.assetId) ||
    !isSafeStudyAssetFileName(identity.fileName)
  ) {
    throw new Error('Некорректные данные вложения')
  }

  return `mymind-asset://local/${encodeURIComponent(identity.materialId)}/${encodeURIComponent(
    identity.assetId
  )}/${encodeURIComponent(identity.fileName)}`
}
