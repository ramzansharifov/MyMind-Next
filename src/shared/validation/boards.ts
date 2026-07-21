import { z } from 'zod'

import {
  BOARD_DOCUMENT_LIMITS,
  BOARD_SYSTEM_ROOT_ID,
  type BoardSnapshot
} from '../contracts/boards'
import { STUDY_SAFE_ID_PATTERN } from '../contracts/study'
import { studyFolderIconSchema } from './study'

const boardSafeIdSchema = z.string().regex(STUDY_SAFE_ID_PATTERN, 'Некорректный идентификатор')

export const boardNodeTypeSchema = z.enum(['folder', 'board'])

export const boardSnapshotSchema = z
  .record(z.string(), z.unknown())
  .superRefine((snapshot, context) => {
    let serialized: string

    try {
      serialized = JSON.stringify(snapshot)
    } catch {
      context.addIssue({
        code: 'custom',
        message: 'Снимок доски должен быть сериализуемым JSON'
      })
      return
    }

    const serializedBytes = new TextEncoder().encode(serialized).byteLength

    if (serializedBytes > BOARD_DOCUMENT_LIMITS.maxSerializedBytes) {
      context.addIssue({
        code: 'custom',
        message: 'Доска превышает допустимый размер'
      })
    }
  }) as z.ZodType<BoardSnapshot>

export const boardNodeSchema = z.object({
  id: boardSafeIdSchema,
  type: boardNodeTypeSchema,
  parentId: boardSafeIdSchema.nullable(),
  title: z.string().trim().min(1).max(BOARD_DOCUMENT_LIMITS.maxTitleLength),
  icon: studyFolderIconSchema.optional(),
  position: z.number().int(),
  isExpanded: z.boolean(),
  isSystem: z.boolean(),
  sourceStudyNodeId: boardSafeIdSchema.optional(),
  sourceMaterialId: boardSafeIdSchema.optional(),
  sourceBlockId: boardSafeIdSchema.optional(),
  createdAt: z.number().int(),
  updatedAt: z.number().int()
})

export const boardDocumentSchema = z.object({
  nodeId: boardSafeIdSchema,
  snapshot: boardSnapshotSchema.nullable(),
  createdAt: z.number().int(),
  updatedAt: z.number().int()
})

export const createBoardNodeInputSchema = z.object({
  type: boardNodeTypeSchema,
  parentId: boardSafeIdSchema.nullable(),
  title: z.string().trim().max(BOARD_DOCUMENT_LIMITS.maxTitleLength).optional(),
  icon: studyFolderIconSchema.optional()
})

export const renameBoardNodeInputSchema = z.object({
  id: boardSafeIdSchema.refine(
    (id) => id !== BOARD_SYSTEM_ROOT_ID,
    'Системную папку нельзя переименовать'
  ),
  title: z.string().trim().min(1).max(BOARD_DOCUMENT_LIMITS.maxTitleLength)
})

export const updateBoardFolderIconInputSchema = z.object({
  id: boardSafeIdSchema.refine(
    (id) => id !== BOARD_SYSTEM_ROOT_ID,
    'Системную папку нельзя изменять'
  ),
  icon: studyFolderIconSchema
})

export const updateBoardNodeExpansionInputSchema = z.object({
  id: boardSafeIdSchema,
  isExpanded: z.boolean()
})

export const moveBoardNodeInputSchema = z.object({
  id: boardSafeIdSchema.refine(
    (id) => id !== BOARD_SYSTEM_ROOT_ID,
    'Системную папку нельзя перемещать'
  ),
  parentId: boardSafeIdSchema.nullable(),
  position: z.number().int().min(0)
})

export const saveBoardDocumentInputSchema = z.object({
  nodeId: boardSafeIdSchema,
  snapshot: boardSnapshotSchema
})

export const ensureStudyBoardInputSchema = z.object({
  materialId: boardSafeIdSchema,
  blockId: boardSafeIdSchema
})
