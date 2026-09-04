from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding='utf-8')
    if old not in text:
        raise RuntimeError(f'Pattern not found in {path}: {old[:120]!r}')
    file_path.write_text(text.replace(old, new, 1), encoding='utf-8')


# Shared contract: renderer can subscribe to operation feedback from preload.
replace_once(
    'src/shared/contracts/system.ts',
    "export interface ShutdownResponse extends ShutdownRequest {\n  decision: 'success' | 'failed' | 'cancel' | 'force'\n}\n\nexport interface MyMindApi {",
    "export interface ShutdownResponse extends ShutdownRequest {\n  decision: 'success' | 'failed' | 'cancel' | 'force'\n}\n\nexport type OperationFeedbackKind = 'success' | 'error'\n\nexport interface OperationFeedback {\n  kind: OperationFeedbackKind\n  message: string\n  key?: string\n}\n\nexport interface MyMindApi {"
)
replace_once(
    'src/shared/contracts/system.ts',
    "    onWindowStateChanged(listener: (state: SystemWindowState) => void): () => void\n    minimizeWindow(): Promise<void>",
    "    onWindowStateChanged(listener: (state: SystemWindowState) => void): () => void\n    onOperationFeedback?(listener: (feedback: OperationFeedback) => void): () => void\n    minimizeWindow(): Promise<void>"
)

# Preload: emit friendly errors for every user-facing IPC action and success feedback for mutations.
replace_once(
    'src/preload/index.ts',
    "  IPC_CHANNELS,\n  type MyMindApi,\n  type SystemHealth,",
    "  IPC_CHANNELS,\n  type MyMindApi,\n  type OperationFeedback,\n  type SystemHealth,"
)
replace_once(
    'src/preload/index.ts',
    "const rawInvoke = ipcRenderer.invoke.bind(ipcRenderer)\nconst invoke: typeof ipcRenderer.invoke = async (channel, ...args) => {\n  try {\n    return await rawInvoke(channel, ...args)\n  } catch (reason: unknown) {\n    throw toFriendlyIpcError(reason)\n  }\n}\n",
    "const operationFeedbackListeners = new Set<(feedback: OperationFeedback) => void>()\nconst silentErrorChannels = new Set<string>([\n  AI_CHAT_IPC_CHANNELS.setBounds,\n  CALENDAR_IPC_CHANNELS.listUnreadReminders,\n  HABITS_IPC_CHANNELS.listUnreadReminders\n])\n\nfunction emitOperationFeedback(feedback: OperationFeedback): void {\n  for (const listener of operationFeedbackListeners) {\n    try {\n      listener(feedback)\n    } catch (reason: unknown) {\n      console.error('Operation feedback listener failed', reason)\n    }\n  }\n}\n\ntype IpcInvokeArgs = Parameters<typeof ipcRenderer.invoke> extends [string, ...infer Args]\n  ? Args\n  : never\n\nconst rawInvoke = ipcRenderer.invoke.bind(ipcRenderer)\nconst invoke: typeof ipcRenderer.invoke = async (channel, ...args) => {\n  try {\n    return await rawInvoke(channel, ...args)\n  } catch (reason: unknown) {\n    const friendlyError = toFriendlyIpcError(reason)\n    if (!silentErrorChannels.has(channel)) {\n      emitOperationFeedback({ kind: 'error', message: friendlyError.message, key: channel })\n    }\n    throw friendlyError\n  }\n}\n\nconst invokeWithSuccess = (\n  channel: string,\n  message: string,\n  ...args: IpcInvokeArgs\n): ReturnType<typeof ipcRenderer.invoke> =>\n  invoke(channel, ...args).then((result) => {\n    emitOperationFeedback({ kind: 'success', message, key: channel })\n    return result\n  })\n"
)
replace_once(
    'src/preload/index.ts',
    "    minimizeWindow: () => invoke(IPC_CHANNELS.windowMinimize) as Promise<void>,",
    "    onOperationFeedback: (listener) => {\n      operationFeedbackListeners.add(listener)\n      return () => {\n        operationFeedbackListeners.delete(listener)\n      }\n    },\n    minimizeWindow: () => invoke(IPC_CHANNELS.windowMinimize) as Promise<void>,"
)

