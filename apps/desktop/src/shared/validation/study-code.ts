import { z } from 'zod'

import { STUDY_SAFE_ID_PATTERN } from '../contracts/study'
import { STUDY_CODE_MAX_SOURCE_LENGTH } from '../study-code'

const studyCodeNodeIdSchema = z.string().regex(STUDY_SAFE_ID_PATTERN, 'Некорректный идентификатор')
const studyCodeRevisionSchema = z.string().regex(/^[a-f0-9]{64}$/, 'Некорректная ревизия')

export const getStudyCodeSnapshotInputSchema = z.object({
  nodeId: studyCodeNodeIdSchema
})

export const previewStudyCodeInputSchema = z.object({
  nodeId: studyCodeNodeIdSchema,
  source: z.string().max(STUDY_CODE_MAX_SOURCE_LENGTH, 'Код превышает допустимый размер'),
  baseRevision: studyCodeRevisionSchema
})

export const applyStudyCodeInputSchema = previewStudyCodeInputSchema.extend({
  confirmDestructive: z.boolean().optional()
})
