import { contextBridge, ipcRenderer } from 'electron'

import { BOARD_IPC_CHANNELS, type BoardDocument, type BoardNode } from '../shared/contracts/boards'
import { DIARY_IPC_CHANNELS } from '../shared/contracts/diary'
import { FINANCE_IPC_CHANNELS } from '../shared/contracts/finance'
import { MOVIES_IPC_CHANNELS } from '../shared/contracts/movies'
import {
  NOTES_IPC_CHANNELS,
  type NoteGroup,
  type NoteLocalAsset,
  type NoteRecord,
  type NoteSummary,
  type NotesOverview
} from '../shared/contracts/notes'
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
import {
  IPC_CHANNELS,
  type MyMindApi,
  type SystemHealth,
  type SystemWindowState
} from '../shared/contracts/system'
import { parseShutdownRequest } from './shutdown-request'

const api: MyMindApi = {
  system: {
    getHealth: () => ipcRenderer.invoke(IPC_CHANNELS.systemHealth) as Promise<SystemHealth>,

    getWindowState: () =>
      ipcRenderer.invoke(IPC_CHANNELS.windowGetState) as Promise<SystemWindowState>,

    onWindowStateChanged: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, state: SystemWindowState): void => {
        listener(state)
      }

      ipcRenderer.on(IPC_CHANNELS.windowStateChanged, handler)

      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.windowStateChanged, handler)
      }
    },

    minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.windowMinimize) as Promise<void>,

    toggleMaximizeWindow: () =>
      ipcRenderer.invoke(IPC_CHANNELS.windowToggleMaximize) as Promise<SystemWindowState>,

    closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.windowClose) as Promise<void>,

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
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.ensureStudyBoard, input) as Promise<BoardNode>,

    ensureNoteBoard: (input) =>
      ipcRenderer.invoke(BOARD_IPC_CHANNELS.ensureNoteBoard, input) as Promise<BoardNode>
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
  },

  notes: {
    listOverview: () =>
      ipcRenderer.invoke(NOTES_IPC_CHANNELS.listOverview) as Promise<NotesOverview>,

    createGroup: (input) =>
      ipcRenderer.invoke(NOTES_IPC_CHANNELS.createGroup, input) as Promise<NoteGroup>,

    renameGroup: (input) =>
      ipcRenderer.invoke(NOTES_IPC_CHANNELS.renameGroup, input) as Promise<NoteGroup>,

    updateGroupIcon: (input) =>
      ipcRenderer.invoke(NOTES_IPC_CHANNELS.updateGroupIcon, input) as Promise<NoteGroup>,

    deleteGroup: (groupId) =>
      ipcRenderer.invoke(NOTES_IPC_CHANNELS.deleteGroup, groupId) as Promise<boolean>,

    createNote: (input) =>
      ipcRenderer.invoke(NOTES_IPC_CHANNELS.createNote, input) as Promise<NoteRecord>,

    renameNote: (input) =>
      ipcRenderer.invoke(NOTES_IPC_CHANNELS.renameNote, input) as Promise<NoteSummary>,

    moveNote: (input) =>
      ipcRenderer.invoke(NOTES_IPC_CHANNELS.moveNote, input) as Promise<NoteSummary>,

    deleteNote: (noteId) =>
      ipcRenderer.invoke(NOTES_IPC_CHANNELS.deleteNote, noteId) as Promise<boolean>,

    getNote: (noteId) =>
      ipcRenderer.invoke(NOTES_IPC_CHANNELS.getNote, noteId) as Promise<NoteRecord>,

    saveNote: (input) =>
      ipcRenderer.invoke(NOTES_IPC_CHANNELS.saveNote, input) as Promise<NoteRecord>,

    importAsset: (input) =>
      ipcRenderer.invoke(NOTES_IPC_CHANNELS.importAsset, input) as Promise<NoteLocalAsset | null>,

    openAsset: (input) => ipcRenderer.invoke(NOTES_IPC_CHANNELS.openAsset, input) as Promise<void>
  },

  diary: {
    listOverview: () => ipcRenderer.invoke(DIARY_IPC_CHANNELS.listOverview),
    createDiary: (input) => ipcRenderer.invoke(DIARY_IPC_CHANNELS.createDiary, input),
    updateDiary: (input) => ipcRenderer.invoke(DIARY_IPC_CHANNELS.updateDiary, input),
    updateAppearance: (input) => ipcRenderer.invoke(DIARY_IPC_CHANNELS.updateAppearance, input),
    deleteDiary: (input) => ipcRenderer.invoke(DIARY_IPC_CHANNELS.deleteDiary, input),
    getDay: (input) => ipcRenderer.invoke(DIARY_IPC_CHANNELS.getDay, input),
    listDays: (input) => ipcRenderer.invoke(DIARY_IPC_CHANNELS.listDays, input),
    setMood: (input) => ipcRenderer.invoke(DIARY_IPC_CHANNELS.setMood, input),
    createEntry: (input) => ipcRenderer.invoke(DIARY_IPC_CHANNELS.createEntry, input),
    updateEntry: (input) => ipcRenderer.invoke(DIARY_IPC_CHANNELS.updateEntry, input),
    deleteEntry: (input) => ipcRenderer.invoke(DIARY_IPC_CHANNELS.deleteEntry, input),
    getReport: (input) => ipcRenderer.invoke(DIARY_IPC_CHANNELS.getReport, input)
  },

  movies: {
    listOverview: () => ipcRenderer.invoke(MOVIES_IPC_CHANNELS.listOverview),
    getMovie: (input) => ipcRenderer.invoke(MOVIES_IPC_CHANNELS.getMovie, input),
    createMovie: (input) => ipcRenderer.invoke(MOVIES_IPC_CHANNELS.createMovie, input),
    updateMovie: (input) => ipcRenderer.invoke(MOVIES_IPC_CHANNELS.updateMovie, input),
    deleteMovie: (input) => ipcRenderer.invoke(MOVIES_IPC_CHANNELS.deleteMovie, input)
  },

  finance: {
    getSettings: () => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.getSettings),
    setBaseCurrency: (input) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.setBaseCurrency, input),
    listExchangeRates: () => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.listExchangeRates),
    upsertExchangeRate: (input) =>
      ipcRenderer.invoke(FINANCE_IPC_CHANNELS.upsertExchangeRate, input),
    deleteExchangeRate: (input) =>
      ipcRenderer.invoke(FINANCE_IPC_CHANNELS.deleteExchangeRate, input),
    listAccounts: (period) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.listAccounts, period),
    getAccount: (id, period) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.getAccount, id, period),
    createAccount: (input) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.createAccount, input),
    updateAccount: (input) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.updateAccount, input),
    deleteAccount: (input) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.deleteAccount, input),
    clearAccountHistory: (input) =>
      ipcRenderer.invoke(FINANCE_IPC_CHANNELS.clearAccountHistory, input),
    listTransactions: (filters) =>
      ipcRenderer.invoke(FINANCE_IPC_CHANNELS.listTransactions, filters),
    getTransaction: (id) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.getTransaction, id),
    createTransaction: (input) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.createTransaction, input),
    updateTransaction: (input) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.updateTransaction, input),
    deleteTransaction: (input) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.deleteTransaction, input),
    listTags: () => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.listTags),
    getTag: (id) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.getTag, id),
    createTag: (input) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.createTag, input),
    updateTag: (input) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.updateTag, input),
    deleteTag: (input) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.deleteTag, input),
    listLimits: (at) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.listLimits, at),
    createLimit: (input) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.createLimit, input),
    updateLimit: (input) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.updateLimit, input),
    setLimitState: (input) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.setLimitState, input),
    deleteLimit: (input) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.deleteLimit, input),
    previewExpenseImpact: (input) =>
      ipcRenderer.invoke(FINANCE_IPC_CHANNELS.previewExpenseImpact, input),
    listTemplates: () => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.listTemplates),
    createTemplate: (input) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.createTemplate, input),
    updateTemplate: (input) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.updateTemplate, input),
    deleteTemplate: (input) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.deleteTemplate, input),
    getDashboard: (period) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.getDashboard, period),
    getReport: (filters) => ipcRenderer.invoke(FINANCE_IPC_CHANNELS.getReport, filters)
  }
}

if (!process.contextIsolated) {
  throw new Error('Context isolation must be enabled')
}

contextBridge.exposeInMainWorld('api', api)
