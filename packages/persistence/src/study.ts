import type { RepositoryRuntime } from '@mymind/contracts/storage'
import type {
  CreateStudyNodeInput,
  DuplicateStudyNodeResult,
  MoveStudyNodeInput,
  ResolveStudyInternalLinkTargetInput,
  SaveStudyMaterialInput,
  SearchStudyInternalLinkTargetsInput,
  StudyDocument,
  StudyFolderIconName,
  StudyInternalLinkTarget,
  StudyMaterial,
  StudyNode
} from '@mymind/contracts/study'
import { documentToPlainText } from '@mymind/core/study-document'
import {
  createStudyNodeInputSchema,
  moveStudyNodeInputSchema,
  resolveStudyInternalLinkTargetInputSchema,
  saveStudyMaterialInputSchema,
  searchStudyInternalLinkTargetsInputSchema,
  studyDocumentSchema,
  studyFolderIconSchema,
  studyInternalLinkTargetSchema,
  studyMaterialSchema,
  studyNodeSchema
} from '@mymind/core/validation/study'

export interface StudyPersistenceHooks {
  validateDocumentAssets?(materialId: string, document: StudyDocument): Promise<void>
  duplicateDocumentAssets?(
    sourceMaterialId: string,
    targetMaterialId: string,
    document: StudyDocument
  ): Promise<StudyDocument>
  afterDocumentSaved?(materialId: string, document: StudyDocument): void | Promise<void>
  afterMaterialsDeleted?(materialIds: string[]): void | Promise<void>
  onCleanupError?(error: unknown): void
}

export interface StudyRepository {
  listNodes(): StudyNode[]
  createNode(input: CreateStudyNodeInput): StudyNode
  renameNode(id: string, title: string): StudyNode
  duplicateNode(id: string): Promise<DuplicateStudyNodeResult>
  updateFolderIcon(id: string, icon: StudyFolderIconName): StudyNode
  updateExpansion(id: string, isExpanded: boolean): StudyNode
  moveNode(input: MoveStudyNodeInput): StudyNode[]
  getMaterial(nodeId: string): StudyMaterial
  saveMaterial(input: SaveStudyMaterialInput): Promise<StudyMaterial>
  deleteNode(id: string): Promise<boolean>
  searchInternalLinkTargets(input: SearchStudyInternalLinkTargetsInput): StudyInternalLinkTarget[]
  resolveInternalLinkTarget(
    input: ResolveStudyInternalLinkTargetInput
  ): StudyInternalLinkTarget | null
}

interface StudyNodeRow {
  id: string
  type: 'folder' | 'material'
  parent_id: string | null
  title: string
  icon: StudyFolderIconName | null
  position: number
  is_expanded: number
  created_at: number
  updated_at: number
}

interface StudyMaterialRow {
  node_id: string
  document: string
  plain_text: string
  created_at: number
  updated_at: number
}

interface StudyLinkTargetRow {
  id: string
  kind: 'material' | 'heading'
  material_id: string
  heading_id: string | null
  title: string
  title_search: string
  material_title: string
  material_title_search: string
  folder_path: string
  folder_path_search: string
  heading_level: number | null
  position: number
  search_text: string
  updated_at: number
}

const NODE_SELECT =
  'SELECT id, type, parent_id, title, icon, position, is_expanded, created_at, updated_at FROM study_nodes'
const MATERIAL_SELECT =
  'SELECT node_id, document, plain_text, created_at, updated_at FROM study_materials'
const TARGET_SELECT =
  'SELECT id, kind, material_id, heading_id, title, title_search, material_title, material_title_search, folder_path, folder_path_search, heading_level, position, search_text, updated_at FROM study_link_targets'

function normalized(...values: string[]): string {
  return values.join(' ').trim().toLocaleLowerCase('ru-RU')
}

