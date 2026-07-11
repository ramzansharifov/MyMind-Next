import {
  MediaControlBar,
  MediaController,
  MediaFullscreenButton,
  MediaLoadingIndicator,
  MediaMuteButton,
  MediaPipButton,
  MediaPlaybackRateButton,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaTimeDisplay,
  MediaTimeRange,
  MediaVolumeRange
} from 'media-chrome/react'

interface StudyVideoPlayerProps {
  src: string
  title: string
  onReady?: () => void
  onError?: () => void
}

const playbackRates = [0.75, 1, 1.25, 1.5, 2]

export function StudyVideoPlayer({
  src,
  title,
  onReady,
  onError
}: StudyVideoPlayerProps): React.JSX.Element {
  return (
    <MediaController
      aria-label={`Видеоплеер «${title}»`}
      className="study-media-controller study-video-player"
    >
      <video
        slot="media"
        src={src}
        preload="metadata"
        playsInline
        aria-label={title}
        className="study-video-player__media"
        onLoadedMetadata={() => {
          onReady?.()
        }}
        onError={() => {
          onError?.()
        }}
      />

      <MediaLoadingIndicator
        noAutohide
        slot="centered-chrome"
        className="study-video-player__loading"
      />

      <MediaPlayButton slot="centered-chrome" className="study-video-player__center-play" />

      <MediaControlBar aria-label="Управление видео" className="study-video-player__controls">
        <MediaPlayButton />

        <MediaSeekBackwardButton seekOffset={10} className="study-media-seek-control" />

        <MediaSeekForwardButton seekOffset={10} className="study-media-seek-control" />

        <MediaTimeDisplay showDuration className="study-media-time" />

        <MediaTimeRange className="study-media-timeline" />

        <MediaMuteButton />

        <MediaVolumeRange className="study-media-volume-range" />

        <MediaPlaybackRateButton rates={playbackRates} />

        <MediaPipButton />

        <MediaFullscreenButton />
      </MediaControlBar>
    </MediaController>
  )
}
