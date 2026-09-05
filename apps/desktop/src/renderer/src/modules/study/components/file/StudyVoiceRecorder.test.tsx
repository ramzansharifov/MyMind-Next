import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { StudyLocalAsset } from '../../../../../../shared/contracts/study'
import { StudyVoiceRecorder } from './StudyVoiceRecorder'

class FakeMediaRecorder {
  static isTypeSupported(mimeType: string): boolean {
    return mimeType.startsWith('audio/webm')
  }

  readonly mimeType: string
  state: RecordingState = 'inactive'
  private readonly listeners = new Map<string, Array<(event: Event) => void>>()

  constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
    this.mimeType = options?.mimeType ?? 'audio/webm'
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    const listeners = this.listeners.get(type) ?? []
    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  start(): void {
    this.state = 'recording'
  }

  stop(): void {
    this.state = 'inactive'
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: this.mimeType })
    this.emit('dataavailable', { data: blob } as BlobEvent)
    this.emit('stop', new Event('stop'))
  }

  private emit(type: string, event: Event): void {
    this.listeners.get(type)?.forEach((listener) => listener(event))
  }
}

const savedAsset: StudyLocalAsset = {
  id: 'voice-asset',
  materialId: 'note-one',
  name: 'voice-recording.weba',
  mimeType: 'audio/webm',
  size: 3,
  url: 'mymind-asset://local/note-one/voice-asset/voice-recording.weba'
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StudyVoiceRecorder', () => {
  it('records microphone audio, saves it and attaches it to the block', async () => {
    const user = userEvent.setup()
    const stopTrack = vi.fn()
    const getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: stopTrack }]
    })
    const saveRecording = vi.fn().mockResolvedValue(savedAsset)
    const onChange = vi.fn()

    vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })

    render(
      <StudyVoiceRecorder
        materialId="note-one"
        block={{ id: 'voice-block', type: 'audio', source: { type: 'local' } }}
        saveRecording={saveRecording}
        onOpenFile={vi.fn()}
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Начать запись' }))

    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    })
    expect(await screen.findByText(/Идёт запись/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Завершить запись' }))

    await waitFor(() => {
      expect(saveRecording).toHaveBeenCalledWith({
        nodeId: 'note-one',
        data: new Uint8Array([1, 2, 3]),
        mimeType: 'audio/webm'
      })
      expect(onChange).toHaveBeenCalledWith({
        id: 'voice-block',
        type: 'audio',
        source: { type: 'local', asset: savedAsset },
        title: 'Голосовая запись'
      })
    })
    expect(stopTrack).toHaveBeenCalled()
  })

  it('shows a clear error when microphone access is denied', async () => {
    const user = userEvent.setup()
    const getUserMedia = vi
      .fn()
      .mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'))

    vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })

    render(
      <StudyVoiceRecorder
        materialId="note-one"
        block={{ id: 'voice-block', type: 'audio', source: { type: 'local' } }}
        saveRecording={vi.fn()}
        onOpenFile={vi.fn()}
        onChange={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Начать запись' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Нет доступа к микрофону')
  })
})
