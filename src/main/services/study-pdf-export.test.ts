import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { WebContents } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  showSaveDialog: vi.fn(),
  printToPDF: vi.fn()
}))

vi.mock('electron', () => ({
  dialog: {
    showSaveDialog: mocks.showSaveDialog
  }
}))

import { createStudyPdfFileName, exportStudyMaterialPdf } from './study-pdf-export'

let tempDirectory: string | null = null

describe('study PDF export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    if (tempDirectory) {
      await rm(tempDirectory, { recursive: true, force: true })
      tempDirectory = null
    }
  })

  it('creates a safe PDF file name from a material title', () => {
    expect(createStudyPdfFileName('  Теория: свет / тень?  ')).toBe('Теория свет тень.pdf')
    expect(createStudyPdfFileName('CON')).toBe('Материал.pdf')
    expect(createStudyPdfFileName('CON.txt')).toBe('Материал.pdf')
    expect(createStudyPdfFileName('COM1.log')).toBe('Материал.pdf')
    expect(createStudyPdfFileName('Лекция.pdf')).toBe('Лекция.pdf')
    expect(createStudyPdfFileName('...')).toBe('Материал.pdf')
  })

  it('does not render or write a PDF when the save dialog is cancelled', async () => {
    mocks.showSaveDialog.mockResolvedValue({ canceled: true, filePath: undefined })
    const webContents = { printToPDF: mocks.printToPDF } as unknown as WebContents

    await expect(
      exportStudyMaterialPdf({ title: 'Материал', webContents, parentWindow: null })
    ).resolves.toEqual({ status: 'cancelled' })

    expect(mocks.printToPDF).not.toHaveBeenCalled()
  })

  it('prints A4 with backgrounds and writes the selected PDF file', async () => {
    const pdf = Buffer.from('%PDF-test')
    tempDirectory = await mkdtemp(join(tmpdir(), 'mymind-study-pdf-'))
    const filePath = join(tempDirectory, 'Lesson.pdf')
    mocks.showSaveDialog.mockResolvedValue({ canceled: false, filePath })
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
    expect(await readFile(filePath)).toEqual(pdf)
  })
})
