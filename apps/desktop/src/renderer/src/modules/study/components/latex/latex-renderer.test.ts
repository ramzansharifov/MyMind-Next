import { describe, expect, it } from 'vitest'

import { renderStudyLatex } from './latex-renderer'

describe('renderStudyLatex', () => {
  it('renders normal display math as one KaTeX expression', () => {
    const result = renderStudyLatex(String.raw`\frac{a}{b}`, 'display')

    expect(result.error).toBeNull()
    expect(result.html).toContain('katex-display')
    expect(result.html).toContain('<math')
    expect(result.html).not.toContain('study-latex-document-layout')
  })

  it('renders a long aligned note as independent full-width rows', () => {
    const result = renderStudyLatex(
      String.raw`\begin{aligned}
        &\textbf{Конспект по математическому анализу} \\
        &\textbf{1. Пределы и основные определения} \\
        &\lim_{x \to a} f(x) = A \\
        &\forall \varepsilon > 0\; \exists \delta > 0:\; 0 < |x-a| < \delta
      \end{aligned}`,
      'display'
    )

    expect(result.error).toBeNull()
    expect(result.html).toContain('data-study-latex-document-layout="true"')
    expect(result.html?.match(/study-latex-document-row/g)).toHaveLength(4)
    expect(result.html).not.toContain('katex-display')
  })

  it('supports note-like array roots instead of relying on aligned only', () => {
    const result = renderStudyLatex(
      String.raw`\begin{array}{l}
        \textbf{Конспект по математическому анализу} \\
        \textbf{1. Пределы и основные определения} \\
        \lim_{x \to a} f(x) = A \\
        \sin x \sim x,\quad \tan x \sim x,\quad \ln(1+x) \sim x
      \end{array}`,
      'display'
    )

    expect(result.error).toBeNull()
    expect(result.html).toContain('study-latex-document-layout')
    expect(result.html?.match(/study-latex-document-row/g)).toHaveLength(4)
  })

  it('keeps nested multi-row math inside one document row', () => {
    const result = renderStudyLatex(
      String.raw`\begin{aligned}
        &\textbf{Конспект с кусочной функцией} \\
        &f(x)=\begin{cases}x^2 & x > 0 \\ 0 & x \le 0\end{cases} \\
        &\text{Следующая строка содержит отдельную формулу} \\
        &f'(x)=2x
      \end{aligned}`,
      'display'
    )

    expect(result.error).toBeNull()
    expect(result.html).toContain('study-latex-document-layout')
    expect(result.html?.match(/study-latex-document-row/g)).toHaveLength(4)
  })

  it('keeps compact aligned equations in the standard KaTeX layout', () => {
    const result = renderStudyLatex(
      String.raw`\begin{aligned}a &= b \\ c &= d\end{aligned}`,
      'display'
    )

    expect(result.error).toBeNull()
    expect(result.html).toContain('katex-display')
    expect(result.html).not.toContain('study-latex-document-layout')
  })

  it('does not use document layout for inline math', () => {
    const result = renderStudyLatex(
      String.raw`\begin{aligned}\text{A} \\ \text{B} \\ \text{C}\end{aligned}`,
      'inline'
    )

    expect(result.error).toBeNull()
    expect(result.html).not.toContain('katex-display')
    expect(result.html).not.toContain('study-latex-document-layout')
  })

  it('returns a readable parsing error', () => {
    const result = renderStudyLatex(String.raw`\frac{`, 'display')

    expect(result.html).toBeNull()
    expect(result.error).toBeTruthy()
  })
})
