import { useEffect, useRef, useState } from 'react'
import type { NoteVoiceRecordingMimeType } from '@mymind/contracts/notes'
import type { StudyLocalAsset } from '@mymind/contracts/study'
import { NOTE_VOICE_RECORDING_MAX_BYTES } from '@mymind/contracts/notes'
import { View } from 'react-native'
import { Button, Label } from '../../../mobile/src/shared/ui/primitives'
import { useTheme } from '../../../mobile/src/shared/ui/theme'
import { AudioPlaybackControls } from '../../../mobile/src/shared/ui/AudioPlaybackControls'

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
  const cancelled = useRef(false)
  const [elapsed, setElapsed] = useState(0)
  const theme = useTheme()
  const mounted = useRef(true)
  const [phase, setPhase] = useState<'idle' | 'starting' | 'recording' | 'saving'>('idle')
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      const current = recorder.current
      if (current) {
        current.onstop = null
        if (current.state !== 'inactive') current.stop()
        current.stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])
  useEffect(() => {
    onBusyChange?.(phase !== 'idle')
  }, [phase, onBusyChange])
  useEffect(() => {
    if (phase !== 'recording') return
    const start = Date.now()
    const timer = setInterval(() => setElapsed(Date.now() - start), 250)
    return () => clearInterval(timer)
  }, [phase])
  const start = async (): Promise<void> => {
    setPhase('starting')
    setElapsed(0)
    cancelled.current = false
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
        cancelled.current = true
        onError?.(new Error('Не удалось записать голос'))
        current.stream.getTracks().forEach((track) => track.stop())
        if (mounted.current) setPhase('idle')
      }
      current.onstop = () => {
        current.stream.getTracks().forEach((track) => track.stop())
        if (!mounted.current) return
        if (cancelled.current) {
          setPhase('idle')
          return
        }
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
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          label={
            phase === 'recording'
              ? 'Остановить и добавить'
              : phase === 'idle'
                ? 'Записать голос'
                : phase === 'saving'
                  ? 'Сохранение…'
                  : 'Подготовка…'
          }
          selected={phase === 'recording'}
          disabled={disabled || phase === 'starting' || phase === 'saving'}
          onPress={() => {
            if (phase === 'recording') recorder.current?.stop()
            else void start()
          }}
        />
        {phase === 'recording' ? (
          <Button
            label="Отмена"
            danger
            onPress={() => {
              cancelled.current = true
              recorder.current?.stop()
            }}
          />
        ) : null}
      </View>
      {phase === 'recording' ? (
        <View style={{ gap: 8 }}>
          <View
            accessibilityLabel="Идёт запись голоса"
            style={{
              height: 40,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              overflow: 'hidden'
            }}
          >
            {Array.from({ length: 36 }, (_, index) => (
              <View
                key={index}
                style={{
                  flex: 1,
                  height: 6 + Math.abs(Math.sin(index * 1.7 + elapsed / 220)) * 30,
                  backgroundColor: theme.accent,
                  borderRadius: 3
                }}
              />
            ))}
          </View>
          <Label muted>
            Запись · {String(Math.floor(elapsed / 60000)).padStart(2, '0')}:
            {String(Math.floor(elapsed / 1000) % 60).padStart(2, '0')}
          </Label>
        </View>
      ) : null}
    </View>
  )
}

export function AudioAssetPlayer({
  uri,
  onError
}: {
  uri: string
  onError?: (reason: unknown) => void
}): React.JSX.Element {
  const audio = useRef<HTMLAudioElement>(null)
  const [state, setState] = useState({
    playing: false,
    loaded: false,
    currentTime: 0,
    duration: 0,
    error: ''
  })
  useEffect(() => {
    const element = audio.current
    const pause = (): void => {
      if (document.visibilityState === 'hidden') element?.pause()
    }
    document.addEventListener('visibilitychange', pause)
    return () => {
      element?.pause()
      document.removeEventListener('visibilitychange', pause)
    }
  }, [uri])
  const update = (): void => {
    const element = audio.current
    if (element)
      setState({
        playing: !element.paused,
        loaded: element.readyState >= 1,
        currentTime: element.currentTime,
        duration: element.duration,
        error: element.error?.message ?? ''
      })
  }
  return (
    <View style={{ gap: 6 }}>
      <audio
        ref={audio}
        key={uri}
        aria-label="Голосовая запись"
        hidden
        preload="metadata"
        src={uri}
        onLoadedMetadata={update}
        onDurationChange={update}
        onTimeUpdate={update}
        onPlay={update}
        onPause={update}
        onEnded={update}
        onError={() => {
          update()
          onError?.(new Error('Не удалось воспроизвести запись'))
        }}
      />
      <AudioPlaybackControls
        {...state}
        toggle={() => {
          const element = audio.current
          if (!element) return
          if (!element.paused) element.pause()
          else {
            if (element.ended) element.currentTime = 0
            void element.play().catch((reason: unknown) => {
              setState((value) => ({
                ...value,
                error: reason instanceof Error ? reason.message : String(reason)
              }))
              onError?.(reason)
            })
          }
        }}
      />
    </View>
  )
}
