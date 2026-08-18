import { describe, expect, it } from 'vitest'

import './StudyFolderCodeWorkspace.css'

describe('StudyFolderCodeWorkspace layout', () => {
  it('keeps folder chrome and DSL aligned through the shared workspace width token', () => {
    const stylesheet = Array.from(document.styleSheets)
      .flatMap((sheet) => Array.from(sheet.cssRules ?? []))
      .map((rule) => rule.cssText)
      .join('\n')

    expect(stylesheet).toContain('--study-folder-workspace-content-width')
    expect(stylesheet).toContain('data-study-folder-code-workspace')
  })
})