preload_replacements = {
    # Boards
    "createNode: (input) => invoke(BOARD_IPC_CHANNELS.createNode, input) as Promise<BoardNode>,": "createNode: (input) =>\n      invokeWithSuccess(BOARD_IPC_CHANNELS.createNode, 'Элемент создан', input) as Promise<BoardNode>,",
    "renameNode: (input) => invoke(BOARD_IPC_CHANNELS.renameNode, input) as Promise<BoardNode>,": "renameNode: (input) =>\n      invokeWithSuccess(BOARD_IPC_CHANNELS.renameNode, 'Название обновлено', input) as Promise<BoardNode>,",
    "invoke(BOARD_IPC_CHANNELS.updateFolderIcon, input) as Promise<BoardNode>,": "invokeWithSuccess(BOARD_IPC_CHANNELS.updateFolderIcon, 'Иконка папки обновлена', input) as Promise<BoardNode>,",
    "deleteNode: (nodeId) => invoke(BOARD_IPC_CHANNELS.deleteNode, nodeId) as Promise<boolean>,": "deleteNode: (nodeId) =>\n      invokeWithSuccess(BOARD_IPC_CHANNELS.deleteNode, 'Элемент удалён', nodeId) as Promise<boolean>,",
    "moveNode: (input) => invoke(BOARD_IPC_CHANNELS.moveNode, input) as Promise<BoardNode[]>,": "moveNode: (input) =>\n      invokeWithSuccess(BOARD_IPC_CHANNELS.moveNode, 'Элемент перемещён', input) as Promise<BoardNode[]>,",
    # Study
    "createNode: (input) => invoke(STUDY_IPC_CHANNELS.createNode, input) as Promise<StudyNode>,": "createNode: (input) =>\n      invokeWithSuccess(STUDY_IPC_CHANNELS.createNode, 'Элемент обучения создан', input) as Promise<StudyNode>,",
    "renameNode: (input) => invoke(STUDY_IPC_CHANNELS.renameNode, input) as Promise<StudyNode>,": "renameNode: (input) =>\n      invokeWithSuccess(STUDY_IPC_CHANNELS.renameNode, 'Название обновлено', input) as Promise<StudyNode>,",
    "invoke(STUDY_IPC_CHANNELS.duplicateNode, input) as Promise<DuplicateStudyNodeResult>,": "invokeWithSuccess(STUDY_IPC_CHANNELS.duplicateNode, 'Копия создана', input) as Promise<DuplicateStudyNodeResult>,",
    "invoke(STUDY_IPC_CHANNELS.updateFolderIcon, input) as Promise<StudyNode>,": "invokeWithSuccess(STUDY_IPC_CHANNELS.updateFolderIcon, 'Иконка папки обновлена', input) as Promise<StudyNode>,",
    "deleteNode: (nodeId) => invoke(STUDY_IPC_CHANNELS.deleteNode, nodeId) as Promise<boolean>,": "deleteNode: (nodeId) =>\n      invokeWithSuccess(STUDY_IPC_CHANNELS.deleteNode, 'Элемент удалён', nodeId) as Promise<boolean>,",
    "moveNode: (input) => invoke(STUDY_IPC_CHANNELS.moveNode, input) as Promise<StudyNode[]>,": "moveNode: (input) =>\n      invokeWithSuccess(STUDY_IPC_CHANNELS.moveNode, 'Элемент перемещён', input) as Promise<StudyNode[]>,",
    "applyCode: (input) => invoke(STUDY_IPC_CHANNELS.applyCode, input),": "applyCode: (input) =>\n      invokeWithSuccess(STUDY_IPC_CHANNELS.applyCode, 'Изменения структуры применены', input),",
    "invoke(STUDY_PDF_IPC_CHANNELS.exportMaterial, input) as Promise<ExportStudyMaterialPdfResult>": "invokeWithSuccess(STUDY_PDF_IPC_CHANNELS.exportMaterial, 'PDF сохранён', input) as Promise<ExportStudyMaterialPdfResult>",
    # Notes
    "createGroup: (input) => invoke(NOTES_IPC_CHANNELS.createGroup, input) as Promise<NoteGroup>,": "createGroup: (input) =>\n      invokeWithSuccess(NOTES_IPC_CHANNELS.createGroup, 'Группа заметок создана', input) as Promise<NoteGroup>,",
    "renameGroup: (input) => invoke(NOTES_IPC_CHANNELS.renameGroup, input) as Promise<NoteGroup>,": "renameGroup: (input) =>\n      invokeWithSuccess(NOTES_IPC_CHANNELS.renameGroup, 'Группа переименована', input) as Promise<NoteGroup>,",
    "invoke(NOTES_IPC_CHANNELS.updateGroupIcon, input) as Promise<NoteGroup>,": "invokeWithSuccess(NOTES_IPC_CHANNELS.updateGroupIcon, 'Иконка группы обновлена', input) as Promise<NoteGroup>,",
    "deleteGroup: (groupId) => invoke(NOTES_IPC_CHANNELS.deleteGroup, groupId) as Promise<boolean>,": "deleteGroup: (groupId) =>\n      invokeWithSuccess(NOTES_IPC_CHANNELS.deleteGroup, 'Группа удалена', groupId) as Promise<boolean>,",
    "createNote: (input) => invoke(NOTES_IPC_CHANNELS.createNote, input) as Promise<NoteRecord>,": "createNote: (input) =>\n      invokeWithSuccess(NOTES_IPC_CHANNELS.createNote, 'Заметка создана', input) as Promise<NoteRecord>,",
    "renameNote: (input) => invoke(NOTES_IPC_CHANNELS.renameNote, input) as Promise<NoteSummary>,": "renameNote: (input) =>\n      invokeWithSuccess(NOTES_IPC_CHANNELS.renameNote, 'Заметка переименована', input) as Promise<NoteSummary>,",
    "moveNote: (input) => invoke(NOTES_IPC_CHANNELS.moveNote, input) as Promise<NoteSummary>,": "moveNote: (input) =>\n      invokeWithSuccess(NOTES_IPC_CHANNELS.moveNote, 'Заметка перемещена', input) as Promise<NoteSummary>,",
    "deleteNote: (noteId) => invoke(NOTES_IPC_CHANNELS.deleteNote, noteId) as Promise<boolean>,": "deleteNote: (noteId) =>\n      invokeWithSuccess(NOTES_IPC_CHANNELS.deleteNote, 'Заметка удалена', noteId) as Promise<boolean>,",
    # Calendar
    "createEvent: (input) => invoke(CALENDAR_IPC_CHANNELS.createEvent, input),": "createEvent: (input) =>\n      invokeWithSuccess(CALENDAR_IPC_CHANNELS.createEvent, 'Событие создано', input),",
    "updateEvent: (input) => invoke(CALENDAR_IPC_CHANNELS.updateEvent, input),": "updateEvent: (input) =>\n      invokeWithSuccess(CALENDAR_IPC_CHANNELS.updateEvent, 'Событие сохранено', input),",
    "deleteEvent: (input) => invoke(CALENDAR_IPC_CHANNELS.deleteEvent, input),": "deleteEvent: (input) =>\n      invokeWithSuccess(CALENDAR_IPC_CHANNELS.deleteEvent, 'Событие удалено', input),",
    # Diary
    "createDiary: (input) => invoke(DIARY_IPC_CHANNELS.createDiary, input),": "createDiary: (input) => invokeWithSuccess(DIARY_IPC_CHANNELS.createDiary, 'Дневник создан', input),",
    "updateDiary: (input) => invoke(DIARY_IPC_CHANNELS.updateDiary, input),": "updateDiary: (input) => invokeWithSuccess(DIARY_IPC_CHANNELS.updateDiary, 'Дневник сохранён', input),",
    "deleteDiary: (input) => invoke(DIARY_IPC_CHANNELS.deleteDiary, input),": "deleteDiary: (input) => invokeWithSuccess(DIARY_IPC_CHANNELS.deleteDiary, 'Дневник удалён', input),",
    "createEntry: (input) => invoke(DIARY_IPC_CHANNELS.createEntry, input),": "createEntry: (input) => invokeWithSuccess(DIARY_IPC_CHANNELS.createEntry, 'Запись добавлена', input),",
    "updateEntry: (input) => invoke(DIARY_IPC_CHANNELS.updateEntry, input),": "updateEntry: (input) => invokeWithSuccess(DIARY_IPC_CHANNELS.updateEntry, 'Запись сохранена', input),",
    "deleteEntry: (input) => invoke(DIARY_IPC_CHANNELS.deleteEntry, input),": "deleteEntry: (input) => invokeWithSuccess(DIARY_IPC_CHANNELS.deleteEntry, 'Запись удалена', input),",
    # Movies
    "createMovie: (input) => invoke(MOVIES_IPC_CHANNELS.createMovie, input),": "createMovie: (input) => invokeWithSuccess(MOVIES_IPC_CHANNELS.createMovie, 'Фильм добавлен', input),",
    "createMovies: (input) => invoke(MOVIES_IPC_CHANNELS.createMovies, input),": "createMovies: (input) => invokeWithSuccess(MOVIES_IPC_CHANNELS.createMovies, 'Фильмы добавлены', input),",
    "updateMovie: (input) => invoke(MOVIES_IPC_CHANNELS.updateMovie, input),": "updateMovie: (input) => invokeWithSuccess(MOVIES_IPC_CHANNELS.updateMovie, 'Изменения фильма сохранены', input),",
    "deleteMovie: (input) => invoke(MOVIES_IPC_CHANNELS.deleteMovie, input),": "deleteMovie: (input) => invokeWithSuccess(MOVIES_IPC_CHANNELS.deleteMovie, 'Фильм удалён', input),",
    # Music
    "createItem: (input) => invoke(MUSIC_IPC_CHANNELS.createItem, input),": "createItem: (input) => invokeWithSuccess(MUSIC_IPC_CHANNELS.createItem, 'Трек добавлен', input),",
    "createItems: (input) => invoke(MUSIC_IPC_CHANNELS.createItems, input),": "createItems: (input) => invokeWithSuccess(MUSIC_IPC_CHANNELS.createItems, 'Треки добавлены', input),",
    "updateItem: (input) => invoke(MUSIC_IPC_CHANNELS.updateItem, input),": "updateItem: (input) => invokeWithSuccess(MUSIC_IPC_CHANNELS.updateItem, 'Изменения трека сохранены', input),",
    "deleteItem: (input) => invoke(MUSIC_IPC_CHANNELS.deleteItem, input),": "deleteItem: (input) => invokeWithSuccess(MUSIC_IPC_CHANNELS.deleteItem, 'Трек удалён', input),",
    "createPlaylist: (input) => invoke(MUSIC_IPC_CHANNELS.createPlaylist, input),": "createPlaylist: (input) => invokeWithSuccess(MUSIC_IPC_CHANNELS.createPlaylist, 'Плейлист создан', input),",
    "updatePlaylist: (input) => invoke(MUSIC_IPC_CHANNELS.updatePlaylist, input),": "updatePlaylist: (input) => invokeWithSuccess(MUSIC_IPC_CHANNELS.updatePlaylist, 'Плейлист сохранён', input),",
    "deletePlaylist: (input) => invoke(MUSIC_IPC_CHANNELS.deletePlaylist, input),": "deletePlaylist: (input) => invokeWithSuccess(MUSIC_IPC_CHANNELS.deletePlaylist, 'Плейлист удалён', input),",
    # Tasks
    "createGroup: (input) => invoke(TASKS_IPC_CHANNELS.createGroup, input),": "createGroup: (input) => invokeWithSuccess(TASKS_IPC_CHANNELS.createGroup, 'Группа задач создана', input),",
    "updateGroup: (input) => invoke(TASKS_IPC_CHANNELS.updateGroup, input),": "updateGroup: (input) => invokeWithSuccess(TASKS_IPC_CHANNELS.updateGroup, 'Группа задач сохранена', input),",
    "deleteGroup: (input) => invoke(TASKS_IPC_CHANNELS.deleteGroup, input),": "deleteGroup: (input) => invokeWithSuccess(TASKS_IPC_CHANNELS.deleteGroup, 'Группа задач удалена', input),",
    "createTask: (input) => invoke(TASKS_IPC_CHANNELS.createTask, input),": "createTask: (input) => invokeWithSuccess(TASKS_IPC_CHANNELS.createTask, 'Задача создана', input),",
    "updateTask: (input) => invoke(TASKS_IPC_CHANNELS.updateTask, input),": "updateTask: (input) => invokeWithSuccess(TASKS_IPC_CHANNELS.updateTask, 'Задача обновлена', input),",
    "deleteTask: (input) => invoke(TASKS_IPC_CHANNELS.deleteTask, input)": "deleteTask: (input) => invokeWithSuccess(TASKS_IPC_CHANNELS.deleteTask, 'Задача удалена', input)",
    # Habits
    "createGroup: (input) => invoke(HABITS_IPC_CHANNELS.createGroup, input),": "createGroup: (input) => invokeWithSuccess(HABITS_IPC_CHANNELS.createGroup, 'Группа привычек создана', input),",
    "updateGroup: (input) => invoke(HABITS_IPC_CHANNELS.updateGroup, input),": "updateGroup: (input) => invokeWithSuccess(HABITS_IPC_CHANNELS.updateGroup, 'Группа привычек сохранена', input),",
    "deleteGroup: (input) => invoke(HABITS_IPC_CHANNELS.deleteGroup, input),": "deleteGroup: (input) => invokeWithSuccess(HABITS_IPC_CHANNELS.deleteGroup, 'Группа привычек удалена', input),",
    "createHabit: (input) => invoke(HABITS_IPC_CHANNELS.createHabit, input),": "createHabit: (input) => invokeWithSuccess(HABITS_IPC_CHANNELS.createHabit, 'Привычка создана', input),",
    "updateHabit: (input) => invoke(HABITS_IPC_CHANNELS.updateHabit, input),": "updateHabit: (input) => invokeWithSuccess(HABITS_IPC_CHANNELS.updateHabit, 'Привычка сохранена', input),",
    "deleteHabit: (input) => invoke(HABITS_IPC_CHANNELS.deleteHabit, input),": "deleteHabit: (input) => invokeWithSuccess(HABITS_IPC_CHANNELS.deleteHabit, 'Привычка удалена', input),",
    # Passwords
    "setupVault: (input) => invoke(PASSWORDS_IPC_CHANNELS.setupVault, input),": "setupVault: (input) => invokeWithSuccess(PASSWORDS_IPC_CHANNELS.setupVault, 'Хранилище паролей создано', input),",
    "changeMasterPassword: (input) => invoke(PASSWORDS_IPC_CHANNELS.changeMasterPassword, input),": "changeMasterPassword: (input) =>\n      invokeWithSuccess(PASSWORDS_IPC_CHANNELS.changeMasterPassword, 'Мастер-пароль изменён', input),",
    "createGroup: (input) => invoke(PASSWORDS_IPC_CHANNELS.createGroup, input),": "createGroup: (input) => invokeWithSuccess(PASSWORDS_IPC_CHANNELS.createGroup, 'Группа паролей создана', input),",
    "updateGroup: (input) => invoke(PASSWORDS_IPC_CHANNELS.updateGroup, input),": "updateGroup: (input) => invokeWithSuccess(PASSWORDS_IPC_CHANNELS.updateGroup, 'Группа паролей сохранена', input),",
    "deleteGroup: (input) => invoke(PASSWORDS_IPC_CHANNELS.deleteGroup, input),": "deleteGroup: (input) => invokeWithSuccess(PASSWORDS_IPC_CHANNELS.deleteGroup, 'Группа паролей удалена', input),",
    "createItem: (input) => invoke(PASSWORDS_IPC_CHANNELS.createItem, input),": "createItem: (input) => invokeWithSuccess(PASSWORDS_IPC_CHANNELS.createItem, 'Запись создана', input),",
    "updateItem: (input) => invoke(PASSWORDS_IPC_CHANNELS.updateItem, input),": "updateItem: (input) => invokeWithSuccess(PASSWORDS_IPC_CHANNELS.updateItem, 'Запись сохранена', input),",
    "deleteItem: (input) => invoke(PASSWORDS_IPC_CHANNELS.deleteItem, input),": "deleteItem: (input) => invokeWithSuccess(PASSWORDS_IPC_CHANNELS.deleteItem, 'Запись удалена', input),",
    "copyItemField: (input) => invoke(PASSWORDS_IPC_CHANNELS.copyItemField, input),": "copyItemField: (input) =>\n      invokeWithSuccess(\n        PASSWORDS_IPC_CHANNELS.copyItemField,\n        input.field === 'password' ? 'Пароль скопирован' : 'Логин скопирован',\n        input\n      ),",
    # Workouts
    "createExercise: (input) => invoke(WORKOUTS_IPC_CHANNELS.createExercise, input),": "createExercise: (input) => invokeWithSuccess(WORKOUTS_IPC_CHANNELS.createExercise, 'Упражнение создано', input),",
    "updateExercise: (input) => invoke(WORKOUTS_IPC_CHANNELS.updateExercise, input),": "updateExercise: (input) => invokeWithSuccess(WORKOUTS_IPC_CHANNELS.updateExercise, 'Упражнение сохранено', input),",
    "deleteExercise: (input) => invoke(WORKOUTS_IPC_CHANNELS.deleteExercise, input),": "deleteExercise: (input) => invokeWithSuccess(WORKOUTS_IPC_CHANNELS.deleteExercise, 'Упражнение удалено', input),",
    "createProgram: (input) => invoke(WORKOUTS_IPC_CHANNELS.createProgram, input),": "createProgram: (input) => invokeWithSuccess(WORKOUTS_IPC_CHANNELS.createProgram, 'Программа создана', input),",
    "updateProgram: (input) => invoke(WORKOUTS_IPC_CHANNELS.updateProgram, input),": "updateProgram: (input) => invokeWithSuccess(WORKOUTS_IPC_CHANNELS.updateProgram, 'Программа сохранена', input),",
    "deleteProgram: (input) => invoke(WORKOUTS_IPC_CHANNELS.deleteProgram, input),": "deleteProgram: (input) => invokeWithSuccess(WORKOUTS_IPC_CHANNELS.deleteProgram, 'Программа удалена', input),",
    "createSession: (input) => invoke(WORKOUTS_IPC_CHANNELS.createSession, input),": "createSession: (input) => invokeWithSuccess(WORKOUTS_IPC_CHANNELS.createSession, 'Тренировка создана', input),",
    "updateSession: (input) => invoke(WORKOUTS_IPC_CHANNELS.updateSession, input),": "updateSession: (input) => invokeWithSuccess(WORKOUTS_IPC_CHANNELS.updateSession, 'Тренировка сохранена', input),",
    "deleteSession: (input) => invoke(WORKOUTS_IPC_CHANNELS.deleteSession, input),": "deleteSession: (input) => invokeWithSuccess(WORKOUTS_IPC_CHANNELS.deleteSession, 'Тренировка удалена', input),",
    "createProgressEntry: (input) => invoke(WORKOUTS_IPC_CHANNELS.createProgressEntry, input),": "createProgressEntry: (input) => invokeWithSuccess(WORKOUTS_IPC_CHANNELS.createProgressEntry, 'Прогресс добавлен', input),",
    "updateProgressEntry: (input) => invoke(WORKOUTS_IPC_CHANNELS.updateProgressEntry, input),": "updateProgressEntry: (input) => invokeWithSuccess(WORKOUTS_IPC_CHANNELS.updateProgressEntry, 'Прогресс сохранён', input),",
    "deleteProgressEntry: (input) => invoke(WORKOUTS_IPC_CHANNELS.deleteProgressEntry, input),": "deleteProgressEntry: (input) => invokeWithSuccess(WORKOUTS_IPC_CHANNELS.deleteProgressEntry, 'Запись прогресса удалена', input),",
    "importProgressPhoto: (input) => invoke(WORKOUTS_IPC_CHANNELS.importProgressPhoto, input),": "importProgressPhoto: (input) => invokeWithSuccess(WORKOUTS_IPC_CHANNELS.importProgressPhoto, 'Фото прогресса добавлено', input),",
    "deleteProgressPhoto: (input) => invoke(WORKOUTS_IPC_CHANNELS.deleteProgressPhoto, input),": "deleteProgressPhoto: (input) => invokeWithSuccess(WORKOUTS_IPC_CHANNELS.deleteProgressPhoto, 'Фото удалено', input),",
    # Nutrition
    "createFood: (input) => invoke(NUTRITION_IPC_CHANNELS.createFood, input),": "createFood: (input) => invokeWithSuccess(NUTRITION_IPC_CHANNELS.createFood, 'Продукт добавлен', input),",
    "createFoods: (input) => invoke(NUTRITION_IPC_CHANNELS.createFoods, input),": "createFoods: (input) => invokeWithSuccess(NUTRITION_IPC_CHANNELS.createFoods, 'Продукты добавлены', input),",
    "updateFood: (input) => invoke(NUTRITION_IPC_CHANNELS.updateFood, input),": "updateFood: (input) => invokeWithSuccess(NUTRITION_IPC_CHANNELS.updateFood, 'Продукт сохранён', input),",
    "deleteFood: (input) => invoke(NUTRITION_IPC_CHANNELS.deleteFood, input),": "deleteFood: (input) => invokeWithSuccess(NUTRITION_IPC_CHANNELS.deleteFood, 'Продукт удалён', input),",
    "createRecipe: (input) => invoke(NUTRITION_IPC_CHANNELS.createRecipe, input),": "createRecipe: (input) => invokeWithSuccess(NUTRITION_IPC_CHANNELS.createRecipe, 'Рецепт создан', input),",
    "updateRecipe: (input) => invoke(NUTRITION_IPC_CHANNELS.updateRecipe, input),": "updateRecipe: (input) => invokeWithSuccess(NUTRITION_IPC_CHANNELS.updateRecipe, 'Рецепт сохранён', input),",
    "deleteRecipe: (input) => invoke(NUTRITION_IPC_CHANNELS.deleteRecipe, input),": "deleteRecipe: (input) => invokeWithSuccess(NUTRITION_IPC_CHANNELS.deleteRecipe, 'Рецепт удалён', input),",
    "createLogEntry: (input) => invoke(NUTRITION_IPC_CHANNELS.createLogEntry, input),": "createLogEntry: (input) => invokeWithSuccess(NUTRITION_IPC_CHANNELS.createLogEntry, 'Приём пищи добавлен', input),",
    "importMeals: (input) => invoke(NUTRITION_IPC_CHANNELS.importMeals, input),": "importMeals: (input) => invokeWithSuccess(NUTRITION_IPC_CHANNELS.importMeals, 'Питание импортировано', input),",
    "updateLogEntry: (input) => invoke(NUTRITION_IPC_CHANNELS.updateLogEntry, input),": "updateLogEntry: (input) => invokeWithSuccess(NUTRITION_IPC_CHANNELS.updateLogEntry, 'Запись питания сохранена', input),",
    "deleteLogEntry: (input) => invoke(NUTRITION_IPC_CHANNELS.deleteLogEntry, input),": "deleteLogEntry: (input) => invokeWithSuccess(NUTRITION_IPC_CHANNELS.deleteLogEntry, 'Запись питания удалена', input),",
    "setTargets: (input) => invoke(NUTRITION_IPC_CHANNELS.setTargets, input),": "setTargets: (input) => invokeWithSuccess(NUTRITION_IPC_CHANNELS.setTargets, 'Цели питания сохранены', input),",
    # Finance
    "setBaseCurrency: (input) => invoke(FINANCE_IPC_CHANNELS.setBaseCurrency, input),": "setBaseCurrency: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.setBaseCurrency, 'Основная валюта сохранена', input),",
    "upsertExchangeRate: (input) => invoke(FINANCE_IPC_CHANNELS.upsertExchangeRate, input),": "upsertExchangeRate: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.upsertExchangeRate, 'Курс валюты сохранён', input),",
    "deleteExchangeRate: (input) => invoke(FINANCE_IPC_CHANNELS.deleteExchangeRate, input),": "deleteExchangeRate: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.deleteExchangeRate, 'Курс валюты удалён', input),",
    "createAccount: (input) => invoke(FINANCE_IPC_CHANNELS.createAccount, input),": "createAccount: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.createAccount, 'Счёт создан', input),",
    "updateAccount: (input) => invoke(FINANCE_IPC_CHANNELS.updateAccount, input),": "updateAccount: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.updateAccount, 'Счёт сохранён', input),",
    "deleteAccount: (input) => invoke(FINANCE_IPC_CHANNELS.deleteAccount, input),": "deleteAccount: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.deleteAccount, 'Счёт удалён', input),",
    "clearAccountHistory: (input) => invoke(FINANCE_IPC_CHANNELS.clearAccountHistory, input),": "clearAccountHistory: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.clearAccountHistory, 'История счёта очищена', input),",
    "createTransaction: (input) => invoke(FINANCE_IPC_CHANNELS.createTransaction, input),": "createTransaction: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.createTransaction, 'Операция создана', input),",
    "updateTransaction: (input) => invoke(FINANCE_IPC_CHANNELS.updateTransaction, input),": "updateTransaction: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.updateTransaction, 'Операция сохранена', input),",
    "deleteTransaction: (input) => invoke(FINANCE_IPC_CHANNELS.deleteTransaction, input),": "deleteTransaction: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.deleteTransaction, 'Операция удалена', input),",
    "createTag: (input) => invoke(FINANCE_IPC_CHANNELS.createTag, input),": "createTag: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.createTag, 'Тег создан', input),",
    "updateTag: (input) => invoke(FINANCE_IPC_CHANNELS.updateTag, input),": "updateTag: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.updateTag, 'Тег сохранён', input),",
    "deleteTag: (input) => invoke(FINANCE_IPC_CHANNELS.deleteTag, input),": "deleteTag: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.deleteTag, 'Тег удалён', input),",
    "createLimit: (input) => invoke(FINANCE_IPC_CHANNELS.createLimit, input),": "createLimit: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.createLimit, 'Лимит создан', input),",
    "updateLimit: (input) => invoke(FINANCE_IPC_CHANNELS.updateLimit, input),": "updateLimit: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.updateLimit, 'Лимит сохранён', input),",
    "setLimitState: (input) => invoke(FINANCE_IPC_CHANNELS.setLimitState, input),": "setLimitState: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.setLimitState, 'Состояние лимита обновлено', input),",
    "deleteLimit: (input) => invoke(FINANCE_IPC_CHANNELS.deleteLimit, input),": "deleteLimit: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.deleteLimit, 'Лимит удалён', input),",
    "createTemplate: (input) => invoke(FINANCE_IPC_CHANNELS.createTemplate, input),": "createTemplate: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.createTemplate, 'Шаблон создан', input),",
    "updateTemplate: (input) => invoke(FINANCE_IPC_CHANNELS.updateTemplate, input),": "updateTemplate: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.updateTemplate, 'Шаблон сохранён', input),",
    "deleteTemplate: (input) => invoke(FINANCE_IPC_CHANNELS.deleteTemplate, input),": "deleteTemplate: (input) => invokeWithSuccess(FINANCE_IPC_CHANNELS.deleteTemplate, 'Шаблон удалён', input),",
}

