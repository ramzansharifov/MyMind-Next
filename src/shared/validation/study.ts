import { z } from 'zod'

import {
  STUDY_DOCUMENT_LIMITS,
  STUDY_FOLDER_ICON_NAMES,
  STUDY_SAFE_ID_PATTERN
} from '../contracts/study'
import { createCanonicalStudyAssetUrl, isSafeStudyAssetFileName } from '../study-assets'

const studySafeIdSchema = z.string().regex(STUDY_SAFE_ID_PATTERN, 'Некорректный идентификатор')

export const studyNodeTypeSchema = z.enum(['folder', 'material'])

export const studyFolderIconSchema = z.enum(STUDY_FOLDER_ICON_NAMES)

export const studyTextBlockSchema = z.object({
  id: studySafeIdSchema,
  type: z.literal('text'),
  text: z.string().max(STUDY_DOCUMENT_LIMITS.maxTextLength),
  html: z.string().max(STUDY_DOCUMENT_LIMITS.maxHtmlLength).optional()
})

export const studyHeadingBlockSchema = z.object({
  id: studySafeIdSchema,
  type: z.literal('heading'),
  text: z.string().max(STUDY_DOCUMENT_LIMITS.maxTitleLength),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  backgroundColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
})

export const studyCodeBlockSchema = z.object({
  id: studySafeIdSchema,
  type: z.literal('code'),
  source: z.string().max(STUDY_DOCUMENT_LIMITS.maxSourceLength),
  language: z.string().max(80)
})
export const studyMarkdownBlockSchema = z.object({
  id: studySafeIdSchema,
  type: z.literal('markdown'),
  source: z.string().max(STUDY_DOCUMENT_LIMITS.maxSourceLength),
  viewMode: z.enum(['write', 'split', 'preview']).optional()
})
export const studyLatexBlockSchema = z.object({
  id: studySafeIdSchema,
  type: z.literal('latex'),
  source: z.string().max(STUDY_DOCUMENT_LIMITS.maxLatexSourceLength),
  viewMode: z.enum(['write', 'split', 'preview']).optional(),
  displayMode: z.enum(['display', 'inline']).optional(),
  alignment: z.enum(['left', 'center', 'right']).optional(),
  scale: z.number().int().min(70).max(180).optional()
})
export const studyMermaidBlockSchema = z.object({
  id: studySafeIdSchema,
  type: z.literal('mermaid'),
  source: z.string().max(STUDY_DOCUMENT_LIMITS.maxMermaidSourceLength),
  viewMode: z.enum(['write', 'split', 'preview']).optional(),
  theme: z.enum(['dark', 'default', 'neutral', 'forest']).optional(),
  scale: z.number().int().min(60).max(180).optional()
})
export const studyLocalAssetSchema = z
  .object({
    id: z.string().uuid(),
    materialId: studySafeIdSchema,
    name: z.string().min(1).max(180).refine(isSafeStudyAssetFileName, 'Некорректное имя файла'),
    mimeType: z.string().min(1).max(120),
    size: z.number().int().nonnegative(),
    url: z.string().regex(/^mymind-asset:\/\/local\//)
  })
  .superRefine((asset, context) => {
    const canonicalUrl = createCanonicalStudyAssetUrl({
      materialId: asset.materialId,
      assetId: asset.id,
      fileName: asset.name
    })

    if (asset.url !== canonicalUrl) {
      context.addIssue({
        code: 'custom',
        path: ['url'],
        message: 'URL вложения не соответствует его идентификаторам'
      })
    }
  })

export const openStudyAssetInputSchema = z.object({
  id: z.string().uuid(),
  materialId: studySafeIdSchema,
  name: z.string().min(1).max(180).refine(isSafeStudyAssetFileName, 'Некорректное имя файла')
})

const studyLocalAssetSourceSchema = z.object({
  type: z.literal('local'),
  asset: studyLocalAssetSchema.optional()
})

const studyRemoteAssetSourceSchema = z.object({
  type: z.literal('url'),
  url: z.string().max(STUDY_DOCUMENT_LIMITS.maxRemoteUrlLength)
})

const studyMediaAssetSourceSchema = z.discriminatedUnion('type', [
  studyLocalAssetSourceSchema,
  studyRemoteAssetSourceSchema
])

const studyAttachmentBaseShape = {
  id: studySafeIdSchema,
  title: z.string().max(STUDY_DOCUMENT_LIMITS.maxTitleLength).optional()
}

export const studyImageBlockSchema = z.object({
  ...studyAttachmentBaseShape,
  type: z.literal('image'),
  source: studyMediaAssetSourceSchema,
  imageFit: z.enum(['contain', 'cover']).optional(),
  imageHeight: z.number().int().min(180).max(720).optional()
})

export const studyVideoBlockSchema = z.object({
  ...studyAttachmentBaseShape,
  type: z.literal('video'),
  source: studyMediaAssetSourceSchema
})

export const studyAudioBlockSchema = z.object({
  ...studyAttachmentBaseShape,
  type: z.literal('audio'),
  source: studyLocalAssetSourceSchema
})

export const studyFileBlockSchema = z.object({
  ...studyAttachmentBaseShape,
  type: z.literal('file'),
  source: studyLocalAssetSourceSchema
})

export const studyDividerBlockSchema = z.object({
  id: studySafeIdSchema,
  type: z.literal('divider'),
  variant: z.enum(['solid', 'tapered', 'dashed', 'dotted']).optional(),
  thickness: z.number().int().min(1).max(12).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
})

export const studyBlockSchema = z.discriminatedUnion('type', [
  studyTextBlockSchema,
  studyHeadingBlockSchema,
  studyCodeBlockSchema,
  studyMarkdownBlockSchema,
  studyLatexBlockSchema,
  studyMermaidBlockSchema,
  studyImageBlockSchema,
  studyVideoBlockSchema,
  studyAudioBlockSchema,
  studyFileBlockSchema,
  studyDividerBlockSchema
])

export const studyDocumentSchema = z
  .object({
    version: z.literal(1),
    blocks: z.array(studyBlockSchema).max(STUDY_DOCUMENT_LIMITS.maxBlocks)
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
        message: 'Документ превышает допустимый размер'
      })
    }
  })

