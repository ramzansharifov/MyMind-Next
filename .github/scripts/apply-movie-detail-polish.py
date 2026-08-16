from pathlib import Path

root = Path('.')

# Contracts
path = root / 'src/shared/contracts/movies.ts'
text = path.read_text()
text = text.replace(
"""export interface DeleteMovieInput {\n  id: string\n}\n\nexport const MOVIES_IPC_CHANNELS = {""",
"""export interface DeleteMovieInput {\n  id: string\n}\n\nexport interface MovieWebSearchInput {\n  query: string\n}\n\nexport const MOVIES_IPC_CHANNELS = {"""
)
text = text.replace(
"""  updateMovie: 'movies:update-movie',\n  deleteMovie: 'movies:delete-movie'""",
"""  updateMovie: 'movies:update-movie',\n  deleteMovie: 'movies:delete-movie',\n  searchWeb: 'movies:search-web'"""
)
text = text.replace(
"""  updateMovie(input: UpdateMovieInput): Promise<MovieRecord>\n  deleteMovie(input: DeleteMovieInput): Promise<boolean>""",
"""  updateMovie(input: UpdateMovieInput): Promise<MovieRecord>\n  deleteMovie(input: DeleteMovieInput): Promise<boolean>\n  searchWeb(input: MovieWebSearchInput): Promise<void>"""
)
path.write_text(text)

# Validation
path = root / 'src/shared/validation/movies.ts'
text = path.read_text()
text += "\nexport const movieWebSearchInputSchema = z\n  .object({ query: z.string().trim().min(1).max(300) })\n  .strict()\n"
path.write_text(text)

# Movies IPC with safe Google URL construction
path = root / 'src/main/ipc/register-movies-ipc.ts'
text = path.read_text()
text = text.replace("import { ipcMain } from 'electron'", "import { ipcMain, shell } from 'electron'")
text = text.replace(
"""  getMovieInputSchema,\n  updateMovieInputSchema""",
"""  getMovieInputSchema,\n  movieWebSearchInputSchema,\n  updateMovieInputSchema"""
)
needle = """  ipcMain.handle(MOVIES_IPC_CHANNELS.deleteMovie, (_event, rawInput: unknown) =>\n    mainOperationTracker.run(() => deleteMovie(deleteMovieInputSchema.parse(rawInput)))\n  )\n}"""
replacement = """  ipcMain.handle(MOVIES_IPC_CHANNELS.deleteMovie, (_event, rawInput: unknown) =>\n    mainOperationTracker.run(() => deleteMovie(deleteMovieInputSchema.parse(rawInput)))\n  )\n  ipcMain.handle(MOVIES_IPC_CHANNELS.searchWeb, (_event, rawInput: unknown) =>\n    mainOperationTracker.run(async () => {\n      const { query } = movieWebSearchInputSchema.parse(rawInput)\n      const url = new URL('https://www.google.com/search')\n      url.searchParams.set('q', query)\n      await shell.openExternal(url.toString())\n    })\n  )\n}"""
if needle not in text:
    raise SystemExit('movies IPC insertion point not found')
path.write_text(text.replace(needle, replacement))

# Preload
path = root / 'src/preload/index.ts'
text = path.read_text()
text = text.replace(
"""    updateMovie: (input) => ipcRenderer.invoke(MOVIES_IPC_CHANNELS.updateMovie, input),\n    deleteMovie: (input) => ipcRenderer.invoke(MOVIES_IPC_CHANNELS.deleteMovie, input)""",
"""    updateMovie: (input) => ipcRenderer.invoke(MOVIES_IPC_CHANNELS.updateMovie, input),\n    deleteMovie: (input) => ipcRenderer.invoke(MOVIES_IPC_CHANNELS.deleteMovie, input),\n    searchWeb: (input) => ipcRenderer.invoke(MOVIES_IPC_CHANNELS.searchWeb, input)"""
)
path.write_text(text)

# Renderer client
path = root / 'src/renderer/src/modules/movies/api/movies-client.ts'
text = path.read_text()
text = text.replace(
"""  MovieRecord,\n  MoviesApi,""",
"""  MovieRecord,\n  MovieWebSearchInput,\n  MoviesApi,"""
)
text = text.replace(
"""  deleteMovie(input: DeleteMovieInput): Promise<boolean> {\n    return getMoviesApi().deleteMovie(input)\n  }\n}""",
"""  deleteMovie(input: DeleteMovieInput): Promise<boolean> {\n    return getMoviesApi().deleteMovie(input)\n  },\n  searchWeb(input: MovieWebSearchInput): Promise<void> {\n    return getMoviesApi().searchWeb(input)\n  }\n}"""
)
path.write_text(text)

