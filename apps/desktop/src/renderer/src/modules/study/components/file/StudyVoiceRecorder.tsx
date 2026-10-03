import { LoaderCircle, Mic, RotateCcw, Square, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type {
  OpenStudyAssetInput,
  StudyBlock,
  StudyLocalAsset
} from '../../../../../../shared/contracts/study'
import type { SaveRecordedAudioInput } from '../study-block-asset-context'
import { cn } from '../../../../shared/lib/cn'
import { StudyFileBlockView } from './StudyFileBlockView'
import './StudyVoiceRecorder.css'

type AudioBlock = Extract<StudyBlock, { type: 'audio' }>
type RecorderState = 'idle' | 'requesting' | 'recording' | 'saving'
type RecordingMimeType = SaveRecordedAudioInput['mimeType']

const MIME_TYPE_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4'
] as const

const WAVEFORM_HEIGHTS = [
  10, 18, 28, 14, 32, 22, 12, 26, 34, 16, 24, 10, 20, 30, 14, 26, 18, 32, 12, 22, 28, 16, 34, 20,
  10, 26, 18, 30, 14, 24, 32, 12
] as const

interface StudyVoiceRecorderProps {
  materialId: string
  block: AudioBlock
  saveRecording: (input: SaveRecordedAudioInput) => Promise<StudyLocalAsset>
  onOpenFile: (input: OpenStudyAssetInput) => Promise<void>
  onChange: (block: AudioBlock) => void
  layout?: 'vertical' | 'horizontal'
  showRecordAgainButton?: boolean
  onControlsChange?: (controls: StudyVoiceRecorderControls | null) => void
}

export interface StudyVoiceRecorderControls {
  startRecording: () => Promise<void>
  isBusy: boolean
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function selectRecordingMimeType(): string | undefined {
  if (typeof MediaRecorder.isTypeSupported !== 'function') return undefined
  return MIME_TYPE_CANDIDATES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType))
}

function normalizeRecordingMimeType(value: string): RecordingMimeType | null {
  const mimeType = value.toLowerCase().split(';', 1)[0]

  if (mimeType === 'audio/webm' || mimeType === 'audio/ogg' || mimeType === 'audio/mp4') {
    return mimeType
  }

  return null
}

function recordingErrorMessage(reason: unknown): string {
  if (reason instanceof DOMException) {
    if (reason.name === 'NotAllowedError' || reason.name === 'SecurityError') {
      return 'Нет доступа к микрофону. Разрешите его в системных настройках и попробуйте снова.'
    }

    if (reason.name === 'NotFoundError') {
      return 'Микрофон не найден.'
    }
  }

  return reason instanceof Error ? reason.message : 'Не удалось записать голосовое сообщение.'
}

