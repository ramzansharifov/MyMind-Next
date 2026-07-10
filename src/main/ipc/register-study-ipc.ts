import { ipcMain } from 'electron'

import { STUDY_IPC_CHANNELS } from '../../shared/contracts/study'
import {
  createStudyNodeInputSchema,
  moveStudyNodeInputSchema,
  renameStudyNodeInputSchema,
  saveStudyMaterialInputSchema,
  updateStudyNodeExpansionInputSchema
} from '../../shared/validation/study'
import {
  createStudyNode,
  deleteStudyNode,
  getStudyMaterial,
  listStudyNodes,
  moveStudyNode,
  renameStudyNode,
  saveStudyMaterial,
  updateStudyNodeExpansion
} from '../repositories/study.repository'

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
}
