import katex from 'katex'

import type { StudyLatexDisplayMode } from '../../../../../../shared/contracts/study'

export interface StudyLatexRenderResult {
  html: string | null
  error: string | null
}

export function renderStudyLatex(
  source: string,
  displayMode: StudyLatexDisplayMode
): StudyLatexRenderResult {
  const trimmedSource = source.trim()

  if (!trimmedSource) {
    return {
      html: null,
      error: null
    }
  }

  try {
    const renderedHtml = katex.renderToString(trimmedSource, {
      displayMode: displayMode === 'display',
      output: 'htmlAndMathml',
      throwOnError: true,
      trust: false,
      strict: 'ignore',
      maxExpand: 500,
      maxSize: 20
    })

    const html = isDocumentLikeLatex(trimmedSource)
      ? `<span class="study-latex-document-layout">${renderedHtml}</span>`
      : renderedHtml

    return {
      html,
      error: null
    }
  } catch (reason: unknown) {
    return {
      html: null,
      error: getLatexErrorMessage(reason)
    }
  }
}

function isDocumentLikeLatex(source: string): boolean {
  const hasDocumentEnvironment = /\\begin\{(?:aligned|alignedat|gathered)\*?\}/.test(source)
  const rowBreakCount = source.match(/\\\\(?:\[[^\]]*\])?/g)?.length ?? 0
  const hasTextContent = /\\(?:text|textbf|textit|textrm|mathrm)\s*\{/.test(source)

  return hasDocumentEnvironment && rowBreakCount >= 2 && hasTextContent
}

function getLatexErrorMessage(reason: unknown): string {
  if (!(reason instanceof Error)) {
    return 'Не удалось отобразить формулу'
  }

  return reason.message.replace(/^KaTeX parse error:\s*/i, '').trim()
}