preload_path = Path('src/preload/index.ts')
preload_text = preload_path.read_text(encoding='utf-8')
for old, new in preload_replacements.items():
    if old not in preload_text:
        raise RuntimeError(f'Preload pattern not found: {old!r}')
    preload_text = preload_text.replace(old, new, 1)
preload_path.write_text(preload_text, encoding='utf-8')

# Global Toastify bridge and visual design.
Path('src/renderer/src/shared/ui/AppToastNotifications.tsx').write_text("""import { useEffect, useRef } from 'react'\nimport { ToastContainer, toast, type ToastOptions } from 'react-toastify'\n\nimport type { OperationFeedback } from '../../../../shared/contracts/system'\n\nconst SUCCESS_OPTIONS: ToastOptions = { autoClose: 2600 }\nconst ERROR_OPTIONS: ToastOptions = { autoClose: 5200 }\n\nfunction feedbackToastId(feedback: OperationFeedback): string {\n  return `${feedback.kind}:${feedback.key ?? 'app'}:${feedback.message}`\n}\n\nexport function notifySuccess(message: string): void {\n  toast.success(message, SUCCESS_OPTIONS)\n}\n\nexport function notifyError(reason: unknown, fallback = 'Не удалось выполнить действие'): void {\n  const message = reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : fallback\n  toast.error(message, ERROR_OPTIONS)\n}\n\nexport function AppToastNotifications(): React.JSX.Element {\n  const activeErrorsRef = useRef(new Set<string>())\n\n  useEffect(() => {\n    const subscribe = window.api?.system?.onOperationFeedback\n    if (!subscribe) return\n\n    return subscribe((feedback) => {\n      const toastId = feedbackToastId(feedback)\n\n      if (feedback.kind === 'error') {\n        if (activeErrorsRef.current.has(toastId)) return\n        activeErrorsRef.current.add(toastId)\n        toast.error(feedback.message, {\n          ...ERROR_OPTIONS,\n          toastId,\n          onClose: () => {\n            activeErrorsRef.current.delete(toastId)\n          }\n        })\n        return\n      }\n\n      toast.success(feedback.message, { ...SUCCESS_OPTIONS, toastId })\n    })\n  }, [])\n\n  return (\n    <ToastContainer\n      position=\"bottom-right\"\n      newestOnTop\n      hideProgressBar\n      closeButton={false}\n      closeOnClick\n      pauseOnHover\n      pauseOnFocusLoss={false}\n      draggable={false}\n      limit={4}\n      className=\"mymind-toast-container\"\n      toastClassName=\"mymind-toast\"\n      bodyClassName=\"mymind-toast-body\"\n    />\n  )\n}\n""", encoding='utf-8')

