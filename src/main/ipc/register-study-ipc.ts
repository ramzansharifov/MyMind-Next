import { BrowserWindow, ipcMain } from 'electron'

import { STUDY_IPC_CHANNELS } from '../../shared/contracts/study'
import {
  createStudyNodeInputSchema,
  duplicateStudyNodeInputSchema,
  importStudyAssetInputSchema,
  moveStudyNodeInputSchema,
  renameStudyNodeInputSchema,
  resolveStudyInternalLinkTargetInputSchema,
  saveStudyMaterialInputSchema,
  searchStudyInternalLinkTargetsInputSchema,
  updateStudyFolderIconInputSchema,
  updateStudyNodeExpansionInputSchema
} from '../../shared/validation/study'
import {
  createStudyNode,
  deleteStudyNode,
  duplicateStudyNode,
  getStudyMaterial,
  listStudyNodes,
  moveStudyNode,
  renameStudyNode,
  resolveStudyInternalLinkTarget,
  saveStudyMaterial,
  searchStudyInternalLinkTargets,
  updateStudyFolderIcon,
  updateStudyNodeExpansion
} from '../repositories/study.repository'
import { importStudyAsset } from '../services/study-assets'

export function registerStudyIpcHandlers(): void {
  Object.values(STUDY_IPC_CHANNELS).forEach((channel) => {
    ipcMain.removeHandler(channel)
  })

  ipcMain.handle(STUDY_IPC_CHANNELS.listNodes, () => listStudyNodes())

  ipcMain.handle(STUDY_IPC_CHANNELS.createNode, (_event, rawInput: unknown) => {
    const input = createStudyNodeInputSchema.parse(rawInput)

    return createStudyNode(input)
  })

  ipcMain.handle(STUDY_IPC_CHANNELS.renameNode, (_event, rawInput: unknown) => {
    const input = renameStudyNodeInputSchema.parse(rawInput)

    return renameStudyNode(input.id, input.title)
  })
  ipcMain.handle(STUDY_IPC_CHANNELS.duplicateNode, (_event, rawInput: unknown) => {
    const input = duplicateStudyNodeInputSchema.parse(rawInput)

    return duplicateStudyNode(input.id)
  })
  ipcMain.handle(STUDY_IPC_CHANNELS.updateFolderIcon, (_event, rawInput: unknown) => {
    const input = updateStudyFolderIconInputSchema.parse(rawInput)

    return updateStudyFolderIcon(input.id, input.icon)
  })

  ipcMain.handle(STUDY_IPC_CHANNELS.deleteNode, (_event, nodeId: unknown) => {
    if (typeof nodeId !== 'string' || !nodeId) {
      throw new Error('Invalid study node id')
    }

    return deleteStudyNode(nodeId)
  })

  ipcMain.handle(STUDY_IPC_CHANNELS.updateExpansion, (_event, rawInput: unknown) => {
    const input = updateStudyNodeExpansionInputSchema.parse(rawInput)

    return updateStudyNodeExpansion(input.id, input.isExpanded)
  })
  ipcMain.handle(STUDY_IPC_CHANNELS.moveNode, (_event, rawInput: unknown) => {
    const input = moveStudyNodeInputSchema.parse(rawInput)

    return moveStudyNode(input)
  })

  ipcMain.handle(STUDY_IPC_CHANNELS.getMaterial, (_event, nodeId: unknown) => {
    if (typeof nodeId !== 'string' || !nodeId) {
      throw new Error('Invalid study material id')
    }

    return getStudyMaterial(nodeId)
  })

  ipcMain.handle(STUDY_IPC_CHANNELS.saveMaterial, (_event, rawInput: unknown) => {
    const input = saveStudyMaterialInputSchema.parse(rawInput)

    return saveStudyMaterial(input)
  })
  ipcMain.handle(STUDY_IPC_CHANNELS.searchInternalLinkTargets, (_event, rawInput: unknown) => {
    const input = searchStudyInternalLinkTargetsInputSchema.parse(rawInput)

    return searchStudyInternalLinkTargets(input)
  })

  ipcMain.handle(STUDY_IPC_CHANNELS.resolveInternalLinkTarget, (_event, rawInput: unknown) => {
    const input = resolveStudyInternalLinkTargetInputSchema.parse(rawInput)

    return resolveStudyInternalLinkTarget(input)
  })
  ipcMain.handle(STUDY_IPC_CHANNELS.importAsset, (event, rawInput: unknown) => {
    if (!event.senderFrame || event.senderFrame !== event.sender.mainFrame) {
      throw new Error('Untrusted study asset request')
    }

    const input = importStudyAssetInputSchema.parse(rawInput)

    getStudyMaterial(input.nodeId)

    const parentWindow = BrowserWindow.fromWebContents(event.sender)

    return importStudyAsset(input, parentWindow)
  })
}
