import { dialog, type BrowserWindow, type SaveDialogOptions, type WebContents } from 'electron'
import { writeFile } from 'node:fs/promises'

import type { ExportBoardPdfResult } from '../../shared/contracts/boards'

const WINDOWS_RESERVED_FILE_NAMES = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i

export function createBoardPdfFileName(title: string): string {
  let normalized = title
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
    .replace(/[. ]+$/g, '')

  if (/\.pdf$/i.test(normalized)) {
    normalized = normalized
      .slice(0, -4)
      .trimEnd()
      .replace(/[. ]+$/g, '')
  }

  const safeStem =
    normalized && !WINDOWS_RESERVED_FILE_NAMES.test(normalized) ? normalized : 'Доска'
  return `${safeStem}.pdf`
}

export async function exportBoardPdf({
  title,
  webContents,
  parentWindow
}: {
  title: string
  webContents: WebContents
  parentWindow: BrowserWindow | null
}): Promise<ExportBoardPdfResult> {
  const options: SaveDialogOptions = {
    title: 'Экспорт доски в PDF',
    defaultPath: createBoardPdfFileName(title),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    properties: ['showOverwriteConfirmation', 'createDirectory']
  }

  const selection = parentWindow
    ? await dialog.showSaveDialog(parentWindow, options)
    : await dialog.showSaveDialog(options)

  if (selection.canceled || !selection.filePath) {
    return { status: 'cancelled' }
  }

  const pdf = await webContents.printToPDF({
    printBackground: true,
    preferCSSPageSize: true,
    pageSize: 'A4'
  })

  await writeFile(selection.filePath, pdf)
  return { status: 'saved' }
}
