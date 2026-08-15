from pathlib import Path

root = Path('.')

# Contracts
path = root / 'src/shared/contracts/movies.ts'
text = path.read_text()
text = text.replace(
"""export interface UpdateMovieInput extends CreateMovieInput {\n  id: string\n}\n\nexport interface GetMovieInput {""",
"""export interface UpdateMovieInput extends CreateMovieInput {\n  id: string\n}\n\nexport interface CreateMoviesInput {\n  movies: CreateMovieInput[]\n}\n\nexport interface GetMovieInput {"""
)
text = text.replace(
"""  createMovie: 'movies:create-movie',\n  updateMovie: 'movies:update-movie',""",
"""  createMovie: 'movies:create-movie',\n  createMovies: 'movies:create-movies',\n  updateMovie: 'movies:update-movie',"""
)
text = text.replace(
"""  createMovie(input: CreateMovieInput): Promise<MovieRecord>\n  updateMovie(input: UpdateMovieInput): Promise<MovieRecord>""",
"""  createMovie(input: CreateMovieInput): Promise<MovieRecord>\n  createMovies(input: CreateMoviesInput): Promise<MovieRecord[]>\n  updateMovie(input: UpdateMovieInput): Promise<MovieRecord>"""
)
path.write_text(text)

# Validation
path = root / 'src/shared/validation/movies.ts'
text = path.read_text()
text = text.replace(
"""export const createMovieInputSchema = movieBaseInputSchema.superRefine(validateRatingStatus)\n\nexport const updateMovieInputSchema""",
"""export const createMovieInputSchema = movieBaseInputSchema.superRefine(validateRatingStatus)\n\nexport const createMoviesInputSchema = z\n  .object({\n    movies: z.array(createMovieInputSchema).min(1).max(100)\n  })\n  .strict()\n\nexport const updateMovieInputSchema"""
)
path.write_text(text)

# Repository
path = root / 'src/main/repositories/movies.repository.ts'
text = path.read_text()
text = text.replace(
"""  CreateMovieInput,\n  DeleteMovieInput,""",
"""  CreateMovieInput,\n  CreateMoviesInput,\n  DeleteMovieInput,"""
)
old_create = """export function createMovie(input: CreateMovieInput): MovieRecord {\n  const id = randomUUID()\n  const now = Date.now()\n  getSqlite()\n    .prepare(\n      `INSERT INTO movies (\n        id,\n        title,\n        original_title,\n        year,\n        poster_url,\n        director,\n        runtime_minutes,\n        genres_json,\n        actors_json,\n        description,\n        status,\n        favorite,\n        rating,\n        comments,\n        created_at,\n        updated_at\n      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`\n    )\n    .run(id, ...normalizedPayload(input), now, now)\n\n  return requireMovie(id)\n}\n"""
new_create = """function insertMovie(input: CreateMovieInput): MovieRecord {\n  const id = randomUUID()\n  const now = Date.now()\n  getSqlite()\n    .prepare(\n      `INSERT INTO movies (\n        id,\n        title,\n        original_title,\n        year,\n        poster_url,\n        director,\n        runtime_minutes,\n        genres_json,\n        actors_json,\n        description,\n        status,\n        favorite,\n        rating,\n        comments,\n        created_at,\n        updated_at\n      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`\n    )\n    .run(id, ...normalizedPayload(input), now, now)\n\n  return requireMovie(id)\n}\n\nexport function createMovie(input: CreateMovieInput): MovieRecord {\n  return insertMovie(input)\n}\n\nexport function createMovies(input: CreateMoviesInput): MovieRecord[] {\n  const transaction = getSqlite().transaction((movies: CreateMovieInput[]) =>\n    movies.map((movie) => insertMovie(movie))\n  )\n  return transaction(input.movies)\n}\n"""
if old_create not in text:
    raise SystemExit('createMovie block not found')
text = text.replace(old_create, new_create)
path.write_text(text)