# MoviesPage passes safe web search callback into details
path = root / 'src/renderer/src/modules/movies/MoviesPage.tsx'
text = path.read_text()
needle = """  async function removeMovie(): Promise<void> {"""
insert = """  async function searchWeb(query: string): Promise<void> {\n    setError(null)\n    try {\n      await moviesClient.searchWeb({ query })\n    } catch (reason) {\n      setError(errorMessage(reason))\n    }\n  }\n\n  async function removeMovie(): Promise<void> {"""
if needle not in text:
    raise SystemExit('MoviesPage search insertion not found')
text = text.replace(needle, insert)
text = text.replace(
"""          <MovieDetail movie={activeMovie} busy={isSaving} onUpdate={updateMovie} />""",
"""          <MovieDetail\n            movie={activeMovie}\n            busy={isSaving}\n            onUpdate={updateMovie}\n            onSearchWeb={searchWeb}\n          />"""
)
path.write_text(text)

# Full MovieDetail redesign
path = root / 'src/renderer/src/modules/movies/components/MovieDetail.tsx'
path.write_text(r'''import * as Popover from '@radix-ui/react-popover'
import {
  CalendarDays,
  Check,
  Clapperboard,
  Clock3,
  Expand,
  ExternalLink,
  Heart,
  Image,
  Play,
  Search,
  Star,
  Tags,
  Users,
  X
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { MovieRecord } from '../../../../../shared/contracts/movies'
import { AppDialog } from '../../../shared/ui/AppDialog'

interface MovieDetailProps {
  movie: MovieRecord
  busy: boolean
  onUpdate: (movie: MovieRecord) => Promise<void>
  onSearchWeb: (query: string) => Promise<void>
}

interface PersonSearchPopoverProps {
  name: string
  role: 'Режиссёр' | 'Актёр'
  onSearch: (query: string) => Promise<void>
}

function formatRuntime(minutes: number | null): string | null {
  if (minutes === null) return null
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} мин.`
  return `${hours} ч ${rest > 0 ? `${rest} мин.` : ''}`.trim()
}

function PersonSearchPopover({
  name,
  role,
  onSearch
}: PersonSearchPopoverProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    []
  )

  function show(): void {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }

  function hideSoon(): void {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpen(false), 140)
  }

  const items = [
    { label: 'Поиск по имени', query: name },
    { label: 'Фильмография', query: `${name} фильмография` },
    { label: 'Биография', query: `${name} биография` }
  ]

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="rounded-md font-medium text-[var(--app-text)] underline decoration-transparent underline-offset-4 transition-colors hover:text-violet-300 hover:decoration-violet-400/45 focus-visible:text-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/35"
          onMouseEnter={show}
          onMouseLeave={hideSoon}
          onFocus={show}
          onBlur={hideSoon}
          onClick={() => void onSearch(name)}
        >
          {name}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-[70] w-72 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 shadow-2xl outline-none"
          onMouseEnter={show}
          onMouseLeave={hideSoon}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="mb-2 px-1">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--app-muted)]">
              <Search className="size-3.5" /> {role}
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-[var(--app-text)]">{name}</p>
          </div>
          <div className="space-y-1">
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] focus-visible:bg-[var(--app-control-hover)] focus-visible:text-[var(--app-text)] focus-visible:outline-none"
                onClick={() => void onSearch(item.query)}
              >
                <span>{item.label}</span>
                <ExternalLink className="size-3.5 shrink-0" />
              </button>
            ))}
          </div>
          <Popover.Arrow className="fill-[var(--app-surface-raised)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function MovieDetail({
  movie,
  busy,
  onUpdate,
  onSearchWeb
}: MovieDetailProps): React.JSX.Element {
  const [posterOpen, setPosterOpen] = useState(false)
  const [posterFailed, setPosterFailed] = useState(false)
  const runtime = formatRuntime(movie.runtimeMinutes)

  async function toggleFavorite(): Promise<void> {
    await onUpdate({ ...movie, favorite: !movie.favorite })
  }

  async function toggleWatched(): Promise<void> {
    const nextWatched = movie.status !== 'watched'
    await onUpdate({
      ...movie,
      status: nextWatched ? 'watched' : 'watchlist',
      rating: nextWatched ? movie.rating : null
    })
  }

  const watchQuery = `Смотреть фильм ${movie.title}${
    movie.originalTitle && movie.originalTitle !== movie.title ? ` ${movie.originalTitle}` : ''
  }`

  return (
    <>
      <section>
        <div className="overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
          <div className="grid gap-0 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="relative min-h-[440px] bg-[var(--app-workspace)]">
              {movie.posterUrl && !posterFailed ? (
                <button
                  type="button"
                  aria-label="Открыть постер на весь экран"
                  className="group absolute inset-0 cursor-zoom-in overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-inset"
                  onClick={() => setPosterOpen(true)}
                >
                  <img
                    src={movie.posterUrl}
                    alt={`Постер фильма «${movie.title}»`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
                    onError={() => setPosterFailed(true)}
                  />
                  <span className="absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-xs font-medium text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Expand className="size-4" /> На весь экран
                  </span>
                </button>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[var(--app-muted)]">
                  <Image className="size-12 opacity-50" />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col p-7 lg:p-9">
              <div className="flex flex-wrap items-start justify-between gap-5 border-b border-[var(--app-border)] pb-6">
                <div className="min-w-0 flex-1">
                  <h2 className="text-3xl font-semibold tracking-tight text-[var(--app-text)] lg:text-4xl">
                    {movie.title}
                  </h2>
                  {movie.originalTitle && (
                    <p className="mt-2 text-base text-[var(--app-muted)]">{movie.originalTitle}</p>
                  )}
                </div>
                {movie.status === 'watched' && movie.rating !== null && (
                  <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-amber-200">
                    <Star className="size-5 fill-current" />
                    <span className="text-xl font-semibold tabular-nums">{movie.rating}</span>
                    <span className="text-xs opacity-70">/ 10</span>
                  </div>
                )}
              </div>

              {(movie.year !== null || runtime) && (
                <div className="mt-6 flex flex-wrap gap-2.5 text-base text-[var(--app-muted)]">
                  {movie.year !== null && (
                    <span className="inline-flex items-center gap-2 rounded-xl bg-[var(--app-control)] px-3 py-2 font-medium">
                      <CalendarDays className="size-4" /> {movie.year}
                    </span>
                  )}
                  {runtime && (
                    <span className="inline-flex items-center gap-2 rounded-xl bg-[var(--app-control)] px-3 py-2 font-medium">
                      <Clock3 className="size-4" /> {runtime}
                    </span>
                  )}
                </div>
              )}

              {movie.genres.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2.5 text-sm text-[var(--app-muted)]">
                  <span className="inline-flex items-center gap-2 font-medium text-[var(--app-muted)]">
                    <Tags className="size-4" /> Жанры:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {movie.genres.map((genre) => (
                      <span
                        key={genre}
                        className="rounded-lg bg-[var(--app-control)] px-2.5 py-1.5 text-[var(--app-muted)]"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {movie.director && (
                <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-[var(--app-muted)]">
                  <Clapperboard className="size-4 shrink-0" />
                  <span>Режиссёр:</span>
                  <PersonSearchPopover name={movie.director} role="Режиссёр" onSearch={onSearchWeb} />
                </div>
              )}

              {movie.actors.length > 0 && (
                <div className="mt-3 flex items-start gap-2 text-sm text-[var(--app-muted)]">
                  <Users className="mt-0.5 size-4 shrink-0" />
                  <span className="shrink-0">Актёры:</span>
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    {movie.actors.map((actor, index) => (
                      <span key={actor} className="inline-flex items-center gap-1.5">
                        <PersonSearchPopover name={actor} role="Актёр" onSearch={onSearchWeb} />
                        {index < movie.actors.length - 1 && <span aria-hidden="true">,</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className={
                    movie.status === 'watched'
                      ? 'inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/15 disabled:opacity-50'
                      : 'inline-flex h-10 items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 text-sm font-semibold text-violet-300 transition-colors hover:bg-violet-400/15 disabled:opacity-50'
                  }
                  onClick={() => void toggleWatched()}
                >
                  <Check className="size-4" />
                  {movie.status === 'watched' ? 'Просмотрено' : 'Хочу посмотреть'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={movie.favorite}
                  className={
                    movie.favorite
                      ? 'inline-flex h-10 items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-400/15 disabled:opacity-50'
                      : 'inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-control)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:text-[var(--app-text)] disabled:opacity-50'
                  }
                  onClick={() => void toggleFavorite()}
                >
                  <Heart className={`size-4 ${movie.favorite ? 'fill-current' : ''}`} />
                  {movie.favorite ? 'В избранном' : 'В избранное'}
                </button>
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 text-sm font-semibold text-violet-300 transition-colors hover:bg-violet-400/15"
                  onClick={() => void onSearchWeb(watchQuery)}
                >
                  <Play className="size-4 fill-current" /> Посмотреть
                </button>
              </div>

              {movie.description && (
                <div className="mt-8 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-5">
                  <h3 className="text-sm font-semibold text-[var(--app-text)]">Описание</h3>
                  <p className="mt-3 max-w-3xl text-sm leading-7 whitespace-pre-wrap text-[var(--app-muted)]">
                    {movie.description}
                  </p>
                </div>
              )}

              {movie.comments && (
                <div className="mt-7 border-t border-[var(--app-border)] pt-6">
                  <h3 className="text-sm font-semibold text-[var(--app-text)]">Личные комментарии</h3>
                  <p className="mt-3 max-w-3xl text-sm leading-7 whitespace-pre-wrap text-[var(--app-muted)]">
                    {movie.comments}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <AppDialog
        open={posterOpen}
        onOpenChange={setPosterOpen}
        title={`Постер фильма ${movie.title}`}
        description="Полноэкранный просмотр постера"
        size="fullscreen"
        showHeader={false}
        overlayClassName="bg-black/90 backdrop-blur-md"
        contentClassName="bg-black"
        bodyClassName="relative flex items-center justify-center bg-black p-4 sm:p-8"
      >
        <button
          type="button"
          aria-label="Закрыть полноэкранный постер"
          className="absolute top-5 right-5 z-10 flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-white/10"
          onClick={() => setPosterOpen(false)}
        >
          <X className="size-5" />
        </button>
        {movie.posterUrl && (
          <img
            src={movie.posterUrl}
            alt={`Постер фильма «${movie.title}»`}
            className="max-h-full max-w-full object-contain shadow-2xl"
          />
        )}
      </AppDialog>
    </>
  )
}
''')

