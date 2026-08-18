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

  const documentLike = displayMode === 'display' && isDocumentLikeLatex(trimmedSource)

  try {
    const html = katex.renderToString(trimmedSource, {
      displayMode: displayMode === 'display',
      fleqn: documentLike,
      output: 'htmlAndMathml',
      throwOnError: true,
      trust: false,
      strict: 'ignore',
      maxExpand: 500,
      maxSize: 20
    })

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
  const rowBreakCount = source.match(/\\\\(?:\[[^\]]*\])?/g)?.length ?? 0
  const hasTextContent = /\\(?:text|textbf|textit|textrm|mathrm)\s*\{/.test(source)
  const hasMultirowEnvironment =
    /\\begin\{(?:align|alignat|aligned|alignedat|gather|gathered)\*?\}/.test(source)

  return hasMultirowEnvironment && rowBreakCount >= 2 && hasTextContent
}

function getLatexErrorMessage(reason: unknown): string {
  if (!(reason instanceof Error)) {
    return 'Не удалось отобразить формулу'
  }

  return reason.message.replace(/^KaTeX parse error:\s*/i, '').trim()
}
