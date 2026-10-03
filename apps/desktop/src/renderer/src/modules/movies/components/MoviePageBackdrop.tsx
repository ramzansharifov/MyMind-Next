import { useState } from 'react'

interface MoviePageBackdropProps {
  posterUrl: string
}

export function MoviePageBackdrop({
  posterUrl
}: MoviePageBackdropProps): React.JSX.Element | null {
  const [failed, setFailed] = useState(false)
  if (failed) return null

  return (
    <div className="movie-page-backdrop" aria-hidden="true">
      <img
        src={posterUrl}
        alt=""
        className="movie-page-backdrop__image"
        onError={() => setFailed(true)}
      />
      <div className="movie-page-backdrop__shimmer" />
    </div>
  )
}
