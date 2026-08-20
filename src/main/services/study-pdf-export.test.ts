import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WebContents } from 'electron'

const mocks = vi.hoisted(() => ({
  showSaveDialog: vi.fn(),
  writeFile: vi.fn(),
  printToPDF: vi.fn()
}))

vi.mock('electron', () => ({
  dialog: {
    showSaveDialog: mocks.showSaveDialog
  }
}))

vi.mock('node:fs/promises', () => ({
  writeFile: mocks.writeFile
}))

import { createStudyPdfFileName, exportStudyMaterialPdf } from './study-pdf-export'

describe('study PDF export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a safe PDF file name from a material title', () => {
    expect(createStudyPdfFileName('  Теория: свет / тень?  ')).toBe('Теория свет тень.pdf')
    expect(createStudyPdfFileName('CON')).toBe('Материал.pdf')
    expect(createStudyPdfFileName('...')).toBe('Материал.pdf')
  })

  it('does not render or write a PDF when the save dialog is cancelled', async () => {
    mocks.showSaveDialog.mockResolvedValue({ canceled: true, filePath: undefined })
    const webContents = { printToPDF: mocks.printToPDF } as unknown as WebContents

    await expect(
      exportStudyMaterialPdf({ title: 'Материал', webContents, parentWindow: null })
    ).resolves.toEqual({ status: 'cancelled' })

    expect(mocks.printToPDF).not.toHaveBeenCalled()
    expect(mocks.writeFile).not.toHaveBeenCalled()
  })

  it('prints A4 with backgrounds and writes the selected PDF file', async () => {
    const pdf = Buffer.from('%PDF-test')
    mocks.showSaveDialog.mockResolvedValue({ canceled: false, filePath: 'C:\\Temp\\Lesson.pdf' })
    mocks.printToPDF.mockResolvedValue(pdf)
    const webContents = { printToPDF: mocks.printToPDF } as unknown as WebContents

    await expect(
      exportStudyMaterialPdf({ title: 'Урок', webContents, parentWindow: null })
    ).resolves.toEqual({ status: 'saved' })

    expect(mocks.printToPDF).toHaveBeenCalledWith({
      printBackground: true,
      preferCSSPageSize: true,
      pageSize: 'A4'
    })
    expect(mocks.writeFile).toHaveBeenCalledWith('C:\\Temp\\Lesson.pdf', pdf)
  })
})
