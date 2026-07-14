import type { StudyNode } from '../../../../../shared/contracts/study'

export interface VisibleStudyNode {
  node: StudyNode
  depth: number
}

export function getStudyAncestorFolders(nodes: StudyNode[], nodeId: string): StudyNode[] {
  const nodesById = new Map(nodes.map((node) => [node.id, node]))

  const ancestors: StudyNode[] = []
  const visited = new Set<string>()

  let parentId = nodesById.get(nodeId)?.parentId ?? null

  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)

    const parent = nodesById.get(parentId)

    if (!parent) {
      break
    }

    if (parent.type === 'folder') {
      ancestors.unshift(parent)
    }

    parentId = parent.parentId
  }

  return ancestors
}

export function getStudySubtreeIds(nodes: StudyNode[], rootId: string): Set<string> {
  const childrenByParent = new Map<string, string[]>()

  nodes.forEach((node) => {
    if (!node.parentId) {
      return
    }

    const children = childrenByParent.get(node.parentId) ?? []
    children.push(node.id)
    childrenByParent.set(node.parentId, children)
  })

  const included = new Set<string>([rootId])
  const pending = [rootId]

  while (pending.length > 0) {
    const parentId = pending.pop()

    if (!parentId) {
      continue
    }

    const children = childrenByParent.get(parentId) ?? []

    children.forEach((childId) => {
      if (included.has(childId)) {
        return
      }

      included.add(childId)
      pending.push(childId)
    })
  }

  return included
}

export function isStudyNodeInSubtree(
  nodes: StudyNode[],
  rootId: string,
  candidateId: string
): boolean {
  return getStudySubtreeIds(nodes, rootId).has(candidateId)
}

export function getVisibleStudyNodes(nodes: StudyNode[], search: string): VisibleStudyNode[] {
  const normalizedSearch = search.trim().toLowerCase()
  const nodesByParent = new Map<string | null, StudyNode[]>()

  nodes.forEach((node) => {
    const siblings = nodesByParent.get(node.parentId) ?? []

    siblings.push(node)
    nodesByParent.set(node.parentId, siblings)
  })

  nodesByParent.forEach((siblings) => {
    siblings.sort((first, second) => first.position - second.position)
  })

  if (normalizedSearch) {
    return nodes
      .filter((node) => node.title.toLowerCase().includes(normalizedSearch))
      .sort((first, second) => first.title.localeCompare(second.title, 'ru'))
      .map((node) => ({
        node,
        depth: 0
      }))
  }

  const visible: VisibleStudyNode[] = []

  function visit(parentId: string | null, depth: number): void {
    const children = nodesByParent.get(parentId) ?? []

    children.forEach((node) => {
      visible.push({
        node,
        depth
      })

      if (node.type === 'folder' && node.isExpanded) {
        visit(node.id, depth + 1)
      }
    })
  }

  visit(null, 0)

  return visible
}
