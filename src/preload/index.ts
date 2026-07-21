import { contextBridge, ipcRenderer } from 'electron'

import { BOARD_IPC_CHANNELS, type BoardDocument, type BoardNode } from '../shared/contracts/boards'
import {
  PREFERENCES_IPC_CHANNELS,
  type AppearancePreferences
} from '../shared/contracts/preferences'
import {
  STUDY_IPC_CHANNELS,
  type DuplicateStudyNodeResult,
  type StudyInternalLinkTarget,
  type StudyLocalAsset,
  type StudyMaterial,
  type StudyNode
} from '../shared/contracts/study'
import { IPC_CHANNELS, type MyMindApi, type SystemHealth } from '../shared/contracts/system'
import { parseShutdownRequest } from './shutdown-request'

const api: MyMindApi = {
  system: {
    getHealth: () => ipcRenderer.invoke(IPC_CHANNELS.systemHealth) as Promise<SystemHealth>,

    onShutdownRequested: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, rawRequest: unknown): void => {
        try {
          listener(parseShutdownRequest(rawRequest))
        } catch (reason: unknown) {
          console.error('Ignored invalid shutdown request', reason)
        }
      }

      ipcRenderer.on(IPC_CHANNELS.shutdownRequested, handler)

      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.shutdownRequested, handler)
      }
    },

    respondToShutdown: (response) =>
      ipcRenderer.invoke(IPC_CHANNELS.respondToShutdown, response) as Promise<void>
  },

  preferences: {
    getAppearance: () =>
      ipcRenderer.invoke(PREFERENCES_IPC_CHANNELS.getAppearance) as Promise<AppearancePreferences>,

    updateAppearance: (input) =>
      ipcRenderer.invoke(
        PREFERENCES_IPC_CHANNELS.updateAppearance,
        input
      ) as Promise<AppearancePreferences>
  },

  boards: {
    listNodes: () => ipcRenderer.invoke(BOARD_IPC_CHANNELS.listNodes) as Promise<BoardNode[]>,

    createNode: (input) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.createNode, input) as Promise<BoardNode>,

    renameNode: (input) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.renameNode, input) as Promise<BoardNode>,

    updateFolderIcon: (input) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.updateFolderIcon, input) as Promise<BoardNode>,

    deleteNode: (nodeId) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.deleteNode, nodeId) as Promise<boolean>,

    updateExpansion: (input) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.updateExpansion, input) as Promise<BoardNode>,

    moveNode: (input) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.moveNode, input) as Promise<BoardNode[]>,

    getDocument: (nodeId) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.getDocument, nodeId) as Promise<BoardDocument>,

    saveDocument: (input) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.saveDocument, input) as Promise<BoardDocument>,

    ensureStudyBoard: (input) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.ensureStudyBoard, input) as Promise<BoardNode>
  },

  study: {
    listNodes: () => ipcRenderer.invoke(STUDY_IPC_CHANNELS.listNodes) as Promise<StudyNode[]>,

    createNode: (input) =>
      ipcRenderer.invoke(STUDY_IPC_CHANNELS.createNode, input) as Promise<StudyNode>,

    renameNode: (input) =>
      ipcRenderer.invoke(STUDY_IPC_CHANNELS.renameNode, input) as Promise<StudyNode>,

    duplicateNode: (input) =>
      ipcRenderer.invoke(
        STUDY_IPC_CHANNELS.duplicateNode,
        input
      ) as Promise<DuplicateStudyNodeResult>,

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
      ipcRenderer.invoke(STUDY_IPC_CHANNELS.importAsset, input) as Promise<StudyLocalAsset | null>,

    openAsset: (input) => ipcRenderer.invoke(STUDY_IPC_CHANNELS.openAsset, input) as Promise<void>
  }
}

if (!process.contextIsolated) {
  throw new Error('Context isolation must be enabled')
}

contextBridge.exposeInMainWorld('api', api)
