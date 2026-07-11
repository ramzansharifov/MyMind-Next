import * as Slider from '@radix-ui/react-slider'
import { LoaderCircle, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from 'lucide-react'
import { useRef, useState } from 'react'

import { cn } from '../../../../shared/lib/cn'

interface StudyAudioPlayerProps {
  src: string
  title: string
  onReady?: () => void
  onError?: () => void
}

const playbackRates = [0.75, 1, 1.25, 1.5, 2] as const

const secondaryButtonClassName = cn(
  'flex size-8 shrink-0 items-center justify-center rounded-lg',
  'text-[var(--app-muted)] outline-none',
  'transition-colors',
  'hover:bg-white/[0.06] hover:text-[var(--app-text)]',
  'focus-visible:ring-2 focus-visible:ring-violet-500/35',
  'disabled:cursor-not-allowed disabled:opacity-35'
)

export function StudyAudioPlayer({
  src,
  title,
  onReady,
  onError
}: StudyAudioPlayerProps): React.JSX.Element {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const lastAudibleVolumeRef = useRef(1)

  const [isReady, setIsReady] = useState(false)

  const [isPlaying, setIsPlaying] = useState(false)

  const [currentTime, setCurrentTime] = useState(0)

  const [duration, setDuration] = useState(0)

  const [volume, setVolume] = useState(1)

  const [isMuted, setIsMuted] = useState(false)

  const [playbackRate, setPlaybackRate] = useState(1)

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0

  const progressValue = safeDuration > 0 ? Math.min(currentTime, safeDuration) : 0

  const effectiveVolume = isMuted ? 0 : volume

  const isSilent = isMuted || volume === 0

  async function togglePlayback(): Promise<void> {
    const audio = audioRef.current

    if (!audio || !isReady) {
      return
    }

    if (!audio.paused) {
      audio.pause()
      return
    }

    if (audio.ended || (safeDuration > 0 && audio.currentTime >= safeDuration)) {
      audio.currentTime = 0
      setCurrentTime(0)
    }

    try {
      await audio.play()
    } catch {
      setIsPlaying(false)
    }
  }

  function seekTo(value: number): void {
    const audio = audioRef.current

    if (!audio || !isReady || safeDuration <= 0) {
      return
    }

    const nextTime = clamp(value, 0, safeDuration)

    audio.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  function seekBy(seconds: number): void {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    seekTo(audio.currentTime + seconds)
  }

  function updateVolume(nextVolume: number): void {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    const normalizedVolume = clamp(nextVolume, 0, 1)

    audio.volume = normalizedVolume

    if (normalizedVolume > 0) {
      lastAudibleVolumeRef.current = normalizedVolume

      audio.muted = false
    }
  }

  function toggleMute(): void {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    if (audio.muted || audio.volume === 0) {
      if (audio.volume === 0) {
        audio.volume = lastAudibleVolumeRef.current
      }

      audio.muted = false
      return
    }

    audio.muted = true
  }

  function cyclePlaybackRate(): void {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    const currentIndex = playbackRates.findIndex((rate) => rate === playbackRate)

    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % playbackRates.length : 1

    const nextRate = playbackRates[nextIndex]

    audio.playbackRate = nextRate
    setPlaybackRate(nextRate)
  }

  return (
    <div className="overflow-hidden bg-[#0a0b0f] shadow-inner shadow-black/20">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget

          setIsReady(true)
          setDuration(getSafeDuration(audio.duration))
          setCurrentTime(audio.currentTime)

          onReady?.()
        }}
        onDurationChange={(event) => {
          setDuration(getSafeDuration(event.currentTarget.duration))
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime)
        }}
        onPlay={() => {
          setIsPlaying(true)
        }}
        onPause={() => {
          setIsPlaying(false)
        }}
        onEnded={() => {
          setIsPlaying(false)
        }}
        onVolumeChange={(event) => {
          const audio = event.currentTarget

          setVolume(audio.volume)
          setIsMuted(audio.muted)

          if (audio.volume > 0) {
            lastAudibleVolumeRef.current = audio.volume
          }
        }}
        onRateChange={(event) => {
          setPlaybackRate(event.currentTarget.playbackRate)
        }}
        onError={() => {
          setIsReady(false)
          setIsPlaying(false)
          onError?.()
        }}
      />

      <div className="flex items-center gap-3 p-3.5 max-[560px]:flex-wrap">
        <button
          type="button"
          disabled={!isReady}
          aria-label={isPlaying ? 'Поставить аудио на паузу' : `Воспроизвести «${title}»`}
          className={cn(
            'flex size-11 shrink-0 items-center justify-center rounded-full',
            'bg-violet-500 text-white shadow-lg shadow-violet-950/35',
            'transition-[background-color,transform,box-shadow] outline-none',
            'hover:scale-[1.03] hover:bg-violet-400',
            'active:scale-95',
            'focus-visible:ring-2 focus-visible:ring-violet-300/70',
            'disabled:cursor-wait disabled:opacity-60'
          )}
          onClick={() => {
            void togglePlayback()
          }}
        >
          {!isReady ? (
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
          ) : isPlaying ? (
            <Pause aria-hidden="true" className="size-5 fill-current" />
          ) : (
            <Play aria-hidden="true" className="ml-0.5 size-5 fill-current" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <Slider.Root
            min={0}
            max={safeDuration > 0 ? safeDuration : 1}
            step={0.1}
            value={[progressValue]}
            disabled={!isReady || safeDuration <= 0}
            aria-label="Позиция воспроизведения"
            aria-valuetext={`${formatAudioTime(progressValue)} из ${formatAudioTime(safeDuration)}`}
            className="relative flex h-5 w-full touch-none items-center select-none"
            onValueChange={(values) => {
              const nextTime = values[0]

              if (typeof nextTime === 'number') {
                seekTo(nextTime)
              }
            }}
          >
            <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-white/[0.1]">
              <Slider.Range className="absolute h-full rounded-full bg-violet-400" />
            </Slider.Track>

            <Slider.Thumb
              aria-label="Позиция аудио"
              className={cn(
                'block size-3.5 rounded-full border-2 border-violet-300',
                'bg-white shadow-md shadow-black/30 outline-none',
                'transition-transform hover:scale-125',
                'focus-visible:ring-4 focus-visible:ring-violet-500/25'
              )}
            />
          </Slider.Root>

          <div className="mt-0.5 flex items-center justify-between font-mono text-[11px] text-[var(--app-muted)] tabular-nums">
            <span>{formatAudioTime(progressValue)}</span>

            <span>{isReady ? formatAudioTime(safeDuration) : '--:--'}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 max-[560px]:ml-14">
          <button
            type="button"
            disabled={!isReady}
            aria-label="Назад на 10 секунд"
            title="Назад на 10 секунд"
            className={secondaryButtonClassName}
            onClick={() => {
              seekBy(-10)
            }}
          >
            <RotateCcw aria-hidden="true" className="size-4" />
          </button>

          <button
            type="button"
            disabled={!isReady}
            aria-label="Вперёд на 10 секунд"
            title="Вперёд на 10 секунд"
            className={secondaryButtonClassName}
            onClick={() => {
              seekBy(10)
            }}
          >
            <RotateCw aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-4 border-t border-white/[0.06] bg-white/[0.018] px-3.5 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            disabled={!isReady}
            aria-label={isSilent ? 'Включить звук' : 'Выключить звук'}
            title={isSilent ? 'Включить звук' : 'Выключить звук'}
            className={secondaryButtonClassName}
            onClick={toggleMute}
          >
            {isSilent ? (
              <VolumeX aria-hidden="true" className="size-4" />
            ) : (
              <Volume2 aria-hidden="true" className="size-4" />
            )}
          </button>

          <Slider.Root
            min={0}
            max={1}
            step={0.01}
            value={[effectiveVolume]}
            disabled={!isReady}
            aria-label="Громкость"
            aria-valuetext={`${Math.round(effectiveVolume * 100)}%`}
            className="relative flex h-5 w-full max-w-28 touch-none items-center select-none"
            onValueChange={(values) => {
              const nextVolume = values[0]

              if (typeof nextVolume === 'number') {
                updateVolume(nextVolume)
              }
            }}
          >
            <Slider.Track className="relative h-1 grow overflow-hidden rounded-full bg-white/[0.1]">
              <Slider.Range className="absolute h-full rounded-full bg-white/55" />
            </Slider.Track>

            <Slider.Thumb
              aria-label="Уровень громкости"
              className="block size-3 rounded-full bg-white transition-transform outline-none hover:scale-125 focus-visible:ring-4 focus-visible:ring-violet-500/25"
            />
          </Slider.Root>

          <span className="w-8 shrink-0 text-right font-mono text-[10px] text-[var(--app-muted)] tabular-nums max-[480px]:hidden">
            {Math.round(effectiveVolume * 100)}%
          </span>
        </div>

        <button
          type="button"
          disabled={!isReady}
          aria-label={`Скорость воспроизведения ${formatPlaybackRate(playbackRate)}`}
          title="Изменить скорость воспроизведения"
          className={cn(
            'flex h-8 min-w-12 shrink-0 items-center justify-center rounded-lg px-2',
            'font-mono text-xs font-semibold tabular-nums',
            'text-[var(--app-muted)] outline-none',
            'transition-colors',
            'hover:bg-white/[0.06] hover:text-violet-200',
            'focus-visible:ring-2 focus-visible:ring-violet-500/35',
            'disabled:cursor-not-allowed disabled:opacity-35'
          )}
          onClick={cyclePlaybackRate}
        >
          {formatPlaybackRate(playbackRate)}
        </button>
      </div>
    </div>
  )
}

function getSafeDuration(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00'
  }

  const wholeSeconds = Math.floor(seconds)

  const hours = Math.floor(wholeSeconds / 3600)

  const minutes = Math.floor((wholeSeconds % 3600) / 60)

  const remainingSeconds = wholeSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(
      2,
      '0'
    )}`
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

function formatPlaybackRate(value: number): string {
  return `${Number(value.toFixed(2))}×`
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}
