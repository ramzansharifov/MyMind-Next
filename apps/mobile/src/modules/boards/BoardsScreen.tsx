import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, BackHandler, FlatList, View } from 'react-native'
import type { BoardDocument, BoardNode } from '@mymind/contracts/boards'
import { isBoardSystemRootId } from '@mymind/contracts/boards'
import { BoardSaveState } from '@mymind/core/board-save-queue'
import * as boardValidation from '@mymind/core/validation/boards'
import { appearanceTokens } from '@mymind/design'
import { useServices } from '../../app/context'
import { notifyDataChanged } from '../../app/changes'
import { useCollection } from '../../shared/hooks/useCollection'
import BoardCanvasDom, { type BoardCanvasDomRef } from './BoardCanvasDom'
import { FormSheet } from '../../shared/ui/FormSheet'
import { ActionMenu } from '../../shared/ui/ActionMenu'
import { WorkspaceNodeCard } from '../../shared/ui/Workspace'
import { VisualIconBadge } from '../../shared/ui/VisualPickers'
import { FOLDER_ICON_CHOICES } from '../../shared/ui/visual-options'
import { choiceField, iconField, messageFor, textField, type FormSpec } from '../../shared/ui/form-model'
import {
  Button,
  EmptyState,
  ErrorState,
  Label,
  LoadingState,
  SearchField
} from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { useConfirmation } from '../../shared/ui/ConfirmationProvider'
import { useToast } from '../../shared/ui/ToastProvider'

function sortNodes(nodes: BoardNode[]): BoardNode[] {
  return [...nodes].sort((a, b) => a.position - b.position || a.title.localeCompare(b.title))
}

function managedNodeIds(nodes: BoardNode[]): Set<string> {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const managed = new Set<string>()
  const anchor = (node: BoardNode): boolean =>
    Boolean(
      isBoardSystemRootId(node.id) ||
      node.sourceStudyNodeId ||
      node.sourceMaterialId ||
      node.sourceNoteId ||
      node.sourceBlockId
    )

  for (const node of nodes) {
    const visited = new Set<string>()
    let current: BoardNode | undefined = node
    while (current && !visited.has(current.id)) {
      visited.add(current.id)
      if (anchor(current)) {
        managed.add(node.id)
        break
      }
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
  }
  return managed
}

function descendantsOf(id: string, nodes: BoardNode[]): Set<string> {
  const result = new Set<string>()
  let changed = true
  while (changed) {
    changed = false
    for (const node of nodes) {
      if (node.parentId && (node.parentId === id || result.has(node.parentId))) {
        if (!result.has(node.id)) {
          result.add(node.id)
          changed = true
        }
      }
    }
  }
  return result
}

function folderLabel(folder: BoardNode, nodes: BoardNode[]): string {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const path = [folder.title]
  const visited = new Set<string>()
  let parentId = folder.parentId
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId)
    const parent = byId.get(parentId)
    if (!parent) break
    path.unshift(parent.title)
    parentId = parent.parentId
  }
  return path.join(' / ')
}