function containsLocalAssets(document: StudyDocument): boolean {
  return document.blocks.some(
    (block) =>
      (block.type === 'image' ||
        block.type === 'video' ||
        block.type === 'audio' ||
        block.type === 'file') &&
      block.source.type === 'local' &&
      Boolean(block.source.asset)
  )
}

function remapInternalLinks(
  document: StudyDocument,
  nodeIds: ReadonlyMap<string, string>
): StudyDocument {
  return {
    ...document,
    blocks: document.blocks.map((block) => {
      if (block.type !== 'text' || !block.html) return block
      const html = block.html.replace(
        /data-material-id=(["'])([^"']+)\1/g,
        (match, quote: string, materialId: string) => {
          const next = nodeIds.get(materialId)
          return next ? `data-material-id=${quote}${next}${quote}` : match
        }
      )
      return html === block.html ? block : { ...block, html }
    })
  }
}

export function createStudyRepository(
  runtime: RepositoryRuntime,
  hooks: StudyPersistenceHooks = {}
): StudyRepository {
  const queues = new Map<string, Promise<void>>()

  function runExclusive<Result>(id: string, operation: () => Promise<Result>): Promise<Result> {
    const previous = queues.get(id) ?? Promise.resolve()
    const result = previous.catch(() => undefined).then(operation)
    const settled = result.then(
      () => undefined,
      () => undefined
    )
    queues.set(id, settled)
    void settled.finally(() => {
      if (queues.get(id) === settled) queues.delete(id)
    })
    return result
  }

  function runForMany<Result>(ids: string[], operation: () => Promise<Result>): Promise<Result> {
    const ordered = [...new Set(ids)].sort()
    const visit = (index: number): Promise<Result> => {
      const id = ordered[index]
      return id ? runExclusive(id, () => visit(index + 1)) : operation()
    }
    return visit(0)
  }

  function mapNode(row: StudyNodeRow): StudyNode {
    return studyNodeSchema.parse({
      id: row.id,
      type: row.type,
      parentId: row.parent_id,
      title: row.title,
      icon: row.type === 'folder' ? (row.icon ?? 'folder') : undefined,
      position: row.position,
      isExpanded: Boolean(row.is_expanded),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  }

  function parseDocument(value: string): StudyDocument {
    try {
      return studyDocumentSchema.parse(JSON.parse(value))
    } catch {
      throw new Error('Содержимое материала повреждено')
    }
  }

  function mapMaterial(row: StudyMaterialRow): StudyMaterial {
    return studyMaterialSchema.parse({
      nodeId: row.node_id,
      document: parseDocument(row.document),
      plainText: row.plain_text,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })
  }

  function parseFolderPath(value: string): string[] {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : []
    } catch {
      return []
    }
  }

  function mapTarget(row: StudyLinkTargetRow): StudyInternalLinkTarget {
    return studyInternalLinkTargetSchema.parse({
      kind: row.kind,
      materialId: row.material_id,
      headingId: row.kind === 'heading' ? row.heading_id : null,
      title: row.title,
      materialTitle: row.material_title,
      folderPath: parseFolderPath(row.folder_path),
      headingLevel:
        row.kind === 'heading' &&
        (row.heading_level === 1 || row.heading_level === 2 || row.heading_level === 3)
          ? row.heading_level
          : null
    })
  }

  function allNodeRows(): StudyNodeRow[] {
    return runtime.database().prepare(NODE_SELECT).all() as StudyNodeRow[]
  }

  function findNode(id: string): StudyNodeRow | null {
    return (
      (runtime.database().prepare(`${NODE_SELECT} WHERE id = ?`).get(id) as StudyNodeRow) ?? null
    )
  }

  function requireNode(id: string): StudyNodeRow {
    const node = findNode(id)
    if (!node) throw new Error('Элемент обучения не найден')
    return node
  }

  function folderPath(parentId: string | null, rows: ReadonlyMap<string, StudyNodeRow>): string[] {
    const path: string[] = []
    const visited = new Set<string>()
    let current = parentId
    while (current && !visited.has(current)) {
      visited.add(current)
      const parent = rows.get(current)
      if (!parent) break
      if (parent.type === 'folder') path.unshift(parent.title)
      current = parent.parent_id
    }
    return path
  }

  function insertTargets(
    materialId: string,
    materialTitle: string,
    path: string[],
    document: StudyDocument,
    updatedAt: number
  ): void {
    const insert = runtime.database().prepare(
      `INSERT INTO study_link_targets(
        id, kind, material_id, heading_id, title, title_search, material_title,
        material_title_search, folder_path, folder_path_search, heading_level,
        position, search_text, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    const pathJson = JSON.stringify(path)
    const pathSearch = normalized(...path)
    insert.run(
      `material:${materialId}`,
      'material',
      materialId,
      null,
      materialTitle,
      normalized(materialTitle),
      materialTitle,
      normalized(materialTitle),
      pathJson,
      pathSearch,
      null,
      -1,
      normalized(materialTitle),
      updatedAt
    )
    document.blocks.forEach((block, position) => {
      if (block.type !== 'heading' || !block.text.trim()) return
      const title = block.text.trim()
      insert.run(
        `heading:${materialId}:${block.id}`,
        'heading',
        materialId,
        block.id,
        title,
        normalized(title),
        materialTitle,
        normalized(materialTitle),
        pathJson,
        pathSearch,
        block.level,
        position,
        normalized(title, materialTitle),
        updatedAt
      )
    })
  }

  function rebuildTargetsForMaterial(
    materialId: string,
    document: StudyDocument,
    rowsById?: ReadonlyMap<string, StudyNodeRow>,
    updatedAt = runtime.now()
  ): void {
    const node = requireNode(materialId)
    if (node.type !== 'material') throw new Error('Материал обучения не найден')
    const nodes = rowsById ?? new Map(allNodeRows().map((item) => [item.id, item]))
    runtime
      .database()
      .prepare('DELETE FROM study_link_targets WHERE material_id = ?')
      .run(materialId)
    insertTargets(materialId, node.title, folderPath(node.parent_id, nodes), document, updatedAt)
  }

  function rebuildAllTargets(): void {
    const rows = allNodeRows()
    const nodes = new Map(rows.map((item) => [item.id, item]))
    runtime.database().prepare('DELETE FROM study_link_targets').run()
    for (const node of rows) {
      if (node.type !== 'material') continue
      const material = runtime
        .database()
        .prepare(`${MATERIAL_SELECT} WHERE node_id = ?`)
        .get(node.id) as StudyMaterialRow | undefined
      if (!material) continue
      const document = parseDocument(material.document)
      insertTargets(
        node.id,
        node.title,
        folderPath(node.parent_id, nodes),
        document,
        material.updated_at
      )
    }
  }

  function emptyDocument(): StudyDocument {
    return { version: 1, blocks: [{ id: runtime.createId(), type: 'text', text: '' }] }
  }

  function listNodes(): StudyNode[] {
    const rows = runtime
      .database()
      .prepare(`${NODE_SELECT} ORDER BY parent_id ASC, position ASC, created_at ASC`)
      .all() as StudyNodeRow[]
    return rows.map(mapNode)
  }

  function assertParent(parentId: string | null): void {
    if (parentId === null) return
    const parent = findNode(parentId)
    if (!parent) throw new Error('Родительский элемент не найден')
    if (parent.type !== 'folder') throw new Error('Создавать элементы можно только внутри папки')
  }

  function createNode(input: CreateStudyNodeInput): StudyNode {
    const valid = createStudyNodeInputSchema.parse(input)
    assertParent(valid.parentId)
    const database = runtime.database()
    const siblings = database
      .prepare(
        valid.parentId === null
          ? 'SELECT position FROM study_nodes WHERE parent_id IS NULL'
          : 'SELECT position FROM study_nodes WHERE parent_id = ?'
      )
      .all(...(valid.parentId === null ? [] : [valid.parentId])) as Array<{ position: number }>
    const position = siblings.reduce((max, row) => Math.max(max, row.position), -1) + 1
    const now = runtime.now()
    const id = runtime.createId()
    const title =
      valid.title?.trim() || (valid.type === 'folder' ? 'Новая папка' : 'Новый материал')
    const document = valid.type === 'material' ? emptyDocument() : null

    database.transaction(() => {
      database
        .prepare(
          `INSERT INTO study_nodes(
            id, type, parent_id, title, icon, position, is_expanded, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          valid.type,
          valid.parentId,
          title,
          valid.type === 'folder' ? (valid.icon ?? 'folder') : null,
          position,
          1,
          now,
          now
        )
      if (document) {
        database
          .prepare(
            'INSERT INTO study_materials(node_id, document, plain_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
          )
          .run(id, JSON.stringify(document), '', now, now)
        const nodes = new Map(allNodeRows().map((item) => [item.id, item]))
        insertTargets(id, title, folderPath(valid.parentId, nodes), document, now)
      }
      if (valid.parentId) {
        database
          .prepare('UPDATE study_nodes SET is_expanded = 1, updated_at = ? WHERE id = ?')
          .run(now, valid.parentId)
      }
    })()
    return mapNode(requireNode(id))
  }

  function renameNode(id: string, title: string): StudyNode {
    requireNode(id)
    const next = title.trim()
    if (!next) throw new Error('Название не должно быть пустым')
    const now = runtime.now()
    const database = runtime.database()
    database.transaction(() => {
      database
        .prepare('UPDATE study_nodes SET title = ?, updated_at = ? WHERE id = ?')
        .run(next, now, id)
      rebuildAllTargets()
    })()
    return mapNode(requireNode(id))
  }

  function subtreeRows(rootId: string, rows = allNodeRows()): StudyNodeRow[] {
    const byId = new Map(rows.map((row) => [row.id, row]))
    if (!byId.has(rootId)) return []
    const result: StudyNodeRow[] = []
    const seen = new Set<string>()
    const visit = (id: string): void => {
      if (seen.has(id)) return
      const node = byId.get(id)
      if (!node) return
      seen.add(id)
      result.push(node)
      rows
        .filter((child) => child.parent_id === id)
        .sort((a, b) => a.position - b.position)
        .forEach((child) => visit(child.id))
    }
    visit(rootId)
    return result
  }

  function materialIdsInSubtree(rootId: string): string[] {
    return subtreeRows(rootId)
      .filter((node) => node.type === 'material')
      .map((node) => node.id)
  }

  function duplicateTitle(source: StudyNodeRow, rows: StudyNodeRow[]): string {
    const siblings = new Set(
      rows
        .filter((row) => row.parent_id === source.parent_id && row.id !== source.id)
        .map((row) => row.title.trim().toLocaleLowerCase('ru-RU'))
    )
    const base = `${source.title} — копия`
    if (!siblings.has(base.toLocaleLowerCase('ru-RU'))) return base
    let index = 2
    while (siblings.has(`${base} ${index}`.toLocaleLowerCase('ru-RU'))) index += 1
    return `${base} ${index}`
  }

  async function duplicateNode(id: string): Promise<DuplicateStudyNodeResult> {
    const materialIds = materialIdsInSubtree(id)
    return runForMany(materialIds, async () => {
      const database = runtime.database()
      const rows = allNodeRows()
      const source = rows.find((row) => row.id === id)
      if (!source) throw new Error('Элемент обучения не найден')
      const subtree = subtreeRows(id, rows)
      const idMap = new Map(subtree.map((row) => [row.id, runtime.createId()]))
      const rootId = idMap.get(id)
      if (!rootId) throw new Error('Не удалось создать копию')
      const now = runtime.now()
      const prepared: Array<{ sourceId: string; targetId: string; document: StudyDocument }> = []

      for (const node of subtree) {
        if (node.type !== 'material') continue
        const material = database.prepare(`${MATERIAL_SELECT} WHERE node_id = ?`).get(node.id) as
          StudyMaterialRow | undefined
        if (!material) throw new Error(`Не найдено содержимое материала «${node.title}»`)
        let document = remapInternalLinks(parseDocument(material.document), idMap)
        const targetId = idMap.get(node.id)
        if (!targetId) throw new Error('Не удалось подготовить копию материала')
        if (containsLocalAssets(document)) {
          if (!hooks.duplicateDocumentAssets)
            throw new Error(
              'Копирование материала с локальными вложениями на этом устройстве недоступно'
            )
          document = studyDocumentSchema.parse(
            await hooks.duplicateDocumentAssets(node.id, targetId, document)
          )
        }
        prepared.push({ sourceId: node.id, targetId, document })
      }

      database.transaction(() => {
        database
          .prepare(
            'UPDATE study_nodes SET position = position + 1, updated_at = ? WHERE parent_id IS ? AND position > ?'
          )
          .run(now, source.parent_id, source.position)

        for (const node of subtree) {
          const targetId = idMap.get(node.id)
          if (!targetId) throw new Error('Не удалось подготовить копию')
          const parentId =
            node.id === source.id
              ? source.parent_id
              : node.parent_id
                ? (idMap.get(node.parent_id) ?? null)
                : null
          database
            .prepare(
              `INSERT INTO study_nodes(
                id, type, parent_id, title, icon, position, is_expanded, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              targetId,
              node.type,
              parentId,
              node.id === source.id ? duplicateTitle(source, rows) : node.title,
              node.type === 'folder' ? (node.icon ?? 'folder') : null,
              node.id === source.id ? source.position + 1 : node.position,
              node.is_expanded,
              now,
              now
            )
        }

        const currentRows = new Map(allNodeRows().map((row) => [row.id, row]))
        for (const item of prepared) {
          const targetNode = currentRows.get(item.targetId)
          if (!targetNode) throw new Error('Не удалось создать копию материала')
          const plainText = documentToPlainText(item.document)
          database
            .prepare(
              'INSERT INTO study_materials(node_id, document, plain_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
            )
            .run(item.targetId, JSON.stringify(item.document), plainText, now, now)
          insertTargets(
            item.targetId,
            targetNode.title,
            folderPath(targetNode.parent_id, currentRows),
            item.document,
            now
          )
        }
      })()
      return { rootId, nodes: listNodes() }
    })
  }

  function updateFolderIcon(id: string, icon: StudyFolderIconName): StudyNode {
    const node = requireNode(id)
    if (node.type !== 'folder') throw new Error('Папка обучения не найдена')
    const valid = studyFolderIconSchema.parse(icon)
    runtime
      .database()
      .prepare('UPDATE study_nodes SET icon = ?, updated_at = ? WHERE id = ?')
      .run(valid, runtime.now(), id)
    return mapNode(requireNode(id))
  }

  function updateExpansion(id: string, isExpanded: boolean): StudyNode {
    const node = requireNode(id)
    if (node.type !== 'folder') throw new Error('Раскрытие доступно только для папок')
    runtime
      .database()
      .prepare('UPDATE study_nodes SET is_expanded = ?, updated_at = ? WHERE id = ?')
      .run(isExpanded ? 1 : 0, runtime.now(), id)
    return mapNode(requireNode(id))
  }

  function moveNode(input: MoveStudyNodeInput): StudyNode[] {
    const valid = moveStudyNodeInputSchema.parse(input)
    const rows = allNodeRows()
    const source = rows.find((row) => row.id === valid.id)
    if (!source) throw new Error('Элемент обучения не найден')
    if (valid.parentId === source.id)
      throw new Error('Нельзя переместить элемент внутрь самого себя')
    if (valid.parentId !== null) {
      const parent = rows.find((row) => row.id === valid.parentId)
      if (!parent || parent.type !== 'folder') throw new Error('Целевая папка не найдена')
      if (source.type === 'folder') {
        let ancestor: StudyNodeRow | undefined = parent
        while (ancestor) {
          if (ancestor.id === source.id) throw new Error('Нельзя переместить папку в её потомка')
          ancestor = ancestor.parent_id
            ? rows.find((row) => row.id === ancestor?.parent_id)
            : undefined
        }
      }
    }

    const sourceSiblings = rows
      .filter((row) => row.parent_id === source.parent_id && row.id !== source.id)
      .sort((a, b) => a.position - b.position)
    const targetSiblings = rows
      .filter((row) => row.parent_id === valid.parentId && row.id !== source.id)
      .sort((a, b) => a.position - b.position)
    const nextPosition = Math.max(0, Math.min(valid.position, targetSiblings.length))
    const currentPosition = rows
      .filter((row) => row.parent_id === source.parent_id)
      .sort((a, b) => a.position - b.position)
      .findIndex((row) => row.id === source.id)
    if (source.parent_id === valid.parentId && currentPosition === nextPosition) return listNodes()

    const now = runtime.now()
    const database = runtime.database()
    database.transaction(() => {
      if (source.parent_id !== valid.parentId) {
        sourceSiblings.forEach((row, position) => {
          database
            .prepare('UPDATE study_nodes SET position = ?, updated_at = ? WHERE id = ?')
            .run(position, now, row.id)
        })
      }
      const arranged = [...targetSiblings]
      arranged.splice(nextPosition, 0, source)
      arranged.forEach((row, position) => {
        database
          .prepare(
            'UPDATE study_nodes SET parent_id = ?, position = ?, updated_at = ? WHERE id = ?'
          )
          .run(valid.parentId, position, now, row.id)
      })
      if (valid.parentId) {
        database
          .prepare('UPDATE study_nodes SET is_expanded = 1, updated_at = ? WHERE id = ?')
          .run(now, valid.parentId)
      }
      rebuildAllTargets()
    })()
    return listNodes()
  }

  function getMaterial(nodeId: string): StudyMaterial {
    const node = requireNode(nodeId)
    if (node.type !== 'material') throw new Error('Материал обучения не найден')
    let material = runtime
      .database()
      .prepare(`${MATERIAL_SELECT} WHERE node_id = ?`)
      .get(nodeId) as StudyMaterialRow | undefined
    if (!material) {
      const document = emptyDocument()
      const now = runtime.now()
      const database = runtime.database()
      database.transaction(() => {
        database
          .prepare(
            'INSERT INTO study_materials(node_id, document, plain_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
          )
          .run(nodeId, JSON.stringify(document), '', now, now)
        rebuildTargetsForMaterial(nodeId, document, undefined, now)
      })()
      material = database.prepare(`${MATERIAL_SELECT} WHERE node_id = ?`).get(nodeId) as
        StudyMaterialRow | undefined
    }
    if (!material) throw new Error('Не удалось создать содержимое материала')
    return mapMaterial(material)
  }

  async function saveMaterial(input: SaveStudyMaterialInput): Promise<StudyMaterial> {
    const valid = saveStudyMaterialInputSchema.parse(input)
    return runExclusive(valid.nodeId, async () => {
      const document = studyDocumentSchema.parse(valid.document)
      await hooks.validateDocumentAssets?.(valid.nodeId, document)
      const node = requireNode(valid.nodeId)
      if (node.type !== 'material') throw new Error('Материал обучения не найден')
      const database = runtime.database()
      const existing = database
        .prepare(`${MATERIAL_SELECT} WHERE node_id = ?`)
        .get(valid.nodeId) as StudyMaterialRow | undefined
      const now = runtime.now()
      const saved = studyMaterialSchema.parse({
        nodeId: valid.nodeId,
        document,
        plainText: documentToPlainText(document),
        createdAt: existing?.created_at ?? now,
        updatedAt: now
      })
      database.transaction(() => {
        if (existing) {
          database
            .prepare(
              'UPDATE study_materials SET document = ?, plain_text = ?, updated_at = ? WHERE node_id = ?'
            )
            .run(JSON.stringify(saved.document), saved.plainText, now, valid.nodeId)
        } else {
          database
            .prepare(
              'INSERT INTO study_materials(node_id, document, plain_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
            )
            .run(valid.nodeId, JSON.stringify(saved.document), saved.plainText, now, now)
        }
        database
          .prepare('UPDATE study_nodes SET updated_at = ? WHERE id = ?')
          .run(now, valid.nodeId)
        rebuildTargetsForMaterial(valid.nodeId, saved.document, undefined, now)
      })()
      await hooks.afterDocumentSaved?.(valid.nodeId, saved.document)
      return saved
    })
  }

  async function deleteNode(id: string): Promise<boolean> {
    const materialIds = materialIdsInSubtree(id)
    return runForMany(materialIds, async () => {
      const result = runtime.database().prepare('DELETE FROM study_nodes WHERE id = ?').run(id)
      if (result.changes > 0 && materialIds.length > 0 && hooks.afterMaterialsDeleted) {
        try {
          await hooks.afterMaterialsDeleted(materialIds)
        } catch (error) {
          hooks.onCleanupError?.(error)
        }
      }
      return result.changes > 0
    })
  }

  function searchInternalLinkTargets(
    input: SearchStudyInternalLinkTargetsInput
  ): StudyInternalLinkTarget[] {
    const valid = searchStudyInternalLinkTargetsInputSchema.parse(input)
    const query = normalized(valid.query)
    const rows = runtime.database().prepare(TARGET_SELECT).all() as StudyLinkTargetRow[]
    const ranked = rows
      .filter(
        (row) =>
          !query ||
          row.title_search.includes(query) ||
          row.material_title_search.includes(query) ||
          row.folder_path_search.includes(query)
      )
      .map((row) => {
        let rank = 100
        if (query) {
          if (row.title_search === query) rank = 0
          else if (row.title_search.startsWith(query)) rank = 10
          else if (row.title_search.includes(query)) rank = 20
          else if (row.material_title_search.includes(query)) rank = 30
          else if (row.folder_path_search.includes(query)) rank = 40
        }
        if (valid.currentMaterialId === row.material_id) rank -= row.kind === 'heading' ? 8 : 4
        if (row.kind === 'material') rank -= 1
        return { row, rank }
      })
      .sort(
        (a, b) =>
          a.rank - b.rank ||
          a.row.folder_path_search.localeCompare(b.row.folder_path_search) ||
          a.row.material_title_search.localeCompare(b.row.material_title_search) ||
          a.row.title_search.localeCompare(b.row.title_search)
      )
      .slice(0, valid.limit ?? 40)
    return ranked.map(({ row }) => mapTarget(row))
  }

  function resolveInternalLinkTarget(
    input: ResolveStudyInternalLinkTargetInput
  ): StudyInternalLinkTarget | null {
    const valid = resolveStudyInternalLinkTargetInputSchema.parse(input)
    const rows = runtime
      .database()
      .prepare(`${TARGET_SELECT} WHERE material_id = ?`)
      .all(valid.materialId) as StudyLinkTargetRow[]
    const row =
      valid.kind === 'material'
        ? rows.find((item) => item.kind === 'material')
        : rows.find((item) => item.kind === 'heading' && item.heading_id === valid.headingId)
    return row ? mapTarget(row) : null
  }

  return {
    listNodes,
    createNode,
    renameNode,
    duplicateNode,
    updateFolderIcon,
    updateExpansion,
    moveNode,
    getMaterial,
    saveMaterial,
    deleteNode,
    searchInternalLinkTargets,
    resolveInternalLinkTarget
  }
}
