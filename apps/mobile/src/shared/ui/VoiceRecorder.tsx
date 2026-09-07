import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState
} from 'expo-audio'
import { File } from 'expo-file-system'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Platform, View } from 'react-native'
import type { NoteVoiceRecordingMimeType } from '@mymind/contracts/notes'
import type { StudyLocalAsset } from '@mymind/contracts/study'
import { Button, Label } from './primitives'

export interface VoiceRecordingInput {
  uri: string
  mimeType: NoteVoiceRecordingMimeType
}

type RecorderPhase = 'idle' | 'starting' | 'recording' | 'saving'

function durationLabel(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function playbackLabel(seconds: number): string {
  return durationLabel(Math.round(Math.max(0, seconds) * 1000))
}

function discardRecording(uri: string | null): void {
  if (!uri) return
  try {
    const file = new File(uri)
    if (file.exists) file.delete()
  } catch {
    // Recorder cache cleanup is best-effort. The operating system can reclaim it as well.
  }
}

async function setRecordingAudioMode(enabled: boolean): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: enabled,
    playsInSilentMode: true
  })
}

interface VoiceRecorderProps {
  saveRecording(input: VoiceRecordingInput): Promise<StudyLocalAsset>
  onSaved(asset: StudyLocalAsset): void
  onError?: (reason: unknown) => void
  disabled?: boolean
}

export function VoiceRecorder({
  saveRecording,
  onSaved,
  onError,
  disabled = false
}: VoiceRecorderProps): React.JSX.Element {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const recorderState = useAudioRecorderState(recorder, 250)
  const [phase, setPhaseState] = useState<RecorderPhase>('idle')
  const phaseRef = useRef<RecorderPhase>('idle')
  const mountedRef = useRef(true)

  const setPhase = useCallback((next: RecorderPhase): void => {
    phaseRef.current = next
    if (mountedRef.current) setPhaseState(next)
  }, [])

  const stopWithoutSaving = useCallback(
    async (message?: string): Promise<void> => {
      if (phaseRef.current !== 'recording') return
      setPhase('saving')
      try {
        await recorder.stop()
        discardRecording(recorder.uri)
        if (message) onError?.(new Error(message))
      } catch (reason) {
        onError?.(reason)
      } finally {
        await setRecordingAudioMode(false).catch(() => undefined)
        setPhase('idle')
      }
    },
    [onError, recorder, setPhase]
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && phaseRef.current === 'recording') {
        void stopWithoutSaving('Запись остановлена без сохранения при сворачивании приложения')
      }
    })
    return () => subscription.remove()
  }, [stopWithoutSaving])

  useEffect(
    () => () => {
      if (phaseRef.current !== 'recording') return
      phaseRef.current = 'saving'
      void recorder
        .stop()
        .then(() => discardRecording(recorder.uri))
        .catch(() => undefined)
        .finally(() => {
          void setRecordingAudioMode(false).catch(() => undefined)
        })
    },
    [recorder]
  )

  const start = async (): Promise<void> => {
    if (disabled || phaseRef.current !== 'idle') return
    if (Platform.OS === 'web') {
      onError?.(new Error('Запись голоса доступна в мобильном приложении MyMind'))
      return
    }

    setPhase('starting')
    try {
      const currentPermission = await AudioModule.getRecordingPermissionsAsync()
      const permission = currentPermission.granted
        ? currentPermission
        : await AudioModule.requestRecordingPermissionsAsync()
      if (!permission.granted) {
        throw new Error('Для записи голоса нужен доступ к микрофону')
      }

      await setRecordingAudioMode(true)
      await recorder.prepareToRecordAsync()
      recorder.record()
      setPhase('recording')
    } catch (reason) {
      await setRecordingAudioMode(false).catch(() => undefined)
      setPhase('idle')
      onError?.(reason)
    }
  }

  const stopAndSave = async (): Promise<void> => {
    if (phaseRef.current !== 'recording') return
    setPhase('saving')
    try {
      await recorder.stop()
      const uri = recorder.uri
      if (!uri) throw new Error('Не удалось получить файл голосовой записи')
      const asset = await saveRecording({ uri, mimeType: 'audio/mp4' })
      onSaved(asset)
    } catch (reason) {
      discardRecording(recorder.uri)
      onError?.(reason)
    } finally {
      await setRecordingAudioMode(false).catch(() => undefined)
      setPhase('idle')
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          label={
            phase === 'starting'
              ? 'Подготовка…'
              : phase === 'saving'
                ? 'Сохранение…'
                : phase === 'recording'
                  ? 'Остановить и добавить'
                  : 'Записать голос'
          }
          selected={phase === 'recording'}
          disabled={disabled || phase === 'starting' || phase === 'saving'}
          onPress={() => void (phase === 'recording' ? stopAndSave() : start())}
        />
        {phase === 'recording' ? (
          <Button label="Отмена" danger onPress={() => void stopWithoutSaving()} />
        ) : null}
      </View>
      {phase === 'recording' ? (
        <Label muted>Запись · {durationLabel(recorderState.durationMillis)}</Label>
      ) : null}
    </View>
  )
}

interface AudioAssetPlayerProps {
  uri: string
  onError?: (reason: unknown) => void
}

export function AudioAssetPlayer({ uri, onError }: AudioAssetPlayerProps): React.JSX.Element {
  const player = useAudioPlayer(uri, { updateInterval: 250 })
  const status = useAudioPlayerStatus(player)

  const toggle = async (): Promise<void> => {
    try {
      if (status.playing) {
        player.pause()
        return
      }
      if (status.duration > 0 && status.currentTime >= status.duration - 0.1) {
        await player.seekTo(0)
      }
      player.play()
    } catch (reason) {
      onError?.(reason)
    }
  }

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          label={status.playing ? 'Пауза' : status.isLoaded ? 'Воспроизвести' : 'Загрузка…'}
          disabled={!status.isLoaded}
          onPress={() => void toggle()}
        />
      </View>
      <Label muted>
        {playbackLabel(status.currentTime)} / {playbackLabel(status.duration)}
      </Label>
      {status.error ? <Label muted>Не удалось воспроизвести: {status.error}</Label> : null}
    </View>
  )
}
