import { randomUUID } from 'expo-crypto'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, BackHandler, FlatList, View } from 'react-native'
import type {
  ResolveStudyInternalLinkTargetInput,
  StudyBoardBlock,
  StudyDocument,
  StudyMaterial,
  StudyNode
} from '@mymind/contracts/study'
import { AutosaveQueue } from '@mymind/core/autosave'
import * as studyValidation from '@mymind/core/validation/study'
import { useServices } from '../../app/context'
import { notifyDataChanged } from '../../app/changes'
import { useCollection } from '../../shared/hooks/useCollection'
import { DocumentEditor } from '../../shared/ui/DocumentEditor'
import { DocumentReader, type DocumentRevealRequest } from '../../shared/ui/DocumentReader'
import { FormSheet } from '../../shared/ui/FormSheet'
import { ActionMenu } from '../../shared/ui/ActionMenu'
import { WorkspaceNodeCard } from '../../shared/ui/Workspace'
import { MobileCreateAction } from '../../shared/ui/MobileCreateAction'
import { VisualIconBadge } from '../../shared/ui/VisualPickers'
import { FOLDER_ICON_CHOICES } from '../../shared/ui/visual-options'
import { useConfirmation } from '../../shared/ui/ConfirmationProvider'
import { useToast } from '../../shared/ui/ToastProvider'
import type { StudyRichTextInternalLink } from '../../shared/ui/studyRichText'
import { StudyCodeWorkspace } from './StudyCodeWorkspace'
import StudyMermaidExportDom, {
  type StudyMermaidPdfItem,
  type StudyMermaidPdfRequest,
  type StudyMermaidPdfResponse,
  type StudyMermaidPdfResult
} from './StudyMermaidExportDom'
import { exportStudyMaterialPdf } from './studyPdfExport'
import {
  choiceField,
  iconField,
  messageFor,
  textField,
  type FormSpec
} from '../../shared/ui/form-model'
import {
  Button,
  EmptyState,
  ErrorState,
  Label,
  LoadingState,
  SearchField
} from '../../shared/ui/primitives'

interface StudyInternalLinkHistoryEntry {
  sourceMaterialId: string
  destinationMaterialId: string
  sourceBlockId: string
}

interface OpenStudyMaterialOptions {
  mode?: 'read' | 'edit'
  revealBlockId?: string | null
  preserveLinkHistory?: boolean
}

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

