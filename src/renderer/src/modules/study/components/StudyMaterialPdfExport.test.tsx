import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StudyMaterialPdfExport } from './StudyMaterialPdfExport'

describe('StudyMaterialPdfExport', () => {
  it('renders a dedicated printable material portal outside the application root', () => {
    const { unmount } = render(
      <StudyMaterialPdfExport
        materialId="material-pdf-test"
        title="Экспортируемый материал"
        studyDocument={{ version: 1, blocks: [] }}
      />
    )

    const exportRoot = document.body.querySelector('[data-study-pdf-export-root]')
    const exportDocument = document.body.querySelector('[data-study-pdf-export-document]')

    expect(exportRoot).toBeInTheDocument()
    expect(exportDocument).toHaveTextContent('MyMind · Обучение')
    expect(exportDocument).toHaveTextContent('Экспортируемый материал')

    unmount()
    expect(document.body.querySelector('[data-study-pdf-export-root]')).not.toBeInTheDocument()
  })
})
