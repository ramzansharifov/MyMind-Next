import { Action, useViewport, DialogLayer } from '../../../ui/browser'
import { useState } from 'react'
import type { MovieRecord } from '@mymind/contracts/movies'
import {
  CalendarDays,
  Clapperboard,
  Clock3,
  Film,
  Heart,
  Layers,
  List,
  Star,
  Tags,
  Users,
  type LucideIcon
} from 'lucide-react'
import { AppDialog } from '../../shared/ui/AppDialog'
import { useConfirmation } from '../../shared/ui/confirmation-context'
import { Button, IconButton } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { formatMovieRuntime, isEpisodicMovieType, movieTypeLabel } from './movie-presentation'
interface MovieDetailViewProps {
  movie: MovieRecord
  busy: boolean
  onBack(): void
  onEdit(): void
  onDelete(): void
  onViewJson(): void
  onUpdate(movie: MovieRecord): void
  onSearchWeb(query: string): void
}
function MetadataChip({
  label,
  icon: Icon,
  onClick
}: {
  label: string
  icon?: LucideIcon
  onClick?: () => void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Action
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      disabled={!onClick}
      style={{
        minHeight: 38,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        paddingInline: 12,
        paddingBlock: 8,
        opacity: 1
      }}
      pressedStyle={{
        borderColor: onClick && true ? theme.accent + '66' : theme.border,
        backgroundColor: theme.raised,
        opacity: 0.78
      }}
    >
      {Icon ? <Icon size={15} color={onClick ? theme.accent : theme.muted} /> : null}
      <span
        className="ui-text"
        style={{
          color: onClick ? theme.accent : theme.text,
          fontSize: 13,
          fontWeight: 600
        }}
      >
        {label}
      </span>
    </Action>
  )
}
function PersonRow({
  label,
  icon: Icon,
  children
}: {
  label: string
  icon: LucideIcon
  children: React.ReactNode
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8
      }}
    >
      <Icon size={16} color={theme.muted} style={{ marginTop: 3 }} />
      <span
        className="ui-text"
        style={{
          color: theme.muted,
          fontSize: 13,
          lineHeight: '22px'
        }}
      >
        {label}:
      </span>
      <div
        className="ui-stack"
        style={{
          minWidth: 0,
          flex: '1 1 0%',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 6
        }}
      >
        {children}
      </div>
    </div>
  )
}
export function MovieDetailView({
  movie,
  busy,
  onBack,
  onEdit,
  onDelete,
  onViewJson,
  onUpdate,
  onSearchWeb
}: MovieDetailViewProps): React.JSX.Element {
  const theme = useTheme()
  const confirm = useConfirmation()
  const window = useViewport()
  const [posterOpen, setPosterOpen] = useState(false)
  const [ratingOpen, setRatingOpen] = useState(false)
  const [pendingRating, setPendingRating] = useState<number | null>(null)
  const episodic = isEpisodicMovieType(movie.type)
  const runtime = formatMovieRuntime(movie.runtimeMinutes)
  const episodeRuntime = formatMovieRuntime(movie.episodeRuntimeMinutes)
  const watched = movie.status === 'watched'
  const wide = window.width >= 620
  const requestWatchlist = (): void => {
    if (!watched || busy) return
    void confirm({
      title: 'Вернуть в «Хочу посмотреть»?',
      subject: movie.title,
      description:
        'Запись перестанет считаться просмотренной и вернётся в список «Хочу посмотреть».',
      tone: 'warning',
      notice: movie.rating !== null ? 'Текущая оценка будет удалена' : null,
      confirmLabel: 'Вернуть',
      onConfirm: () => onUpdate({ ...movie, status: 'watchlist', rating: null })
    })
  }
  const requestWatched = (): void => {
    if (watched || busy) return
    setPendingRating(null)
    setRatingOpen(true)
  }
  return (
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%'
      }}
    >
      <div
        className="ui-stack"
        style={{
          minHeight: 52,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          padding: 5,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 16,
          backgroundColor: theme.surface
        }}
      >
        <Button label="Назад" icon="back" compact ghost onClick={onBack} disabled={busy} />
        <div
          className="ui-stack"
          style={{
            flex: '1 1 0%'
          }}
        ></div>
        <Button
          label="Смотреть"
          icon="play"
          compact
          primary
          onClick={() => onSearchWeb(`Смотреть фильм ${movie.title}`)}
          disabled={busy}
        />
        <IconButton label="JSON" icon="json" ghost onClick={onViewJson} disabled={busy} />
        <IconButton label="Изменить" icon="edit" ghost onClick={onEdit} disabled={busy} />
        <IconButton label="Удалить" icon="delete" danger ghost disabled={busy} onClick={onDelete} />
      </div>

      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 44
          }}
        >
          <div
            className="ui-stack"
            style={{
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 22,
              backgroundColor: theme.surface
            }}
          >
            <div
              className="ui-stack"
              style={{
                flexDirection: wide ? 'row' : 'column'
              }}
            >
              <Action
                role={movie.posterUrl ? 'button' : undefined}
                aria-label={movie.posterUrl ? 'Открыть постер на весь экран' : undefined}
                disabled={!movie.posterUrl}
                onClick={() => setPosterOpen(true)}
                style={{
                  width: wide ? 250 : '100%',
                  aspectRatio: 2 / 3,
                  overflow: 'hidden',
                  backgroundColor: theme.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 1
                }}
                pressedStyle={{
                  opacity: 0.82
                }}
              >
                {movie.posterUrl ? (
                  <img
                    src={movie.posterUrl}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain'
                    }}
                    alt=""
                    draggable="false"
                  ></img>
                ) : (
                  <span
                    className="ui-text"
                    style={{
                      color: theme.muted,
                      fontSize: 14
                    }}
                  >
                    Постер не указан
                  </span>
                )}
              </Action>

              <div
                className="ui-stack"
                style={{
                  minWidth: 0,
                  flex: '1 1 0%',
                  padding: wide ? 28 : 16
                }}
              >
                <div
                  className="ui-stack"
                  style={{
                    paddingBottom: 20,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border
                  }}
                >
                  <div
                    className="ui-stack"
                    style={{
                      minWidth: 0,
                      flex: '1 1 0%'
                    }}
                  >
                    <span
                      className="ui-text"
                      style={{
                        color: theme.text,
                        fontSize: wide ? 30 : 25,
                        lineHeight: wide ? '38px' : '32px',
                        fontWeight: 700,
                        letterSpacing: -0.7
                      }}
                    >
                      {movie.title}
                    </span>
                    {movie.originalTitle ? (
                      <span
                        className="ui-text"
                        style={{
                          marginTop: 5,
                          color: theme.muted,
                          fontSize: 15
                        }}
                      >
                        {movie.originalTitle}
                      </span>
                    ) : null}
                  </div>

                  <div
                    className="ui-stack"
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8
                    }}
                  >
                    {watched && movie.rating !== null ? (
                      <div
                        className="ui-stack"
                        style={{
                          minHeight: 52,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 7,
                          paddingInline: 12,
                          borderWidth: 1,
                          borderColor: '#fbbf2433',
                          borderRadius: 16,
                          backgroundColor: '#fbbf2414'
                        }}
                      >
                        <Star size={19} color="#fde68a" fill="#fde68a" />
                        <span
                          className="ui-text"
                          style={{
                            color: '#fde68a',
                            fontSize: 19,
                            fontWeight: 700
                          }}
                        >
                          {movie.rating}
                        </span>
                        <span
                          className="ui-text"
                          style={{
                            color: '#fde68aAA',
                            fontSize: 11
                          }}
                        >
                          / 10
                        </span>
                      </div>
                    ) : null}

                    <Action
                      role={'button'}
                      aria-label={movie.favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                      aria-selected={movie.favorite}
                      aria-disabled={busy}
                      disabled={busy}
                      onClick={() => onUpdate({ ...movie, favorite: !movie.favorite })}
                      style={{
                        width: 52,
                        height: 52,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: movie.favorite ? '#fb718533' : theme.border,
                        borderRadius: 16,
                        backgroundColor: movie.favorite ? '#fb718514' : theme.surface,
                        opacity: busy ? 0.45 : 1
                      }}
                      pressedStyle={{
                        backgroundColor: movie.favorite ? '#fb718514' : theme.raised,
                        opacity: busy ? 0.45 : 0.78
                      }}
                    >
                      <Heart
                        size={20}
                        color={movie.favorite ? '#fda4af' : theme.muted}
                        fill={movie.favorite ? '#fda4af' : 'none'}
                      />
                    </Action>
                  </div>
                </div>

                <div
                  className="ui-stack"
                  style={{
                    marginTop: 20,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8
                  }}
                >
                  <MetadataChip icon={Film} label={movieTypeLabel(movie.type)} />
                  {movie.year !== null ? (
                    <MetadataChip icon={CalendarDays} label={String(movie.year)} />
                  ) : null}
                  {!episodic && runtime ? <MetadataChip icon={Clock3} label={runtime} /> : null}
                  {episodic && movie.seasonCount !== null ? (
                    <MetadataChip icon={Layers} label={`Сезонов: ${movie.seasonCount}`} />
                  ) : null}
                  {episodic && movie.episodesPerSeason !== null ? (
                    <MetadataChip
                      icon={List}
                      label={`Серий в сезоне: ${movie.episodesPerSeason}`}
                    />
                  ) : null}
                  {episodic && episodeRuntime ? (
                    <MetadataChip icon={Clock3} label={`Серия: ${episodeRuntime}`} />
                  ) : null}
                </div>

                {movie.genres.length > 0 ? (
                  <div
                    className="ui-stack"
                    style={{
                      marginTop: 18
                    }}
                  >
                    <PersonRow label="Жанры" icon={Tags}>
                      {movie.genres.map((genre) => (
                        <MetadataChip
                          key={genre}
                          label={genre}
                          onClick={() => onSearchWeb(`фильмы жанра ${genre}`)}
                        />
                      ))}
                    </PersonRow>
                  </div>
                ) : null}

                {movie.director ? (
                  <div
                    className="ui-stack"
                    style={{
                      marginTop: 16
                    }}
                  >
                    <PersonRow label="Режиссёр" icon={Clapperboard}>
                      <Action onClick={() => onSearchWeb(movie.director)}>
                        <span
                          className="ui-text"
                          style={{
                            color: theme.text,
                            fontSize: 13,
                            lineHeight: '22px',
                            fontWeight: 600
                          }}
                        >
                          {movie.director}
                        </span>
                      </Action>
                    </PersonRow>
                  </div>
                ) : null}

                {movie.actors.length > 0 ? (
                  <div
                    className="ui-stack"
                    style={{
                      marginTop: 12
                    }}
                  >
                    <PersonRow label="Актёры" icon={Users}>
                      {movie.actors.map((actor) => (
                        <Action key={actor} onClick={() => onSearchWeb(actor)}>
                          <span
                            className="ui-text"
                            style={{
                              color: theme.text,
                              fontSize: 13,
                              lineHeight: '22px',
                              fontWeight: 600
                            }}
                          >
                            {actor}
                          </span>
                        </Action>
                      ))}
                    </PersonRow>
                  </div>
                ) : null}

                <div
                  className="ui-stack"
                  style={{
                    marginTop: 20,
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8
                  }}
                >
                  <div
                    className="ui-stack"
                    aria-label={'Статус просмотра'}
                    style={{
                      minHeight: 40,
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 4,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 12,
                      backgroundColor: theme.surface
                    }}
                  >
                    <Action
                      role={'button'}
                      aria-selected={watched}
                      aria-disabled={busy}
                      disabled={busy}
                      onClick={requestWatched}
                      style={{
                        minHeight: 32,
                        justifyContent: 'center',
                        paddingInline: 12,
                        borderWidth: watched ? 1 : 0,
                        borderColor: '#34d39933',
                        borderRadius: 8,
                        backgroundColor: watched ? '#34d39914' : 'transparent'
                      }}
                      pressedStyle={{
                        backgroundColor: watched ? '#34d39914' : theme.raised
                      }}
                    >
                      <span
                        className="ui-text"
                        style={{
                          color: watched ? '#6ee7b7' : theme.muted,
                          fontSize: 13,
                          fontWeight: watched ? '700' : '500'
                        }}
                      >
                        Просмотрено
                      </span>
                    </Action>
                    <div
                      className="ui-stack"
                      style={{
                        width: 1,
                        height: 20,
                        marginInline: 4,
                        backgroundColor: theme.border
                      }}
                    ></div>
                    <Action
                      role={'button'}
                      aria-selected={!watched}
                      aria-disabled={busy}
                      disabled={busy}
                      onClick={requestWatchlist}
                      style={{
                        minHeight: 32,
                        justifyContent: 'center',
                        paddingInline: 12,
                        borderWidth: !watched ? 1 : 0,
                        borderColor: theme.accent + '44',
                        borderRadius: 8,
                        backgroundColor: !watched ? theme.accent + '14' : 'transparent'
                      }}
                      pressedStyle={{
                        backgroundColor: !watched ? theme.accent + '14' : theme.raised
                      }}
                    >
                      <span
                        className="ui-text"
                        style={{
                          color: !watched ? theme.accent : theme.muted,
                          fontSize: 13,
                          fontWeight: !watched ? '700' : '500'
                        }}
                      >
                        Хочу посмотреть
                      </span>
                    </Action>
                  </div>
                </div>

                {movie.description ? (
                  <div
                    className="ui-stack"
                    style={{
                      marginTop: 26,
                      padding: 18,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 16,
                      backgroundColor: theme.background
                    }}
                  >
                    <span
                      className="ui-text"
                      style={{
                        color: theme.text,
                        fontSize: 14,
                        fontWeight: 700
                      }}
                    >
                      Описание
                    </span>
                    <span
                      className="ui-text"
                      style={{
                        marginTop: 10,
                        color: theme.muted,
                        fontSize: 14,
                        lineHeight: '25px'
                      }}
                    >
                      {movie.description}
                    </span>
                  </div>
                ) : null}

                {movie.comments ? (
                  <div
                    className="ui-stack"
                    style={{
                      marginTop: 22,
                      paddingTop: 20,
                      borderTopWidth: 1,
                      borderTopColor: theme.border
                    }}
                  >
                    <span
                      className="ui-text"
                      style={{
                        color: theme.text,
                        fontSize: 14,
                        fontWeight: 700
                      }}
                    >
                      Личные комментарии
                    </span>
                    <span
                      className="ui-text"
                      style={{
                        marginTop: 10,
                        color: theme.muted,
                        fontSize: 14,
                        lineHeight: '25px'
                      }}
                    >
                      {movie.comments}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AppDialog
        open={ratingOpen}
        onOpenChange={(open) => {
          setRatingOpen(open)
          if (!open) setPendingRating(null)
        }}
        title="Отметить как просмотрено"
        description={`Выберите оценку для «${movie.title}»`}
        icon="movies"
        busy={busy}
        presentation="card"
        footer={
          <>
            <Button label="Отмена" disabled={busy} onClick={() => setRatingOpen(false)} />
            <Button
              label="Отметить просмотренным"
              primary
              disabled={busy || pendingRating === null}
              onClick={() => {
                if (pendingRating === null) return
                onUpdate({ ...movie, status: 'watched', rating: pendingRating })
                setRatingOpen(false)
                setPendingRating(null)
              }}
            />
          </>
        }
      >
        <div
          className="ui-stack"
          style={{
            padding: 16,
            gap: 12
          }}
        >
          <span
            className="ui-text"
            style={{
              color: theme.muted,
              fontSize: 13,
              lineHeight: '20px'
            }}
          >
            Выберите оценку. После сохранения фильм перейдёт в «Просмотрено».
          </span>
          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 7
            }}
          >
            {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => (
              <Action
                key={rating}
                role={'radio'}
                aria-selected={pendingRating === rating}
                disabled={busy}
                onClick={() => setPendingRating(rating)}
                style={{
                  width: 46,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: pendingRating === rating ? '#fbbf2459' : theme.border,
                  borderRadius: 12,
                  backgroundColor: pendingRating === rating ? '#fbbf2426' : theme.background
                }}
                pressedStyle={{
                  backgroundColor: pendingRating === rating ? '#fbbf2426' : theme.raised
                }}
              >
                <span
                  className="ui-text"
                  style={{
                    color: pendingRating === rating ? '#fde68a' : theme.muted,
                    fontSize: 14,
                    fontWeight: 600
                  }}
                >
                  {rating}
                </span>
              </Action>
            ))}
          </div>
        </div>
      </AppDialog>

      <DialogLayer open={posterOpen} transition={'fade'} onClose={() => setPosterOpen(false)}>
        <div
          className="ui-stack"
          style={{
            flex: '1 1 0%',
            backgroundColor: '#000',
            padding: 16,
            paddingTop: 48
          }}
        >
          <Action
            role={'button'}
            aria-label={'Закрыть полноэкранный постер'}
            onClick={() => setPosterOpen(false)}
            style={{
              position: 'absolute',
              top: 48,
              right: 18,
              zIndex: 10,
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 22,
              backgroundColor: '#000000AA'
            }}
          >
            <span
              className="ui-text"
              style={{
                color: '#fff',
                fontSize: 22
              }}
            >
              ×
            </span>
          </Action>
          {movie.posterUrl ? (
            <img
              src={movie.posterUrl}
              style={{
                flex: '1 1 0%',
                width: '100%',
                objectFit: 'contain'
              }}
              alt=""
              draggable="false"
            ></img>
          ) : null}
        </div>
      </DialogLayer>
    </div>
  )
}
