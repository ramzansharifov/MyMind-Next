import { z } from 'zod'

import { STUDY_SAFE_ID_PATTERN } from '../contracts/study'

export const exportStudyMaterialPdfInputSchema = z.object({
  nodeId: z.string().regex(STUDY_SAFE_ID_PATTERN, 'Некорректный идентификатор материала')
})
