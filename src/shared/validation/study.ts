import { z } from 'zod'

export const studyNodeTypeSchema = z.enum(['folder', 'material'])

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

export const studyDividerBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('divider'),
  thickness: z.number().int().min(1).max(12).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
})

export const studyLinkBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('link'),
  title: z.string(),
  url: z.string()
})

export const studyBlockSchema = z.discriminatedUnion('type', [
  studyTextBlockSchema,
  studyHeadingBlockSchema,
  studyCodeBlockSchema,
  studyDividerBlockSchema,
  studyLinkBlockSchema
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

export const createStudyNodeInputSchema = z.object({
  type: studyNodeTypeSchema,
  parentId: z.string().nullable(),
  title: z.string().trim().optional()
})

export const renameStudyNodeInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(120)
})

export const updateStudyNodeExpansionInputSchema = z.object({
  id: z.string().min(1),
  isExpanded: z.boolean()
})

export const saveStudyMaterialInputSchema = z.object({
  nodeId: z.string().min(1),
  document: studyDocumentSchema
})