# Visible terminology in the dedicated form
path = root / 'src/renderer/src/modules/movies/components/MovieFormPage.tsx'
text = path.read_text()
text = text.replace('title="Описание и комментарии"', 'title="Описание и личные комментарии"')
text = text.replace('>Комментарии</span>', '>Личные комментарии</span>')
text = text.replace('placeholder="Комментарий…"', 'placeholder="Личный комментарий…"')
path.write_text(text)

# Preload test
path = root / 'src/preload/index.test.ts'
text = path.read_text()
text = text.replace(
"""      'createMovies',\n      'updateMovie',\n      'deleteMovie'""",
"""      'createMovies',\n      'updateMovie',\n      'deleteMovie',\n      'searchWeb'"""
)
needle = """    await api.movies.getMovie({ id: 'movie-1' })\n    expect(electronMocks.invoke).toHaveBeenCalledWith('movies:get-movie', { id: 'movie-1' })\n"""
replacement = needle + """\n    await api.movies.searchWeb({ query: 'Christopher Nolan' })\n    expect(electronMocks.invoke).toHaveBeenCalledWith('movies:search-web', {\n      query: 'Christopher Nolan'\n    })\n"""
if needle not in text:
    raise SystemExit('preload movie test insertion point not found')
path.write_text(text.replace(needle, replacement))

