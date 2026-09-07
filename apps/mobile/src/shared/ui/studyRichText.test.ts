import { describe, expect, it } from 'vitest'

import {
  ensureStudyRichTextEditableSegments,
  hasStudyRichTextInternalLinks,
  insertStudyRichTextLink,
  parseStudyRichTextSegments,
  removeStudyRichTextLink,
  serializeStudyRichTextSegments,
  studyRichTextLinkFromTarget,
  studyRichTextSegmentsToText,
  updateStudyRichTextTextSegment
} from './studyRichText'

describe('parseStudyRichTextSegments', () => {
  it('keeps plain mobile text when the block has no internal links', () => {
    expect(
      parseStudyRichTextSegments('<p><strong>Desktop rich</strong></p>', 'Mobile plain')
    ).toEqual([{ type: 'text', text: 'Mobile plain' }])
  })

  it('parses the desktop Study internal-link contract and surrounding text', () => {
    const html =
      '<p>До <span data-study-internal-link="true" data-target-kind="heading" data-material-id="material-2" data-heading-id="heading-9" data-heading-level="2" data-label-mode="auto" data-label="Раздел &amp; детали" data-material-title="Материал &quot;B&quot;" data-folder-path="[&quot;Курс&quot;,&quot;Тема&quot;]">Раздел &amp; детали</span> после</p>'
    expect(parseStudyRichTextSegments(html, 'До Раздел & детали после')).toEqual([
      { type: 'text', text: 'До ' },
      {
        type: 'internal-link',
        link: {
          kind: 'heading',
          materialId: 'material-2',
          headingId: 'heading-9',
          headingLevel: 2,
          labelMode: 'auto',
          label: 'Раздел & детали',
          materialTitle: 'Материал "B"',
          folderPath: ['Курс', 'Тема']
        }
      },
      { type: 'text', text: ' после' }
    ])
  })

  it('supports custom material labels and single-quoted attributes', () => {
    const html =
      "<span data-study-internal-link='true' data-target-kind='material' data-material-id='material-7' data-label-mode='custom' data-label='Моя ссылка' data-material-title='Материал' data-folder-path='[]'>Моя ссылка</span>"
    expect(parseStudyRichTextSegments(html, 'Моя ссылка')).toEqual([
      {
        type: 'internal-link',
        link: {
          kind: 'material',
          materialId: 'material-7',
          headingId: null,
          headingLevel: null,
          labelMode: 'custom',
          label: 'Моя ссылка',
          materialTitle: 'Материал',
          folderPath: []
        }
      }
    ])
  })

  it('falls back to plain text for malformed internal-link markup', () => {
    expect(
      parseStudyRichTextSegments(
        '<p><span data-study-internal-link="true" data-material-id="broken">Без закрытия</p>',
        'Без закрытия'
      )
    ).toEqual([{ type: 'text', text: 'Без закрытия' }])
  })
})

describe('Study rich-text authoring', () => {
  const headingTarget = {
    kind: 'heading' as const,
    materialId: 'material-2',
    headingId: 'heading-9',
    title: 'Раздел & детали',
    materialTitle: 'Материал "B"',
    folderPath: ['Курс', 'Тема'],
    headingLevel: 2 as const
  }

  it('serializes the desktop link contract and round-trips special characters', () => {
    const link = studyRichTextLinkFromTarget(headingTarget)
    const segments = [
      { type: 'text' as const, text: 'До < ' },
      { type: 'internal-link' as const, link },
      { type: 'text' as const, text: ' > после' }
    ]
    const html = serializeStudyRichTextSegments(segments)
    expect(html).toContain('data-study-internal-link="true"')
    expect(html).toContain('data-heading-id="heading-9"')
    expect(html).toContain('data-folder-path="[&quot;Курс&quot;,&quot;Тема&quot;]"')
    expect(parseStudyRichTextSegments(html, studyRichTextSegmentsToText(segments))).toEqual(
      segments
    )
  })

  it('inserts a link at the cursor without losing surrounding text', () => {
    const link = studyRichTextLinkFromTarget(headingTarget, 'Ссылка')
    const inserted = insertStudyRichTextLink([{ type: 'text', text: 'abcdef' }], 0, 3, link)
    expect(studyRichTextSegmentsToText(inserted)).toBe('abcСсылкаdef')
    expect(inserted).toEqual([
      { type: 'text', text: 'abc' },
      { type: 'internal-link', link },
      { type: 'text', text: 'def' }
    ])
  })

  it('preserves an existing link when adjacent text is edited', () => {
    const link = studyRichTextLinkFromTarget(headingTarget)
    const initial = ensureStudyRichTextEditableSegments([
      { type: 'text', text: 'До ' },
      { type: 'internal-link', link },
      { type: 'text', text: ' после' }
    ])
    const edited = updateStudyRichTextTextSegment(initial, 0, 'До очень ')
    const roundTrip = parseStudyRichTextSegments(
      serializeStudyRichTextSegments(edited),
      studyRichTextSegmentsToText(edited)
    )
    expect(roundTrip[1]).toEqual({ type: 'internal-link', link })
    expect(studyRichTextSegmentsToText(roundTrip)).toBe('До очень Раздел & детали после')
  })

  it('removes a link and merges neighboring text slots', () => {
    const link = studyRichTextLinkFromTarget(headingTarget)
    const removed = removeStudyRichTextLink(
      [
        { type: 'text', text: 'До ' },
        { type: 'internal-link', link },
        { type: 'text', text: ' после' }
      ],
      1
    )
    expect(removed).toEqual([{ type: 'text', text: 'До  после' }])
    expect(hasStudyRichTextInternalLinks(removed)).toBe(false)
  })
})