# IPC
path = root / 'src/main/ipc/register-movies-ipc.ts'
text = path.read_text()
text = text.replace(
"""  createMovieInputSchema,\n  deleteMovieInputSchema,""",
"""  createMovieInputSchema,\n  createMoviesInputSchema,\n  deleteMovieInputSchema,"""
)
text = text.replace(
"""  createMovie,\n  deleteMovie,""",
"""  createMovie,\n  createMovies,\n  deleteMovie,"""
)
text = text.replace(
"""  ipcMain.handle(MOVIES_IPC_CHANNELS.createMovie, (_event, rawInput: unknown) =>\n    mainOperationTracker.run(() => createMovie(createMovieInputSchema.parse(rawInput)))\n  )\n  ipcMain.handle(MOVIES_IPC_CHANNELS.updateMovie,""",
"""  ipcMain.handle(MOVIES_IPC_CHANNELS.createMovie, (_event, rawInput: unknown) =>\n    mainOperationTracker.run(() => createMovie(createMovieInputSchema.parse(rawInput)))\n  )\n  ipcMain.handle(MOVIES_IPC_CHANNELS.createMovies, (_event, rawInput: unknown) =>\n    mainOperationTracker.run(() => createMovies(createMoviesInputSchema.parse(rawInput)))\n  )\n  ipcMain.handle(MOVIES_IPC_CHANNELS.updateMovie,"""
)
path.write_text(text)

# Preload
path = root / 'src/preload/index.ts'
text = path.read_text()
text = text.replace(
"""    createMovie: (input) => ipcRenderer.invoke(MOVIES_IPC_CHANNELS.createMovie, input),\n    updateMovie:""",
"""    createMovie: (input) => ipcRenderer.invoke(MOVIES_IPC_CHANNELS.createMovie, input),\n    createMovies: (input) => ipcRenderer.invoke(MOVIES_IPC_CHANNELS.createMovies, input),\n    updateMovie:"""
)
path.write_text(text)

# Renderer client
path = root / 'src/renderer/src/modules/movies/api/movies-client.ts'
text = path.read_text()
text = text.replace(
"""  CreateMovieInput,\n  DeleteMovieInput,""",
"""  CreateMovieInput,\n  CreateMoviesInput,\n  DeleteMovieInput,"""
)
text = text.replace(
"""  createMovie(input: CreateMovieInput): Promise<MovieRecord> {\n    return getMoviesApi().createMovie(input)\n  },\n  updateMovie""",
"""  createMovie(input: CreateMovieInput): Promise<MovieRecord> {\n    return getMoviesApi().createMovie(input)\n  },\n  createMovies(input: CreateMoviesInput): Promise<MovieRecord[]> {\n    return getMoviesApi().createMovies(input)\n  },\n  updateMovie"""
)
path.write_text(text)

