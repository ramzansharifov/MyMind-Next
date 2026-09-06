import { randomUUID } from 'expo-crypto'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, AppState, BackHandler, FlatList, TextInput, View } from 'react-native'
import type { StudyDocument, StudyMaterial, StudyNode } from '@mymind/contracts/study'
import { STUDY_FOLDER_ICON_NAMES } from '@mymind/contracts/study'
import { AutosaveQueue } from '@mymind/core/autosave'
import * as studyValidation from '@mymind/core/validation/study'
import { useServices } from '../../app/context'
import { notifyDataChanged } from '../../app/changes'
import { useCollection } from '../../shared/hooks/useCollection'
import { DocumentEditor } from '../../shared/ui/DocumentEditor'
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
import { useTheme } from '../../shared/ui/theme'

function sortNodes(nodes: StudyNode[]): StudyNode[] {
  return [...nodes].sort((a, b) => a.position - b.position || a.createdAt - b.createdAt)
}

function descendantsOf(id: string, nodes: StudyNode[]): Set<string> {
  const descendants = new Set<string>()
  let changed = true
  while (changed) {
    changed = false
    for (const node of nodes) {
      if (node.parentId && (node.parentId === id || descendants.has(node.parentId))) {
        if (!descendants.has(node.id)) {
          descendants.add(node.id)
          changed = true
        }
      }
    }
  }
  return descendants
}

function folderLabel(folder: StudyNode, nodes: StudyNode[]): string {
  const path = [folder.title]
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const seen = new Set<string>()
  let parentId = folder.parentId
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId)
    const parent = byId.get(parentId)
    if (!parent) break
    path.unshift(parent.title)
    parentId = parent.parentId
  }
  return path.join(' / ')
}

