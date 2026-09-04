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
  type OperationFeedback,
  type SystemHealth,
  type SystemWindowState
} from '../shared/contracts/system'
import { TASKS_IPC_CHANNELS } from '../shared/contracts/tasks'
import { WORKOUTS_IPC_CHANNELS } from '../shared/contracts/workouts'
import { toFriendlyIpcError } from './friendly-ipc-error'
import { parseShutdownRequest } from './shutdown-request'

const operationFeedbackListeners = new Set<(feedback: OperationFeedback) => void>()
const silentErrorChannels = new Set<string>([
  AI_CHAT_IPC_CHANNELS.setBounds,
  CALENDAR_IPC_CHANNELS.listUnreadReminders,
  HABITS_IPC_CHANNELS.listUnreadReminders
])

function emitOperationFeedback(feedback: OperationFeedback): void {
  for (const listener of operationFeedbackListeners) {
    try {
      listener(feedback)
    } catch (reason: unknown) {
      console.error('Operation feedback listener failed', reason)
    }
  }
}

type IpcInvokeArgs =
  Parameters<typeof ipcRenderer.invoke> extends [string, ...infer Args] ? Args : never

const rawInvoke = ipcRenderer.invoke.bind(ipcRenderer)
const invoke: typeof ipcRenderer.invoke = async (channel, ...args) => {
  try {
    return await rawInvoke(channel, ...args)
  } catch (reason: unknown) {
    const friendlyError = toFriendlyIpcError(reason)
    if (!silentErrorChannels.has(channel)) {
      emitOperationFeedback({ kind: 'error', message: friendlyError.message, key: channel })
    }
    throw friendlyError
  }
}

