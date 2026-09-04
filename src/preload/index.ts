import { contextBridge, ipcRenderer } from 'electron'

import { AI_CHAT_IPC_CHANNELS } from '../shared/contracts/ai-chat'
import { BOARD_IPC_CHANNELS, type BoardDocument, type BoardNode } from '../shared/contracts/boards'
import { CALENDAR_IPC_CHANNELS } from '../shared/contracts/calendar'
import { DIARY_IPC_CHANNELS } from '../shared/contracts/diary'
import { FINANCE_IPC_CHANNELS } from '../shared/contracts/finance'
import { HABITS_IPC_CHANNELS } from '../shared/contracts/habits'
import { MOVIES_IPC_CHANNELS } from '../shared/contracts/movies'
import { MUSIC_IPC_CHANNELS } from '../shared/contracts/music'
import {
  NOTES_IPC_CHANNELS,
  type NoteGroup,
  type NoteLocalAsset,
  type NoteRecord,
  type NoteSummary,
  type NotesOverview
} from '../shared/contracts/notes'
import { NUTRITION_IPC_CHANNELS } from '../shared/contracts/nutrition'
import { PASSWORDS_IPC_CHANNELS } from '../shared/contracts/passwords'
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
  STUDY_PDF_IPC_CHANNELS,
  type ExportStudyMaterialPdfResult
} from '../shared/contracts/study-pdf'
import {
  IPC_CHANNELS,
  type MyMindApi,
  type SystemHealth,
  type SystemWindowState
} from '../shared/contracts/system'
import { TASKS_IPC_CHANNELS } from '../shared/contracts/tasks'
import { WORKOUTS_IPC_CHANNELS } from '../shared/contracts/workouts'
import { toFriendlyIpcError } from './friendly-ipc-error'
import { parseShutdownRequest } from './shutdown-request'

const rawInvoke = ipcRenderer.invoke.bind(ipcRenderer)
const invoke: typeof ipcRenderer.invoke = async (channel, ...args) => {
  try {
    return await rawInvoke(channel, ...args)
  } catch (reason: unknown) {
    throw toFriendlyIpcError(reason)
  }
}

