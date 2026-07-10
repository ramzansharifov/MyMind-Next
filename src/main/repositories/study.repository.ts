import { asc, eq, isNull } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

import { studyMaterials, studyNodes } from '../database/schema/study'
import { getDatabase } from '../database/client'
import type {
  CreateStudyNodeInput,
  SaveStudyMaterialInput,
  StudyBlock,
  StudyDocument,
  StudyMaterial,
  StudyNode
} from '../../shared/contracts/study'
import {
  studyDocumentSchema,
  studyMaterialSchema,
  studyNodeSchema
} from '../../shared/validation/study'

function createEmptyStudyDocument(): StudyDocument {
  return {
    version: 1,
    blocks: [
      {
        id: randomUUID(),
        type: 'text',
        text: ''
      }
    ]
  }
}

function documentToPlainText(document: StudyDocument): string {
  return document.blocks
    .map((block: StudyBlock) => {
      if (block.type === 'text') {
        return block.text
      }

      if (block.type === 'heading') {
        return block.text
      }

      if (block.type === 'code') {
        return block.source
      }

      if (block.type === 'link') {
        return [block.title, block.url].filter(Boolean).join(' ')
      }

      return ''
    })
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

function mapStudyNode(row: typeof studyNodes.$inferSelect): StudyNode {
  return studyNodeSchema.parse({
    ...row,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime()
  })
}

function mapStudyMaterial(row: typeof studyMaterials.$inferSelect): StudyMaterial {
  return studyMaterialSchema.parse({
    nodeId: row.nodeId,
    document: row.document,
    plainText: row.plainText,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime()
  })
}

export function listStudyNodes(): StudyNode[] {
  const rows = getDatabase()
    .select()
    .from(studyNodes)
    .orderBy(asc(studyNodes.parentId), asc(studyNodes.position))
    .all()

  return rows.map(mapStudyNode)
}

export function createStudyNode(input: CreateStudyNodeInput): StudyNode {
  const database = getDatabase()
  const now = new Date()
  const id = randomUUID()

  const siblings = database
    .select({
      position: studyNodes.position
    })
    .from(studyNodes)
    .where(
      input.parentId === null
        ? isNull(studyNodes.parentId)
        : eq(studyNodes.parentId, input.parentId)
    )
    .all()

  const nextPosition =
    siblings.reduce((maximum, sibling) => Math.max(maximum, sibling.position), -1) + 1

  const title = input.title?.trim() || (input.type === 'folder' ? 'Новая папка' : 'Новый материал')

  database.transaction((transaction) => {
    transaction
      .insert(studyNodes)
      .values({
        id,
        type: input.type,
        parentId: input.parentId,
        title,
        position: nextPosition,
        isExpanded: true,
        createdAt: now,
        updatedAt: now
      })
      .run()

    if (input.type === 'material') {
      transaction
        .insert(studyMaterials)
        .values({
          nodeId: id,
          document: createEmptyStudyDocument(),
          plainText: '',
          createdAt: now,
          updatedAt: now
        })
        .run()
    }

    if (input.parentId) {
      transaction
        .update(studyNodes)
        .set({
          isExpanded: true,
          updatedAt: now
        })
        .where(eq(studyNodes.id, input.parentId))
        .run()
    }
  })

  const created = database.select().from(studyNodes).where(eq(studyNodes.id, id)).get()

  if (!created) {
    throw new Error('Study node was not created')
  }

  return mapStudyNode(created)
}

export function renameStudyNode(id: string, title: string): StudyNode {
  const database = getDatabase()

  database
    .update(studyNodes)
    .set({
      title: title.trim(),
      updatedAt: new Date()
    })
    .where(eq(studyNodes.id, id))
    .run()

  const updated = database.select().from(studyNodes).where(eq(studyNodes.id, id)).get()

  if (!updated) {
    throw new Error('Study node was not found')
  }

  return mapStudyNode(updated)
}

export function updateStudyNodeExpansion(id: string, isExpanded: boolean): StudyNode {
  const database = getDatabase()

  database
    .update(studyNodes)
    .set({
      isExpanded,
      updatedAt: new Date()
    })
    .where(eq(studyNodes.id, id))
    .run()

  const updated = database.select().from(studyNodes).where(eq(studyNodes.id, id)).get()

  if (!updated) {
    throw new Error('Study folder was not found')
  }

  return mapStudyNode(updated)
}

export function deleteStudyNode(id: string): boolean {
  const result = getDatabase().delete(studyNodes).where(eq(studyNodes.id, id)).run()

  return result.changes > 0
}

export function getStudyMaterial(nodeId: string): StudyMaterial {
  const database = getDatabase()

  let material = database
    .select()
    .from(studyMaterials)
    .where(eq(studyMaterials.nodeId, nodeId))
    .get()

  if (!material) {
    const node = database.select().from(studyNodes).where(eq(studyNodes.id, nodeId)).get()

    if (!node || node.type !== 'material') {
      throw new Error('Study material was not found')
    }

    const now = new Date()

    database
      .insert(studyMaterials)
      .values({
        nodeId,
        document: createEmptyStudyDocument(),
        plainText: '',
        createdAt: now,
        updatedAt: now
      })
      .run()

    material = database.select().from(studyMaterials).where(eq(studyMaterials.nodeId, nodeId)).get()
  }

  if (!material) {
    throw new Error('Study material was not created')
  }

  return mapStudyMaterial(material)
}

export function saveStudyMaterial(input: SaveStudyMaterialInput): StudyMaterial {
  const database = getDatabase()
  const document = studyDocumentSchema.parse(input.document)
  const plainText = documentToPlainText(document)
  const now = new Date()

  const existing = database
    .select()
    .from(studyMaterials)
    .where(eq(studyMaterials.nodeId, input.nodeId))
    .get()

  if (existing) {
    database
      .update(studyMaterials)
      .set({
        document,
        plainText,
        updatedAt: now
      })
      .where(eq(studyMaterials.nodeId, input.nodeId))
      .run()
  } else {
    database
      .insert(studyMaterials)
      .values({
        nodeId: input.nodeId,
        document,
        plainText,
        createdAt: now,
        updatedAt: now
      })
      .run()
  }

  database
    .update(studyNodes)
    .set({
      updatedAt: now
    })
    .where(eq(studyNodes.id, input.nodeId))
    .run()

  return getStudyMaterial(input.nodeId)
}