export function StudyScreen({
  initialResource = null,
  onResourceHandled,
  onImmersiveChange,
  onOpenBoard
}: {
  initialResource?: ResolveStudyInternalLinkTargetInput | null
  onResourceHandled?: () => void
  onImmersiveChange?: (active: boolean) => void
  onOpenBoard?: (boardId: string) => void
}): React.JSX.Element {
  const { study: api, boards, documentAssets } = useServices()
  const confirm = useConfirmation()
  const toast = useToast()
  const nodes = useCollection(useCallback(() => api.listNodes(), [api]))
  const [folderId, setFolderId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormSpec | null>(null)
  const [material, setMaterial] = useState<StudyMaterial | null>(null)
  const [document, setDocument] = useState<StudyDocument | null>(null)
  const [editorError, setEditorError] = useState('')
  const [closing, setClosing] = useState(false)
  const [pendingAction, setPendingAction] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [materialMode, setMaterialMode] = useState<'read' | 'edit' | 'code'>('edit')
  const [codeNodeId, setCodeNodeId] = useState<string | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [internalLinkHistory, setInternalLinkHistory] = useState<StudyInternalLinkHistoryEntry[]>(
    []
  )
  const [reveal, setReveal] = useState<DocumentRevealRequest | null>(null)
  const queueRef = useRef<AutosaveQueue<StudyDocument> | null>(null)
  const [mermaidPdfRequest, setMermaidPdfRequest] = useState<StudyMermaidPdfRequest | null>(null)
  const mermaidPdfSequenceRef = useRef(0)
  const mermaidPdfPendingRef = useRef<{
    requestId: number
    resolve(results: StudyMermaidPdfResult[]): void
    timeout: ReturnType<typeof setTimeout>
  } | null>(null)
  const revealSequenceRef = useRef(0)

  const allNodes = useMemo(() => nodes.data ?? [], [nodes.data])
  const effectiveFolderId =
    folderId && allNodes.some((node) => node.id === folderId) ? folderId : null
  const currentFolder = effectiveFolderId
    ? (allNodes.find((node) => node.id === effectiveFolderId) ?? null)
    : null

  const setFocus = useCallback(
    (active: boolean): void => {
      setFocusMode(active)
      onImmersiveChange?.(active)
      if (active) setMaterialMode('read')
    },
    [onImmersiveChange]
  )

  const requestReveal = useCallback((blockId: string | null): void => {
    revealSequenceRef.current += 1
    setReveal({ blockId, requestId: revealSequenceRef.current })
  }, [])

  const openMaterial = useCallback(
    (id: string, options: OpenStudyMaterialOptions = {}): void => {
      try {
        setFocus(false)
        setMaterialMode(options.mode ?? 'edit')
        if (!options.preserveLinkHistory) setInternalLinkHistory([])
        if (options.revealBlockId !== undefined) requestReveal(options.revealBlockId)
        else setReveal(null)
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
    [api, requestReveal, setFocus]
  )

  useEffect(() => {
    if (!initialResource) return

    const target = api.resolveInternalLinkTarget(initialResource)
    if (!target) {
      setEditorError('Материал или заголовок был удалён.')
      onResourceHandled?.()
      return
    }

    openMaterial(target.materialId, {
      mode: 'read',
      revealBlockId: target.kind === 'heading' ? target.headingId : null
    })
    onResourceHandled?.()
  }, [api, initialResource, onResourceHandled, openMaterial])

  const flush = useCallback(async (): Promise<void> => {
    const queue = queueRef.current
    if (!queue) return
    await queue.flush()
    setEditorError('')
  }, [])

  const renderMermaidPdf = useCallback(
    (items: StudyMermaidPdfItem[]): Promise<StudyMermaidPdfResult[]> => {
      if (items.length === 0) return Promise.resolve([])
      const previous = mermaidPdfPendingRef.current
      if (previous) {
        clearTimeout(previous.timeout)
        previous.resolve([])
      }
      mermaidPdfSequenceRef.current += 1
      const requestId = mermaidPdfSequenceRef.current
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          const pending = mermaidPdfPendingRef.current
          if (!pending || pending.requestId !== requestId) return
          mermaidPdfPendingRef.current = null
          setMermaidPdfRequest(null)
          resolve([])
        }, 12000)
        mermaidPdfPendingRef.current = { requestId, resolve, timeout }
        setMermaidPdfRequest({ requestId, items })
      })
    },
    []
  )

  const handleMermaidPdfRendered = useCallback(
    async (response: StudyMermaidPdfResponse): Promise<void> => {
      const pending = mermaidPdfPendingRef.current
      if (!pending || pending.requestId !== response.requestId) return
      clearTimeout(pending.timeout)
      mermaidPdfPendingRef.current = null
      setMermaidPdfRequest(null)
      pending.resolve(response.results)
    },
    []
  )

  useEffect(
    () => () => {
      const pending = mermaidPdfPendingRef.current
      if (!pending) return
      clearTimeout(pending.timeout)
      mermaidPdfPendingRef.current = null
      pending.resolve([])
    },
    []
  )

  const exportPdf = useCallback(
    async (title: string): Promise<void> => {
      if (!material || !document || exportingPdf) return
      setExportingPdf(true)
      setEditorError('')
      try {
        await flush()
        const mermaidItems: StudyMermaidPdfItem[] = document.blocks
          .filter((block) => block.type === 'mermaid')
          .map((block) => ({ id: block.id, source: block.source, theme: block.theme }))
        const renderedMermaidSvg: Record<string, string> = {}
        const rendered = await renderMermaidPdf(mermaidItems)
        for (const item of rendered) {
          if (item.svg) renderedMermaidSvg[item.id] = item.svg
        }
        await exportStudyMaterialPdf({
          title,
          document,
          resolveAssetUri: documentAssets.resolveAssetUri,
          renderedMermaidSvg,
          resolveInternalLinkTarget: (link) =>
            api.resolveInternalLinkTarget({
              kind: link.kind,
              materialId: link.materialId,
              headingId: link.headingId
            })
        })
      } catch (reason) {
        setEditorError(messageFor(reason))
      } finally {
        setExportingPdf(false)
      }
    },
    [api, document, documentAssets, exportingPdf, flush, material, renderMermaidPdf]
  )

  const openInternalLink = useCallback(
    async (link: StudyRichTextInternalLink, sourceBlockId: string): Promise<void> => {
      if (!material || !link.materialId) return
      const target = api.resolveInternalLinkTarget({
        kind: link.kind,
        materialId: link.materialId,
        headingId: link.headingId
      })
      if (!target) {
        toast.error('Материал или заголовок был удалён.', 'study-link-unavailable')
        return
      }

      try {
        await flush()
        setInternalLinkHistory((current) => [
          ...current,
          {
            sourceMaterialId: material.nodeId,
            destinationMaterialId: target.materialId,
            sourceBlockId
          }
        ])

        const targetBlockId = target.kind === 'heading' ? target.headingId : null
        if (target.materialId === material.nodeId) {
          setFocus(false)
          setMaterialMode('read')
          requestReveal(targetBlockId)
          return
        }

        openMaterial(target.materialId, {
          mode: 'read',
          revealBlockId: targetBlockId,
          preserveLinkHistory: true
        })
      } catch (reason) {
        setEditorError(messageFor(reason))
      }
    },
    [api, flush, material, openMaterial, requestReveal, setFocus]
  )

  const navigateInternalLinkBack = useCallback(async (): Promise<void> => {
    const entry = internalLinkHistory.at(-1)
    if (!entry || !material) return

    try {
      await flush()
      api.getMaterial(entry.sourceMaterialId)
      setInternalLinkHistory((current) => current.slice(0, -1))

      if (entry.sourceMaterialId === material.nodeId) {
        setFocus(false)
        setMaterialMode('read')
        requestReveal(entry.sourceBlockId)
        return
      }

      openMaterial(entry.sourceMaterialId, {
        mode: 'read',
        revealBlockId: entry.sourceBlockId,
        preserveLinkHistory: true
      })
    } catch (reason) {
      setInternalLinkHistory((current) => current.slice(0, -1))
      setEditorError(messageFor(reason))
    }
  }, [api, flush, internalLinkHistory, material, openMaterial, requestReveal, setFocus])

  const closeMaterial = useCallback(async (): Promise<void> => {
    if (closing) return
    setClosing(true)
    try {
      await flush()
      setFocus(false)
      queueRef.current = null
      setMaterial(null)
      setDocument(null)
      setInternalLinkHistory([])
      setReveal(null)
      nodes.refresh()
    } catch (reason) {
      setEditorError(messageFor(reason))
    } finally {
      setClosing(false)
    }
  }, [closing, flush, nodes, setFocus])

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (focusMode) {
        setFocus(false)
        return true
      }
      if (material && materialMode === 'code') {
        setMaterialMode('edit')
        return true
      }
      if (codeNodeId) {
        setCodeNodeId(null)
        return true
      }
      if (material && internalLinkHistory.length > 0) {
        void navigateInternalLinkBack()
        return true
      }
      if (material) {
        void closeMaterial()
        return true
      }
      if (effectiveFolderId) {
        setFolderId(currentFolder?.parentId ?? null)
        return true
      }
      return false
    })
    return () => subscription.remove()
  }, [
    closeMaterial,
    codeNodeId,
    currentFolder?.parentId,
    effectiveFolderId,
    focusMode,
    internalLinkHistory.length,
    material,
    materialMode,
    navigateInternalLinkBack,
    setFocus
  ])

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

  const openLinkedBoard = useCallback(
    async (block: StudyBoardBlock): Promise<void> => {
      if (!material || !document || !onOpenBoard) {
        throw new Error('Связанную доску сейчас нельзя открыть')
      }
      await flush()
      const board = boards.ensureStudyBoard({ materialId: material.nodeId, blockId: block.id })
      if (block.boardId !== board.id || block.title !== board.title) {
        const nextDocument: StudyDocument = {
          ...document,
          blocks: document.blocks.map((item) =>
            item.id === block.id && item.type === 'board'
              ? { ...item, boardId: board.id, title: board.title }
              : item
          )
        }
        setDocument(nextDocument)
        queueRef.current?.schedule(nextDocument)
        await flush()
      }
      notifyDataChanged()
      onOpenBoard(board.id)
    },
    [boards, document, flush, material, onOpenBoard]
  )

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
        iconField('icon', 'Иконка', FOLDER_ICON_CHOICES, 'folder')
      ],
      preview: {
        titleKey: 'title',
        iconKey: 'icon',
        iconFamily: 'folder',
        description: 'Так папка будет выглядеть в обучении.'
      },
      save: (values) => {
        const input = studyValidation.createStudyNodeInputSchema.parse({
          type: 'folder',
          parentId: effectiveFolderId,
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
          parentId: effectiveFolderId,
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
          ? [iconField('icon', 'Иконка', FOLDER_ICON_CHOICES, 'folder')]
          : []),
        choiceField('parentId', 'Расположение', folderChoices)
      ],
      preview:
        node.type === 'folder'
          ? {
              titleKey: 'title',
              iconKey: 'icon',
              iconFamily: 'folder',
              description: 'Так папка будет выглядеть в обучении.'
            }
          : undefined,
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
    if (pendingAction) return
    void confirm({
      title: node.type === 'folder' ? 'Удалить папку?' : 'Удалить материал?',
      description:
        node.type === 'folder'
          ? 'Будут удалены папка, все вложенные материалы и их локальные данные.'
          : 'Материал и его локальные данные будут удалены.',
      tone: 'danger',
      onConfirm: async () => {
        setPendingAction(true)
        if (material?.nodeId === node.id) queueRef.current?.discardPending()
        try {
          await api.deleteNode(node.id)
          if (material?.nodeId === node.id) {
            setFocus(false)
            queueRef.current = null
            setMaterial(null)
            setDocument(null)
            setInternalLinkHistory([])
            setReveal(null)
          }
          if (folderId === node.id) setFolderId(node.parentId)
          setEditorError('')
          refreshAfterMutation()
          toast.success(node.type === 'folder' ? 'Папка удалена' : 'Материал удалён')
        } catch (reason) {
          setEditorError(messageFor(reason))
          throw reason
        } finally {
          setPendingAction(false)
        }
      }
    })
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

  if (codeNodeId) {
    return (
      <View style={{ flex: 1 }}>
        {editorError ? <ErrorState message={editorError} /> : null}
        <StudyCodeWorkspace
          repository={api}
          nodeId={codeNodeId}
          validateDocumentAssets={documentAssets.validateDocumentAssets}
          onClose={() => setCodeNodeId(null)}
          onApplied={() => {
            nodes.refresh()
            notifyDataChanged()
          }}
        />
      </View>
    )
  }

  if (material && document) {
    const node = allNodes.find((item) => item.id === material.nodeId)
    if (materialMode === 'code') {
      return (
        <View style={{ flex: 1 }}>
          {editorError ? <ErrorState message={editorError} /> : null}
          <StudyCodeWorkspace
            repository={api}
            nodeId={material.nodeId}
            validateDocumentAssets={documentAssets.validateDocumentAssets}
            onClose={() => setMaterialMode('edit')}
            onApplied={() => {
              const next = api.getMaterial(material.nodeId)
              setMaterial(next)
              setDocument(next.document)
              nodes.refresh()
              notifyDataChanged()
            }}
          />
        </View>
      )
    }
    const reading = focusMode || materialMode === 'read'
    const readerHeader = (
      <View
        style={{
          gap: 12,
          paddingHorizontal: focusMode ? 16 : 0,
          paddingTop: focusMode ? 12 : 0,
          paddingBottom: 20
        }}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {focusMode ? (
            <Button label="Выйти из фокуса" selected onPress={() => setFocus(false)} />
          ) : (
            <>
              {internalLinkHistory.length > 0 ? (
                <Button label="← По ссылке" onPress={() => void navigateInternalLinkBack()} />
              ) : null}
              <Button
                label={closing ? 'Сохранение…' : 'Назад'}
                disabled={closing}
                onPress={() => void closeMaterial()}
              />
              <Button label="Редактировать" onPress={() => setMaterialMode('edit')} />
              <Button
                label="Код"
                disabled={closing}
                onPress={() => {
                  void flush()
                    .then(() => setMaterialMode('code'))
                    .catch((reason) => setEditorError(messageFor(reason)))
                }}
              />
              <Button
                label={exportingPdf ? 'PDF…' : 'PDF'}
                disabled={closing || exportingPdf}
                onPress={() => void exportPdf(node?.title ?? 'Материал')}
              />
              <Button label="Фокус" selected onPress={() => setFocus(true)} />
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
            </>
          )}
        </View>
        {node ? <Label title>{node.title}</Label> : null}
        {!focusMode ? <Label muted>Режим чтения не изменяет содержимое материала.</Label> : null}
      </View>
    )

    return (
      <View style={{ flex: 1 }}>
        <View
          pointerEvents="none"
          style={{ position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' }}
        >
          <StudyMermaidExportDom
            request={mermaidPdfRequest}
            onRendered={handleMermaidPdfRendered}
            dom={{ scrollEnabled: false, style: { width: 1, height: 1 } }}
          />
        </View>
        {editorError ? <ErrorState message={editorError} retry={() => void flush()} /> : null}
        {reading ? (
          <DocumentReader
            document={document}
            openAsset={documentAssets.openAsset}
            resolveAssetUri={documentAssets.resolveAssetUri}
            onAssetError={(reason) => setEditorError(messageFor(reason))}
            openBoard={openLinkedBoard}
            resolveInternalLinkTarget={api.resolveInternalLinkTarget}
            onOpenInternalLink={(link, sourceBlockId) => {
              void openInternalLink(link, sourceBlockId)
            }}
            reveal={reveal}
            header={readerHeader}
          />
        ) : (
          <DocumentEditor
            document={document}
            onChange={changeDocument}
            createId={randomUUID}
            importAsset={(kind) => documentAssets.importAsset(material.nodeId, kind)}
            openAsset={documentAssets.openAsset}
            resolveAssetUri={documentAssets.resolveAssetUri}
            openBoard={openLinkedBoard}
            searchInternalLinkTargets={(linkQuery) =>
              api.searchInternalLinkTargets({
                query: linkQuery,
                currentMaterialId: material.nodeId,
                limit: 40
              })
            }
            onAssetError={(reason) => setEditorError(messageFor(reason))}
            header={
              <View style={{ gap: 12, paddingBottom: 16 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {internalLinkHistory.length > 0 ? (
                    <Button label="← По ссылке" onPress={() => void navigateInternalLinkBack()} />
                  ) : null}
                  <Button
                    label={closing ? 'Сохранение…' : 'Назад'}
                    disabled={closing}
                    onPress={() => void closeMaterial()}
                  />
                  <Button label="Чтение" onPress={() => setMaterialMode('read')} />
                  <Button
                    label="Код"
                    disabled={closing}
                    onPress={() => {
                      void flush()
                        .then(() => setMaterialMode('code'))
                        .catch((reason) => setEditorError(messageFor(reason)))
                    }}
                  />
                  <Button
                    label={exportingPdf ? 'PDF…' : 'PDF'}
                    disabled={closing || exportingPdf}
                    onPress={() => void exportPdf(node?.title ?? 'Материал')}
                  />
                  <Button label="Фокус" onPress={() => setFocus(true)} />
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
                {node ? <Label title>{node.title}</Label> : null}
                <Label muted>Изменения содержимого сохраняются автоматически.</Label>
              </View>
            }
          />
        )}
        {!focusMode && form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
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
        {currentFolder ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button label="Код папки" onPress={() => setCodeNodeId(currentFolder.id)} />
          </View>
        ) : null}
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
          contentContainerStyle={{ paddingBottom: 88 }}
          refreshing={nodes.loading}
          onRefresh={nodes.refresh}
          ListEmptyComponent={
            <EmptyState text={query.trim() ? 'Ничего не найдено.' : 'В этой папке пока пусто.'} />
          }
          renderItem={({ item, index }) => (
            <WorkspaceNodeCard
              title={item.title}
              subtitle={item.type === 'folder' ? 'Папка' : 'Материал'}
              leading={
                item.type === 'folder' ? (
                  <VisualIconBadge value={item.icon ?? 'folder'} />
                ) : undefined
              }
              leadingIcon={item.type === 'material' ? 'study' : undefined}
              onPress={() =>
                item.type === 'folder' ? setFolderId(item.id) : openMaterial(item.id)
              }
              action={
                <ActionMenu
                  title={item.title}
                  disabled={pendingAction}
                  items={[
                    { label: 'Изменить', icon: 'edit', onPress: () => editNode(item) },
                    { label: 'Открыть код', icon: 'study', onPress: () => setCodeNodeId(item.id) },
                    {
                      label: 'Переместить выше',
                      icon: 'move',
                      disabled: index === 0,
                      onPress: () => reorder(item, -1)
                    },
                    {
                      label: 'Переместить ниже',
                      icon: 'move',
                      disabled: index === children.length - 1,
                      onPress: () => reorder(item, 1)
                    },
                    { label: 'Создать копию', icon: 'add', onPress: () => duplicate(item) },
                    {
                      label: 'Удалить',
                      icon: 'delete',
                      danger: true,
                      onPress: () => confirmDelete(item)
                    }
                  ]}
                />
              }
            />
          )}
        />
      )}
      <MobileCreateAction
        actions={[
          {
            key: 'folder',
            label: 'Новая папка',
            description: 'Создать папку в текущем разделе',
            icon: 'folder',
            onPress: createFolder
          },
          {
            key: 'material',
            label: 'Новый материал',
            description: 'Создать учебный материал здесь',
            icon: 'study',
            onPress: createMaterial
          }
        ]}
      />
      {form && <FormSheet spec={form} close={() => setForm(null)} />}
    </View>
  )
}
