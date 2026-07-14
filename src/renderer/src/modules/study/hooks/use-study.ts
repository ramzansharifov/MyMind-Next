import { useCallback, useEffect, useState } from 'react'

import type {
  CreateStudyNodeInput,
  MoveStudyNodeInput,
  StudyFolderIconName,
  StudyNode
} from '../../../../../shared/contracts/study'
import { studyClient } from '../api/study-client'
import {
  getActiveStudyDraftHandle,
  type StudyDraftDeletionSuspension
} from '../lib/study-draft-lifecycle'
import { getStudySubtreeIds, isStudyNodeInSubtree } from '../lib/study-tree'

interface UseStudyResult {
  nodes: StudyNode[]
  selectedNodeId: string | null
  isLoading: boolean
  error: string | null
  selectNode: (nodeId: string | null) => void
  createNode: (input: CreateStudyNodeInput) => Promise<StudyNode | null>
  renameNode: (nodeId: string, title: string) => Promise<StudyNode>
  duplicateNode: (nodeId: string) => Promise<StudyNode | null>
  updateFolderIcon: (nodeId: string, icon: StudyFolderIconName) => Promise<void>
  deleteNode: (nodeId: string) => Promise<boolean>
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

  const renameNode = useCallback(async (nodeId: string, title: string): Promise<StudyNode> => {
    try {
      setError(null)

      const updated = await studyClient.renameNode(nodeId, title)

      setNodes((current) => current.map((node) => (node.id === updated.id ? updated : node)))

      return updated
    } catch (reason: unknown) {
      const renameError =
        reason instanceof Error ? reason : new Error('Не удалось переименовать элемент')

      setError(renameError.message)
      throw renameError
    }
  }, [])

  const duplicateNode = useCallback(async (nodeId: string): Promise<StudyNode | null> => {
    try {
      setError(null)

      const result = await studyClient.duplicateNode(nodeId)

      const duplicatedRoot = result.nodes.find((node) => node.id === result.rootId)

      if (!duplicatedRoot) {
        throw new Error('Сервер не вернул корневой элемент копии')
      }

      const uniqueNodeIds = new Set(result.nodes.map((node) => node.id))

      if (uniqueNodeIds.size !== result.nodes.length) {
        throw new Error('Сервер вернул некорректное дерево копии')
      }

      setNodes(result.nodes)
      setSelectedNodeId(duplicatedRoot.id)

      return duplicatedRoot
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Не удалось дублировать элемент')

      return null
    }
  }, [])

  const updateFolderIcon = useCallback(
    async (nodeId: string, icon: StudyFolderIconName): Promise<void> => {
      try {
        setError(null)

        const updated = await studyClient.updateFolderIcon(nodeId, icon)

        setNodes((current) => current.map((node) => (node.id === updated.id ? updated : node)))
      } catch (reason: unknown) {
        setError(reason instanceof Error ? reason.message : 'Не удалось изменить иконку папки')
      }
    },
    []
  )

  const deleteNode = useCallback(
    async (nodeId: string): Promise<boolean> => {
      let deletionSuspension: StudyDraftDeletionSuspension | null = null

      try {
        setError(null)

        const activeDraft = getActiveStudyDraftHandle()

        if (activeDraft && isStudyNodeInSubtree(nodes, nodeId, activeDraft.materialId)) {
          deletionSuspension = activeDraft.suspendForDeletion()
        }

        const deleted = await studyClient.deleteNode(nodeId)

        if (!deleted) {
          throw new Error('Элемент уже удалён или не найден')
        }

        deletionSuspension?.commit()

        setNodes((current) => {
          const removed = getStudySubtreeIds(current, nodeId)
          const remaining = current.filter((node) => !removed.has(node.id))

          setSelectedNodeId((selected) => (selected && removed.has(selected) ? null : selected))

          return remaining
        })

        return true
      } catch (reason: unknown) {
        let message = reason instanceof Error ? reason.message : 'Не удалось удалить элемент'

        if (deletionSuspension) {
          try {
            await deletionSuspension.rollback()
          } catch (rollbackReason: unknown) {
            const rollbackMessage =
              rollbackReason instanceof Error
                ? rollbackReason.message
                : 'неизвестная ошибка сохранения'

            message = `${message}. Черновик остался открыт, но автоматическое сохранение после отмены удаления завершилось ошибкой: ${rollbackMessage}`
          }
        }

        setError(message)

        return false
      }
    },
    [nodes]
  )

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
    duplicateNode,
    updateFolderIcon,
    deleteNode,
    toggleFolder,
    moveNode
  }
}
