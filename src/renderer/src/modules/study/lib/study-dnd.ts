import type { MoveStudyNodeInput, StudyNode } from '../../../../../shared/contracts/study'

export type StudyDropPlacement = 'before' | 'inside' | 'after' | 'root'

export function getStudyDropPlacement(
  activeCenterY: number,
  overTop: number,
  overHeight: number,
  targetIsFolder: boolean
): StudyDropPlacement {
  const safeHeight = Math.max(overHeight, 1)

  const relativePosition = (activeCenterY - overTop) / safeHeight

  if (targetIsFolder && relativePosition >= 0.28 && relativePosition <= 0.72) {
    return 'inside'
  }

  return relativePosition < 0.5 ? 'before' : 'after'
}

export function createStudyMoveInput(
  nodes: StudyNode[],
  activeId: string,
  overId: string | null,
  placement: StudyDropPlacement
): MoveStudyNodeInput | null {
  const active = nodes.find((node) => node.id === activeId)

  if (!active) {
    return null
  }

  if (placement === 'root' || overId === null) {
    return createInputForParent(nodes, active, null, getSiblings(nodes, null, active.id).length)
  }

  if (active.id === overId) {
    return null
  }

  const target = nodes.find((node) => node.id === overId)

  if (!target) {
    return null
  }

  if (placement === 'inside' && target.type === 'folder') {
    return createInputForParent(
      nodes,
      active,
      target.id,
      getSiblings(nodes, target.id, active.id).length
    )
  }

  const siblings = getSiblings(nodes, target.parentId, active.id)

  const targetIndex = siblings.findIndex((node) => node.id === target.id)

  if (targetIndex < 0) {
    return null
  }

  const position = targetIndex + (placement === 'after' ? 1 : 0)

  return createInputForParent(nodes, active, target.parentId, position)
}

function createInputForParent(
  nodes: StudyNode[],
  active: StudyNode,
  parentId: string | null,
  position: number
): MoveStudyNodeInput | null {
  if (!canMoveIntoParent(nodes, active, parentId)) {
    return null
  }

  const siblings = getSiblings(nodes, parentId, active.id)

  const nextPosition = Math.max(0, Math.min(position, siblings.length))

  const currentSiblings = nodes
    .filter((node) => node.parentId === active.parentId)
    .sort((first, second) => first.position - second.position)

  const currentPosition = currentSiblings.findIndex((node) => node.id === active.id)

  if (active.parentId === parentId && currentPosition === nextPosition) {
    return null
  }

  return {
    id: active.id,
    parentId,
    position: nextPosition
  }
}

function canMoveIntoParent(
  nodes: StudyNode[],
  active: StudyNode,
  parentId: string | null
): boolean {
  if (parentId === null) {
    return true
  }

  if (parentId === active.id) {
    return false
  }

  const nodesById = new Map(nodes.map((node) => [node.id, node]))

  const parent = nodesById.get(parentId)

  if (!parent || parent.type !== 'folder') {
    return false
  }

  if (active.type !== 'folder') {
    return true
  }

  let ancestor: StudyNode | undefined = parent

  while (ancestor) {
    if (ancestor.id === active.id) {
      return false
    }

    ancestor = ancestor.parentId ? nodesById.get(ancestor.parentId) : undefined
  }

  return true
}

function getSiblings(nodes: StudyNode[], parentId: string | null, excludedId: string): StudyNode[] {
  return nodes
    .filter((node) => node.parentId === parentId && node.id !== excludedId)
    .sort((first, second) => first.position - second.position)
}