const invokeWithSuccess = (
  channel: string,
  message: string,
  ...args: IpcInvokeArgs
): ReturnType<typeof ipcRenderer.invoke> =>
  invoke(channel, ...args).then((result) => {
    emitOperationFeedback({ kind: 'success', message, key: channel })
    return result
  })

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
    onOperationFeedback: (listener) => {
      operationFeedbackListeners.add(listener)
      return () => {
        operationFeedbackListeners.delete(listener)
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
    createNode: (input) =>
      invokeWithSuccess(
        BOARD_IPC_CHANNELS.createNode,
        'Элемент создан',
        input
      ) as Promise<BoardNode>,
    renameNode: (input) =>
      invokeWithSuccess(
        BOARD_IPC_CHANNELS.renameNode,
        'Название обновлено',
        input
      ) as Promise<BoardNode>,
    updateFolderIcon: (input) =>
      invokeWithSuccess(
        BOARD_IPC_CHANNELS.updateFolderIcon,
        'Иконка папки обновлена',
        input
      ) as Promise<BoardNode>,
    deleteNode: (nodeId) =>
      invokeWithSuccess(
        BOARD_IPC_CHANNELS.deleteNode,
        'Элемент удалён',
        nodeId
      ) as Promise<boolean>,
    updateExpansion: (input) =>
      invoke(BOARD_IPC_CHANNELS.updateExpansion, input) as Promise<BoardNode>,
    moveNode: (input) =>
      invokeWithSuccess(BOARD_IPC_CHANNELS.moveNode, 'Элемент перемещён', input) as Promise<
        BoardNode[]
      >,
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
    createNode: (input) =>
      invokeWithSuccess(
        STUDY_IPC_CHANNELS.createNode,
        'Элемент обучения создан',
        input
      ) as Promise<StudyNode>,
    renameNode: (input) =>
      invokeWithSuccess(
        STUDY_IPC_CHANNELS.renameNode,
        'Название обновлено',
        input
      ) as Promise<StudyNode>,
    duplicateNode: (input) =>
      invokeWithSuccess(
        STUDY_IPC_CHANNELS.duplicateNode,
        'Копия создана',
        input
      ) as Promise<DuplicateStudyNodeResult>,
    updateFolderIcon: (input) =>
      invokeWithSuccess(
        STUDY_IPC_CHANNELS.updateFolderIcon,
        'Иконка папки обновлена',
        input
      ) as Promise<StudyNode>,
    deleteNode: (nodeId) =>
      invokeWithSuccess(
        STUDY_IPC_CHANNELS.deleteNode,
        'Элемент удалён',
        nodeId
      ) as Promise<boolean>,
    updateExpansion: (input) =>
      invoke(STUDY_IPC_CHANNELS.updateExpansion, input) as Promise<StudyNode>,
    moveNode: (input) =>
      invokeWithSuccess(STUDY_IPC_CHANNELS.moveNode, 'Элемент перемещён', input) as Promise<
        StudyNode[]
      >,
    getMaterial: (nodeId) =>
      invoke(STUDY_IPC_CHANNELS.getMaterial, nodeId) as Promise<StudyMaterial>,
    saveMaterial: (input) =>
      invoke(STUDY_IPC_CHANNELS.saveMaterial, input) as Promise<StudyMaterial>,
    getCodeSnapshot: (input) => invoke(STUDY_IPC_CHANNELS.getCodeSnapshot, input),
    previewCode: (input) => invoke(STUDY_IPC_CHANNELS.previewCode, input),
    applyCode: (input) =>
      invokeWithSuccess(STUDY_IPC_CHANNELS.applyCode, 'Изменения структуры применены', input),
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
      invokeWithSuccess(
        STUDY_PDF_IPC_CHANNELS.exportMaterial,
        'PDF сохранён',
        input
      ) as Promise<ExportStudyMaterialPdfResult>
  },

  notes: {
    listOverview: () => invoke(NOTES_IPC_CHANNELS.listOverview) as Promise<NotesOverview>,
    createGroup: (input) =>
      invokeWithSuccess(
        NOTES_IPC_CHANNELS.createGroup,
        'Группа заметок создана',
        input
      ) as Promise<NoteGroup>,
    renameGroup: (input) =>
      invokeWithSuccess(
        NOTES_IPC_CHANNELS.renameGroup,
        'Группа переименована',
        input
      ) as Promise<NoteGroup>,
    updateGroupIcon: (input) =>
      invokeWithSuccess(
        NOTES_IPC_CHANNELS.updateGroupIcon,
        'Иконка группы обновлена',
        input
      ) as Promise<NoteGroup>,
    deleteGroup: (groupId) =>
      invokeWithSuccess(
        NOTES_IPC_CHANNELS.deleteGroup,
        'Группа удалена',
        groupId
      ) as Promise<boolean>,
    createNote: (input) =>
      invokeWithSuccess(
        NOTES_IPC_CHANNELS.createNote,
        'Заметка создана',
        input
      ) as Promise<NoteRecord>,
    renameNote: (input) =>
      invokeWithSuccess(
        NOTES_IPC_CHANNELS.renameNote,
        'Заметка переименована',
        input
      ) as Promise<NoteSummary>,
    moveNote: (input) =>
      invokeWithSuccess(
        NOTES_IPC_CHANNELS.moveNote,
        'Заметка перемещена',
        input
      ) as Promise<NoteSummary>,
    deleteNote: (noteId) =>
      invokeWithSuccess(
        NOTES_IPC_CHANNELS.deleteNote,
        'Заметка удалена',
        noteId
      ) as Promise<boolean>,
    getNote: (noteId) => invoke(NOTES_IPC_CHANNELS.getNote, noteId) as Promise<NoteRecord>,
    saveNote: (input) => invoke(NOTES_IPC_CHANNELS.saveNote, input) as Promise<NoteRecord>,
    importAsset: (input) =>
      invoke(NOTES_IPC_CHANNELS.importAsset, input) as Promise<NoteLocalAsset | null>,
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
    createEvent: (input) =>
      invokeWithSuccess(CALENDAR_IPC_CHANNELS.createEvent, 'Событие создано', input),
    updateEvent: (input) =>
      invokeWithSuccess(CALENDAR_IPC_CHANNELS.updateEvent, 'Событие сохранено', input),
    deleteEvent: (input) =>
      invokeWithSuccess(CALENDAR_IPC_CHANNELS.deleteEvent, 'Событие удалено', input),
    setOccurrenceNote: (input) => invoke(CALENDAR_IPC_CHANNELS.setOccurrenceNote, input),
    setOccurrenceHidden: (input) => invoke(CALENDAR_IPC_CHANNELS.setOccurrenceHidden, input)
  },

  diary: {
    listOverview: () => invoke(DIARY_IPC_CHANNELS.listOverview),
    createDiary: (input) =>
      invokeWithSuccess(DIARY_IPC_CHANNELS.createDiary, 'Дневник создан', input),
    updateDiary: (input) =>
      invokeWithSuccess(DIARY_IPC_CHANNELS.updateDiary, 'Дневник сохранён', input),
    updateAppearance: (input) => invoke(DIARY_IPC_CHANNELS.updateAppearance, input),
    deleteDiary: (input) =>
      invokeWithSuccess(DIARY_IPC_CHANNELS.deleteDiary, 'Дневник удалён', input),
    getDay: (input) => invoke(DIARY_IPC_CHANNELS.getDay, input),
    listDays: (input) => invoke(DIARY_IPC_CHANNELS.listDays, input),
    setMood: (input) => invoke(DIARY_IPC_CHANNELS.setMood, input),
    createEntry: (input) =>
      invokeWithSuccess(DIARY_IPC_CHANNELS.createEntry, 'Запись добавлена', input),
    updateEntry: (input) =>
      invokeWithSuccess(DIARY_IPC_CHANNELS.updateEntry, 'Запись сохранена', input),
    deleteEntry: (input) =>
      invokeWithSuccess(DIARY_IPC_CHANNELS.deleteEntry, 'Запись удалена', input),
    getReport: (input) => invoke(DIARY_IPC_CHANNELS.getReport, input)
  },

  movies: {
    listOverview: () => invoke(MOVIES_IPC_CHANNELS.listOverview),
    getMovie: (input) => invoke(MOVIES_IPC_CHANNELS.getMovie, input),
    createMovie: (input) =>
      invokeWithSuccess(MOVIES_IPC_CHANNELS.createMovie, 'Фильм добавлен', input),
    createMovies: (input) =>
      invokeWithSuccess(MOVIES_IPC_CHANNELS.createMovies, 'Фильмы добавлены', input),
    updateMovie: (input) =>
      invokeWithSuccess(MOVIES_IPC_CHANNELS.updateMovie, 'Изменения фильма сохранены', input),
    deleteMovie: (input) =>
      invokeWithSuccess(MOVIES_IPC_CHANNELS.deleteMovie, 'Фильм удалён', input),
    searchWeb: (input) => invoke(MOVIES_IPC_CHANNELS.searchWeb, input)
  },

  music: {
    listOverview: () => invoke(MUSIC_IPC_CHANNELS.listOverview),
    getItem: (input) => invoke(MUSIC_IPC_CHANNELS.getItem, input),
    createItem: (input) => invokeWithSuccess(MUSIC_IPC_CHANNELS.createItem, 'Трек добавлен', input),
    createItems: (input) =>
      invokeWithSuccess(MUSIC_IPC_CHANNELS.createItems, 'Треки добавлены', input),
    updateItem: (input) =>
      invokeWithSuccess(MUSIC_IPC_CHANNELS.updateItem, 'Изменения трека сохранены', input),
    deleteItem: (input) => invokeWithSuccess(MUSIC_IPC_CHANNELS.deleteItem, 'Трек удалён', input),
    createPlaylist: (input) =>
      invokeWithSuccess(MUSIC_IPC_CHANNELS.createPlaylist, 'Плейлист создан', input),
    updatePlaylist: (input) =>
      invokeWithSuccess(MUSIC_IPC_CHANNELS.updatePlaylist, 'Плейлист сохранён', input),
    deletePlaylist: (input) =>
      invokeWithSuccess(MUSIC_IPC_CHANNELS.deletePlaylist, 'Плейлист удалён', input),
    setItemPlaylists: (input) => invoke(MUSIC_IPC_CHANNELS.setItemPlaylists, input),
    searchWeb: (input) => invoke(MUSIC_IPC_CHANNELS.searchWeb, input)
  },

  tasks: {
    listOverview: () => invoke(TASKS_IPC_CHANNELS.listOverview),
    createGroup: (input) =>
      invokeWithSuccess(TASKS_IPC_CHANNELS.createGroup, 'Группа задач создана', input),
    updateGroup: (input) =>
      invokeWithSuccess(TASKS_IPC_CHANNELS.updateGroup, 'Группа задач сохранена', input),
    deleteGroup: (input) =>
      invokeWithSuccess(TASKS_IPC_CHANNELS.deleteGroup, 'Группа задач удалена', input),
    createTask: (input) =>
      invokeWithSuccess(TASKS_IPC_CHANNELS.createTask, 'Задача создана', input),
    updateTask: (input) =>
      invokeWithSuccess(TASKS_IPC_CHANNELS.updateTask, 'Задача обновлена', input),
    deleteTask: (input) => invokeWithSuccess(TASKS_IPC_CHANNELS.deleteTask, 'Задача удалена', input)
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
    createGroup: (input) =>
      invokeWithSuccess(HABITS_IPC_CHANNELS.createGroup, 'Группа привычек создана', input),
    updateGroup: (input) =>
      invokeWithSuccess(HABITS_IPC_CHANNELS.updateGroup, 'Группа привычек сохранена', input),
    deleteGroup: (input) =>
      invokeWithSuccess(HABITS_IPC_CHANNELS.deleteGroup, 'Группа привычек удалена', input),
    createHabit: (input) =>
      invokeWithSuccess(HABITS_IPC_CHANNELS.createHabit, 'Привычка создана', input),
    updateHabit: (input) =>
      invokeWithSuccess(HABITS_IPC_CHANNELS.updateHabit, 'Привычка сохранена', input),
    deleteHabit: (input) =>
      invokeWithSuccess(HABITS_IPC_CHANNELS.deleteHabit, 'Привычка удалена', input),
    upsertEntry: (input) => invoke(HABITS_IPC_CHANNELS.upsertEntry, input),
    deleteEntry: (input) => invoke(HABITS_IPC_CHANNELS.deleteEntry, input),
    getReport: (input) => invoke(HABITS_IPC_CHANNELS.getReport, input)
  },

  passwords: {
    getVaultStatus: () => invoke(PASSWORDS_IPC_CHANNELS.getVaultStatus),
    setupVault: (input) =>
      invokeWithSuccess(PASSWORDS_IPC_CHANNELS.setupVault, 'Хранилище паролей создано', input),
    unlockVault: (input) => invoke(PASSWORDS_IPC_CHANNELS.unlockVault, input),
    lockVault: () => invoke(PASSWORDS_IPC_CHANNELS.lockVault),
    changeMasterPassword: (input) =>
      invokeWithSuccess(
        PASSWORDS_IPC_CHANNELS.changeMasterPassword,
        'Мастер-пароль изменён',
        input
      ),
    listOverview: () => invoke(PASSWORDS_IPC_CHANNELS.listOverview),
    getItem: (input) => invoke(PASSWORDS_IPC_CHANNELS.getItem, input),
    createGroup: (input) =>
      invokeWithSuccess(PASSWORDS_IPC_CHANNELS.createGroup, 'Группа паролей создана', input),
    updateGroup: (input) =>
      invokeWithSuccess(PASSWORDS_IPC_CHANNELS.updateGroup, 'Группа паролей сохранена', input),
    deleteGroup: (input) =>
      invokeWithSuccess(PASSWORDS_IPC_CHANNELS.deleteGroup, 'Группа паролей удалена', input),
    createItem: (input) =>
      invokeWithSuccess(PASSWORDS_IPC_CHANNELS.createItem, 'Запись создана', input),
    updateItem: (input) =>
      invokeWithSuccess(PASSWORDS_IPC_CHANNELS.updateItem, 'Запись сохранена', input),
    deleteItem: (input) =>
      invokeWithSuccess(PASSWORDS_IPC_CHANNELS.deleteItem, 'Запись удалена', input),
    generatePassword: (input) => invoke(PASSWORDS_IPC_CHANNELS.generatePassword, input),
    copyItemField: (input) =>
      invokeWithSuccess(
        PASSWORDS_IPC_CHANNELS.copyItemField,
        input.field === 'password' ? 'Пароль скопирован' : 'Логин скопирован',
        input
      ),
    openWebsite: (input) => invoke(PASSWORDS_IPC_CHANNELS.openWebsite, input)
  },

  workouts: {
    listOverview: () => invoke(WORKOUTS_IPC_CHANNELS.listOverview),
    createExercise: (input) =>
      invokeWithSuccess(WORKOUTS_IPC_CHANNELS.createExercise, 'Упражнение создано', input),
    updateExercise: (input) =>
      invokeWithSuccess(WORKOUTS_IPC_CHANNELS.updateExercise, 'Упражнение сохранено', input),
    deleteExercise: (input) =>
      invokeWithSuccess(WORKOUTS_IPC_CHANNELS.deleteExercise, 'Упражнение удалено', input),
    createProgram: (input) =>
      invokeWithSuccess(WORKOUTS_IPC_CHANNELS.createProgram, 'Программа создана', input),
    updateProgram: (input) =>
      invokeWithSuccess(WORKOUTS_IPC_CHANNELS.updateProgram, 'Программа сохранена', input),
    deleteProgram: (input) =>
      invokeWithSuccess(WORKOUTS_IPC_CHANNELS.deleteProgram, 'Программа удалена', input),
    createSession: (input) =>
      invokeWithSuccess(WORKOUTS_IPC_CHANNELS.createSession, 'Тренировка создана', input),
    updateSession: (input) =>
      invokeWithSuccess(WORKOUTS_IPC_CHANNELS.updateSession, 'Тренировка сохранена', input),
    deleteSession: (input) =>
      invokeWithSuccess(WORKOUTS_IPC_CHANNELS.deleteSession, 'Тренировка удалена', input),
    getSession: (input) => invoke(WORKOUTS_IPC_CHANNELS.getSession, input),
    createProgressEntry: (input) =>
      invokeWithSuccess(WORKOUTS_IPC_CHANNELS.createProgressEntry, 'Прогресс добавлен', input),
    updateProgressEntry: (input) =>
      invokeWithSuccess(WORKOUTS_IPC_CHANNELS.updateProgressEntry, 'Прогресс сохранён', input),
    deleteProgressEntry: (input) =>
      invokeWithSuccess(
        WORKOUTS_IPC_CHANNELS.deleteProgressEntry,
        'Запись прогресса удалена',
        input
      ),
    importProgressPhoto: (input) =>
      invokeWithSuccess(
        WORKOUTS_IPC_CHANNELS.importProgressPhoto,
        'Фото прогресса добавлено',
        input
      ),
    deleteProgressPhoto: (input) =>
      invokeWithSuccess(WORKOUTS_IPC_CHANNELS.deleteProgressPhoto, 'Фото удалено', input),
    getReport: (input) => invoke(WORKOUTS_IPC_CHANNELS.getReport, input)
  },

  nutrition: {
    listOverview: (input) => invoke(NUTRITION_IPC_CHANNELS.listOverview, input),
    createFood: (input) =>
      invokeWithSuccess(NUTRITION_IPC_CHANNELS.createFood, 'Продукт добавлен', input),
    createFoods: (input) =>
      invokeWithSuccess(NUTRITION_IPC_CHANNELS.createFoods, 'Продукты добавлены', input),
    updateFood: (input) =>
      invokeWithSuccess(NUTRITION_IPC_CHANNELS.updateFood, 'Продукт сохранён', input),
    deleteFood: (input) =>
      invokeWithSuccess(NUTRITION_IPC_CHANNELS.deleteFood, 'Продукт удалён', input),
    createRecipe: (input) =>
      invokeWithSuccess(NUTRITION_IPC_CHANNELS.createRecipe, 'Рецепт создан', input),
    updateRecipe: (input) =>
      invokeWithSuccess(NUTRITION_IPC_CHANNELS.updateRecipe, 'Рецепт сохранён', input),
    deleteRecipe: (input) =>
      invokeWithSuccess(NUTRITION_IPC_CHANNELS.deleteRecipe, 'Рецепт удалён', input),
    createLogEntry: (input) =>
      invokeWithSuccess(NUTRITION_IPC_CHANNELS.createLogEntry, 'Приём пищи добавлен', input),
    importMeals: (input) =>
      invokeWithSuccess(NUTRITION_IPC_CHANNELS.importMeals, 'Питание импортировано', input),
    updateLogEntry: (input) =>
      invokeWithSuccess(NUTRITION_IPC_CHANNELS.updateLogEntry, 'Запись питания сохранена', input),
    deleteLogEntry: (input) =>
      invokeWithSuccess(NUTRITION_IPC_CHANNELS.deleteLogEntry, 'Запись питания удалена', input),
    setWater: (input) => invoke(NUTRITION_IPC_CHANNELS.setWater, input),
    setTargets: (input) =>
      invokeWithSuccess(NUTRITION_IPC_CHANNELS.setTargets, 'Цели питания сохранены', input),
    getReport: (input) => invoke(NUTRITION_IPC_CHANNELS.getReport, input)
  },

  finance: {
    getSettings: () => invoke(FINANCE_IPC_CHANNELS.getSettings),
    setBaseCurrency: (input) =>
      invokeWithSuccess(FINANCE_IPC_CHANNELS.setBaseCurrency, 'Основная валюта сохранена', input),
    listExchangeRates: () => invoke(FINANCE_IPC_CHANNELS.listExchangeRates),
    upsertExchangeRate: (input) =>
      invokeWithSuccess(FINANCE_IPC_CHANNELS.upsertExchangeRate, 'Курс валюты сохранён', input),
    deleteExchangeRate: (input) =>
      invokeWithSuccess(FINANCE_IPC_CHANNELS.deleteExchangeRate, 'Курс валюты удалён', input),
    listAccounts: (period) => invoke(FINANCE_IPC_CHANNELS.listAccounts, period),
    getAccount: (id, period) => invoke(FINANCE_IPC_CHANNELS.getAccount, id, period),
    createAccount: (input) =>
      invokeWithSuccess(FINANCE_IPC_CHANNELS.createAccount, 'Счёт создан', input),
    updateAccount: (input) =>
      invokeWithSuccess(FINANCE_IPC_CHANNELS.updateAccount, 'Счёт сохранён', input),
    deleteAccount: (input) =>
      invokeWithSuccess(FINANCE_IPC_CHANNELS.deleteAccount, 'Счёт удалён', input),
    clearAccountHistory: (input) =>
      invokeWithSuccess(FINANCE_IPC_CHANNELS.clearAccountHistory, 'История счёта очищена', input),
    listTransactions: (filters) => invoke(FINANCE_IPC_CHANNELS.listTransactions, filters),
    getTransaction: (id) => invoke(FINANCE_IPC_CHANNELS.getTransaction, id),
    createTransaction: (input) =>
      invokeWithSuccess(FINANCE_IPC_CHANNELS.createTransaction, 'Операция создана', input),
    updateTransaction: (input) =>
      invokeWithSuccess(FINANCE_IPC_CHANNELS.updateTransaction, 'Операция сохранена', input),
    deleteTransaction: (input) =>
      invokeWithSuccess(FINANCE_IPC_CHANNELS.deleteTransaction, 'Операция удалена', input),
    listTags: () => invoke(FINANCE_IPC_CHANNELS.listTags),
    getTag: (id) => invoke(FINANCE_IPC_CHANNELS.getTag, id),
    createTag: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.createTag, 'Тег создан', input),
    updateTag: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.updateTag, 'Тег сохранён', input),
    deleteTag: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.deleteTag, 'Тег удалён', input),
    listLimits: (at) => invoke(FINANCE_IPC_CHANNELS.listLimits, at),
    createLimit: (input) =>
      invokeWithSuccess(FINANCE_IPC_CHANNELS.createLimit, 'Лимит создан', input),
    updateLimit: (input) =>
      invokeWithSuccess(FINANCE_IPC_CHANNELS.updateLimit, 'Лимит сохранён', input),
    setLimitState: (input) =>
      invokeWithSuccess(FINANCE_IPC_CHANNELS.setLimitState, 'Состояние лимита обновлено', input),
    deleteLimit: (input) =>
      invokeWithSuccess(FINANCE_IPC_CHANNELS.deleteLimit, 'Лимит удалён', input),
    previewExpenseImpact: (input) => invoke(FINANCE_IPC_CHANNELS.previewExpenseImpact, input),
    listTemplates: () => invoke(FINANCE_IPC_CHANNELS.listTemplates),
    createTemplate: (input) =>
      invokeWithSuccess(FINANCE_IPC_CHANNELS.createTemplate, 'Шаблон создан', input),
    updateTemplate: (input) =>
      invokeWithSuccess(FINANCE_IPC_CHANNELS.updateTemplate, 'Шаблон сохранён', input),
    deleteTemplate: (input) =>
      invokeWithSuccess(FINANCE_IPC_CHANNELS.deleteTemplate, 'Шаблон удалён', input),
    getDashboard: (period) => invoke(FINANCE_IPC_CHANNELS.getDashboard, period),
    getReport: (filters) => invoke(FINANCE_IPC_CHANNELS.getReport, filters)
  }
}

if (!process.contextIsolated) {
  throw new Error('Context isolation must be enabled')
}

contextBridge.exposeInMainWorld('api', api)
