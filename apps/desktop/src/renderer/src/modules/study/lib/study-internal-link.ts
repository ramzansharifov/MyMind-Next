import type {
  StudyInternalLinkTarget,
  StudyInternalLinkTargetKind
} from '../../../../../shared/contracts/study'

export const STUDY_OPEN_INTERNAL_LINK_PICKER_EVENT = 'mymind:study-open-internal-link-picker'

export const STUDY_INTERNAL_LINK_NAVIGATE_EVENT = 'mymind:study-internal-link-navigate'

export interface StudyInternalLinkNavigateDetail {
  kind: StudyInternalLinkTargetKind
  materialId: string
  headingId: string | null
  sourcePosition?: number
  sourceBlockId?: string
}

export interface StudyInternalLinkHistoryEntry {
  sourceMaterialId: string
  destinationMaterialId: string
  sourcePosition?: number
  sourceBlockId?: string
}

export interface StudyInternalLinkNavigationRequest extends StudyInternalLinkNavigateDetail {
  requestId: number
  revealSourcePosition?: number
  revealSourceBlockId?: string
}

export function normalizeStudyInternalLinkHistory(
  history: StudyInternalLinkHistoryEntry[],
  materialIds: ReadonlySet<string>
): StudyInternalLinkHistoryEntry[] {
  let end = history.length

  while (end > 0 && !materialIds.has(history[end - 1].sourceMaterialId)) {
    end -= 1
  }

  return end === history.length ? history : history.slice(0, end)
}

export function appendStudyInternalLinkHistory(
  history: StudyInternalLinkHistoryEntry[],
  entry: StudyInternalLinkHistoryEntry
): StudyInternalLinkHistoryEntry[] {
  return [...history, entry]
}

export function clearStudyInternalLinkHistory(): StudyInternalLinkHistoryEntry[] {
  return []
}

export function dispatchStudyInternalLinkNavigation(
  detail: StudyInternalLinkNavigateDetail,
  resolvedTarget: StudyInternalLinkTarget | null | undefined
): boolean {
  if (!detail.materialId || resolvedTarget === null) {
    return false
  }

  window.dispatchEvent(new CustomEvent(STUDY_INTERNAL_LINK_NAVIGATE_EVENT, { detail }))
  return true
}

export function findStudyInternalLinkReturnTarget(
  scrollContainer: HTMLElement,
  sourcePosition?: number,
  sourceBlockId?: string
): { target: HTMLElement | null; exact: boolean } {
  const exactTarget =
    sourcePosition === undefined
      ? null
      : scrollContainer.querySelector<HTMLElement>(
          `[data-study-internal-link-position="${sourcePosition}"]`
        )

  if (exactTarget) {
    return { target: exactTarget, exact: true }
  }

  const sourceBlock = sourceBlockId
    ? (Array.from(scrollContainer.querySelectorAll<HTMLElement>('[data-study-block-id]')).find(
        (element) => element.dataset.studyBlockId === sourceBlockId
      ) ?? null)
    : null

  return { target: sourceBlock, exact: false }
}