# JSON import dialog component
path = root / 'src/renderer/src/modules/movies/components/MovieJsonImportDialog.tsx'
path.write_text(r'''import { Braces, LoaderCircle, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { CreateMovieInput } from '../../../../../shared/contracts/movies'
import { createMovieInputSchema } from '../../../../../shared/validation/movies'
import { AppDialog } from '../../../shared/ui/AppDialog'

interface MovieJsonImportDialogProps {
  open: boolean
  busy: boolean
  onOpenChange: (open: boolean) => void
  onImport: (movies: CreateMovieInput[]) => Promise<void>
}

interface ParseResult {
  movies: CreateMovieInput[]
  error: string | null
}

const EXAMPLE_JSON = `[
  {
    "title": "Интерстеллар",
    "originalTitle": "Interstellar",
    "year": 2014,
    "posterUrl": "https://example.com/poster.jpg",
    "director": "Christopher Nolan",
    "runtimeMinutes": 169,
    "genres": ["Фантастика", "Драма"],
    "actors": ["Matthew McConaughey", "Anne Hathaway"],
    "description": "",
    "status": "watched",
    "favorite": true,
    "rating": 9,
    "comments": ""
  }
]`

function stripCodeFence(value: string): string {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```')) return trimmed
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

function normalizedCandidate(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const source = value as Record<string, unknown>
  return {
    title: source.title,
    originalTitle: source.originalTitle ?? null,
    year: source.year ?? null,
    posterUrl: source.posterUrl ?? null,
    director: source.director ?? '',
    runtimeMinutes: source.runtimeMinutes ?? null,
    genres: source.genres ?? [],
    actors: source.actors ?? [],
    description: source.description ?? '',
    status: source.status ?? 'watchlist',
    favorite: source.favorite ?? false,
    rating: source.rating ?? null,
    comments: source.comments ?? ''
  }
}

function formatIssue(index: number, path: PropertyKey[], message: string): string {
  const field = path.length > 0 ? ` · ${path.map(String).join('.')}` : ''
  return `Фильм ${index + 1}${field}: ${message}`
}

export function parseMoviesJson(value: string): ParseResult {
  const source = stripCodeFence(value)
  if (!source) return { movies: [], error: null }

  let parsed: unknown
  try {
    parsed = JSON.parse(source) as unknown
  } catch {
    return { movies: [], error: 'JSON содержит синтаксическую ошибку' }
  }

  const candidates = Array.isArray(parsed) ? parsed : [parsed]
  if (candidates.length === 0) return { movies: [], error: 'Массив фильмов пуст' }
  if (candidates.length > 100) return { movies: [], error: 'За один раз можно добавить до 100 фильмов' }

  const movies: CreateMovieInput[] = []
  for (const [index, candidate] of candidates.entries()) {
    const result = createMovieInputSchema.safeParse(normalizedCandidate(candidate))
    if (!result.success) {
      const issue = result.error.issues[0]
      return {
        movies: [],
        error: formatIssue(index, issue?.path ?? [], issue?.message ?? 'Некорректные данные')
      }
    }
    movies.push(result.data)
  }

  return { movies, error: null }
}

export function MovieJsonImportDialog({
  open,
  busy,
  onOpenChange,
  onImport
}: MovieJsonImportDialogProps): React.JSX.Element {
  const [value, setValue] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const parsed = useMemo(() => parseMoviesJson(value), [value])

  async function submit(): Promise<void> {
    if (parsed.error || parsed.movies.length === 0) return
    setSubmitError(null)
    try {
      await onImport(parsed.movies)
      setValue('')
      onOpenChange(false)
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : 'Не удалось добавить фильмы')
    }
  }

  function changeOpen(nextOpen: boolean): void {
    if (!nextOpen) setSubmitError(null)
    onOpenChange(nextOpen)
  }

  const error = submitError ?? parsed.error

  return (
    <AppDialog
      open={open}
      busy={busy}
      onOpenChange={changeOpen}
      title="Добавить фильмы из JSON"
      description="Быстрое добавление одного или нескольких фильмов из JSON"
      icon={<Braces />}
      size="xl"
      bodyClassName="space-y-3"
      footer={
        <>
          <button
            type="button"
            disabled={busy}
            className="h-10 rounded-xl border border-[var(--app-border)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-50"
            onClick={() => changeOpen(false)}
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={busy || parsed.movies.length === 0 || Boolean(parsed.error)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-45"
            onClick={() => void submit()}
          >
            {busy && <LoaderCircle className="size-4 animate-spin" />}
            {parsed.movies.length > 1 ? `Добавить ${parsed.movies.length} фильма` : 'Добавить'}
          </button>
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-[var(--app-muted)]">
          Один объект или массив. Обязательное поле: <code className="text-[var(--app-text)]">title</code>.
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            className="h-8 rounded-lg border border-[var(--app-border)] px-3 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-50"
            onClick={() => setValue(EXAMPLE_JSON)}
          >
            Вставить пример
          </button>
          <button
            type="button"
            aria-label="Очистить JSON"
            disabled={busy || !value}
            className="flex size-8 items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-35"
            onClick={() => setValue('')}
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      </div>

      <textarea
        value={value}
        aria-label="JSON фильмов"
        autoFocus
        spellCheck={false}
        placeholder='[{ "title": "Интерстеллар", "status": "watched", "rating": 9 }]'
        className="min-h-[360px] w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4 font-mono text-[13px] leading-6 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
        onChange={(event) => {
          setValue(event.target.value)
          setSubmitError(null)
        }}
      />

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {error}
        </div>
      ) : parsed.movies.length > 0 ? (
        <div className="text-xs text-emerald-300">Готово к добавлению: {parsed.movies.length}</div>
      ) : null}
    </AppDialog>
  )
}
''')