export const studyNodeSchema = z.object({
  id: studySafeIdSchema,
  type: studyNodeTypeSchema,
  parentId: studySafeIdSchema.nullable(),
  title: z.string().min(1).max(STUDY_DOCUMENT_LIMITS.maxTitleLength),
  icon: studyFolderIconSchema.optional(),
  position: z.number().int(),
  isExpanded: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int()
})

export const studyMaterialSchema = z.object({
  nodeId: studySafeIdSchema,
  document: studyDocumentSchema,
  plainText: z.string().max(STUDY_DOCUMENT_LIMITS.maxTextLength),
  createdAt: z.number().int(),
  updatedAt: z.number().int()
})
export const studyInternalLinkTargetKindSchema = z.enum(['material', 'heading'])

export const studyInternalLinkTargetSchema = z.object({
  kind: studyInternalLinkTargetKindSchema,
  materialId: z.string().min(1),
  headingId: z.string().min(1).nullable(),
  title: z.string().min(1),
  materialTitle: z.string().min(1),
  folderPath: z.array(z.string().min(1)),
  headingLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable()
})

export const searchStudyInternalLinkTargetsInputSchema = z.object({
  query: z.string().trim().max(240),
  currentMaterialId: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional()
})

export const resolveStudyInternalLinkTargetInputSchema = z.object({
  kind: studyInternalLinkTargetKindSchema,
  materialId: z.string().min(1),
  headingId: z.string().min(1).nullable().optional()
})

export const createStudyNodeInputSchema = z.object({
  type: studyNodeTypeSchema,
  parentId: studySafeIdSchema.nullable(),
  title: z.string().trim().max(STUDY_DOCUMENT_LIMITS.maxTitleLength).optional(),
  icon: studyFolderIconSchema.optional()
})

export const renameStudyNodeInputSchema = z.object({
  id: studySafeIdSchema,
  title: z.string().trim().min(1).max(STUDY_DOCUMENT_LIMITS.maxTitleLength)
})
export const duplicateStudyNodeInputSchema = z.object({
  id: studySafeIdSchema
})
export const updateStudyFolderIconInputSchema = z.object({
  id: studySafeIdSchema,
  icon: studyFolderIconSchema
})

export const updateStudyNodeExpansionInputSchema = z.object({
  id: studySafeIdSchema,
  isExpanded: z.boolean()
})
export const moveStudyNodeInputSchema = z.object({
  id: studySafeIdSchema,
  parentId: studySafeIdSchema.nullable(),
  position: z.number().int().min(0)
})

export const importStudyAssetInputSchema = z.object({
  nodeId: studySafeIdSchema,
  kind: z.enum(['image', 'video', 'audio', 'file'])
})
export const saveStudyMaterialInputSchema = z
  .object({
    nodeId: studySafeIdSchema,
    document: studyDocumentSchema
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
        block.source.asset.materialId !== input.nodeId
      ) {
        context.addIssue({
          code: 'custom',
          path: ['document', 'blocks', index, 'source', 'asset', 'materialId'],
          message: 'Вложение принадлежит другому материалу'
        })
      }
    })
  })
