import type { StudyInternalLinkTargetKind } from '../../../../../shared/contracts/study'

export const STUDY_OPEN_INTERNAL_LINK_PICKER_EVENT = 'mymind:study-open-internal-link-picker'

export const STUDY_INTERNAL_LINK_NAVIGATE_EVENT = 'mymind:study-internal-link-navigate'

export interface StudyInternalLinkNavigateDetail {
  kind: StudyInternalLinkTargetKind
  materialId: string
  headingId: string | null
}

export interface StudyInternalLinkNavigationRequest extends StudyInternalLinkNavigateDetail {
  requestId: number
}
