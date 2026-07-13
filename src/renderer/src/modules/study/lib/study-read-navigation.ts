export const STUDY_REVEAL_HEADING_EVENT = 'mymind:study-reveal-heading'
export const STUDY_REVEAL_BLOCK_EVENT = 'mymind:study-reveal-block'

export interface StudyRevealHeadingDetail {
  headingId: string
}

export interface StudyRevealBlockDetail {
  blockId: string
}

export function getStudyHeadingElementId(headingId: string): string {
  return `study-heading-${headingId}`
}
