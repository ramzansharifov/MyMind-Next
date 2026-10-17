import { createPortal } from 'react-dom'

import type { StudyDocument } from '../../../../../shared/contracts/study'
import '../../../assets/study-material-pdf-export.css'
import { StudyBlockEditor } from './StudyBlockEditor'

interface StudyMaterialPdfExportProps {
  materialId: string
  title: string
  studyDocument: StudyDocument
}

export function StudyMaterialPdfExport({
  materialId,
  title,
  studyDocument
}: StudyMaterialPdfExportProps): React.JSX.Element {
  return createPortal(
    <div data-study-pdf-export-root aria-hidden="true">
      <main data-study-pdf-export-document>
        <header data-study-pdf-export-title>
          <p>MyMind · Обучение</p>
          <h1>{title}</h1>
        </header>

        <section data-study-pdf-export-content>
          <StudyBlockEditor
            materialId={materialId}
            document={studyDocument}
            mode="read"
            focusMode
            onChange={() => undefined}
          />
        </section>
      </main>
    </div>,
    window.document.body
  )
}
