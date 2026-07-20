import {
  BOARD_SYSTEM_ROOT_ID,
  type BoardNode,
  type MoveBoardNodeInput
} from '../../../../../shared/contracts/boards'

export type BoardDropPlacement = 'before' | 'inside' | 'after' | 'root'

export function createBoardMoveInput(
  nodes: BoardNode[],
  activeId: string,
  overId: string | null,
  placement: BoardDropPlacement
): MoveBoardNodeInput | null {
  const active = nodes.find((node) => node.id === activeId)

  if (!active) {
    return null
  }

  const studyManagedIds = getStudyManagedBoardNodeIds(nodes)

  if (studyManagedIds.has(active.id)) {
    return null
  }

  if (placement === 'root' || overId === null) {
    return createInputForParent(
      nodes,
      studyManagedIds,
      active,
      null,
      getSiblings(nodes, null, active.id).length
    )
  }

  if (active.id === overId || studyManagedIds.has(overId)) {
    return null
  }

  const target = nodes.find((node) => node.id === overId)

  if (!target) {
    return null
  }

  if (placement === 'inside' && target.type === 'folder') {
    return createInputForParent(
      nodes,
      studyManagedIds,
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

  return createInputForParent(nodes, studyManagedIds, active, target.parentId, position)
}

export function getStudyManagedBoardNodeIds(nodes: BoardNode[]): Set<string> {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))
  const protectedIds = new Set<string>()

  nodes.forEach((node) => {
    const visited = new Set<string>()
    let current: BoardNode | undefined = node

    while (current && !visited.has(current.id)) {
      visited.add(current.id)

      if (isStudyManagedAnchor(current)) {
        protectedIds.add(node.id)
        break
      }

      current = current.parentId ? nodesById.get(current.parentId) : undefined
    }
  })

  for (const protectedId of [...protectedIds]) {
    const visited = new Set<string>()
    let current = nodesById.get(protectedId)

    while (current?.parentId && !visited.has(current.parentId)) {
      visited.add(current.parentId)
      protectedIds.add(current.parentId)
      current = nodesById.get(current.parentId)
    }
  }

  return protectedIds
}

function createInputForParent(
  nodes: BoardNode[],
  studyManagedIds: Set<string>,
  active: BoardNode,
  parentId: string | null,
  position: number
): MoveBoardNodeInput | null {
  if (!canMoveIntoParent(nodes, studyManagedIds, active, parentId)) {
    return null
  }

  const siblings = getSiblings(nodes, parentId, active.id)
  const nextPosition = Math.max(0, Math.min(position, siblings.length))
  const currentSiblings = nodes
    .filter((node) => node.parentId === active.parentId)
    .sort(compareBoardNodes)
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
  nodes: BoardNode[],
  studyManagedIds: Set<string>,
  active: BoardNode,
  parentId: string | null
): boolean {
  if (parentId === null) {
    return true
  }

  if (parentId === active.id || studyManagedIds.has(parentId)) {
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

  const visited = new Set<string>()
  let ancestor: BoardNode | undefined = parent

  while (ancestor && !visited.has(ancestor.id)) {
    if (ancestor.id === active.id) {
      return false
    }

    visited.add(ancestor.id)
    ancestor = ancestor.parentId ? nodesById.get(ancestor.parentId) : undefined
  }

  return true
}

function isStudyManagedAnchor(node: BoardNode): boolean {
  return Boolean(
    node.id === BOARD_SYSTEM_ROOT_ID ||
      node.sourceStudyNodeId ||
      node.sourceMaterialId ||
      node.sourceBlockId
  )
}

function getSiblings(nodes: BoardNode[], parentId: string | null, excludedId: string): BoardNode[] {
  return nodes
    .filter((node) => node.parentId === parentId && node.id !== excludedId)
    .sort(compareBoardNodes)
}

function compareBoardNodes(first: BoardNode, second: BoardNode): number {
  if (first.parentId === null && second.parentId === null) {
    if (first.id === BOARD_SYSTEM_ROOT_ID) return -1
    if (second.id === BOARD_SYSTEM_ROOT_ID) return 1
  }

  return first.position - second.position || first.title.localeCompare(second.title, 'ru')
}