# MoviesPage tests
path = root / 'src/renderer/src/modules/movies/MoviesPage.test.tsx'
text = path.read_text()
text = text.replace(
"""  updateMovie: vi.fn(),\n  deleteMovie: vi.fn()""",
"""  updateMovie: vi.fn(),\n  deleteMovie: vi.fn(),\n  searchWeb: vi.fn()"""
)
text = text.replace(
"""  mocks.deleteMovie.mockResolvedValue(true)\n})""",
"""  mocks.deleteMovie.mockResolvedValue(true)\n  mocks.searchWeb.mockResolvedValue(undefined)\n})"""
)
text = text.replace(
"""    expect(screen.getByText('Комментарии')).toBeInTheDocument()""",
"""    expect(screen.getByText('Личные комментарии')).toBeInTheDocument()"""
)
text = text.replace(
"""  it('shows actors and comments in movie view and opens fullscreen poster', async () => {""",
"""  it('shows structured metadata, person search and watch action in movie view', async () => {"""
)
old = """    expect(screen.getByText('Matthew McConaughey, Anne Hathaway')).toBeInTheDocument()\n    expect(screen.getByText('Комментарии')).toBeInTheDocument()\n    expect(screen.queryByText(/Просмотрено:/)).not.toBeInTheDocument()\n\n    await user.click(screen.getByRole('button', { name: 'Открыть постер на весь экран' }))"""
new = """    expect(screen.getByText('Жанры:')).toBeInTheDocument()\n    expect(screen.getByText('Режиссёр:')).toBeInTheDocument()\n    expect(screen.getByText('Актёры:')).toBeInTheDocument()\n    expect(screen.getByText('Личные комментарии')).toBeInTheDocument()\n    expect(screen.getByRole('button', { name: 'Matthew McConaughey' })).toBeInTheDocument()\n    expect(screen.getByRole('button', { name: 'Anne Hathaway' })).toBeInTheDocument()\n\n    const director = screen.getByRole('button', { name: 'Christopher Nolan' })\n    await user.hover(director)\n    expect(await screen.findByText('Фильмография')).toBeInTheDocument()\n    expect(screen.getByText('Биография')).toBeInTheDocument()\n    await user.click(director)\n    expect(mocks.searchWeb).toHaveBeenCalledWith({ query: 'Christopher Nolan' })\n\n    await user.click(screen.getByRole('button', { name: 'Посмотреть' }))\n    expect(mocks.searchWeb).toHaveBeenCalledWith({\n      query: 'Смотреть фильм Интерстеллар Interstellar'\n    })\n\n    await user.click(screen.getByRole('button', { name: 'Открыть постер на весь экран' }))"""
if old not in text:
    raise SystemExit('MoviesPage detail test block not found')