export function StudyScreen(): React.JSX.Element {
  const { study: api } = useServices()
  const theme = useTheme()
  const nodes = useCollection(useCallback(() => api.listNodes(), [api]))
  const [folderId, setFolderId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormSpec | null>(null)
  const [material, setMaterial] = useState<StudyMaterial | null>(null)
  const [document, setDocument] = useState<StudyDocument | null>(null)
  const [editorError, setEditorError] = useState('')
  const [closing, setClosing] = useState(false)
  const [pendingAction, setPendingAction] = useState(false)
  const queueRef = useRef<AutosaveQueue<StudyDocument> | null>(null)

  const allNodes = nodes.data ?? []
  const currentFolder = folderId ? allNodes.find((node) => node.id === folderId) ?? null : null

  useEffect(() => {
    if (folderId && nodes.data && !nodes.data.some((node) => node.id === folderId)) setFolderId(null)
  }, [folderId, nodes.data])

  const openMaterial = useCallback(
    (id: string): void => {
      try {
        const next = api.getMaterial(id)
        setMaterial(next)
        setDocument(next.document)
        setEditorError('')
        queueRef.current = new AutosaveQueue<StudyDocument>(
          async (value) => {
            const saved = await api.saveMaterial({ nodeId: id, document: value })
            setMaterial(saved)
            notifyDataChanged()
          },
          {
            delayMs: 350,
            onError: (reason) => setEditorError(messageFor(reason))
          }
        )
      } catch (reason) {
        setEditorError(messageFor(reason))
      }
    },
    [api]
  )

  const flush = useCallback(async (): Promise<void> => {
    const queue = queueRef.current
    if (!queue) return
    await queue.flush()
    setEditorError('')
  }, [])

  const closeMaterial = useCallback(async (): Promise<void> => {
    if (closing) return
    setClosing(true)
    try {
      await flush()
      queueRef.current = null
      setMaterial(null)
      setDocument(null)
      nodes.refresh()
    } catch (reason) {
      setEditorError(messageFor(reason))
    } finally {
      setClosing(false)
    }
  }, [closing, flush, nodes])

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (material) {
        void closeMaterial()
        return true
      }
      if (folderId) {
        setFolderId(currentFolder?.parentId ?? null)
        return true
      }
      return false
    })
    return () => subscription.remove()
  }, [closeMaterial, currentFolder?.parentId, folderId, material])

  useEffect(() => {
    if (!material) return
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void flush().catch((reason) => setEditorError(messageFor(reason)))
    })
    return () => subscription.remove()
  }, [flush, material])

  const changeDocument = (next: StudyDocument): void => {
    setDocument(next)
    setEditorError('')
    queueRef.current?.schedule(next)
  }

  const refreshAfterMutation = (): void => {
    nodes.refresh()
    notifyDataChanged()
  }

  const createFolder = (): void => {
    setForm({
      title: 'Новая папка',
      initial: { title: '', icon: 'folder' },
      fields: [
        textField('title', 'Название'),
        choiceField(
          'icon',
          'Иконка',
          STUDY_FOLDER_ICON_NAMES.map((icon) => ({ value: icon, label: icon }))
        )
      ],
      save: (values) => {
        const input = studyValidation.createStudyNodeInputSchema.parse({
          type: 'folder',
          parentId: folderId,
          title: values.title,
          icon: values.icon
        })
        api.createNode(input)
        refreshAfterMutation()
      }
    })
  }

  const createMaterial = (): void => {
    setForm({
      title: 'Новый материал',
      initial: { title: '' },
      fields: [textField('title', 'Название')],
      save: (values) => {
        const input = studyValidation.createStudyNodeInputSchema.parse({
          type: 'material',
          parentId: folderId,
          title: values.title
        })
        const created = api.createNode(input)
        refreshAfterMutation()
        openMaterial(created.id)
      }
    })
  }

  const editNode = (node: StudyNode): void => {
    const blocked = node.type === 'folder' ? descendantsOf(node.id, allNodes) : new Set<string>()
    const folderChoices = [
      { value: null, label: 'Корень' },
      ...allNodes
        .filter(
          (candidate) =>
            candidate.type === 'folder' && candidate.id !== node.id && !blocked.has(candidate.id)
        )
        .sort((a, b) => folderLabel(a, allNodes).localeCompare(folderLabel(b, allNodes)))
        .map((folder) => ({ value: folder.id, label: folderLabel(folder, allNodes) }))
    ]
    setForm({
      title: node.type === 'folder' ? 'Свойства папки' : 'Свойства материала',
      initial: { title: node.title, parentId: node.parentId, icon: node.icon ?? 'folder' },
      fields: [
        textField('title', 'Название'),
        ...(node.type === 'folder'
          ? [
              choiceField(
                'icon',
                'Иконка',
                STUDY_FOLDER_ICON_NAMES.map((icon) => ({ value: icon, label: icon }))
              )
            ]
          : []),
        choiceField('parentId', 'Расположение', folderChoices)
      ],
      save: async (values) => {
        if (material?.nodeId === node.id) await flush()
        const renamed = studyValidation.renameStudyNodeInputSchema.parse({
          id: node.id,
          title: values.title
        })
        api.renameNode(renamed.id, renamed.title)
        if (node.type === 'folder') {
          const icon = studyValidation.updateStudyFolderIconInputSchema.parse({
            id: node.id,
            icon: values.icon
          })
          api.updateFolderIcon(icon.id, icon.icon)
        }
        const parentId = typeof values.parentId === 'string' ? values.parentId : null
        if (parentId !== node.parentId) {
          const siblings = allNodes.filter(
            (candidate) => candidate.parentId === parentId && candidate.id !== node.id
          )
          api.moveNode({ id: node.id, parentId, position: siblings.length })
          if (folderId === node.id) setFolderId(parentId)
        }
        if (material?.nodeId === node.id) {
          const updated = api.getMaterial(node.id)
          setMaterial(updated)
          setDocument(updated.document)
        }
        refreshAfterMutation()
      }
    })
  }

  const reorder = (node: StudyNode, direction: -1 | 1): void => {
    const siblings = sortNodes(allNodes.filter((item) => item.parentId === node.parentId))
    const index = siblings.findIndex((item) => item.id === node.id)
    const position = index + direction
    if (index < 0 || position < 0 || position >= siblings.length) return
    try {
      api.moveNode({ id: node.id, parentId: node.parentId, position })
      refreshAfterMutation()
    } catch (reason) {
      setEditorError(messageFor(reason))
    }
  }

  const duplicate = (node: StudyNode): void => {
    if (pendingAction) return
    setPendingAction(true)
    setEditorError('')
    void api
      .duplicateNode(node.id)
      .then((result) => {
        refreshAfterMutation()
        const copied = result.nodes.find((item) => item.id === result.rootId)
        if (copied?.type === 'material') openMaterial(copied.id)
      })
      .catch((reason) => setEditorError(messageFor(reason)))
      .finally(() => setPendingAction(false))
  }

  const confirmDelete = (node: StudyNode): void => {
    Alert.alert(
      node.type === 'folder' ? 'Удалить папку?' : 'Удалить материал?',
      node.type === 'folder'
        ? 'Будут удалены папка, все вложенные материалы и их локальные данные.'
        : 'Материал и его локальные данные будут удалены.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            if (pendingAction) return
            setPendingAction(true)
            if (material?.nodeId === node.id) queueRef.current?.discardPending()
            void api
              .deleteNode(node.id)
              .then(() => {
                if (material?.nodeId === node.id) {
                  queueRef.current = null
                  setMaterial(null)
                  setDocument(null)
                }
                if (folderId === node.id) setFolderId(node.parentId)
                setEditorError('')
                refreshAfterMutation()
              })
              .catch((reason) => setEditorError(messageFor(reason)))
              .finally(() => setPendingAction(false))
          }
        }
      ]
    )
  }

  const breadcrumbs = useMemo(() => {
    const byId = new Map(allNodes.map((node) => [node.id, node]))
    const result: StudyNode[] = []
    const seen = new Set<string>()
    let current = currentFolder
    while (current && !seen.has(current.id)) {
      seen.add(current.id)
      result.unshift(current)
      current = current.parentId ? (byId.get(current.parentId) ?? null) : null
    }
    return result
  }, [allNodes, currentFolder])

  if (material && document) {
    const node = allNodes.find((item) => item.id === material.nodeId)
    return (
      <View style={{ flex: 1 }}>
        {editorError ? <ErrorState message={editorError} retry={() => void flush()} /> : null}
        <DocumentEditor
          document={document}
          onChange={changeDocument}
          createId={randomUUID}
          header={
            <View style={{ gap: 12, paddingBottom: 16 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button
                  label={closing ? 'Сохранение…' : 'Назад'}
                  disabled={closing}
                  onPress={() => void closeMaterial()}
                />
                {node ? (
                  <Button label="Свойства" disabled={closing} onPress={() => editNode(node)} />
                ) : null}
                {node ? (
                  <Button
                    label="Копия"
                    disabled={closing || pendingAction}
                    onPress={() => duplicate(node)}
                  />
                ) : null}
                {node ? (
                  <Button
                    label="Удалить"
                    danger
                    disabled={closing || pendingAction}
                    onPress={() => confirmDelete(node)}
                  />
                ) : null}
              </View>
              {node ? (
                <TextInput
                  accessibilityLabel="Название материала"
                  value={node.title}
                  onChangeText={(title) => {
                    nodes.refresh()
                    const current = nodes.data?.find((item) => item.id === node.id)
                    if (current) {
                      setForm({
                        title: 'Переименовать материал',
                        initial: { title },
                        fields: [textField('title', 'Название')],
                        save: (values) => {
                          const valid = studyValidation.renameStudyNodeInputSchema.parse({
                            id: node.id,
                            title: values.title
                          })
                          api.renameNode(valid.id, valid.title)
                          refreshAfterMutation()
                        }
                      })
                    }
                  }}
                  editable={false}
                  style={{
                    color: theme.text,
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    minHeight: 52,
                    paddingHorizontal: 14,
                    fontSize: 20,
                    fontWeight: '700'
                  }}
                />
              ) : null}
              <Label muted>Изменения содержимого сохраняются автоматически.</Label>
            </View>
          }
        />
        {form && <FormSheet spec={form} close={() => setForm(null)} />}
      </View>
    )
  }

  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')
  const children = sortNodes(
    allNodes.filter(
      (node) =>
        node.parentId === folderId &&
        (!normalizedQuery || node.title.toLocaleLowerCase('ru-RU').includes(normalizedQuery))
    )
  )

  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 10, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label="Корень" selected={!folderId} onPress={() => setFolderId(null)} />
          {breadcrumbs.map((folder) => (
            <Button
              key={folder.id}
              label={folder.title}
              selected={folder.id === folderId}
              onPress={() => setFolderId(folder.id)}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label="+ Папка" selected onPress={createFolder} />
          <Button label="+ Материал" selected onPress={createMaterial} />
        </View>
        <SearchField value={query} onChangeText={setQuery} />
      </View>

      {editorError ? <ErrorState message={editorError} /> : null}
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
          renderItem={({ item, index }) => (
            <Row
              title={item.title}
              subtitle={item.type === 'folder' ? `Папка · ${item.icon ?? 'folder'}` : 'Материал'}
              onPress={() =>
                item.type === 'folder' ? setFolderId(item.id) : openMaterial(item.id)
              }
            >
              <Button label="Изменить" onPress={() => editNode(item)} />
              <Button label="↑" disabled={index === 0} onPress={() => reorder(item, -1)} />
              <Button
                label="↓"
                disabled={index === children.length - 1}
                onPress={() => reorder(item, 1)}
              />
              <Button
                label="Копия"
                disabled={pendingAction}
                onPress={() => duplicate(item)}
              />
              <Button
                label="Удалить"
                danger
                disabled={pendingAction}
                onPress={() => confirmDelete(item)}
              />
            </Row>
          )}
        />
      )}
      {form && <FormSheet spec={form} close={() => setForm(null)} />}
    </View>
  )
}
