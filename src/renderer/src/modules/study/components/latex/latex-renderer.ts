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
    const html = katex.renderToString(trimmedSource, {
      displayMode: displayMode === 'display',
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

function getLatexErrorMessage(reason: unknown): string {
  if (!(reason instanceof Error)) {
    return 'Не удалось отобразить формулу'
  }

  return reason.message.replace(/^KaTeX parse error:\s*/i, '').trim()
}
