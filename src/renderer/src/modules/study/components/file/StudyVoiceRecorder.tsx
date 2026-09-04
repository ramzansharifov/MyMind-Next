import { LoaderCircle, Mic, RotateCcw, Square, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type {
  OpenStudyAssetInput,
  StudyBlock,
  StudyLocalAsset
} from '../../../../../../shared/contracts/study'
import type { SaveRecordedAudioInput } from '../study-block-asset-context'
import { StudyFileBlockView } from './StudyFileBlockView'

type AudioBlock = Extract<StudyBlock, { type: 'audio' }>
type RecorderState = 'idle' | 'requesting' | 'recording' | 'saving'
type RecordingMimeType = SaveRecordedAudioInput['mimeType']

const MIME_TYPE_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4'
] as const

interface StudyVoiceRecorderProps {
  materialId: string
  block: AudioBlock
  saveRecording: (input: SaveRecordedAudioInput) => Promise<StudyLocalAsset>
  onOpenFile: (input: OpenStudyAssetInput) => Promise<void>
  onChange: (block: AudioBlock) => void
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
  onChange
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

  if (hasSavedRecording && recorderState === 'idle') {
    return (
      <div className="space-y-2">
        <StudyFileBlockView block={block} onOpenFile={onOpenFile} />
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--app-text)]"
          onClick={() => void startRecording()}
        >
          <RotateCcw aria-hidden="true" className="size-3.5" />
          Записать заново
        </button>
        {error && <RecorderError message={error} />}
      </div>
    )
  }

  return (
    <section className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-5 py-6">
      <div className="mx-auto flex max-w-lg flex-col items-center text-center">
        <span
          className={
            recorderState === 'recording'
              ? 'flex size-14 items-center justify-center rounded-full bg-red-500/15 text-red-300 ring-4 ring-red-500/10'
              : 'flex size-14 items-center justify-center rounded-full bg-violet-500/10 text-violet-300'
          }
        >
          <Mic aria-hidden="true" className="size-6" />
        </span>

        <h3 className="mt-3 text-sm font-semibold text-[var(--app-text)]">Голосовое</h3>

        {recorderState === 'recording' ? (
          <>
            <div className="mt-2 flex items-center gap-2 text-sm font-medium text-red-200">
              <span className="size-2 animate-pulse rounded-full bg-red-400" />
              <span aria-live="polite">Идёт запись · {formatDuration(durationSeconds)}</span>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] px-4 text-sm font-medium text-[var(--app-muted)] hover:bg-white/[0.05] hover:text-[var(--app-text)]"
                onClick={cancelRecording}
              >
                <X aria-hidden="true" className="size-4" /> Отменить
              </button>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-semibold text-white hover:bg-red-400"
                onClick={stopRecording}
              >
                <Square aria-hidden="true" className="size-3.5 fill-current" /> Завершить запись
              </button>
            </div>
          </>
        ) : recorderState === 'requesting' ? (
          <RecorderProgress label="Запрашиваем доступ к микрофону…" />
        ) : recorderState === 'saving' ? (
          <RecorderProgress label="Сохраняем запись…" />
        ) : (
          <>
            <p className="mt-2 max-w-sm text-xs leading-5 text-[var(--app-muted)]">
              Запишите голос прямо в заметку, а затем прослушайте его в аудиоплеере.
            </p>
            <button
              type="button"
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400"
              onClick={() => void startRecording()}
            >
              <Mic aria-hidden="true" className="size-4" /> Начать запись
            </button>
          </>
        )}

        {error && <RecorderError message={error} />}
      </div>
    </section>
  )
}

function RecorderProgress({ label }: { label: string }): React.JSX.Element {
  return (
    <div role="status" className="mt-4 flex items-center gap-2 text-xs text-[var(--app-muted)]">
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
