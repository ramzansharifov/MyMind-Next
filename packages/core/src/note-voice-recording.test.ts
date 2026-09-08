import { describe, expect, it } from 'vitest'
import { NOTE_VOICE_RECORDING_MAX_BYTES } from '@mymind/contracts/notes'
import { assertNoteVoiceRecordingSize, noteVoiceRecordingFileName } from './note-voice-recording'

describe('note voice recording rules', () => {
  it('uses a stable extension for every accepted desktop-compatible mime type', () => {
    expect(noteVoiceRecordingFileName('audio/mp4', 123)).toBe('voice-123.m4a')
    expect(noteVoiceRecordingFileName('audio/webm', 123)).toBe('voice-123.webm')
    expect(noteVoiceRecordingFileName('audio/ogg', 123)).toBe('voice-123.ogg')
  })

  it('accepts a recording up to 50 MiB and rejects empty or oversized files', () => {
    expect(() => assertNoteVoiceRecordingSize(1)).not.toThrow()
    expect(() => assertNoteVoiceRecordingSize(NOTE_VOICE_RECORDING_MAX_BYTES)).not.toThrow()
    expect(() => assertNoteVoiceRecordingSize(0)).toThrow('Запись не должна быть пустой')
    expect(() => assertNoteVoiceRecordingSize(NOTE_VOICE_RECORDING_MAX_BYTES + 1)).toThrow(
      'Запись превышает допустимый размер 50 МБ'
    )
  })
})
