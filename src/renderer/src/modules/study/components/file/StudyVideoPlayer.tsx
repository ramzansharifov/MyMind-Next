import * as Slider from '@radix-ui/react-slider'
import {
  LoaderCircle,
  Maximize2,
  Minimize2,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '../../../../shared/lib/cn'

interface StudyVideoPlayerProps {
  src: string
  title: string
  onReady?: () => void
  onError?: () => void
}

interface PictureInPictureDocument extends Document {
  pictureInPictureEnabled?: boolean
  pictureInPictureElement?: Element | null
  exitPictureInPicture?: () => Promise<void>
}

interface PictureInPictureVideoElement extends HTMLVideoElement {
  requestPictureInPicture?: () => Promise<unknown>
}

const playbackRates = [0.75, 1, 1.25, 1.5, 2] as const

const controlButtonClassName = cn(
  'flex size-9 shrink-0 items-center justify-center rounded-lg',
  'text-white/80 outline-none',
  'transition-[background-color,color,transform]',
  'hover:bg-white/10 hover:text-white',
  'active:scale-95',
  'focus-visible:ring-2 focus-visible:ring-violet-300/70',
  'disabled:cursor-not-allowed disabled:opacity-35'
)

export function StudyVideoPlayer({
  src,
  title,
  onReady,
  onError
}: StudyVideoPlayerProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)

  const hideControlsTimerRef = useRef<number | null>(null)

  const lastAudibleVolumeRef = useRef(1)

  const [isReady, setIsReady] = useState(false)

  const [isPlaying, setIsPlaying] = useState(false)

  const [isBuffering, setIsBuffering] = useState(false)

  const [controlsVisible, setControlsVisible] = useState(true)

  const [isFullscreen, setIsFullscreen] = useState(false)

  const [currentTime, setCurrentTime] = useState(0)

  const [duration, setDuration] = useState(0)

  const [bufferedEnd, setBufferedEnd] = useState(0)

  const [volume, setVolume] = useState(1)

  const [isMuted, setIsMuted] = useState(false)

  const [playbackRate, setPlaybackRate] = useState(1)

  const safeDuration = getSafeDuration(duration)

  const progressValue = safeDuration > 0 ? clamp(currentTime, 0, safeDuration) : 0

  const bufferedPercent = safeDuration > 0 ? clamp((bufferedEnd / safeDuration) * 100, 0, 100) : 0

  const effectiveVolume = isMuted ? 0 : volume

  const isSilent = isMuted || volume === 0

  const pictureInPictureAvailable =
    isReady && Boolean((document as PictureInPictureDocument).pictureInPictureEnabled)

  useEffect(() => {
    function handleFullscreenChange(): void {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  useEffect(() => {
    return () => {
      clearControlsTimer()
    }
  }, [])

  function clearControlsTimer(): void {
    if (hideControlsTimerRef.current === null) {
      return
    }

    window.clearTimeout(hideControlsTimerRef.current)

    hideControlsTimerRef.current = null
  }

  function scheduleControlsHide(delay = 2400): void {
    clearControlsTimer()

    const video = videoRef.current

    if (!video || video.paused) {
      return
    }

    hideControlsTimerRef.current = window.setTimeout(() => {
      hideControlsTimerRef.current = null

      setControlsVisible(false)
    }, delay)
  }

  function revealControls(): void {
    setControlsVisible(true)
    scheduleControlsHide()
  }

  async function togglePlayback(): Promise<void> {
    const video = videoRef.current

    if (!video || !isReady) {
      return
    }

    if (!video.paused) {
      video.pause()
      return
    }

    if (video.ended || (safeDuration > 0 && video.currentTime >= safeDuration)) {
      video.currentTime = 0
      setCurrentTime(0)
    }

    try {
      await video.play()
    } catch {
      setIsPlaying(false)
    }
  }

  function seekTo(value: number): void {
    const video = videoRef.current

    if (!video || !isReady || safeDuration <= 0) {
      return
    }

    const nextTime = clamp(value, 0, safeDuration)

    video.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  function seekBy(seconds: number): void {
    const video = videoRef.current

    if (!video) {
      return
    }

    seekTo(video.currentTime + seconds)
  }

  function updateVolume(nextVolume: number): void {
    const video = videoRef.current

    if (!video) {
      return
    }

    const normalizedVolume = clamp(nextVolume, 0, 1)

    video.volume = normalizedVolume

    if (normalizedVolume > 0) {
      lastAudibleVolumeRef.current = normalizedVolume

      video.muted = false
    }
  }

  function toggleMute(): void {
    const video = videoRef.current

    if (!video) {
      return
    }

    if (video.muted || video.volume === 0) {
      if (video.volume === 0) {
        video.volume = lastAudibleVolumeRef.current
      }

      video.muted = false
      return
    }

    video.muted = true
  }

  function cyclePlaybackRate(): void {
    const video = videoRef.current

    if (!video) {
      return
    }

    const currentIndex = playbackRates.findIndex((rate) => rate === playbackRate)

    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % playbackRates.length : 1

    const nextRate = playbackRates[nextIndex]

    video.playbackRate = nextRate
    setPlaybackRate(nextRate)
  }

  async function toggleFullscreen(): Promise<void> {
    const container = containerRef.current

    if (!container) {
      return
    }

    try {
      if (document.fullscreenElement === container) {
        await document.exitFullscreen()
        return
      }

      await container.requestFullscreen()
    } catch {
      return
    }
  }

  async function togglePictureInPicture(): Promise<void> {
    const video = videoRef.current as PictureInPictureVideoElement | null

    const pictureInPictureDocument = document as PictureInPictureDocument

    if (
      !video ||
      !pictureInPictureDocument.pictureInPictureEnabled ||
      !video.requestPictureInPicture
    ) {
      return
    }

    try {
      if (pictureInPictureDocument.pictureInPictureElement === video) {
        await pictureInPictureDocument.exitPictureInPicture?.()

        return
      }

      await video.requestPictureInPicture()
    } catch {
      return
    }
  }

  function handleKeyboard(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.target !== event.currentTarget) {
      return
    }

    const key = event.key.toLowerCase()

    if (key === ' ' || key === 'k') {
      event.preventDefault()
      void togglePlayback()
      return
    }

    if (key === 'arrowleft') {
      event.preventDefault()
      seekBy(-10)
      return
    }

    if (key === 'arrowright') {
      event.preventDefault()
      seekBy(10)
      return
    }

    if (key === 'm') {
      event.preventDefault()
      toggleMute()
      return
    }

    if (key === 'f') {
      event.preventDefault()
      void toggleFullscreen()
    }
  }

  return (
    <div
      ref={containerRef}
      role="group"
      tabIndex={0}
      aria-label={`Видеоплеер «${title}»`}
      className={cn(
        'group/video relative min-h-52 overflow-hidden bg-black outline-none',
        'focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-inset',
        isFullscreen && 'flex h-screen items-center'
      )}
      onKeyDown={handleKeyboard}
      onPointerMove={() => {
        revealControls()
      }}
      onPointerLeave={() => {
        scheduleControlsHide(700)
      }}
      onFocusCapture={() => {
        setControlsVisible(true)
      }}
    >
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline
        aria-label={title}
        className={cn(
          'block min-h-52 w-full bg-black object-contain',
          isFullscreen ? 'h-screen max-h-screen' : 'max-h-[36rem]'
        )}
        onClick={() => {
          void togglePlayback()
        }}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget

          setIsReady(true)
          setDuration(getSafeDuration(video.duration))
          setCurrentTime(video.currentTime)
          setBufferedEnd(0)

          onReady?.()
        }}
        onDurationChange={(event) => {
          setDuration(getSafeDuration(event.currentTarget.duration))
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime)
        }}
        onProgress={(event) => {
          const video = event.currentTarget

          const lastRangeIndex = video.buffered.length - 1

          setBufferedEnd(
            lastRangeIndex >= 0 ? getSafeDuration(video.buffered.end(lastRangeIndex)) : 0
          )
        }}
        onPlay={() => {
          setIsPlaying(true)
        }}
        onPlaying={() => {
          setIsPlaying(true)
          setIsBuffering(false)
          scheduleControlsHide()
        }}
        onPause={() => {
          clearControlsTimer()
          setIsPlaying(false)
          setIsBuffering(false)
          setControlsVisible(true)
        }}
        onWaiting={() => {
          if (!videoRef.current?.paused) {
            setIsBuffering(true)
          }
        }}
        onCanPlay={() => {
          setIsBuffering(false)
        }}
        onEnded={() => {
          clearControlsTimer()
          setIsPlaying(false)
          setIsBuffering(false)
          setControlsVisible(true)
        }}
        onVolumeChange={(event) => {
          const video = event.currentTarget

          setVolume(video.volume)
          setIsMuted(video.muted)

          if (video.volume > 0) {
            lastAudibleVolumeRef.current = video.volume
          }
        }}
        onRateChange={(event) => {
          setPlaybackRate(event.currentTarget.playbackRate)
        }}
        onError={() => {
          clearControlsTimer()
          setIsReady(false)
          setIsPlaying(false)
          setIsBuffering(false)
          setControlsVisible(true)

          onError?.()
        }}
      />

      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0',
          'bg-gradient-to-t from-black/85 via-black/5 to-black/15',
          'transition-opacity duration-200',
          controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0'
        )}
      />

      {(!isPlaying || isBuffering || !isReady) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            disabled={!isReady || isBuffering}
            aria-label={isBuffering ? 'Видео загружается' : `Воспроизвести «${title}»`}
            className={cn(
              'pointer-events-auto flex size-16 items-center justify-center rounded-full',
              'bg-violet-500 text-white shadow-2xl shadow-black/40',
              'transition-[background-color,transform] outline-none',
              'hover:scale-105 hover:bg-violet-400',
              'active:scale-95',
              'focus-visible:ring-4 focus-visible:ring-violet-300/40',
              'disabled:cursor-wait disabled:bg-black/55'
            )}
            onClick={() => {
              void togglePlayback()
            }}
          >
            {!isReady || isBuffering ? (
              <LoaderCircle aria-hidden="true" className="size-7 animate-spin" />
            ) : (
              <Play aria-hidden="true" className="ml-1 size-7 fill-current" />
            )}
          </button>
        </div>
      )}

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 z-10 px-3 pb-3',
          'transition-[opacity,transform] duration-200',
          controlsVisible || !isPlaying
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-2 opacity-0'
        )}
      >
        <Slider.Root
          min={0}
          max={safeDuration > 0 ? safeDuration : 1}
          step={0.1}
          value={[progressValue]}
          disabled={!isReady || safeDuration <= 0}
          aria-label="Позиция видео"
          aria-valuetext={`${formatVideoTime(progressValue)} из ${formatVideoTime(safeDuration)}`}
          className="relative flex h-6 w-full touch-none items-center select-none"
          onValueChange={(values) => {
            const nextTime = values[0]

            if (typeof nextTime === 'number') {
              seekTo(nextTime)
            }
          }}
        >
          <Slider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-white/20">
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 bg-white/25"
              style={{
                width: `${bufferedPercent}%`
              }}
            />

            <Slider.Range className="absolute h-full rounded-full bg-violet-400" />
          </Slider.Track>

          <Slider.Thumb
            aria-label="Позиция воспроизведения видео"
            className={cn(
              'block size-3.5 rounded-full border-2 border-violet-300',
              'bg-white shadow-md shadow-black/40 outline-none',
              'transition-transform hover:scale-125',
              'focus-visible:ring-4 focus-visible:ring-violet-500/30'
            )}
          />
        </Slider.Root>

        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            disabled={!isReady}
            aria-label={isPlaying ? 'Поставить видео на паузу' : 'Воспроизвести видео'}
            className={controlButtonClassName}
            onClick={() => {
              void togglePlayback()
            }}
          >
            {isPlaying ? (
              <Pause aria-hidden="true" className="size-5 fill-current" />
            ) : (
              <Play aria-hidden="true" className="ml-0.5 size-5 fill-current" />
            )}
          </button>

          <button
            type="button"
            disabled={!isReady}
            aria-label="Назад на 10 секунд"
            title="Назад на 10 секунд"
            className={controlButtonClassName}
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
            className={controlButtonClassName}
            onClick={() => {
              seekBy(10)
            }}
          >
            <RotateCw aria-hidden="true" className="size-4" />
          </button>

          <span className="ml-1 shrink-0 font-mono text-[11px] text-white/80 tabular-nums">
            {formatVideoTime(progressValue)}
            {' / '}
            {isReady ? formatVideoTime(safeDuration) : '--:--'}
          </span>

          <div className="ml-auto flex min-w-0 items-center gap-1">
            <button
              type="button"
              disabled={!isReady}
              aria-label={isSilent ? 'Включить звук' : 'Выключить звук'}
              title={isSilent ? 'Включить звук' : 'Выключить звук'}
              className={controlButtonClassName}
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
              aria-label="Громкость видео"
              aria-valuetext={`${Math.round(effectiveVolume * 100)}%`}
              className="relative flex h-6 w-20 touch-none items-center select-none max-[560px]:hidden"
              onValueChange={(values) => {
                const nextVolume = values[0]

                if (typeof nextVolume === 'number') {
                  updateVolume(nextVolume)
                }
              }}
            >
              <Slider.Track className="relative h-1 grow overflow-hidden rounded-full bg-white/20">
                <Slider.Range className="absolute h-full rounded-full bg-white/70" />
              </Slider.Track>

              <Slider.Thumb
                aria-label="Уровень громкости видео"
                className="block size-3 rounded-full bg-white transition-transform outline-none hover:scale-125 focus-visible:ring-4 focus-visible:ring-violet-500/30"
              />
            </Slider.Root>

            <button
              type="button"
              disabled={!isReady}
              aria-label={`Скорость воспроизведения ${formatPlaybackRate(playbackRate)}`}
              title="Изменить скорость"
              className={cn(
                controlButtonClassName,
                'w-auto min-w-12 px-2 font-mono text-xs font-semibold tabular-nums'
              )}
              onClick={cyclePlaybackRate}
            >
              {formatPlaybackRate(playbackRate)}
            </button>

            {pictureInPictureAvailable && (
              <button
                type="button"
                aria-label="Картинка в картинке"
                title="Картинка в картинке"
                className={controlButtonClassName}
                onClick={() => {
                  void togglePictureInPicture()
                }}
              >
                <PictureInPicture2 aria-hidden="true" className="size-4" />
              </button>
            )}

            <button
              type="button"
              disabled={!isReady}
              aria-label={isFullscreen ? 'Выйти из полноэкранного режима' : 'Открыть на весь экран'}
              title={isFullscreen ? 'Выйти из полноэкранного режима' : 'На весь экран'}
              className={controlButtonClassName}
              onClick={() => {
                void toggleFullscreen()
              }}
            >
              {isFullscreen ? (
                <Minimize2 aria-hidden="true" className="size-4" />
              ) : (
                <Maximize2 aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getSafeDuration(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function formatVideoTime(seconds: number): string {
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
