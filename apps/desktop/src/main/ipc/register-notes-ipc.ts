import { BrowserWindow, ipcMain } from 'electron'

import { NOTES_IPC_CHANNELS } from '../../shared/contracts/notes'
import {
  createNoteGroupInputSchema,
  createNoteInputSchema,
  importNoteAssetInputSchema,
  moveNoteInputSchema,
  noteSafeIdSchema,
  openNoteAssetInputSchema,
  renameNoteGroupInputSchema,
  renameNoteInputSchema,
  saveNoteVoiceRecordingInputSchema,
  saveNoteInputSchema,
  updateNoteGroupIconInputSchema
} from '../../shared/validation/notes'
import {
  createNote,
  createNoteGroup,
  deleteNote,
  deleteNoteGroup,
  getNote,
  listNotesOverview,
  moveNote,
  renameNote,
  renameNoteGroup,
  saveNote,
  updateNoteGroupIcon
} from '../repositories/notes.repository'
import {
  importStudyAsset,
  openStudyAsset,
  persistStudyAudioRecording
} from '../services/study-assets'
import { mainOperationTracker } from '../services/main-operation-tracker'

export function registerNotesIpcHandlers(): void {
  Object.values(NOTES_IPC_CHANNELS).forEach((channel) => {
    ipcMain.removeHandler(channel)
  })

  ipcMain.handle(NOTES_IPC_CHANNELS.listOverview, () =>
    mainOperationTracker.run(() => listNotesOverview())
  )

  ipcMain.handle(NOTES_IPC_CHANNELS.createGroup, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const input = createNoteGroupInputSchema.parse(rawInput)
      return createNoteGroup(input.title)
    })
  )

  ipcMain.handle(NOTES_IPC_CHANNELS.renameGroup, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const input = renameNoteGroupInputSchema.parse(rawInput)
      return renameNoteGroup(input.id, input.title)
    })
  )

  ipcMain.handle(NOTES_IPC_CHANNELS.updateGroupIcon, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const input = updateNoteGroupIconInputSchema.parse(rawInput)
      return updateNoteGroupIcon(input.id, input.icon)
    })
  )

  ipcMain.handle(NOTES_IPC_CHANNELS.deleteGroup, (_event, rawId: unknown) =>
    mainOperationTracker.run(() => deleteNoteGroup(noteSafeIdSchema.parse(rawId)))
  )

  ipcMain.handle(NOTES_IPC_CHANNELS.createNote, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => createNote(createNoteInputSchema.parse(rawInput)))
  )

  ipcMain.handle(NOTES_IPC_CHANNELS.renameNote, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const input = renameNoteInputSchema.parse(rawInput)
      return renameNote(input.id, input.title)
    })
  )

  ipcMain.handle(NOTES_IPC_CHANNELS.moveNote, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const input = moveNoteInputSchema.parse(rawInput)
      return moveNote(input.id, input.groupId)
    })
  )

  ipcMain.handle(NOTES_IPC_CHANNELS.deleteNote, (_event, rawId: unknown) =>
    mainOperationTracker.run(() => deleteNote(noteSafeIdSchema.parse(rawId)))
  )

  ipcMain.handle(NOTES_IPC_CHANNELS.getNote, (_event, rawId: unknown) =>
    mainOperationTracker.run(() => getNote(noteSafeIdSchema.parse(rawId)))
  )

  ipcMain.handle(NOTES_IPC_CHANNELS.saveNote, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => saveNote(saveNoteInputSchema.parse(rawInput)))
  )

  ipcMain.handle(NOTES_IPC_CHANNELS.importAsset, (event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      if (!event.senderFrame || event.senderFrame !== event.sender.mainFrame) {
        throw new Error('Untrusted note asset request')
      }

      const input = importNoteAssetInputSchema.parse(rawInput)
      const parentWindow = BrowserWindow.fromWebContents(event.sender)

      return importStudyAsset(
        {
          nodeId: input.noteId,
          kind: input.kind
        },
        parentWindow,
        () => {
          getNote(input.noteId)
        }
      )
    })
  )

  ipcMain.handle(NOTES_IPC_CHANNELS.saveVoiceRecording, (event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      if (!event.senderFrame || event.senderFrame !== event.sender.mainFrame) {
        throw new Error('Untrusted note voice recording request')
      }

      const input = saveNoteVoiceRecordingInputSchema.parse(rawInput)

      return persistStudyAudioRecording(input.noteId, input.data, input.mimeType, () => {
        getNote(input.noteId)
      })
    })
  )

  ipcMain.handle(NOTES_IPC_CHANNELS.openAsset, (event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      if (!event.senderFrame || event.senderFrame !== event.sender.mainFrame) {
        throw new Error('Untrusted note asset request')
      }

      return openStudyAsset(openNoteAssetInputSchema.parse(rawInput))
    })
  )
}