export function StudyVoiceRecorder({
  materialId,
  block,
  saveRecording,
  onOpenFile,
  onChange,
  layout = 'vertical',
  showRecordAgainButton = true,
  onControlsChange
}: StudyVoiceRecorderProps): React.JSX.Element {
  const [recorderState, setRecorderState] = useState<RecorderState>('idle')
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const cancelRecordingRef = useRef(false)
  const mountedRef = useRef(true)
  const recordingStartedAtRef = useRef(0)
  const startRecordingRef = useRef(startRecording)

  useEffect(() => {
    startRecordingRef.current = startRecording
  })

  useEffect(() => {
    if (!onControlsChange) return
    onControlsChange({
      startRecording: () => startRecordingRef.current(),
      isBusy: recorderState !== 'idle'
    })
    return () => onControlsChange(null)
  }, [onControlsChange, recorderState])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      cancelRecordingRef.current = true

      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.stop()
      }

      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (recorderState !== 'recording') return undefined

    const timer = window.setInterval(() => {
      setDurationSeconds(Math.floor((Date.now() - recordingStartedAtRef.current) / 1000))
    }, 250)

    return () => window.clearInterval(timer)
  }, [recorderState])

  function releaseMicrophone(): void {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  async function persistRecording(recorder: MediaRecorder): Promise<void> {
    if (cancelRecordingRef.current || !mountedRef.current) {
      if (mountedRef.current) setRecorderState('idle')
      return
    }

    const blob = new Blob(chunksRef.current, {
      type: recorder.mimeType || chunksRef.current[0]?.type || 'audio/webm'
    })
    const mimeType = normalizeRecordingMimeType(blob.type)

    if (blob.size === 0) {
      setError('Запись получилась пустой. Проверьте микрофон и попробуйте снова.')
      setRecorderState('idle')
      return
    }

    if (!mimeType) {
      setError('Формат записи не поддерживается.')
      setRecorderState('idle')
      return
    }

    setRecorderState('saving')

    try {
      const asset = await saveRecording({
        nodeId: materialId,
        data: new Uint8Array(await blob.arrayBuffer()),
        mimeType
      })

      if (!mountedRef.current) return

      onChange({
        ...block,
        source: { type: 'local', asset },
        title: block.title?.trim() || 'Голосовая запись'
      })
      setRecorderState('idle')
      setDurationSeconds(0)
    } catch (reason: unknown) {
      if (!mountedRef.current) return
      setError(recordingErrorMessage(reason))
      setRecorderState('idle')
    }
  }

  async function startRecording(): Promise<void> {
    setError(null)
    setDurationSeconds(0)
    cancelRecordingRef.current = false

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Запись с микрофона не поддерживается на этом устройстве.')
      return
    }

    setRecorderState('requesting')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      })

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      const selectedMimeType = selectRecordingMimeType()
      const recorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType, audioBitsPerSecond: 128_000 })
        : new MediaRecorder(stream)

      recorderRef.current = recorder
      chunksRef.current = []

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      })
      recorder.addEventListener('error', () => {
        cancelRecordingRef.current = true
        releaseMicrophone()
        if (mountedRef.current) {
          setError('Во время записи произошла ошибка.')
          setRecorderState('idle')
        }
      })
      recorder.addEventListener('stop', () => {
        releaseMicrophone()
        recorderRef.current = null
        void persistRecording(recorder)
      })

      recorder.start(1000)
      recordingStartedAtRef.current = Date.now()
      setRecorderState('recording')
    } catch (reason: unknown) {
      releaseMicrophone()
      if (mountedRef.current) {
        setError(recordingErrorMessage(reason))
        setRecorderState('idle')
      }
    }
  }

  function stopRecording(): void {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  function cancelRecording(): void {
    cancelRecordingRef.current = true
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const hasSavedRecording = block.source.type === 'local' && Boolean(block.source.asset)
  const horizontal = layout === 'horizontal'

  if (hasSavedRecording && recorderState === 'idle') {
    return (
      <div className="space-y-2">
        <StudyFileBlockView block={block} onOpenFile={onOpenFile} />
        {showRecordAgainButton && (
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--app-text)]"
            onClick={() => void startRecording()}
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            Записать заново
          </button>
        )}
        {error && <RecorderError message={error} />}
      </div>
    )
  }

  return (
    <section
      className={cn(
        'rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)]',
        horizontal ? 'px-4 py-4' : 'px-5 py-6'
      )}
    >
      <div
        className={cn(
          'flex items-center',
          horizontal ? 'flex-wrap gap-4 text-left' : 'mx-auto max-w-lg flex-col text-center'
        )}
      >
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full',
            horizontal ? 'size-11' : 'size-14',
            recorderState === 'recording'
              ? 'bg-red-500/15 text-red-300 ring-4 ring-red-500/10'
              : 'bg-accent-500/10 text-accent-300'
          )}
        >
          <Mic aria-hidden="true" className={horizontal ? 'size-5' : 'size-6'} />
        </span>

        <div
          className={
            horizontal
              ? cn('min-w-0', recorderState === 'recording' ? 'shrink-0' : 'flex-1')
              : 'contents'
          }
        >
          <h3 className={cn('text-sm font-semibold text-[var(--app-text)]', !horizontal && 'mt-3')}>
            Голосовое
          </h3>
          {recorderState === 'recording' ? (
            <div
              className={cn(
                'flex items-center gap-2 font-medium text-red-200',
                horizontal ? 'mt-1 text-xs' : 'mt-2 text-sm'
              )}
            >
              <span className="size-2 animate-pulse rounded-full bg-red-400" />
              <span aria-live="polite">Идёт запись · {formatDuration(durationSeconds)}</span>
            </div>
          ) : recorderState === 'requesting' ? (
            <RecorderProgress label="Запрашиваем доступ к микрофону…" compact={horizontal} />
          ) : recorderState === 'saving' ? (
            <RecorderProgress label="Сохраняем запись…" compact={horizontal} />
          ) : (
            <p
              className={cn(
                'text-xs leading-5 text-[var(--app-muted)]',
                horizontal ? 'mt-1' : 'mt-2 max-w-sm'
              )}
            >
              {horizontal
                ? 'Запишите голос прямо в заметку.'
                : 'Запишите голос прямо в заметку, а затем прослушайте его в аудиоплеере.'}
            </p>
          )}
        </div>

        {horizontal && recorderState === 'recording' && <RecordingWaveform />}

        {recorderState === 'recording' ? (
          <div
            className={cn(
              'flex flex-wrap gap-2',
              horizontal ? 'ml-auto shrink-0' : 'mt-5 justify-center'
            )}
          >
            <button
              type="button"
              className={cn(
                'inline-flex items-center gap-2 border border-[var(--app-border)] font-medium text-[var(--app-muted)] hover:bg-white/[0.05] hover:text-[var(--app-text)]',
                horizontal ? 'h-9 rounded-lg px-3 text-xs' : 'h-10 rounded-xl px-4 text-sm'
              )}
              onClick={cancelRecording}
            >
              <X aria-hidden="true" className="size-4" /> Отменить
            </button>
            <button
              type="button"
              className={cn(
                'inline-flex items-center gap-2 bg-red-500 font-semibold text-white hover:bg-red-400',
                horizontal ? 'h-9 rounded-lg px-3 text-xs' : 'h-10 rounded-xl px-4 text-sm'
              )}
              onClick={stopRecording}
            >
              <Square aria-hidden="true" className="size-3.5 fill-current" /> Завершить запись
            </button>
          </div>
        ) : recorderState === 'idle' ? (
          <button
            type="button"
            className={cn(
              'bg-accent-500 hover:bg-accent-400 inline-flex items-center gap-2 font-semibold text-white',
              horizontal
                ? 'ml-auto h-9 shrink-0 rounded-lg px-3 text-xs'
                : 'mt-5 h-10 rounded-xl px-4 text-sm'
            )}
            onClick={() => void startRecording()}
          >
            <Mic aria-hidden="true" className="size-4" /> Начать запись
          </button>
        ) : null}

        {!horizontal && error && <RecorderError message={error} />}
      </div>
      {horizontal && error && <RecorderError message={error} />}
    </section>
  )
}

function RecordingWaveform(): React.JSX.Element {
  return (
    <div className="study-voice-recorder-waveform" aria-hidden="true">
      <div className="study-voice-recorder-waveform__track">
        {[0, 1].map((copy) => (
          <div key={copy} className="study-voice-recorder-waveform__segment">
            {WAVEFORM_HEIGHTS.map((height, index) => (
              <span
                key={index}
                className="study-voice-recorder-waveform__bar"
                style={{
                  height: `${height}px`,
                  animationDelay: `${-index * 97}ms`,
                  animationDuration: `${850 + (index % 7) * 130}ms`
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function RecorderProgress({
  label,
  compact = false
}: {
  label: string
  compact?: boolean
}): React.JSX.Element {
  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-2 text-xs text-[var(--app-muted)]',
        compact ? 'mt-1' : 'mt-4'
      )}
    >
      <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> {label}
    </div>
  )
}

function RecorderError({ message }: { message: string }): React.JSX.Element {
  return (
    <p
      role="alert"
      className="mt-4 w-full rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs leading-5 text-red-300"
    >
      {message}
    </p>
  )
}