path.write_text(text.replace(old, new))

# IPC test for safe browser search
path = root / 'src/main/ipc/register-movies-ipc.test.ts'
path.write_text(r'''import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MOVIES_IPC_CHANNELS } from '../../shared/contracts/movies'

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  removeHandler: vi.fn(),
  openExternal: vi.fn().mockResolvedValue(undefined),
  run: vi.fn((operation: () => unknown) => operation())
}))

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle, removeHandler: mocks.removeHandler },
  shell: { openExternal: mocks.openExternal }
}))
vi.mock('../services/main-operation-tracker', () => ({ mainOperationTracker: { run: mocks.run } }))
vi.mock('../repositories/movies.repository', () => ({
  listMoviesOverview: vi.fn(),
  getMovie: vi.fn(),
  createMovie: vi.fn(),
  createMovies: vi.fn(),
  updateMovie: vi.fn(),
  deleteMovie: vi.fn()
}))

import { registerMoviesIpcHandlers } from './register-movies-ipc'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('registerMoviesIpcHandlers', () => {
  it('registers every movies channel', () => {
    registerMoviesIpcHandlers()
    expect(mocks.removeHandler.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(MOVIES_IPC_CHANNELS)
    )
    expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(MOVIES_IPC_CHANNELS)
    )
  })

  it('opens only a generated Google search URL from a validated query', async () => {
    registerMoviesIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === MOVIES_IPC_CHANNELS.searchWeb
    )?.[1]

    await handler({}, { query: 'Смотреть фильм Интерстеллар' })

    expect(mocks.openExternal).toHaveBeenCalledOnce()
    const [url] = mocks.openExternal.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.origin).toBe('https://www.google.com')
    expect(parsed.pathname).toBe('/search')
    expect(parsed.searchParams.get('q')).toBe('Смотреть фильм Интерстеллар')

    expect(() => handler({}, { query: '' })).toThrow()
    expect(mocks.openExternal).toHaveBeenCalledTimes(1)
  })
})
''')
