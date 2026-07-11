import type { StudyDocument } from '../../../../../shared/contracts/study'

export type StudyBlockDropPlacement = 'before' | 'after'

export function moveStudyBlockByDrop(
  document: StudyDocument,
  activeBlockId: string,
  targetBlockId: string,
  placement: StudyBlockDropPlacement
): StudyDocument {
  if (activeBlockId === targetBlockId) {
    return document
  }

  const activeIndex = document.blocks.findIndex((block) => block.id === activeBlockId)

  const targetIndex = document.blocks.findIndex((block) => block.id === targetBlockId)

  if (activeIndex < 0 || targetIndex < 0) {
    return document
  }

  const blocks = [...document.blocks]

  const [activeBlock] = blocks.splice(activeIndex, 1)

  if (!activeBlock) {
    return document
  }

  const nextTargetIndex = blocks.findIndex((block) => block.id === targetBlockId)

  if (nextTargetIndex < 0) {
    return document
  }

  const insertionIndex = placement === 'before' ? nextTargetIndex : nextTargetIndex + 1

  blocks.splice(insertionIndex, 0, activeBlock)

  const orderChanged = blocks.some((block, index) => block.id !== document.blocks[index]?.id)

  if (!orderChanged) {
    return document
  }

  return {
    ...document,
    blocks
  }
}
