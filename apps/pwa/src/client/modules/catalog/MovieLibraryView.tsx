import { Action, RefreshRegion } from '../../../ui/browser'
import type { MovieRecord } from '@mymind/contracts/movies'
import { Bookmark, Check, Heart, Star } from 'lucide-react'
import { EmptyState } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { movieTypeLabel } from './movie-presentation'
interface MovieLibraryViewProps {
  movies: MovieRecord[]
  refreshing: boolean
  onRefresh(): void
  onOpen(movie: MovieRecord): void
  onToggleFavorite(movie: MovieRecord): void
  onSearchWeb(movie: MovieRecord): void
}
function MoviePoster({ movie }: { movie: MovieRecord }): React.JSX.Element {
  const theme = useTheme()
  return movie.posterUrl ? (
    <img
      src={movie.posterUrl}
      style={{
        width: '100%',
        aspectRatio: 2 / 3,
        objectFit: 'cover'
      }}
      alt=""
      draggable="false"
    ></img>
  ) : (
    <div
      className="ui-stack"
      style={{
        width: '100%',
        aspectRatio: 2 / 3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.raised
      }}
    >
      <span
        className="ui-text"
        style={{
          paddingInline: 10,
          textAlign: 'center',
          color: theme.muted,
          fontSize: 11
        }}
      >
        Постер не указан
      </span>
    </div>
  )
}
function MovieCard({
  movie,
  onOpen,
  onToggleFavorite
}: {
  movie: MovieRecord
  onOpen(): void
  onToggleFavorite(): void
}): React.JSX.Element {
  const theme = useTheme()
  const watched = movie.status === 'watched'
  return (
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%',
        minWidth: 0,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface
      }}
    >
      <div
        className="ui-stack"
        style={{
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Action
          role={'button'}
          aria-label={`Открыть фильм «${movie.title}»`}
          onClick={onOpen}
          style={{
            opacity: 1
          }}
          pressedStyle={{
            opacity: 0.78
          }}
        >
          <MoviePoster movie={movie} />
          <div
            className="ui-stack"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 72,
              backgroundColor: '#00000055',
              pointerEvents: 'none'
            }}
          ></div>
        </Action>

        <Action
          hitPadding={4}
          role={'button'}
          aria-label={movie.favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          aria-selected={movie.favorite}
          onClick={onToggleFavorite}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: movie.favorite ? '#fda4af44' : '#ffffff22',
            borderRadius: 12,
            backgroundColor: '#00000080'
          }}
          pressedStyle={{
            backgroundColor: '#000000AA'
          }}
        >
          <Heart
            size={16}
            color={movie.favorite ? '#fda4af' : '#ffffffB3'}
            fill={movie.favorite ? '#fda4af' : 'none'}
          />
        </Action>

        <div
          className="ui-stack"
          style={{
            position: 'absolute',
            left: 10,
            right: 10,
            bottom: 10,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 6,
            pointerEvents: 'none'
          }}
        >
          <div
            className="ui-stack"
            style={{
              maxWidth: '72%',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingInline: 7,
              paddingBlock: 4,
              borderWidth: 1,
              borderColor: watched ? '#6ee7b733' : theme.accent + '44',
              borderRadius: 8,
              backgroundColor: '#00000088'
            }}
          >
            {watched ? (
              <Check size={11} color="#a7f3d0" />
            ) : (
              <Bookmark size={11} color={theme.accent} />
            )}
            <span
              className="ui-text"
              data-lines={1}
              style={{
                color: watched ? '#a7f3d0' : theme.accent,
                fontSize: 10.5,
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1
              }}
            >
              {watched ? 'Просмотрено' : 'Хочу посмотреть'}
            </span>
          </div>

          {watched && movie.rating !== null ? (
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                paddingInline: 7,
                paddingBlock: 4,
                borderRadius: 8,
                backgroundColor: '#00000099'
              }}
            >
              <Star size={11} color="#fde68a" fill="#fde68a" />
              <span
                className="ui-text"
                style={{
                  color: '#fde68a',
                  fontSize: 10.5,
                  fontWeight: 700
                }}
              >
                {movie.rating.toFixed(1)}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <Action
        role={'button'}
        aria-label={`Подробнее о фильме «${movie.title}»`}
        onClick={onOpen}
        style={{
          minHeight: 64,
          justifyContent: 'center',
          paddingInline: 14,
          paddingBlock: 11,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: theme.surface,
          opacity: 1
        }}
        pressedStyle={{
          backgroundColor: theme.raised,
          opacity: 0.82
        }}
      >
        <span
          className="ui-text"
          data-lines={1}
          style={{
            color: theme.text,
            fontSize: 14,
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 1
          }}
        >
          {movie.title}
        </span>
        <span
          className="ui-text"
          style={{
            marginTop: 2,
            color: theme.muted,
            fontSize: 11
          }}
        >
          {movieTypeLabel(movie.type)}
        </span>
      </Action>
    </div>
  )
}
export function MovieLibraryView({
  movies,
  refreshing,
  onRefresh,
  onOpen,
  onToggleFavorite
}: MovieLibraryViewProps): React.JSX.Element {
  return (
    <RefreshRegion
      className="ui-scroll"
      key={'desktop-parity-movie-grid'}
      onRefresh={onRefresh}
      busy={refreshing}
    >
      <div
        className="ui-stack ui-scroll-content"
        style={{
          paddingBottom: 96
        }}
      >
        <div
          className="ui-stack ui-list"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${2}, minmax(0, 1fr))`,
            gap: 12,
            rowGap: 18
          }}
        >
          {movies.length > 0 ? (
            movies.map((item) => (
              <div className="ui-stack ui-list-item" key={((item) => item.id)(item)}>
                {
                  <div
                    className="ui-stack"
                    style={{
                      flex: '1 1 0%',
                      minWidth: 0
                    }}
                  >
                    <MovieCard
                      movie={item}
                      onOpen={() => onOpen(item)}
                      onToggleFavorite={() => onToggleFavorite(item)}
                    />
                  </div>
                }
              </div>
            ))
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </RefreshRegion>
  )
}
