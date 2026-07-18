import { describe, expect, it } from 'vitest'

import { STUDY_DOCUMENT_LIMITS, type StudyDocument } from '../../shared/contracts/study'
import {
  documentToPlainText,
  studyBlockPlainTextExtractors,
  truncateStudyPlainText
} from './study-document-index'

describe('study document search index', () => {
  it('provides a plain-text extractor for every block type', () => {
    expect(Object.keys(studyBlockPlainTextExtractors)).toEqual([
      'text',
      'heading',
      'code',
      'markdown',
      'latex',
      'mermaid',
      'image',
      'video',
      'audio',
      'file',
      'divider',
      'board'
    ])
  })

  it('limits derived plain text while preserving the complete document', () => {
    const source = 'a'.repeat(600_000)
    const document: StudyDocument = {
      version: 1,
      blocks: [
        { id: 'code-1', type: 'code', source, language: 'text' },
        { id: 'code-2', type: 'code', source, language: 'text' }
      ]
    }

    expect(documentToPlainText(document)).toHaveLength(STUDY_DOCUMENT_LIMITS.maxPlainTextLength)
    expect(document.blocks[0]).toHaveProperty('source', source)
    expect(document.blocks[1]).toHaveProperty('source', source)
  })

  it('does not split a Unicode surrogate pair at the boundary', () => {
    const truncated = truncateStudyPlainText('1234😀tail', 5)

    expect(truncated).toBe('1234😀')
    expect(truncated).not.toContain('\uFFFD')
  })
})
