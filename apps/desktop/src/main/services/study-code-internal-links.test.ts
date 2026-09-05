import { describe, expect, it } from 'vitest'

import {
  resolveStudyCodeSymbolicInternalLinks,
  symbolizeStoredStudyInternalLinks,
  type StudyCodeInternalLinkReference
} from './study-code-internal-links'

function resolve(reference: StudyCodeInternalLinkReference) {
  if (reference.materialName === 'RelationalModel') {
    return {
      kind: 'material' as const,
      materialId: 'material-relational',
      headingId: null,
      headingLevel: null,
      title: 'Реляционная модель',
      materialTitle: 'Реляционная модель',
      folderPath: ['Базы данных', 'Основы']
    }
  }

  return {
    kind: 'heading' as const,
    materialId: 'material-sql',
    headingId: 'heading-select',
    headingLevel: 1 as const,
    title: 'SELECT',
    materialTitle: 'Основы SQL',
    folderPath: ['Базы данных', 'SQL']
  }
}

describe('study code symbolic internal links', () => {
  it('turns readable material and heading references into native rich-text internal links', () => {
    const source =
      'Сначала [[RelationalModel|изучите реляционную модель]], затем [[SqlBasics.Select]].'

    const resolved = resolveStudyCodeSymbolicInternalLinks(source, undefined, resolve)

    expect(resolved.text).toBe('Сначала изучите реляционную модель, затем SELECT.')
    expect(resolved.html).toContain('data-study-internal-link="true"')
    expect(resolved.html).toContain('data-material-id="material-relational"')
    expect(resolved.html).toContain('data-material-id="material-sql"')
    expect(resolved.html).toContain('data-heading-id="heading-select"')
    expect(resolved.html).toContain('data-label-mode="custom"')
    expect(resolved.html).toContain('data-label-mode="auto"')
  })

  it('serializes stored UUID links back to stable DSL names without leaking internal ids', () => {
    const resolved = resolveStudyCodeSymbolicInternalLinks(
      'Сначала [[RelationalModel|изучите реляционную модель]], затем [[SqlBasics.Select]].',
      undefined,
      resolve
    )

    const symbolic = symbolizeStoredStudyInternalLinks(resolved.text, resolved.html, ({ materialId, headingId }) => {
      if (materialId === 'material-relational') return { materialName: 'RelationalModel' }
      if (materialId === 'material-sql' && headingId === 'heading-select') {
        return { materialName: 'SqlBasics', headingName: 'Select' }
      }
      return null
    })

    expect(symbolic.text).toContain('[[RelationalModel|изучите реляционную модель]]')
    expect(symbolic.text).toContain('[[SqlBasics.Select]]')
    expect(symbolic.html).toContain('[[RelationalModel|изучите реляционную модель]]')
    expect(symbolic.html).toContain('[[SqlBasics.Select]]')
    expect(symbolic.html).not.toContain('material-relational')
    expect(symbolic.html).not.toContain('heading-select')
  })
})
