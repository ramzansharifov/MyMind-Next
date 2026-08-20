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

        <StudyBlockEditor
          materialId={materialId}
          document={studyDocument}
          mode="read"
          focusMode
          onChange={() => undefined}
        />
      </main>
    </div>,
    window.document.body
  )
}

export async function waitForStudyMaterialPdfReady(timeoutMs = 8_000): Promise<void> {
  await nextAnimationFrame()
  await nextAnimationFrame()

  const exportRoot = window.document.querySelector<HTMLElement>('[data-study-pdf-export-root]')
  if (!exportRoot) throw new Error('Не удалось подготовить материал к экспорту')

  if (window.document.fonts?.ready) {
    await window.document.fonts.ready
  }

  await waitForImages(exportRoot, Math.min(timeoutMs, 4_000))
  await waitForAsyncBlocks(exportRoot, timeoutMs)
  await nextAnimationFrame()
}

async function waitForAsyncBlocks(root: HTMLElement, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const pending = root.querySelector('[aria-busy="true"], [role="status"]')
    if (!pending) return
    await delay(50)
  }

  throw new Error('Не все блоки материала успели подготовиться к экспорту')
}

async function waitForImages(root: HTMLElement, timeoutMs: number): Promise<void> {
  const images = Array.from(root.querySelectorAll('img'))
  if (images.length === 0) return

  await Promise.all(images.map((image) => waitForImage(image, timeoutMs)))
}

async function waitForImage(image: HTMLImageElement, timeoutMs: number): Promise<void> {
  if (image.complete) {
    await image.decode?.().catch(() => undefined)
    return
  }

  await new Promise<void>((resolve) => {
    const timer = window.setTimeout(finish, timeoutMs)

    function finish(): void {
      window.clearTimeout(timer)
      image.removeEventListener('load', finish)
      image.removeEventListener('error', finish)
      resolve()
    }

    image.addEventListener('load', finish, { once: true })
    image.addEventListener('error', finish, { once: true })
  })

  await image.decode?.().catch(() => undefined)
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()))
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}
