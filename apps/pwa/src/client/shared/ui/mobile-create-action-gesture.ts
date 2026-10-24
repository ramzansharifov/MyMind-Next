export const MOBILE_CREATE_ACTION_STEP = 124

export function wrapCarouselIndex(index: number, length: number): number {
  if (length <= 0) return 0
  return ((index % length) + length) % length
}

export function mobileCreateActionSelection(
  dy: number,
  length: number,
  startIndex = 0,
  step = MOBILE_CREATE_ACTION_STEP
): { index: number; offsetY: number } {
  if (length <= 0) return { index: 0, offsetY: 0 }

  const rawStep = Math.round(-dy / step)
  const index = wrapCarouselIndex(startIndex + rawStep, length)
  const snappedDy = -rawStep * step
  const offsetY = Math.max(-step / 2, Math.min(step / 2, dy - snappedDy))

  return { index, offsetY }
}

/**
 * A two-item wheel needs the same neighbour above and below the active card.
 * Otherwise a half-turn causes the only other card to jump to the other side.
 */
export function visibleCarouselSlots(
  length: number,
  currentIndex: number
): Array<{ index: number; slot: number }> {
  if (!length) return []
  if (length === 1) return [{ index: 0, slot: 0 }]
  if (length === 2)
    return [-1, 0, 1].map((slot) => ({
      index: wrapCarouselIndex(currentIndex + slot, length),
      slot
    }))
  return Array.from({ length }, (_, index) => {
    let slot = wrapCarouselIndex(index - currentIndex, length)
    if (slot > length / 2) slot -= length
    return { index, slot }
  }).filter(({ slot }) => Math.abs(slot) <= 2)
}