# MoviesPage integration
path = root / 'src/renderer/src/modules/movies/MoviesPage.tsx'
text = path.read_text()
text = text.replace(
"""  ArrowLeft,\n  Bookmark,""",
"""  ArrowLeft,\n  Bookmark,\n  Braces,"""
)
text = text.replace(
"""import { MovieDetail } from './components/MovieDetail'\nimport { MovieFormPage } from './components/MovieFormPage'""",
"""import { MovieDetail } from './components/MovieDetail'\nimport { MovieFormPage } from './components/MovieFormPage'\nimport { MovieJsonImportDialog } from './components/MovieJsonImportDialog'"""
)
text = text.replace(
"""  const [deleteTarget, setDeleteTarget] = useState<MovieRecord | null>(null)\n  const [isLoading,""",
"""  const [deleteTarget, setDeleteTarget] = useState<MovieRecord | null>(null)\n  const [jsonImportOpen, setJsonImportOpen] = useState(false)\n  const [isLoading,"""
)
anchor = """  async function updateMovie(movie: MovieRecord): Promise<void> {"""
insert = """  async function importMovies(inputs: CreateMovieInput[]): Promise<void> {\n    setIsSaving(true)\n    setError(null)\n    try {\n      const created = await moviesClient.createMovies({ movies: inputs })\n      setMovies((current) => [...created, ...current])\n    } catch (reason) {\n      setError(errorMessage(reason))\n      throw reason\n    } finally {\n      setIsSaving(false)\n    }\n  }\n\n"""
if anchor not in text:
    raise SystemExit('updateMovie anchor not found')
text = text.replace(anchor, insert + anchor, 1)
old_library_button = """              {view.kind === 'library' && (\n                <button\n                  type=\"button\"\n                  className=\"inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400\"\n                  onClick={() => setView({ kind: 'form', movieId: null })}\n                >\n                  <Plus className=\"size-4\" /> Добавить фильм\n                </button>\n              )}"""
new_library_buttons = """              {view.kind === 'library' && (\n                <>\n                  <button\n                    type=\"button\"\n                    className=\"inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]\"\n                    onClick={() => setJsonImportOpen(true)}\n                  >\n                    <Braces className=\"size-4\" /> Из JSON\n                  </button>\n                  <button\n                    type=\"button\"\n                    className=\"inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400\"\n                    onClick={() => setView({ kind: 'form', movieId: null })}\n                  >\n                    <Plus className=\"size-4\" /> Добавить фильм\n                  </button>\n                </>\n              )}"""
if old_library_button not in text:
    raise SystemExit('library add button not found')
text = text.replace(old_library_button, new_library_buttons)
old_dialog = """      <DeleteConfirmationDialog\n        open={deleteTarget !== null}"""
new_dialog = """      <MovieJsonImportDialog\n        open={jsonImportOpen}\n        busy={isSaving}\n        onOpenChange={setJsonImportOpen}\n        onImport={importMovies}\n      />\n\n      <DeleteConfirmationDialog\n        open={deleteTarget !== null}"""
if old_dialog not in text:
    raise SystemExit('delete dialog anchor not found')
text = text.replace(old_dialog, new_dialog)
path.write_text(text)

