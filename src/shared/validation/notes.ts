import { z } from 'zod'

import { NOTE_BLOCK_TYPES } from '../contracts/notes'
import { STUDY_DOCUMENT_LIMITS, STUDY_SAFE_ID_PATTERN } from '../contracts/study'
import {
  openStudyAssetInputSchema,
  studyAudioBlockSchema,
  studyDividerBlockSchema,
  studyFileBlockSchema,
  studyImageBlockSchema,
  studyTextBlockSchema,
  studyVideoBlockSchema
} from './study'

export const noteSafeIdSchema = z
  .string()
  .regex(STUDY_SAFE_ID_PATTERN, 'Некорректный идентификатор')

export const noteBlockTypeSchema = z.enum(NOTE_BLOCK_TYPES)

export const noteBlockSchema = z.discriminatedUnion('type', [
  studyTextBlockSchema,
  studyImageBlockSchema,
  studyAudioBlockSchema,
  studyVideoBlockSchema,
  studyFileBlockSchema,
  studyDividerBlockSchema
])

export const noteDocumentSchema = z
  .object({
    version: z.literal(1),
    blocks: z.array(noteBlockSchema).max(STUDY_DOCUMENT_LIMITS.maxBlocks)
  })
  .superRefine((document, context) => {
    const ids = new Set<string>()

    document.blocks.forEach((block, index) => {
      if (ids.has(block.id)) {
        context.addIssue({
          code: 'custom',
          path: ['blocks', index, 'id'],
          message: 'Идентификаторы блоков должны быть уникальными'
        })
      }

      ids.add(block.id)
    })

    const serializedBytes = new TextEncoder().encode(JSON.stringify(document)).byteLength

    if (serializedBytes > STUDY_DOCUMENT_LIMITS.maxSerializedBytes) {
      context.addIssue({
        code: 'custom',
        path: [],
        message: 'Заметка превышает допустимый размер'
      })
    }
  })

export const noteGroupSchema = z.object({
  id: noteSafeIdSchema,
  title: z.string().trim().min(1).max(STUDY_DOCUMENT_LIMITS.maxTitleLength),
  createdAt: z.number().int(),
  updatedAt: z.number().int()
})

export const noteSummarySchema = z.object({
  id: noteSafeIdSchema,
  groupId: noteSafeIdSchema.nullable(),
  title: z.string().trim().min(1).max(STUDY_DOCUMENT_LIMITS.maxTitleLength),
  plainText: z
    .string()
    .refine(
      (value) => Array.from(value).length <= STUDY_DOCUMENT_LIMITS.maxPlainTextLength,
      'Поисковый текст превышает допустимую длину'
    ),
  createdAt: z.number().int(),
  updatedAt: z.number().int()
})

export const noteRecordSchema = noteSummarySchema.extend({
  document: noteDocumentSchema
})

export const notesOverviewSchema = z.object({
  groups: z.array(noteGroupSchema),
  notes: z.array(noteSummarySchema)
})

export const createNoteGroupInputSchema = z.object({
  title: z.string().trim().max(STUDY_DOCUMENT_LIMITS.maxTitleLength).optional()
})

export const renameNoteGroupInputSchema = z.object({
  id: noteSafeIdSchema,
  title: z.string().trim().min(1).max(STUDY_DOCUMENT_LIMITS.maxTitleLength)
})

export const createNoteInputSchema = z.object({
  groupId: noteSafeIdSchema.nullable(),
  title: z.string().trim().max(STUDY_DOCUMENT_LIMITS.maxTitleLength).optional()
})

export const renameNoteInputSchema = z.object({
  id: noteSafeIdSchema,
  title: z.string().trim().min(1).max(STUDY_DOCUMENT_LIMITS.maxTitleLength)
})

export const moveNoteInputSchema = z.object({
  id: noteSafeIdSchema,
  groupId: noteSafeIdSchema.nullable()
})

export const importNoteAssetInputSchema = z.object({
  noteId: noteSafeIdSchema,
  kind: z.enum(['image', 'video', 'audio', 'file'])
})

export const openNoteAssetInputSchema = openStudyAssetInputSchema

export const saveNoteInputSchema = z
  .object({
    id: noteSafeIdSchema,
    document: noteDocumentSchema
  })
  .superRefine((input, context) => {
    input.document.blocks.forEach((block, index) => {
      if (
        (block.type === 'image' ||
          block.type === 'video' ||
          block.type === 'audio' ||
          block.type === 'file') &&
        block.source.type === 'local' &&
        block.source.asset &&
        block.source.asset.materialId !== input.id
      ) {
        context.addIssue({
          code: 'custom',
          path: ['document', 'blocks', index, 'source', 'asset', 'materialId'],
          message: 'Вложение принадлежит другой заметке'
        })
      }
    })
  })
