import { useEffect, useRef, useState } from 'react'
import type { NoteVoiceRecordingMimeType } from '@mymind/contracts/notes'
import type { StudyLocalAsset } from '@mymind/contracts/study'
import { NOTE_VOICE_RECORDING_MAX_BYTES } from '@mymind/contracts/notes'
import { Button } from '../../../mobile/src/shared/ui/primitives'

export interface VoiceRecordingInput {
  uri: string
  mimeType: NoteVoiceRecordingMimeType
}
interface Props {
  saveRecording(input: VoiceRecordingInput): Promise<StudyLocalAsset>
  onSaved(asset: StudyLocalAsset): void
  onError?: (reason: unknown) => void
  disabled?: boolean
  onBusyChange?: (busy: boolean) => void
}

export function VoiceRecorder({
  saveRecording,
  onSaved,
  onError,
  disabled,
  onBusyChange
}: Props): React.JSX.Element {
  const recorder = useRef<MediaRecorder | null>(null)
  const mounted = useRef(true)
  const [phase, setPhase] = useState<'idle' | 'starting' | 'recording' | 'saving'>('idle')
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      const current = recorder.current
      if (current) {
        current.onstop = null
        current.stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])
  useEffect(() => {
    onBusyChange?.(phase !== 'idle')
  }, [phase, onBusyChange])
  const start = async (): Promise<void> => {
    setPhase('starting')
    let stream: MediaStream | undefined
    try {
      if (!navigator.mediaDevices || typeof MediaRecorder === 'undefined')
        throw new Error('Запись голоса недоступна в этом браузере.')
      const mimeType = (['audio/webm', 'audio/mp4', 'audio/ogg'] as const).find((type) =>
        MediaRecorder.isTypeSupported(type)
      )
      if (!mimeType) throw new Error('Браузер не поддерживает формат записи MyMind.')
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!mounted.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      const current = new MediaRecorder(stream, { mimeType })
      recorder.current = current
      const chunks: Blob[] = []
      let size = 0
      let tooLarge = false
      current.ondataavailable = (event) => {
        size += event.data.size
        if (size > NOTE_VOICE_RECORDING_MAX_BYTES) {
          tooLarge = true
          if (current.state === 'recording') current.stop()
        } else chunks.push(event.data)
      }
      current.onerror = () => {
        onError?.(new Error('Не удалось записать голос'))
        current.stream.getTracks().forEach((track) => track.stop())
      }
      current.onstop = () => {
        current.stream.getTracks().forEach((track) => track.stop())
        if (!mounted.current) return
        setPhase('saving')
        const blob = new Blob(chunks, { type: mimeType })
        const uri = URL.createObjectURL(blob)
        void (async () => {
          if (tooLarge) throw new Error('Запись превышает допустимый размер 50 МБ.')
          onSaved(await saveRecording({ uri, mimeType }))
        })()
          .catch(onError)
          .finally(() => {
            URL.revokeObjectURL(uri)
            if (mounted.current) setPhase('idle')
          })
      }
      current.start(1000)
      setPhase('recording')
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop())
      onError?.(error)
      if (mounted.current) setPhase('idle')
    }
  }
  return (
    <Button
      label={
        phase === 'recording'
          ? 'Остановить и добавить'
          : phase === 'idle'
            ? 'Записать голос'
            : 'Подготовка…'
      }
      disabled={disabled || phase === 'starting' || phase === 'saving'}
      onPress={() => {
        if (phase === 'recording') recorder.current?.stop()
        else void start()
      }}
    />
  )
}

export function AudioAssetPlayer({
  uri,
  onError
}: {
  uri: string
  onError?: (reason: unknown) => void
}): React.JSX.Element {
  return (
    <audio
      aria-label="Голосовая запись"
      controls
      preload="metadata"
      src={uri}
      onError={() => onError?.(new Error('Не удалось воспроизвести запись'))}
      style={{ width: '100%' }}
    />
  )
}
