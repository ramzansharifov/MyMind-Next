export const STUDY_REVEAL_HEADING_EVENT = 'mymind:study-reveal-heading'

export interface StudyRevealHeadingDetail {
  headingId: string
}

export function getStudyHeadingElementId(headingId: string): string {
  return `study-heading-${headingId}`
}
