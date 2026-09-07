import { describe, expect, it } from 'vitest'

import { parseStudyRichTextSegments } from './studyRichText'

describe('parseStudyRichTextSegments', () => {
  it('keeps plain mobile text when the block has no internal links', () => {
    expect(parseStudyRichTextSegments('<p><strong>Desktop rich</strong></p>', 'Mobile plain')).toEqual([
      { type: 'text', text: 'Mobile plain' }
    ])
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
