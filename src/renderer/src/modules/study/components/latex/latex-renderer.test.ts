import { describe, expect, it } from 'vitest'

import { renderStudyLatex } from './latex-renderer'

describe('renderStudyLatex', () => {
  it('renders accessible display math', () => {
    const result = renderStudyLatex(String.raw`\frac{a}{b}`, 'display')

    expect(result.error).toBeNull()
    expect(result.html).toContain('katex-display')
    expect(result.html).toContain('<math')
  })

  it('returns a readable parsing error', () => {
    const result = renderStudyLatex(String.raw`\frac{`, 'display')

    expect(result.html).toBeNull()
    expect(result.error).toBeTruthy()
  })

  it('supports inline rendering', () => {
    const result = renderStudyLatex(String.raw`x^2`, 'inline')

    expect(result.error).toBeNull()
    expect(result.html).not.toContain('katex-display')
  })
})