Path('src/renderer/src/assets/toast-notifications.css').write_text(""".mymind-toast-container.Toastify__toast-container {\n  z-index: 240;\n  width: min(380px, calc(100vw - 32px));\n  padding: 0;\n  right: 18px;\n  bottom: 18px;\n}\n\n.mymind-toast-container .mymind-toast.Toastify__toast {\n  min-height: 52px;\n  margin-bottom: 10px;\n  padding: 12px 14px;\n  border: 1px solid var(--app-border);\n  border-radius: 14px;\n  background: var(--app-menu);\n  color: var(--app-text);\n  box-shadow: var(--app-shadow-menu);\n  font-family: inherit;\n  font-size: 14px;\n  line-height: 1.4;\n}\n\n.mymind-toast-container .mymind-toast.Toastify__toast--success {\n  border-color: color-mix(in srgb, var(--app-accent-500) 28%, var(--app-border));\n}\n\n.mymind-toast-container .mymind-toast.Toastify__toast--error {\n  border-color: color-mix(in srgb, rgb(248 113 113) 30%, var(--app-border));\n}\n\n.mymind-toast-container .Toastify__toast-icon {\n  width: 18px;\n  margin-inline-end: 10px;\n}\n\n.mymind-toast-container .Toastify__toast--success .Toastify__toast-icon {\n  color: var(--app-accent-400);\n}\n\n.mymind-toast-container .Toastify__toast--error .Toastify__toast-icon {\n  color: rgb(248 113 113);\n}\n\n.mymind-toast-container .mymind-toast-body {\n  min-width: 0;\n  margin: 0;\n  padding: 0;\n  font-weight: 500;\n}\n\n@media (max-width: 520px) {\n  .mymind-toast-container.Toastify__toast-container {\n    right: 12px;\n    bottom: 12px;\n    width: calc(100vw - 24px);\n  }\n}\n""", encoding='utf-8')

