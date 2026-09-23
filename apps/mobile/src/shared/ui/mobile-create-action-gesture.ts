export const MOBILE_CREATE_ACTION_STEP = 64

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
