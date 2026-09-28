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

import { createBoardPdfFileName, exportBoardPdf } from './board-pdf-export'

let tempDirectory: string | null = null

describe('board PDF export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    if (tempDirectory) {
      await rm(tempDirectory, { recursive: true, force: true })
      tempDirectory = null
    }
  })

  it('creates a safe PDF file name from a board title', () => {
    expect(createBoardPdfFileName('  Конспект: алгебра / 1?  ')).toBe('Конспект алгебра 1.pdf')
    expect(createBoardPdfFileName('CON')).toBe('Доска.pdf')
    expect(createBoardPdfFileName('Лист.pdf')).toBe('Лист.pdf')
  })

  it('does not print when the save dialog is cancelled', async () => {
    mocks.showSaveDialog.mockResolvedValue({ canceled: true, filePath: undefined })
    const webContents = { printToPDF: mocks.printToPDF } as unknown as WebContents

    await expect(
      exportBoardPdf({ title: 'Доска', webContents, parentWindow: null })
    ).resolves.toEqual({ status: 'cancelled' })

    expect(mocks.printToPDF).not.toHaveBeenCalled()
  })

  it('lets CSS define A4 size instead of passing Electron pageSize', async () => {
    const pdf = Buffer.from('%PDF-board-test')
    tempDirectory = await mkdtemp(join(tmpdir(), 'mymind-board-pdf-'))
    const filePath = join(tempDirectory, 'Board.pdf')
    mocks.showSaveDialog.mockResolvedValue({ canceled: false, filePath })
    mocks.printToPDF.mockResolvedValue(pdf)
    const webContents = { printToPDF: mocks.printToPDF } as unknown as WebContents

    await expect(
      exportBoardPdf({ title: 'Доска', webContents, parentWindow: null })
    ).resolves.toEqual({ status: 'saved' })

    expect(mocks.printToPDF).toHaveBeenCalledWith({
      printBackground: true,
      preferCSSPageSize: true,
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      }
    })
    expect(mocks.printToPDF.mock.calls[0]?.[0]).not.toHaveProperty('pageSize')
    expect(await readFile(filePath)).toEqual(pdf)
  })
})
