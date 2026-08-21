import { describe, expect, it } from 'vitest'

import { createRichTextExtensions } from './extensions'

describe('createRichTextExtensions', () => {
  it('keeps internal links enabled for study by default', () => {
    expect(createRichTextExtensions(false).map((extension) => extension.name)).toContain(
      'studyInternalLink'
    )
  })

  it('removes the internal-link extension when the capability is disabled', () => {
    expect(
      createRichTextExtensions(false, { internalLinks: false }).map((extension) => extension.name)
    ).not.toContain('studyInternalLink')
  })
})
