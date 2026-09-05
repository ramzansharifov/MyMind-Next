import { z } from 'zod'

import { NOTE_BLOCK_TYPES } from '@mymind/contracts/notes'
import { STUDY_DOCUMENT_LIMITS, STUDY_SAFE_ID_PATTERN } from '@mymind/contracts/study'
import {
  openStudyAssetInputSchema,
  studyAudioBlockSchema,
  studyBoardBlockSchema,
  studyCodeBlockSchema,
  studyDividerBlockSchema,
  studyFileBlockSchema,
  studyFolderIconSchema,
  studyHeadingBlockSchema,
  studyImageBlockSchema,
  studyLatexBlockSchema,
  studyMarkdownBlockSchema,
  studyMermaidBlockSchema,
  studyTextBlockSchema,
  studyVideoBlockSchema
} from './study'

export const noteSafeIdSchema = z
  .string()
  .regex(STUDY_SAFE_ID_PATTERN, 'Некорректный идентификатор')

export const noteBlockTypeSchema = z.enum(NOTE_BLOCK_TYPES)

export const noteBlockSchema = z.discriminatedUnion('type', [
  studyTextBlockSchema,
  studyHeadingBlockSchema,
  studyCodeBlockSchema,
  studyMarkdownBlockSchema,
  studyLatexBlockSchema,
  studyMermaidBlockSchema,
  studyImageBlockSchema,
  studyAudioBlockSchema,
  studyVideoBlockSchema,
  studyFileBlockSchema,
  studyDividerBlockSchema,
  studyBoardBlockSchema
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
  icon: studyFolderIconSchema,
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

export const noteRecordSchema = noteSummarySchema.extend({ document: noteDocumentSchema })

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

export const updateNoteGroupIconInputSchema = z.object({
  id: noteSafeIdSchema,
  icon: studyFolderIconSchema
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

const NOTE_VOICE_RECORDING_MAX_BYTES = 50 * 1024 * 1024

export const saveNoteVoiceRecordingInputSchema = z.object({
  noteId: noteSafeIdSchema,
  data: z
    .custom<Uint8Array>((value) => value instanceof Uint8Array, 'Некорректные данные записи')
    .refine((value) => value.byteLength > 0, 'Запись не должна быть пустой')
    .refine(
      (value) => value.byteLength <= NOTE_VOICE_RECORDING_MAX_BYTES,
      'Запись превышает допустимый размер 50 МБ'
    ),
  mimeType: z.enum(['audio/webm', 'audio/ogg', 'audio/mp4'])
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