# Mount one Toastify container for the whole renderer.
replace_once(
    'src/renderer/src/main.tsx',
    "import './assets/app-titlebar.css'\n\nimport { StrictMode } from 'react'",
    "import './assets/app-titlebar.css'\nimport 'react-toastify/dist/ReactToastify.css'\nimport './assets/toast-notifications.css'\n\nimport { StrictMode } from 'react'"
)
replace_once(
    'src/renderer/src/main.tsx',
    "import App from './App'\n\ncreateRoot",
    "import App from './App'\nimport { AppToastNotifications } from './shared/ui/AppToastNotifications'\n\ncreateRoot"
)
replace_once(
    'src/renderer/src/main.tsx',
    "  <StrictMode>\n    <App />\n  </StrictMode>",
    "  <StrictMode>\n    <App />\n    <AppToastNotifications />\n  </StrictMode>"
)

# Password copy feedback is now supplied by the global Toastify bridge.
replace_once('src/renderer/src/modules/passwords/PasswordsPage.tsx', "  ClipboardCheck,\n", "")
replace_once(
    'src/renderer/src/modules/passwords/PasswordsPage.tsx',
    "  const [copiedLabel, setCopiedLabel] = useState<string | null>(null)\n",
    ""
)
replace_once(
    'src/renderer/src/modules/passwords/PasswordsPage.tsx',
    "      await passwordsClient.copyItemField({ id: itemId, field })\n      setCopiedLabel(field === 'password' ? 'Пароль скопирован' : 'Логин скопирован')\n      window.setTimeout(() => setCopiedLabel(null), 1600)",
    "      await passwordsClient.copyItemField({ id: itemId, field })"
)
replace_once(
    'src/renderer/src/modules/passwords/PasswordsPage.tsx',
    "\n      {copiedLabel && (\n        <div className=\"fixed right-6 bottom-6 z-[100] inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-[var(--app-menu)] px-4 py-3 text-sm font-medium text-emerald-300 shadow-[var(--app-shadow-menu)]\">\n          <ClipboardCheck className=\"size-4\" /> {copiedLabel}\n        </div>\n      )}\n",
    "\n"
)
replace_once(
    'src/renderer/src/modules/passwords/PasswordsPage.test.tsx',
    "    expect(mocks.copyItemField).toHaveBeenCalledWith({ id: 'item-github', field: 'password' })\n    expect(await screen.findByText('Пароль скопирован')).toBeInTheDocument()",
    "    expect(mocks.copyItemField).toHaveBeenCalledWith({ id: 'item-github', field: 'password' })"
)

