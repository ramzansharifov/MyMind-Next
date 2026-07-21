import { ipcMain } from 'electron'

import { BOARD_IPC_CHANNELS } from '../../shared/contracts/boards'
import {
  createBoardNodeInputSchema,
  ensureStudyBoardInputSchema,
  moveBoardNodeInputSchema,
  renameBoardNodeInputSchema,
  saveBoardDocumentInputSchema,
  updateBoardFolderIconInputSchema,
  updateBoardNodeExpansionInputSchema
} from '../../shared/validation/boards'
import {
  createBoardNode,
  deleteBoardNode,
  ensureStudyBoard,
  getBoardDocument,
  listBoardNodes,
  moveBoardNode,
  renameBoardNode,
  saveBoardDocument,
  updateBoardFolderIcon,
  updateBoardNodeExpansion
} from '../repositories/boards.repository'
import { mainOperationTracker } from '../services/main-operation-tracker'

export function registerBoardsIpcHandlers(): void {
  Object.values(BOARD_IPC_CHANNELS).forEach((channel) => {
    ipcMain.removeHandler(channel)
  })

  ipcMain.handle(BOARD_IPC_CHANNELS.listNodes, () =>
    mainOperationTracker.run(() => listBoardNodes())
  )

  ipcMain.handle(BOARD_IPC_CHANNELS.createNode, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => createBoardNode(createBoardNodeInputSchema.parse(rawInput)))
  )

  ipcMain.handle(BOARD_IPC_CHANNELS.renameNode, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const input = renameBoardNodeInputSchema.parse(rawInput)
      return renameBoardNode(input.id, input.title)
    })
  )

  ipcMain.handle(BOARD_IPC_CHANNELS.updateFolderIcon, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      updateBoardFolderIcon(updateBoardFolderIconInputSchema.parse(rawInput))
    )
  )

  ipcMain.handle(BOARD_IPC_CHANNELS.deleteNode, (_event, nodeId: unknown) =>
    mainOperationTracker.run(() => {
      if (typeof nodeId !== 'string' || !nodeId) {
        throw new Error('Некорректный идентификатор доски')
      }

      return deleteBoardNode(nodeId)
    })
  )

  ipcMain.handle(BOARD_IPC_CHANNELS.updateExpansion, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const input = updateBoardNodeExpansionInputSchema.parse(rawInput)
      return updateBoardNodeExpansion(input.id, input.isExpanded)
    })
  )

  ipcMain.handle(BOARD_IPC_CHANNELS.moveNode, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => moveBoardNode(moveBoardNodeInputSchema.parse(rawInput)))
  )

  ipcMain.handle(BOARD_IPC_CHANNELS.getDocument, (_event, nodeId: unknown) =>
    mainOperationTracker.run(() => {
      if (typeof nodeId !== 'string' || !nodeId) {
        throw new Error('Некорректный идентификатор доски')
      }

      return getBoardDocument(nodeId)
    })
  )

  ipcMain.handle(BOARD_IPC_CHANNELS.saveDocument, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const input = saveBoardDocumentInputSchema.parse(rawInput)
      return saveBoardDocument(input.nodeId, input.snapshot)
    })
  )

  ipcMain.handle(BOARD_IPC_CHANNELS.ensureStudyBoard, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => ensureStudyBoard(ensureStudyBoardInputSchema.parse(rawInput)))
  )
}
