import {
  MediaControlBar,
  MediaController,
  MediaMuteButton,
  MediaPlaybackRateButton,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeDisplay,
  MediaTimeRange,
  MediaVolumeRange
} from 'media-chrome/react'

interface StudyAudioPlayerProps {
  src: string
  title: string
  onReady?: () => void
  onError?: () => void
}

const playbackRates = [0.75, 1, 1.25, 1.5, 2]

export function StudyAudioPlayer({
  src,
  title,
  onReady,
  onError
}: StudyAudioPlayerProps): React.JSX.Element {
  return (
    <MediaController
      audio
      aria-label={`Аудиоплеер «${title}»`}
      className="study-media-controller study-audio-player"
    >
      <audio
        slot="media"
        src={src}
        preload="metadata"
        aria-label={title}
        onLoadedMetadata={() => {
          onReady?.()
        }}
        onError={() => {
          onError?.()
        }}
      />

      <MediaControlBar aria-label="Управление аудио" className="study-audio-player__controls">
        <MediaPlayButton />

        <MediaSeekBackwardButton seekOffset={10} className="study-media-seek-control" />

        <MediaSeekForwardButton seekOffset={10} className="study-media-seek-control" />

        <MediaTimeDisplay showDuration className="study-media-time" />

        <MediaTimeRange className="study-media-timeline" />

        <MediaMuteButton />

        <MediaVolumeRange className="study-media-volume-range" />

        <MediaPlaybackRateButton rates={playbackRates} />
      </MediaControlBar>
    </MediaController>
  )
}
