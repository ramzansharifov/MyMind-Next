import { useCallback, useEffect, useState } from 'react'

import type {
  CreateStudyNodeInput,
  MoveStudyNodeInput,
  StudyNode
} from '../../../../../shared/contracts/study'
import { studyClient } from '../api/study-client'

interface UseStudyResult {
  nodes: StudyNode[]
  selectedNodeId: string | null
  isLoading: boolean
  error: string | null
  selectNode: (nodeId: string) => void
  createNode: (input: CreateStudyNodeInput) => Promise<StudyNode | null>
  renameNode: (nodeId: string, title: string) => Promise<void>
  deleteNode: (nodeId: string) => Promise<void>
  toggleFolder: (node: StudyNode) => Promise<void>
  moveNode: (input: MoveStudyNodeInput) => Promise<void>
}

export function useStudy(): UseStudyResult {
  const [nodes, setNodes] = useState<StudyNode[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    studyClient
      .listNodes()
      .then((loadedNodes) => {
        if (!active) {
          return
        }

        setNodes(loadedNodes)
        setSelectedNodeId(
          (current) =>
            current ??
            loadedNodes.find((node) => node.type === 'material')?.id ??
            loadedNodes[0]?.id ??
            null
        )
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Не удалось загрузить обучение')
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const createNode = useCallback(async (input: CreateStudyNodeInput): Promise<StudyNode | null> => {
    try {
      setError(null)

      const created = await studyClient.createNode(input)

      setNodes((current) => [...current, created])
      setSelectedNodeId(created.id)

      return created
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Не удалось создать элемент')

      return null
    }
  }, [])

  const renameNode = useCallback(async (nodeId: string, title: string): Promise<void> => {
    try {
      const updated = await studyClient.renameNode(nodeId, title)

      setNodes((current) => current.map((node) => (node.id === updated.id ? updated : node)))
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Не удалось переименовать элемент')
    }
  }, [])

  const deleteNode = useCallback(async (nodeId: string): Promise<void> => {
    try {
      await studyClient.deleteNode(nodeId)

      setNodes((current) => {
        const removed = new Set<string>([nodeId])
        let changed = true

        while (changed) {
          changed = false

          current.forEach((node) => {
            if (node.parentId && removed.has(node.parentId) && !removed.has(node.id)) {
              removed.add(node.id)
              changed = true
            }
          })
        }

        const remaining = current.filter((node) => !removed.has(node.id))

        setSelectedNodeId((selected) =>
          selected && removed.has(selected) ? (remaining[0]?.id ?? null) : selected
        )

        return remaining
      })
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Не удалось удалить элемент')
    }
  }, [])

  const toggleFolder = useCallback(async (node: StudyNode): Promise<void> => {
    if (node.type !== 'folder') {
      return
    }

    const isExpanded = !node.isExpanded

    setNodes((current) =>
      current.map((item) =>
        item.id === node.id
          ? {
              ...item,
              isExpanded
            }
          : item
      )
    )

    try {
      const updated = await studyClient.updateExpansion(node.id, isExpanded)

      setNodes((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch {
      setNodes((current) => current.map((item) => (item.id === node.id ? node : item)))
    }
  }, [])

  const moveNode = useCallback(async (input: MoveStudyNodeInput): Promise<void> => {
    try {
      setError(null)

      const updatedNodes = await studyClient.moveNode(input)

      setNodes(updatedNodes)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Не удалось переместить элемент')
    }
  }, [])
  return {
    nodes,
    selectedNodeId,
    isLoading,
    error,
    selectNode: setSelectedNodeId,
    createNode,
    renameNode,
    deleteNode,
    toggleFolder,
    moveNode
  }
}
