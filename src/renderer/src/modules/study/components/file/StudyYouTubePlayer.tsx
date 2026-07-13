interface StudyYouTubePlayerProps {
  embedUrl: string
  title: string
}

export function StudyYouTubePlayer({
  embedUrl,
  title
}: StudyYouTubePlayerProps): React.JSX.Element {
  return (
    <div className="aspect-video w-full overflow-hidden bg-black">
      <iframe
        src={embedUrl}
        title={title}
        className="size-full border-0"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  )
}