export function BoardsScreen({
  initialBoardId = null
}: {
  initialBoardId?: string | null
}): React.JSX.Element {
  const { boards: api } = useServices()
  const confirm = useConfirmation()
  const toast = useToast()
  const nodes = useCollection(useCallback(() => api.listNodes(), [api]))
  const [folderId, setFolderId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormSpec | null>(null)
  const [opened, setOpened] = useState<{ node: BoardNode; document: BoardDocument } | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [saveState, setSaveState] = useState<BoardSaveState>('saved')
  const [closingBoard, setClosingBoard] = useState(false)
  const canvasRef = useRef<BoardCanvasDomRef>(null)
  const initialBoardRef = useRef<string | null>(null)
  const theme = useTheme()
  const canvasColorScheme = theme.background === appearanceTokens.dark.background ? 'dark' : 'light'

  const allNodes = useMemo(() => nodes.data ?? [], [nodes.data])
  const managed = useMemo(() => managedNodeIds(allNodes), [allNodes])
  const currentFolder = folderId ? (allNodes.find((node) => node.id === folderId) ?? null) : null
  const effectiveFolderId = folderId && currentFolder ? folderId : null

  const refresh = (): void => {
    nodes.refresh()
    notifyDataChanged()
  }

  const openBoard = useCallback(
    (node: BoardNode): void => {
      setError('')
      setSaveState('saved')
      setOpened({ node, document: api.getDocument(node.id) })
    },
    [api]
  )

  useEffect(() => {
    if (!initialBoardId || nodes.loading || initialBoardRef.current === initialBoardId) {
      return undefined
    }
    initialBoardRef.current = initialBoardId
    let active = true
    queueMicrotask(() => {
      if (!active) return
      const target = allNodes.find((node) => node.id === initialBoardId)
      if (!target || target.type !== 'board') {
        setError('Связанная доска не найдена')
        return
      }
      try {
        openBoard(target)
      } catch (reason) {
        setError(messageFor(reason))
      }
    })
    return () => {
      active = false
    }
  }, [allNodes, initialBoardId, nodes.loading, openBoard])

  const closeBoard = useCallback(async (): Promise<void> => {
    if (!opened || closingBoard) return
    setClosingBoard(true)
    try {
      await canvasRef.current?.flush()
      setOpened(null)
      setError('')
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setClosingBoard(false)
    }
  }, [closingBoard, opened])

  useEffect(() => {
    if (!opened) return undefined
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      void closeBoard()
      return true
    })
    return () => subscription.remove()
  }, [closeBoard, opened])

  useEffect(() => {
    if (!opened) return undefined
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        void canvasRef.current?.flush().catch((reason: unknown) => setError(messageFor(reason)))
      }
    })
    return () => subscription.remove()
  }, [opened])

  const createNode = (type: 'folder' | 'board'): void => {
    setForm({
      title: type === 'folder' ? 'Новая папка' : 'Новая доска',
      initial: { title: '', icon: 'folder' },
      fields: [
        textField('title', 'Название'),
        ...(type === 'folder'
          ? [
              iconField('icon', 'Иконка', FOLDER_ICON_CHOICES, 'folder')
            ]
          : [])
      ],
      preview:
        type === 'folder'
          ? {
              titleKey: 'title',
              iconKey: 'icon',
              iconFamily: 'folder',
              description: 'Так папка будет выглядеть в разделе досок.'
            }
          : undefined,
      save: (values) => {
        const input = boardValidation.createBoardNodeInputSchema.parse({
          type,
          parentId: effectiveFolderId,
          title: values.title,
          icon: type === 'folder' ? values.icon : undefined
        })
        const created = api.createNode(input)
        refresh()
        if (created.type === 'board') openBoard(created)
      }
    })
  }

  const editNode = (node: BoardNode): void => {
    const blocked = node.type === 'folder' ? descendantsOf(node.id, allNodes) : new Set<string>()
    const folderChoices = [
      { value: null, label: 'Корень' },
      ...allNodes
        .filter(
          (candidate) =>
            candidate.type === 'folder' &&
            !managed.has(candidate.id) &&
            candidate.id !== node.id &&
            !blocked.has(candidate.id)
        )
        .sort((a, b) => folderLabel(a, allNodes).localeCompare(folderLabel(b, allNodes)))
        .map((folder) => ({ value: folder.id, label: folderLabel(folder, allNodes) }))
    ]
    const managedFolder = node.type === 'folder' && managed.has(node.id)
    setForm({
      title: node.type === 'folder' ? 'Свойства папки' : 'Свойства доски',
      initial: { title: node.title, parentId: node.parentId, icon: node.icon ?? 'folder' },
      fields: [
        textField('title', 'Название'),
        ...(node.type === 'folder' && !managedFolder
          ? [
              iconField('icon', 'Иконка', FOLDER_ICON_CHOICES, 'folder'),
              choiceField('parentId', 'Расположение', folderChoices)
            ]
          : node.type === 'board' && !managed.has(node.id)
            ? [choiceField('parentId', 'Расположение', folderChoices)]
            : [])
      ],
      preview:
        node.type === 'folder' && !managedFolder
          ? {
              titleKey: 'title',
              iconKey: 'icon',
              iconFamily: 'folder',
              description: 'Так папка будет выглядеть в разделе досок.'
            }
          : undefined,
      save: (values) => {
        const renamed = boardValidation.renameBoardNodeInputSchema.parse({
          id: node.id,
          title: values.title
        })
        const updated = api.renameNode(renamed.id, renamed.title)
        if (node.type === 'folder' && !managedFolder) {
          const icon = boardValidation.updateBoardFolderIconInputSchema.parse({
            id: node.id,
            icon: values.icon
          })
          api.updateFolderIcon(icon)
        }
        if (!managed.has(node.id)) {
          const parentId = typeof values.parentId === 'string' ? values.parentId : null
          if (parentId !== node.parentId) {
            const siblings = allNodes.filter(
              (candidate) => candidate.parentId === parentId && candidate.id !== node.id
            )
            api.moveNode({ id: node.id, parentId, position: siblings.length })
            if (effectiveFolderId === node.id) setFolderId(parentId)
          }
        }
        if (opened?.node.id === node.id)
          setOpened({ node: updated, document: api.getDocument(updated.id) })
        refresh()
      }
    })
  }

  const reorder = (node: BoardNode, direction: -1 | 1): void => {
    if (managed.has(node.id)) return
    const siblings = sortNodes(allNodes.filter((item) => item.parentId === node.parentId))
    const index = siblings.findIndex((item) => item.id === node.id)
    const position = index + direction
    if (index < 0 || position < 0 || position >= siblings.length) return
    try {
      api.moveNode({ id: node.id, parentId: node.parentId, position })
      refresh()
      setError('')
    } catch (reason) {
      setError(messageFor(reason))
    }
  }

  const confirmDelete = (node: BoardNode): void => {
    if (pending || (node.type === 'folder' && managed.has(node.id))) return
    void confirm({
      title: node.type === 'folder' ? 'Удалить папку?' : 'Удалить доску?',
      description:
        node.type === 'folder'
          ? 'Будут удалены папка и все вложенные обычные доски.'
          : node.sourceMaterialId || node.sourceNoteId
            ? 'Связанный блок будет также удалён из исходного документа.'
            : 'Это действие нельзя отменить.',
      tone: 'danger',
      onConfirm: async () => {
        setPending(true)
        setError('')
        try {
          if (opened?.node.id === node.id) await canvasRef.current?.flush()
          await api.deleteNode(node.id)
          if (opened?.node.id === node.id) setOpened(null)
          if (effectiveFolderId === node.id) setFolderId(node.parentId)
          refresh()
          toast.success(node.type === 'folder' ? 'Папка удалена' : 'Доска удалена')
        } catch (reason) {
          setError(messageFor(reason))
          throw reason
        } finally {
          setPending(false)
        }
      }
    })
  }

  const breadcrumbs = useMemo(() => {
    const byId = new Map(allNodes.map((node) => [node.id, node]))
    const result: BoardNode[] = []
    const visited = new Set<string>()
    let current = effectiveFolderId ? byId.get(effectiveFolderId) : undefined
    while (current && !visited.has(current.id)) {
      visited.add(current.id)
      result.unshift(current)
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    return result
  }, [allNodes, effectiveFolderId])

  if (opened) {
    const current = allNodes.find((node) => node.id === opened.node.id) ?? opened.node
    const saveLabel =
      saveState === 'saving'
        ? 'Сохранение…'
        : saveState === 'dirty'
          ? 'Есть несохранённые изменения'
          : saveState === 'error'
            ? 'Ошибка сохранения'
            : 'Сохранено локально'

    return (
      <View style={{ flex: 1, gap: 10 }}>
        {error ? <ErrorState message={error} /> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            label={closingBoard ? 'Сохранение…' : 'Назад'}
            disabled={closingBoard || pending}
            onPress={() => void closeBoard()}
          />
          <Button
            label="Свойства"
            disabled={closingBoard || pending}
            onPress={() => editNode(current)}
          />
          <Button
            label="Удалить"
            danger
            disabled={closingBoard || pending}
            onPress={() => confirmDelete(current)}
          />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Label title>{current.title}</Label>
          <Label muted>{saveLabel}</Label>
        </View>
        <View style={{ flex: 1, minHeight: 320, overflow: 'hidden', borderRadius: 12 }}>
          <BoardCanvasDom
            key={current.id}
            ref={canvasRef}
            snapshot={opened.document.snapshot}
            colorScheme={canvasColorScheme}
            saveSnapshot={async (snapshot) => {
              api.saveDocument(current.id, snapshot)
            }}
            onSaveState={async (state) => {
              setSaveState(state)
            }}
            onError={async (message) => {
              setError(message)
            }}
            dom={{ scrollEnabled: false, style: { flex: 1 } }}
          />
        </View>
        {form && <FormSheet spec={form} close={() => setForm(null)} />}
      </View>
    )
  }

  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')
  const children = sortNodes(
    allNodes.filter(
      (node) =>
        node.parentId === effectiveFolderId &&
        (!normalizedQuery || node.title.toLocaleLowerCase('ru-RU').includes(normalizedQuery))
    )
  )
  const currentManaged = effectiveFolderId ? managed.has(effectiveFolderId) : false

  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 10, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label="Корень" selected={!effectiveFolderId} onPress={() => setFolderId(null)} />
          {breadcrumbs.map((folder) => (
            <Button
              key={folder.id}
              label={folder.title}
              selected={folder.id === effectiveFolderId}
              onPress={() => setFolderId(folder.id)}
            />
          ))}
        </View>
        {!currentManaged ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button label="+ Папка" selected onPress={() => createNode('folder')} />
            <Button label="+ Доска" selected onPress={() => createNode('board')} />
          </View>
        ) : (
          <Label muted>Этот раздел управляется связанным модулем MyMind.</Label>
        )}
        <SearchField value={query} onChangeText={setQuery} />
      </View>

      {error ? <ErrorState message={error} /> : null}
      {nodes.error ? <ErrorState message={nodes.error} retry={nodes.refresh} /> : null}
      {nodes.loading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={children}
          keyExtractor={(item) => item.id}
          refreshing={nodes.loading}
          onRefresh={nodes.refresh}
          ListEmptyComponent={
            <EmptyState text={query.trim() ? 'Ничего не найдено.' : 'В этой папке пока пусто.'} />
          }
          renderItem={({ item, index }) => {
            const itemManaged = managed.has(item.id)
            const canDelete =
              !(item.type === 'folder' && itemManaged) && !isBoardSystemRootId(item.id)
            return (
              <WorkspaceNodeCard
                title={item.title}
                subtitle={
                  item.type === 'folder'
                    ? itemManaged
                      ? 'Управляемая папка'
                      : 'Папка'
                    : item.sourceMaterialId
                      ? 'Доска материала'
                      : item.sourceNoteId
                        ? 'Доска заметки'
                        : 'Доска'
                }
                leading={
                  item.type === 'folder' ? (
                    <VisualIconBadge value={item.icon ?? 'folder'} />
                  ) : undefined
                }
                leadingIcon={item.type === 'board' ? 'boards' : undefined}
                onPress={() => (item.type === 'folder' ? setFolderId(item.id) : openBoard(item))}
                action={
                  <ActionMenu
                    title={item.title}
                    disabled={pending}
                    items={[
                      ...(item.type === 'board' || !itemManaged
                        ? [
                            {
                              key: 'edit',
                              label: 'Изменить',
                              icon: 'edit' as const,
                              onPress: () => editNode(item)
                            }
                          ]
                        : []),
                      ...(!itemManaged
                        ? [
                            {
                              key: 'up',
                              label: 'Переместить выше',
                              icon: 'move' as const,
                              disabled: index === 0,
                              onPress: () => reorder(item, -1)
                            },
                            {
                              key: 'down',
                              label: 'Переместить ниже',
                              icon: 'move' as const,
                              disabled: index === children.length - 1,
                              onPress: () => reorder(item, 1)
                            }
                          ]
                        : []),
                      ...(canDelete
                        ? [
                            {
                              key: 'delete',
                              label: 'Удалить',
                              icon: 'delete' as const,
                              danger: true,
                              onPress: () => confirmDelete(item)
                            }
                          ]
                        : [])
                    ]}
                  />
                }
              />
            )
          }}
        />
      )}
      {form && <FormSheet spec={form} close={() => setForm(null)} />}
    </View>
  )
}
