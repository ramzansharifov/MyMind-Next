import {
  describe,
  expect,
  it
} from 'vitest'

import {
  getStudyCodeLanguage,
  STUDY_CODE_LANGUAGE_OPTIONS
} from './code-languages'

describe('study code languages', () => {
  it('maps HTML to the Prism markup grammar', () => {
    expect(
      getStudyCodeLanguage('html')
        .prismLanguage
    ).toBe('markup')
  })

  it('falls back to plain text for an unknown language', () => {
    expect(
      getStudyCodeLanguage('unknown')
        .value
    ).toBe('text')
  })

  it('keeps every language value unique', () => {
    const values =
      STUDY_CODE_LANGUAGE_OPTIONS.map(
        (option) => option.value
      )

    expect(new Set(values).size).toBe(
      values.length
    )
  })
})