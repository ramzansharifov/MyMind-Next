import { contextBridge, ipcRenderer } from 'electron'

import { IPC_CHANNELS, type MyMindApi, type SystemHealth } from '../shared/contracts/system'
import {
  STUDY_IPC_CHANNELS,
  type StudyInternalLinkTarget,
  type StudyLocalAsset,
  type StudyMaterial,
  type StudyNode
} from '../shared/contracts/study'

const api: MyMindApi = {
  system: {
    getHealth: () => ipcRenderer.invoke(IPC_CHANNELS.systemHealth) as Promise<SystemHealth>
  },

  study: {
    listNodes: () => ipcRenderer.invoke(STUDY_IPC_CHANNELS.listNodes) as Promise<StudyNode[]>,

    createNode: (input) =>
      ipcRenderer.invoke(STUDY_IPC_CHANNELS.createNode, input) as Promise<StudyNode>,

    renameNode: (input) =>
      ipcRenderer.invoke(STUDY_IPC_CHANNELS.renameNode, input) as Promise<StudyNode>,
    updateFolderIcon: (input) =>
      ipcRenderer.invoke(STUDY_IPC_CHANNELS.updateFolderIcon, input) as Promise<StudyNode>,

    deleteNode: (nodeId) =>
      ipcRenderer.invoke(STUDY_IPC_CHANNELS.deleteNode, nodeId) as Promise<boolean>,

    updateExpansion: (input) =>
      ipcRenderer.invoke(STUDY_IPC_CHANNELS.updateExpansion, input) as Promise<StudyNode>,
    moveNode: (input) =>
      ipcRenderer.invoke(STUDY_IPC_CHANNELS.moveNode, input) as Promise<StudyNode[]>,

    getMaterial: (nodeId) =>
      ipcRenderer.invoke(STUDY_IPC_CHANNELS.getMaterial, nodeId) as Promise<StudyMaterial>,

    saveMaterial: (input) =>
      ipcRenderer.invoke(STUDY_IPC_CHANNELS.saveMaterial, input) as Promise<StudyMaterial>,
    searchInternalLinkTargets: (input) =>
      ipcRenderer.invoke(STUDY_IPC_CHANNELS.searchInternalLinkTargets, input) as Promise<
        StudyInternalLinkTarget[]
      >,

    resolveInternalLinkTarget: (input) =>
      ipcRenderer.invoke(
        STUDY_IPC_CHANNELS.resolveInternalLinkTarget,
        input
      ) as Promise<StudyInternalLinkTarget | null>,

    importAsset: (input) =>
      ipcRenderer.invoke(STUDY_IPC_CHANNELS.importAsset, input) as Promise<StudyLocalAsset | null>
  }
}

if (!process.contextIsolated) {
  throw new Error('Context isolation must be enabled')
}

contextBridge.exposeInMainWorld('api', api)
