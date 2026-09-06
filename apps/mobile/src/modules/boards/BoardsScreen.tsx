import { useCallback, useMemo, useState } from 'react'
import { Alert, FlatList, View } from 'react-native'
import type { BoardDocument, BoardNode } from '@mymind/contracts/boards'
import { isBoardSystemRootId } from '@mymind/contracts/boards'
import { STUDY_FOLDER_ICON_NAMES } from '@mymind/contracts/study'
import * as boardValidation from '@mymind/core/validation/boards'
import { useServices } from '../../app/context'
import { notifyDataChanged } from '../../app/changes'
import { useCollection } from '../../shared/hooks/useCollection'
import { FormSheet } from '../../shared/ui/FormSheet'
import { choiceField, messageFor, textField, type FormSpec } from '../../shared/ui/form-model'
import {
  Button,
  EmptyState,
  ErrorState,
  Label,
  LoadingState,
  Row,
  SearchField
} from '../../shared/ui/primitives'

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

export function BoardsScreen(): React.JSX.Element {
  const { boards: api } = useServices()
  const nodes = useCollection(useCallback(() => api.listNodes(), [api]))
  const [folderId, setFolderId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormSpec | null>(null)
  const [opened, setOpened] = useState<{ node: BoardNode; document: BoardDocument } | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const allNodes = useMemo(() => nodes.data ?? [], [nodes.data])
  const managed = useMemo(() => managedNodeIds(allNodes), [allNodes])
  const currentFolder = folderId ? (allNodes.find((node) => node.id === folderId) ?? null) : null
  const effectiveFolderId = folderId && currentFolder ? folderId : null

  const refresh = (): void => {
    nodes.refresh()
    notifyDataChanged()
  }

  const createNode = (type: 'folder' | 'board'): void => {
    setForm({
      title: type === 'folder' ? 'Новая папка' : 'Новая доска',
      initial: { title: '', icon: 'folder' },
      fields: [
        textField('title', 'Название'),
        ...(type === 'folder'
          ? [
              choiceField(
                'icon',
                'Иконка',
                STUDY_FOLDER_ICON_NAMES.map((icon) => ({ value: icon, label: icon }))
              )
            ]
          : [])
      ],
      save: (values) => {
        const input = boardValidation.createBoardNodeInputSchema.parse({
          type,
          parentId: effectiveFolderId,
          title: values.title,
          icon: type === 'folder' ? values.icon : undefined
        })
        const created = api.createNode(input)
        refresh()
        if (created.type === 'board')
          setOpened({ node: created, document: api.getDocument(created.id) })
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
              choiceField(
                'icon',
                'Иконка',
                STUDY_FOLDER_ICON_NAMES.map((icon) => ({ value: icon, label: icon }))
              ),
              choiceField('parentId', 'Расположение', folderChoices)
            ]
          : node.type === 'board' && !managed.has(node.id)
            ? [choiceField('parentId', 'Расположение', folderChoices)]
            : [])
      ],
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
    Alert.alert(
      node.type === 'folder' ? 'Удалить папку?' : 'Удалить доску?',
      node.type === 'folder'
        ? 'Будут удалены папка и все вложенные обычные доски.'
        : node.sourceMaterialId || node.sourceNoteId
          ? 'Связанный блок будет также удалён из исходного документа.'
          : 'Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            setPending(true)
            setError('')
            void api
              .deleteNode(node.id)
              .then(() => {
                if (opened?.node.id === node.id) setOpened(null)
                if (effectiveFolderId === node.id) setFolderId(node.parentId)
                refresh()
              })
              .catch((reason) => setError(messageFor(reason)))
              .finally(() => setPending(false))
          }
        }
      ]
    )
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
    return (
      <View style={{ flex: 1, gap: 14 }}>
        {error ? <ErrorState message={error} /> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label="Назад" onPress={() => setOpened(null)} />
          <Button label="Свойства" onPress={() => editNode(current)} />
          <Button
            label="Удалить"
            danger
            disabled={pending}
            onPress={() => confirmDelete(current)}
          />
        </View>
        <Label title>{current.title}</Label>
        <Row
          title={opened.document.snapshot ? 'Снимок доски сохранён' : 'Пустая доска'}
          subtitle={
            opened.document.snapshot
              ? 'Документ tldraw сохранён без преобразований. Мобильный canvas подключается отдельно, чтобы не повредить совместимость с desktop.'
              : 'Структура доски создана и готова для нативного canvas.'
          }
        />
        <Label muted>
          На этом этапе мобильная версия уже безопасно хранит и переносит исходный BoardSnapshot без
          изменения его структуры. Редактирование canvas будет подключено следующим слоем.
        </Label>
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
              <Row
                title={item.title}
                subtitle={
                  item.type === 'folder'
                    ? itemManaged
                      ? 'Управляемая папка'
                      : `Папка · ${item.icon ?? 'folder'}`
                    : item.sourceMaterialId
                      ? 'Доска материала'
                      : item.sourceNoteId
                        ? 'Доска заметки'
                        : 'Доска'
                }
                onPress={() =>
                  item.type === 'folder'
                    ? setFolderId(item.id)
                    : setOpened({ node: item, document: api.getDocument(item.id) })
                }
              >
                {item.type === 'board' || !itemManaged ? (
                  <Button label="Изменить" onPress={() => editNode(item)} />
                ) : null}
                {!itemManaged ? (
                  <>
                    <Button label="↑" disabled={index === 0} onPress={() => reorder(item, -1)} />
                    <Button
                      label="↓"
                      disabled={index === children.length - 1}
                      onPress={() => reorder(item, 1)}
                    />
                  </>
                ) : null}
                {canDelete ? (
                  <Button
                    label="Удалить"
                    danger
                    disabled={pending}
                    onPress={() => confirmDelete(item)}
                  />
                ) : null}
              </Row>
            )
          }}
        />
      )}
      {form && <FormSheet spec={form} close={() => setForm(null)} />}
    </View>
  )
}
