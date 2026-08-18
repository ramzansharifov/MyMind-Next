import { describe, expect, it } from 'vitest'

import { renderStudyLatex } from './latex-renderer'

describe('renderStudyLatex', () => {
  it('renders accessible display math without forcing flush-left layout', () => {
    const result = renderStudyLatex(String.raw`\frac{a}{b}`, 'display')

    expect(result.error).toBeNull()
    expect(result.html).toContain('katex-display')
    expect(result.html).toContain('<math')
    expect(result.html).not.toContain('fleqn')
  })

  it('uses KaTeX fleqn for long note-like aligned content', () => {
    const result = renderStudyLatex(
      String.raw`\begin{aligned}
        &\textbf{Конспект по математическому анализу} \\
        &\textbf{1. Пределы} \\
        &\lim_{x \to a} f(x) = A
      \end{aligned}`,
      'display'
    )

    expect(result.error).toBeNull()
    expect(result.html).toContain('katex-display')
    expect(result.html).toContain('fleqn')
  })

  it('keeps compact aligned equations centered', () => {
    const result = renderStudyLatex(
      String.raw`\begin{aligned}a &= b \\ c &= d\end{aligned}`,
      'display'
    )

    expect(result.error).toBeNull()
    expect(result.html).not.toContain('fleqn')
  })

  it('does not enable fleqn for inline math', () => {
    const result = renderStudyLatex(
      String.raw`\begin{aligned}\text{A} \\ \text{B} \\ \text{C}\end{aligned}`,
      'inline'
    )

    expect(result.error).toBeNull()
    expect(result.html).not.toContain('katex-display')
    expect(result.html).not.toContain('fleqn')
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