# Repository tests
path = root / 'src/main/repositories/movies.repository.test.ts'
text = path.read_text()
text = text.replace(
"""  createMovie,\n  deleteMovie,""",
"""  createMovie,\n  createMovies,\n  deleteMovie,"""
)
anchor = """  it('clears rating outside watched state', () => {"""
test = r'''  it('creates multiple movies in one transaction and rolls back the whole batch on failure', () => {
    const base = {
      originalTitle: null,
      year: null,
      posterUrl: null,
      director: '',
      runtimeMinutes: null,
      genres: [],
      actors: [],
      description: '',
      status: 'watchlist' as const,
      favorite: false,
      rating: null,
      comments: ''
    }

    const created = createMovies({
      movies: [
        { ...base, title: 'Movie A' },
        { ...base, title: 'Movie B' }
      ]
    })
    expect(created.map((movie) => movie.title)).toEqual(['Movie A', 'Movie B'])
    expect(listMoviesOverview().movies).toHaveLength(2)

    getSqlite().exec('DELETE FROM movies;')
    expect(() =>
      createMovies({
        movies: [
          { ...base, title: 'Will roll back' },
          { ...base, title: null as unknown as string }
        ]
      })
    ).toThrow()
    expect(listMoviesOverview().movies).toHaveLength(0)
  })

'''
if anchor not in text:
    raise SystemExit('repository test anchor not found')
text = text.replace(anchor, test + anchor, 1)
path.write_text(text)

# Preload test
path = root / 'src/preload/index.test.ts'
text = path.read_text()
text = text.replace(
"""      'createMovie',\n      'updateMovie',""",
"""      'createMovie',\n      'createMovies',\n      'updateMovie',"""
)
old = """    await api.movies.getMovie({ id: 'movie-1' })\n    expect(electronMocks.invoke).toHaveBeenCalledWith('movies:get-movie', { id: 'movie-1' })\n"""
new = old + """\n    await api.movies.createMovies({ movies: [] })\n    expect(electronMocks.invoke).toHaveBeenCalledWith('movies:create-movies', { movies: [] })\n"""
if old not in text:
    raise SystemExit('preload movies assertion not found')
text = text.replace(old, new)
path.write_text(text)

# Movies UI test
path = root / 'src/renderer/src/modules/movies/MoviesPage.test.tsx'
text = path.read_text()
text = text.replace(
"""  createMovie: vi.fn(),\n  updateMovie:""",
"""  createMovie: vi.fn(),\n  createMovies: vi.fn(),\n  updateMovie:"""
)
text = text.replace(
"""  mocks.createMovie.mockResolvedValue(movie)\n  mocks.updateMovie""",
"""  mocks.createMovie.mockResolvedValue(movie)\n  mocks.createMovies.mockResolvedValue([movie])\n  mocks.updateMovie"""
)
anchor = """  it('keeps the module header clean and puts movie actions into it', async () => {"""
test = r'''  it('imports one or many movies from GPT-friendly JSON', async () => {
    const user = userEvent.setup()
    const secondMovie = { ...movie, id: 'movie-2', title: 'Дюна', favorite: false, rating: null, status: 'watchlist' as const }
    mocks.createMovies.mockResolvedValue([movie, secondMovie])

    render(<MoviesPage />)
    await screen.findByText('Библиотека пока пустая')
    await user.click(screen.getByRole('button', { name: 'Из JSON' }))

    const input = screen.getByRole('textbox', { name: 'JSON фильмов' })
    await user.type(
      input,
      '```json\n[{"title":"Интерстеллар","status":"watched","rating":9},{"title":"Дюна"}]\n```'
    )

    expect(screen.getByText('Готово к добавлению: 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Добавить 2 фильма' }))

    await waitFor(() =>
      expect(mocks.createMovies).toHaveBeenCalledWith({
        movies: [
          {
            title: 'Интерстеллар',
            originalTitle: null,
            year: null,
            posterUrl: null,
            director: '',
            runtimeMinutes: null,
            genres: [],
            actors: [],
            description: '',
            status: 'watched',
            favorite: false,
            rating: 9,
            comments: ''
          },
          {
            title: 'Дюна',
            originalTitle: null,
            year: null,
            posterUrl: null,
            director: '',
            runtimeMinutes: null,
            genres: [],
            actors: [],
            description: '',
            status: 'watchlist',
            favorite: false,
            rating: null,
            comments: ''
          }
        ]
      })
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Дюна')).toBeInTheDocument()
  })

'''
if anchor not in text:
    raise SystemExit('UI test anchor not found')
text = text.replace(anchor, test + anchor, 1)
path.write_text(text)
