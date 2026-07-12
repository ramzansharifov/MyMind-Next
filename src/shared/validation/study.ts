import { z } from 'zod'

export const studyNodeTypeSchema = z.enum(['folder', 'material'])

export const studyFolderIconSchema = z.enum([
  'folder',
  'book',
  'graduation',
  'science',
  'calculator',
  'code',
  'languages',
  'history',
  'microscope',
  'art',
  'music',
  'work'
])

export const studyTextBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('text'),
  text: z.string(),
  html: z.string().optional()
})

export const studyHeadingBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('heading'),
  text: z.string(),
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
  id: z.string().min(1),
  type: z.literal('code'),
  source: z.string(),
  language: z.string()
})
export const studyMarkdownBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('markdown'),
  source: z.string(),
  viewMode: z.enum(['write', 'split', 'preview']).optional()
})
export const studyLatexBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('latex'),
  source: z.string(),
  viewMode: z.enum(['write', 'split', 'preview']).optional(),
  displayMode: z.enum(['display', 'inline']).optional(),
  alignment: z.enum(['left', 'center', 'right']).optional(),
  scale: z.number().int().min(70).max(180).optional()
})
export const studyMermaidBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('mermaid'),
  source: z.string(),
  viewMode: z.enum(['write', 'split', 'preview']).optional(),
  theme: z.enum(['dark', 'default', 'neutral', 'forest']).optional(),
  scale: z.number().int().min(60).max(180).optional()
})
export const studyLocalAssetSchema = z.object({
  id: z.string().uuid(),
  materialId: z.string().min(1).max(120),
  name: z.string().min(1).max(180),
  mimeType: z.string().min(1).max(120),
  size: z.number().int().nonnegative(),
  url: z.string().regex(/^mymind-asset:\/\/local\//)
})

const studyLocalAssetSourceSchema = z.object({
  type: z.literal('local'),
  asset: studyLocalAssetSchema.optional()
})

const studyRemoteAssetSourceSchema = z.object({
  type: z.literal('url'),
  url: z.string().max(4096)
})

const studyMediaAssetSourceSchema = z.discriminatedUnion('type', [
  studyLocalAssetSourceSchema,
  studyRemoteAssetSourceSchema
])

const studyAttachmentBaseShape = {
  id: z.string().min(1),
  title: z.string().max(240).optional()
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
  id: z.string().min(1),
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

export const studyDocumentSchema = z.object({
  version: z.literal(1),
  blocks: z.array(studyBlockSchema)
})

export const studyNodeSchema = z.object({
  id: z.string().min(1),
  type: studyNodeTypeSchema,
  parentId: z.string().nullable(),
  title: z.string().min(1),
  icon: studyFolderIconSchema.optional(),
  position: z.number().int(),
  isExpanded: z.boolean(),
  createdAt: z.number().int(),
  updatedAt: z.number().int()
})

export const studyMaterialSchema = z.object({
  nodeId: z.string().min(1),
  document: studyDocumentSchema,
  plainText: z.string(),
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
  parentId: z.string().nullable(),
  title: z.string().trim().optional(),
  icon: studyFolderIconSchema.optional()
})

export const renameStudyNodeInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(120)
})
export const updateStudyFolderIconInputSchema = z.object({
  id: z.string().min(1),
  icon: studyFolderIconSchema
})

export const updateStudyNodeExpansionInputSchema = z.object({
  id: z.string().min(1),
  isExpanded: z.boolean()
})
export const moveStudyNodeInputSchema = z.object({
  id: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  position: z.number().int().min(0)
})

export const importStudyAssetInputSchema = z.object({
  nodeId: z.string().min(1).max(120),
  kind: z.enum(['image', 'video', 'audio', 'file'])
})
export const saveStudyMaterialInputSchema = z.object({
  nodeId: z.string().min(1),
  document: studyDocumentSchema
})