const api: MyMindApi = {
  aiChat: {
    setOpen: (input) => invoke(AI_CHAT_IPC_CHANNELS.setOpen, input),
    setBounds: (bounds) => invoke(AI_CHAT_IPC_CHANNELS.setBounds, bounds),
    reload: () => invoke(AI_CHAT_IPC_CHANNELS.reload)
  },

  system: {
    getHealth: () => invoke(IPC_CHANNELS.systemHealth) as Promise<SystemHealth>,
    getWindowState: () => invoke(IPC_CHANNELS.windowGetState) as Promise<SystemWindowState>,
    onWindowStateChanged: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, state: SystemWindowState): void => {
        listener(state)
      }
      ipcRenderer.on(IPC_CHANNELS.windowStateChanged, handler)
      return () => {
        ipcRenderer.removeListener(IPC_CHANNELS.windowStateChanged, handler)
      }
    },
    minimizeWindow: () => invoke(IPC_CHANNELS.windowMinimize) as Promise<void>,
    toggleMaximizeWindow: () =>
      invoke(IPC_CHANNELS.windowToggleMaximize) as Promise<SystemWindowState>,
    closeWindow: () => invoke(IPC_CHANNELS.windowClose) as Promise<void>,
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
      invoke(IPC_CHANNELS.respondToShutdown, response) as Promise<void>
  },

  preferences: {
    getAppearance: () =>
      invoke(PREFERENCES_IPC_CHANNELS.getAppearance) as Promise<AppearancePreferences>,
    updateAppearance: (input) =>
      invoke(PREFERENCES_IPC_CHANNELS.updateAppearance, input) as Promise<AppearancePreferences>
  },

  boards: {
    listNodes: () => invoke(BOARD_IPC_CHANNELS.listNodes) as Promise<BoardNode[]>,
    createNode: (input) => invoke(BOARD_IPC_CHANNELS.createNode, input) as Promise<BoardNode>,
    renameNode: (input) => invoke(BOARD_IPC_CHANNELS.renameNode, input) as Promise<BoardNode>,
    updateFolderIcon: (input) =>
      invoke(BOARD_IPC_CHANNELS.updateFolderIcon, input) as Promise<BoardNode>,
    deleteNode: (nodeId) => invoke(BOARD_IPC_CHANNELS.deleteNode, nodeId) as Promise<boolean>,
    updateExpansion: (input) =>
      invoke(BOARD_IPC_CHANNELS.updateExpansion, input) as Promise<BoardNode>,
    moveNode: (input) => invoke(BOARD_IPC_CHANNELS.moveNode, input) as Promise<BoardNode[]>,
    getDocument: (nodeId) =>
      invoke(BOARD_IPC_CHANNELS.getDocument, nodeId) as Promise<BoardDocument>,
    saveDocument: (input) =>
      invoke(BOARD_IPC_CHANNELS.saveDocument, input) as Promise<BoardDocument>,
    ensureStudyBoard: (input) =>
      invoke(BOARD_IPC_CHANNELS.ensureStudyBoard, input) as Promise<BoardNode>,
    ensureNoteBoard: (input) =>
      invoke(BOARD_IPC_CHANNELS.ensureNoteBoard, input) as Promise<BoardNode>
  },

  study: {
    listNodes: () => invoke(STUDY_IPC_CHANNELS.listNodes) as Promise<StudyNode[]>,
    createNode: (input) => invoke(STUDY_IPC_CHANNELS.createNode, input) as Promise<StudyNode>,
    renameNode: (input) => invoke(STUDY_IPC_CHANNELS.renameNode, input) as Promise<StudyNode>,
    duplicateNode: (input) =>
      invoke(STUDY_IPC_CHANNELS.duplicateNode, input) as Promise<DuplicateStudyNodeResult>,
    updateFolderIcon: (input) =>
      invoke(STUDY_IPC_CHANNELS.updateFolderIcon, input) as Promise<StudyNode>,
    deleteNode: (nodeId) => invoke(STUDY_IPC_CHANNELS.deleteNode, nodeId) as Promise<boolean>,
    updateExpansion: (input) =>
      invoke(STUDY_IPC_CHANNELS.updateExpansion, input) as Promise<StudyNode>,
    moveNode: (input) => invoke(STUDY_IPC_CHANNELS.moveNode, input) as Promise<StudyNode[]>,
    getMaterial: (nodeId) =>
      invoke(STUDY_IPC_CHANNELS.getMaterial, nodeId) as Promise<StudyMaterial>,
    saveMaterial: (input) =>
      invoke(STUDY_IPC_CHANNELS.saveMaterial, input) as Promise<StudyMaterial>,
    getCodeSnapshot: (input) => invoke(STUDY_IPC_CHANNELS.getCodeSnapshot, input),
    previewCode: (input) => invoke(STUDY_IPC_CHANNELS.previewCode, input),
    applyCode: (input) => invoke(STUDY_IPC_CHANNELS.applyCode, input),
    searchInternalLinkTargets: (input) =>
      invoke(STUDY_IPC_CHANNELS.searchInternalLinkTargets, input) as Promise<
        StudyInternalLinkTarget[]
      >,
    resolveInternalLinkTarget: (input) =>
      invoke(
        STUDY_IPC_CHANNELS.resolveInternalLinkTarget,
        input
      ) as Promise<StudyInternalLinkTarget | null>,
    importAsset: (input) =>
      invoke(STUDY_IPC_CHANNELS.importAsset, input) as Promise<StudyLocalAsset | null>,
    openAsset: (input) => invoke(STUDY_IPC_CHANNELS.openAsset, input) as Promise<void>,
    exportMaterial: (input) =>
      invoke(STUDY_PDF_IPC_CHANNELS.exportMaterial, input) as Promise<ExportStudyMaterialPdfResult>
  },

  notes: {
    listOverview: () => invoke(NOTES_IPC_CHANNELS.listOverview) as Promise<NotesOverview>,
    createGroup: (input) => invoke(NOTES_IPC_CHANNELS.createGroup, input) as Promise<NoteGroup>,
    renameGroup: (input) => invoke(NOTES_IPC_CHANNELS.renameGroup, input) as Promise<NoteGroup>,
    updateGroupIcon: (input) =>
      invoke(NOTES_IPC_CHANNELS.updateGroupIcon, input) as Promise<NoteGroup>,
    deleteGroup: (groupId) => invoke(NOTES_IPC_CHANNELS.deleteGroup, groupId) as Promise<boolean>,
    createNote: (input) => invoke(NOTES_IPC_CHANNELS.createNote, input) as Promise<NoteRecord>,
    renameNote: (input) => invoke(NOTES_IPC_CHANNELS.renameNote, input) as Promise<NoteSummary>,
    moveNote: (input) => invoke(NOTES_IPC_CHANNELS.moveNote, input) as Promise<NoteSummary>,
    deleteNote: (noteId) => invoke(NOTES_IPC_CHANNELS.deleteNote, noteId) as Promise<boolean>,
    getNote: (noteId) => invoke(NOTES_IPC_CHANNELS.getNote, noteId) as Promise<NoteRecord>,
    saveNote: (input) => invoke(NOTES_IPC_CHANNELS.saveNote, input) as Promise<NoteRecord>,
    importAsset: (input) =>
      invoke(NOTES_IPC_CHANNELS.importAsset, input) as Promise<NoteLocalAsset | null>,
    saveVoiceRecording: (input) =>
      invoke(NOTES_IPC_CHANNELS.saveVoiceRecording, input) as Promise<NoteLocalAsset>,
    openAsset: (input) => invoke(NOTES_IPC_CHANNELS.openAsset, input) as Promise<void>
  },

  calendar: {
    listRange: (input) => invoke(CALENDAR_IPC_CHANNELS.listRange, input),
    listUpcomingReminders: (input) => invoke(CALENDAR_IPC_CHANNELS.listUpcomingReminders, input),
    listUnreadReminders: () => invoke(CALENDAR_IPC_CHANNELS.listUnreadReminders),
    acknowledgeReminder: (input) => invoke(CALENDAR_IPC_CHANNELS.acknowledgeReminder, input),
    onRemindersChanged: (listener) => {
      const handler = (): void => listener()
      ipcRenderer.on(CALENDAR_IPC_CHANNELS.remindersChanged, handler)
      return () => ipcRenderer.removeListener(CALENDAR_IPC_CHANNELS.remindersChanged, handler)
    },
    createEvent: (input) => invoke(CALENDAR_IPC_CHANNELS.createEvent, input),
    updateEvent: (input) => invoke(CALENDAR_IPC_CHANNELS.updateEvent, input),
    deleteEvent: (input) => invoke(CALENDAR_IPC_CHANNELS.deleteEvent, input),
    setOccurrenceNote: (input) => invoke(CALENDAR_IPC_CHANNELS.setOccurrenceNote, input),
    setOccurrenceHidden: (input) => invoke(CALENDAR_IPC_CHANNELS.setOccurrenceHidden, input)
  },

  diary: {
    listOverview: () => invoke(DIARY_IPC_CHANNELS.listOverview),
    createDiary: (input) => invoke(DIARY_IPC_CHANNELS.createDiary, input),
    updateDiary: (input) => invoke(DIARY_IPC_CHANNELS.updateDiary, input),
    updateAppearance: (input) => invoke(DIARY_IPC_CHANNELS.updateAppearance, input),
    deleteDiary: (input) => invoke(DIARY_IPC_CHANNELS.deleteDiary, input),
    getDay: (input) => invoke(DIARY_IPC_CHANNELS.getDay, input),
    listDays: (input) => invoke(DIARY_IPC_CHANNELS.listDays, input),
    setMood: (input) => invoke(DIARY_IPC_CHANNELS.setMood, input),
    createEntry: (input) => invoke(DIARY_IPC_CHANNELS.createEntry, input),
    updateEntry: (input) => invoke(DIARY_IPC_CHANNELS.updateEntry, input),
    deleteEntry: (input) => invoke(DIARY_IPC_CHANNELS.deleteEntry, input),
    getReport: (input) => invoke(DIARY_IPC_CHANNELS.getReport, input)
  },

  movies: {
    listOverview: () => invoke(MOVIES_IPC_CHANNELS.listOverview),
    getMovie: (input) => invoke(MOVIES_IPC_CHANNELS.getMovie, input),
    createMovie: (input) => invoke(MOVIES_IPC_CHANNELS.createMovie, input),
    createMovies: (input) => invoke(MOVIES_IPC_CHANNELS.createMovies, input),
    updateMovie: (input) => invoke(MOVIES_IPC_CHANNELS.updateMovie, input),
    deleteMovie: (input) => invoke(MOVIES_IPC_CHANNELS.deleteMovie, input),
    searchWeb: (input) => invoke(MOVIES_IPC_CHANNELS.searchWeb, input)
  },

  music: {
    listOverview: () => invoke(MUSIC_IPC_CHANNELS.listOverview),
    getItem: (input) => invoke(MUSIC_IPC_CHANNELS.getItem, input),
    createItem: (input) => invoke(MUSIC_IPC_CHANNELS.createItem, input),
    createItems: (input) => invoke(MUSIC_IPC_CHANNELS.createItems, input),
    updateItem: (input) => invoke(MUSIC_IPC_CHANNELS.updateItem, input),
    deleteItem: (input) => invoke(MUSIC_IPC_CHANNELS.deleteItem, input),
    createPlaylist: (input) => invoke(MUSIC_IPC_CHANNELS.createPlaylist, input),
    updatePlaylist: (input) => invoke(MUSIC_IPC_CHANNELS.updatePlaylist, input),
    deletePlaylist: (input) => invoke(MUSIC_IPC_CHANNELS.deletePlaylist, input),
    setItemPlaylists: (input) => invoke(MUSIC_IPC_CHANNELS.setItemPlaylists, input),
    searchWeb: (input) => invoke(MUSIC_IPC_CHANNELS.searchWeb, input)
  },

  tasks: {
    listOverview: () => invoke(TASKS_IPC_CHANNELS.listOverview),
    createGroup: (input) => invoke(TASKS_IPC_CHANNELS.createGroup, input),
    updateGroup: (input) => invoke(TASKS_IPC_CHANNELS.updateGroup, input),
    deleteGroup: (input) => invoke(TASKS_IPC_CHANNELS.deleteGroup, input),
    createTask: (input) => invoke(TASKS_IPC_CHANNELS.createTask, input),
    updateTask: (input) => invoke(TASKS_IPC_CHANNELS.updateTask, input),
    deleteTask: (input) => invoke(TASKS_IPC_CHANNELS.deleteTask, input)
  },

  habits: {
    listOverview: (input) => invoke(HABITS_IPC_CHANNELS.listOverview, input),
    listUnreadReminders: () => invoke(HABITS_IPC_CHANNELS.listUnreadReminders),
    acknowledgeReminder: (input) => invoke(HABITS_IPC_CHANNELS.acknowledgeReminder, input),
    onRemindersChanged: (listener) => {
      const handler = (): void => listener()
      ipcRenderer.on(HABITS_IPC_CHANNELS.remindersChanged, handler)
      return () => ipcRenderer.removeListener(HABITS_IPC_CHANNELS.remindersChanged, handler)
    },
    createGroup: (input) => invoke(HABITS_IPC_CHANNELS.createGroup, input),
    updateGroup: (input) => invoke(HABITS_IPC_CHANNELS.updateGroup, input),
    deleteGroup: (input) => invoke(HABITS_IPC_CHANNELS.deleteGroup, input),
    createHabit: (input) => invoke(HABITS_IPC_CHANNELS.createHabit, input),
    updateHabit: (input) => invoke(HABITS_IPC_CHANNELS.updateHabit, input),
    deleteHabit: (input) => invoke(HABITS_IPC_CHANNELS.deleteHabit, input),
    upsertEntry: (input) => invoke(HABITS_IPC_CHANNELS.upsertEntry, input),
    deleteEntry: (input) => invoke(HABITS_IPC_CHANNELS.deleteEntry, input),
    getReport: (input) => invoke(HABITS_IPC_CHANNELS.getReport, input)
  },

  passwords: {
    getVaultStatus: () => invoke(PASSWORDS_IPC_CHANNELS.getVaultStatus),
    setupVault: (input) => invoke(PASSWORDS_IPC_CHANNELS.setupVault, input),
    unlockVault: (input) => invoke(PASSWORDS_IPC_CHANNELS.unlockVault, input),
    lockVault: () => invoke(PASSWORDS_IPC_CHANNELS.lockVault),
    changeMasterPassword: (input) => invoke(PASSWORDS_IPC_CHANNELS.changeMasterPassword, input),
    listOverview: () => invoke(PASSWORDS_IPC_CHANNELS.listOverview),
    getItem: (input) => invoke(PASSWORDS_IPC_CHANNELS.getItem, input),
    createGroup: (input) => invoke(PASSWORDS_IPC_CHANNELS.createGroup, input),
    updateGroup: (input) => invoke(PASSWORDS_IPC_CHANNELS.updateGroup, input),
    deleteGroup: (input) => invoke(PASSWORDS_IPC_CHANNELS.deleteGroup, input),
    createItem: (input) => invoke(PASSWORDS_IPC_CHANNELS.createItem, input),
    updateItem: (input) => invoke(PASSWORDS_IPC_CHANNELS.updateItem, input),
    deleteItem: (input) => invoke(PASSWORDS_IPC_CHANNELS.deleteItem, input),
    generatePassword: (input) => invoke(PASSWORDS_IPC_CHANNELS.generatePassword, input),
    copyItemField: (input) => invoke(PASSWORDS_IPC_CHANNELS.copyItemField, input),
    openWebsite: (input) => invoke(PASSWORDS_IPC_CHANNELS.openWebsite, input)
  },

  workouts: {
    listOverview: () => invoke(WORKOUTS_IPC_CHANNELS.listOverview),
    createExercise: (input) => invoke(WORKOUTS_IPC_CHANNELS.createExercise, input),
    updateExercise: (input) => invoke(WORKOUTS_IPC_CHANNELS.updateExercise, input),
    deleteExercise: (input) => invoke(WORKOUTS_IPC_CHANNELS.deleteExercise, input),
    createProgram: (input) => invoke(WORKOUTS_IPC_CHANNELS.createProgram, input),
    updateProgram: (input) => invoke(WORKOUTS_IPC_CHANNELS.updateProgram, input),
    deleteProgram: (input) => invoke(WORKOUTS_IPC_CHANNELS.deleteProgram, input),
    createSession: (input) => invoke(WORKOUTS_IPC_CHANNELS.createSession, input),
    updateSession: (input) => invoke(WORKOUTS_IPC_CHANNELS.updateSession, input),
    deleteSession: (input) => invoke(WORKOUTS_IPC_CHANNELS.deleteSession, input),
    getSession: (input) => invoke(WORKOUTS_IPC_CHANNELS.getSession, input),
    createProgressEntry: (input) => invoke(WORKOUTS_IPC_CHANNELS.createProgressEntry, input),
    updateProgressEntry: (input) => invoke(WORKOUTS_IPC_CHANNELS.updateProgressEntry, input),
    deleteProgressEntry: (input) => invoke(WORKOUTS_IPC_CHANNELS.deleteProgressEntry, input),
    importProgressPhoto: (input) => invoke(WORKOUTS_IPC_CHANNELS.importProgressPhoto, input),
    deleteProgressPhoto: (input) => invoke(WORKOUTS_IPC_CHANNELS.deleteProgressPhoto, input),
    getReport: (input) => invoke(WORKOUTS_IPC_CHANNELS.getReport, input)
  },

  nutrition: {
    listOverview: (input) => invoke(NUTRITION_IPC_CHANNELS.listOverview, input),
    createFood: (input) => invoke(NUTRITION_IPC_CHANNELS.createFood, input),
    createFoods: (input) => invoke(NUTRITION_IPC_CHANNELS.createFoods, input),
    updateFood: (input) => invoke(NUTRITION_IPC_CHANNELS.updateFood, input),
    deleteFood: (input) => invoke(NUTRITION_IPC_CHANNELS.deleteFood, input),
    createRecipe: (input) => invoke(NUTRITION_IPC_CHANNELS.createRecipe, input),
    updateRecipe: (input) => invoke(NUTRITION_IPC_CHANNELS.updateRecipe, input),
    deleteRecipe: (input) => invoke(NUTRITION_IPC_CHANNELS.deleteRecipe, input),
    createLogEntry: (input) => invoke(NUTRITION_IPC_CHANNELS.createLogEntry, input),
    importMeals: (input) => invoke(NUTRITION_IPC_CHANNELS.importMeals, input),
    updateLogEntry: (input) => invoke(NUTRITION_IPC_CHANNELS.updateLogEntry, input),
    deleteLogEntry: (input) => invoke(NUTRITION_IPC_CHANNELS.deleteLogEntry, input),
    setWater: (input) => invoke(NUTRITION_IPC_CHANNELS.setWater, input),
    setTargets: (input) => invoke(NUTRITION_IPC_CHANNELS.setTargets, input),
    getReport: (input) => invoke(NUTRITION_IPC_CHANNELS.getReport, input)
  },

  finance: {
    getSettings: () => invoke(FINANCE_IPC_CHANNELS.getSettings),
    setBaseCurrency: (input) => invoke(FINANCE_IPC_CHANNELS.setBaseCurrency, input),
    listExchangeRates: () => invoke(FINANCE_IPC_CHANNELS.listExchangeRates),
    upsertExchangeRate: (input) => invoke(FINANCE_IPC_CHANNELS.upsertExchangeRate, input),
    deleteExchangeRate: (input) => invoke(FINANCE_IPC_CHANNELS.deleteExchangeRate, input),
    listAccounts: (period) => invoke(FINANCE_IPC_CHANNELS.listAccounts, period),
    getAccount: (id, period) => invoke(FINANCE_IPC_CHANNELS.getAccount, id, period),
    createAccount: (input) => invoke(FINANCE_IPC_CHANNELS.createAccount, input),
    updateAccount: (input) => invoke(FINANCE_IPC_CHANNELS.updateAccount, input),
    deleteAccount: (input) => invoke(FINANCE_IPC_CHANNELS.deleteAccount, input),
    clearAccountHistory: (input) => invoke(FINANCE_IPC_CHANNELS.clearAccountHistory, input),
    listTransactions: (filters) => invoke(FINANCE_IPC_CHANNELS.listTransactions, filters),
    getTransaction: (id) => invoke(FINANCE_IPC_CHANNELS.getTransaction, id),
    createTransaction: (input) => invoke(FINANCE_IPC_CHANNELS.createTransaction, input),
    updateTransaction: (input) => invoke(FINANCE_IPC_CHANNELS.updateTransaction, input),
    deleteTransaction: (input) => invoke(FINANCE_IPC_CHANNELS.deleteTransaction, input),
    listTags: () => invoke(FINANCE_IPC_CHANNELS.listTags),
    getTag: (id) => invoke(FINANCE_IPC_CHANNELS.getTag, id),
    createTag: (input) => invoke(FINANCE_IPC_CHANNELS.createTag, input),
    updateTag: (input) => invoke(FINANCE_IPC_CHANNELS.updateTag, input),
    deleteTag: (input) => invoke(FINANCE_IPC_CHANNELS.deleteTag, input),
    listLimits: (at) => invoke(FINANCE_IPC_CHANNELS.listLimits, at),
    createLimit: (input) => invoke(FINANCE_IPC_CHANNELS.createLimit, input),
    updateLimit: (input) => invoke(FINANCE_IPC_CHANNELS.updateLimit, input),
    setLimitState: (input) => invoke(FINANCE_IPC_CHANNELS.setLimitState, input),
    deleteLimit: (input) => invoke(FINANCE_IPC_CHANNELS.deleteLimit, input),
    previewExpenseImpact: (input) => invoke(FINANCE_IPC_CHANNELS.previewExpenseImpact, input),
    listTemplates: () => invoke(FINANCE_IPC_CHANNELS.listTemplates),
    createTemplate: (input) => invoke(FINANCE_IPC_CHANNELS.createTemplate, input),
    updateTemplate: (input) => invoke(FINANCE_IPC_CHANNELS.updateTemplate, input),
    deleteTemplate: (input) => invoke(FINANCE_IPC_CHANNELS.deleteTemplate, input),
    getDashboard: (period) => invoke(FINANCE_IPC_CHANNELS.getDashboard, period),
    getReport: (filters) => invoke(FINANCE_IPC_CHANNELS.getReport, filters)
  }
}

if (!process.contextIsolated) {
  throw new Error('Context isolation must be enabled')
}

contextBridge.exposeInMainWorld('api', api)
