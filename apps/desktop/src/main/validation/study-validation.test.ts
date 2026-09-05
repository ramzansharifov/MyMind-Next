import { describe, expect, it } from 'vitest'

import { STUDY_DOCUMENT_LIMITS, type StudyDocument } from '../../shared/contracts/study'
import { createCanonicalStudyAssetUrl } from '../../shared/study-assets'
import { saveStudyMaterialInputSchema, studyDocumentSchema } from '../../shared/validation/study'

describe('study document validation', () => {
  it('rejects duplicate block identifiers', () => {
    const document: StudyDocument = {
      version: 1,
      blocks: [
        { id: 'same-id', type: 'text', text: 'A' },
        { id: 'same-id', type: 'text', text: 'B' }
      ]
    }

    expect(studyDocumentSchema.safeParse(document).success).toBe(false)
  })

  it('rejects documents with too many blocks', () => {
    const document = {
      version: 1,
      blocks: Array.from({ length: STUDY_DOCUMENT_LIMITS.maxBlocks + 1 }, (_, index) => ({
        id: `block-${index}`,
        type: 'text' as const,
        text: ''
      }))
    }

    expect(studyDocumentSchema.safeParse(document).success).toBe(false)
  })

  it('rejects a local asset owned by another material', () => {
    const document: StudyDocument = {
      version: 1,
      blocks: [
        {
          id: 'image-1',
          type: 'image',
          source: {
            type: 'local',
            asset: {
              id: '00000000-0000-4000-8000-000000000001',
              materialId: 'material-b',
              name: 'photo.png',
              mimeType: 'image/png',
              size: 10,
              url: createCanonicalStudyAssetUrl({
                materialId: 'material-b',
                assetId: '00000000-0000-4000-8000-000000000001',
                fileName: 'photo.png'
              })
            }
          }
        }
      ]
    }

    expect(saveStudyMaterialInputSchema.safeParse({ nodeId: 'material-a', document }).success).toBe(
      false
    )
  })
})
