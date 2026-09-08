import {
  NOTE_VOICE_RECORDING_MAX_BYTES,
  type NoteVoiceRecordingMimeType
} from '@mymind/contracts/notes'

const EXTENSIONS: Readonly<Record<NoteVoiceRecordingMimeType, string>> = {
  'audio/mp4': 'm4a',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg'
}

export function noteVoiceRecordingFileName(
  mimeType: NoteVoiceRecordingMimeType,
  createdAt = Date.now()
): string {
  if (!Number.isSafeInteger(createdAt) || createdAt < 0) {
    throw new Error('Некорректное время создания записи')
  }
  return `voice-${createdAt}.${EXTENSIONS[mimeType]}`
}

export function assertNoteVoiceRecordingSize(size: number): void {
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new Error('Запись не должна быть пустой')
  }
  if (size > NOTE_VOICE_RECORDING_MAX_BYTES) {
    throw new Error('Запись превышает допустимый размер 50 МБ')
  }
}