# Tests for the shared bridge itself.
Path('src/renderer/src/shared/ui/AppToastNotifications.test.tsx').write_text("""import { act, render, screen } from '@testing-library/react'\nimport { beforeEach, describe, expect, it, vi } from 'vitest'\n\nimport type { OperationFeedback } from '../../../../shared/contracts/system'\n\nconst toastMocks = vi.hoisted(() => ({\n  success: vi.fn(),\n  error: vi.fn()\n}))\n\nvi.mock('react-toastify', () => ({\n  ToastContainer: () => <div data-testid=\"toast-container\" />,\n  toast: {\n    success: toastMocks.success,\n    error: toastMocks.error\n  }\n}))\n\nimport { AppToastNotifications } from './AppToastNotifications'\n\ndescribe('AppToastNotifications', () => {\n  let listener: ((feedback: OperationFeedback) => void) | null\n\n  beforeEach(() => {\n    listener = null\n    toastMocks.success.mockReset()\n    toastMocks.error.mockReset()\n\n    Object.defineProperty(window, 'api', {\n      configurable: true,\n      value: {\n        system: {\n          onOperationFeedback: (nextListener: (feedback: OperationFeedback) => void) => {\n            listener = nextListener\n            return () => {\n              listener = null\n            }\n          }\n        }\n      }\n    })\n  })\n\n  it('shows success and error feedback through Toastify', () => {\n    render(<AppToastNotifications />)\n    expect(screen.getByTestId('toast-container')).toBeInTheDocument()\n\n    act(() => {\n      listener?.({ kind: 'success', message: 'Задача создана', key: 'tasks:create-task' })\n      listener?.({ kind: 'error', message: 'Не удалось сохранить', key: 'tasks:update-task' })\n    })\n\n    expect(toastMocks.success).toHaveBeenCalledWith(\n      'Задача создана',\n      expect.objectContaining({ toastId: 'success:tasks:create-task:Задача создана' })\n    )\n    expect(toastMocks.error).toHaveBeenCalledWith(\n      'Не удалось сохранить',\n      expect.objectContaining({ toastId: 'error:tasks:update-task:Не удалось сохранить' })\n    )\n  })\n\n  it('does not duplicate an active error toast', () => {\n    render(<AppToastNotifications />)\n\n    act(() => {\n      listener?.({ kind: 'error', message: 'Ошибка', key: 'music:update-item' })\n      listener?.({ kind: 'error', message: 'Ошибка', key: 'music:update-item' })\n    })\n\n    expect(toastMocks.error).toHaveBeenCalledTimes(1)\n  })\n})\n""", encoding='utf-8')
