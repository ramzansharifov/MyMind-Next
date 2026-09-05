import { describe, expect, it } from 'vitest'

import { readRepoText } from '../test/read-repo-text'

const styles = readRepoText('src/renderer/src/assets/study-code-editor.css')

describe('study code editor layout', () => {
  it('lets the editor grow with the complete document instead of stretching to viewport height', () => {
    expect(styles).toContain('align-items: flex-start;')
    expect(styles).toContain('width: max-content;')
    expect(styles).toContain('flex: 1 0 max-content;')
    expect(styles).toContain('align-self: flex-start;')
  })

  it('keeps textarea and highlighted layer on the same unwrapped line geometry', () => {
    expect(styles).toMatch(
      /\.study-code-editor__root textarea,[\s\S]*?\.study-code-editor__root pre[\s\S]*?white-space: pre !important;[\s\S]*?word-break: normal !important;[\s\S]*?overflow-wrap: normal !important;/
    )
    expect(styles).toMatch(
      /\.study-code-editor__root pre,[\s\S]*?\.study-code-editor__root pre \*[\s\S]*?font-weight: inherit !important;[\s\S]*?line-height: inherit !important;/
    )
  })
})
