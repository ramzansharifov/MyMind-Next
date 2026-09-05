import { Tooltip } from '../../../shared/ui/tooltip'
import { Braces, LoaderCircle, RotateCcw } from 'lucide-react'
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
    "title": "Аркейн",
    "originalTitle": "Arcane",
    "type": "animated_series",
    "year": 2021,
    "posterUrl": "https://example.com/poster.jpg",
    "director": "",
    "runtimeMinutes": null,
    "seasonCount": 2,
    "episodesPerSeason": 9,
    "episodeRuntimeMinutes": 42,
    "genres": ["Анимация", "Драма"],
    "actors": [],
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
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

function normalizedCandidate(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const source = value as Record<string, unknown>
  return {
    title: source.title,
    originalTitle: source.originalTitle ?? null,
    type: source.type ?? 'movie',
    year: source.year ?? null,
    posterUrl: source.posterUrl ?? null,
    director: source.director ?? '',
    runtimeMinutes: source.runtimeMinutes ?? null,
    seasonCount: source.seasonCount ?? null,
    episodesPerSeason: source.episodesPerSeason ?? null,
    episodeRuntimeMinutes: source.episodeRuntimeMinutes ?? null,
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

function parseMoviesJson(value: string): ParseResult {
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
  if (candidates.length > 100)
    return { movies: [], error: 'За один раз можно добавить до 100 фильмов' }

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
            className="bg-accent-500 hover:bg-accent-400 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-45"
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
          Один объект или массив. Обязательное поле:{' '}
          <code className="text-[var(--app-text)]">title</code>. Тип:{' '}
          <code className="text-[var(--app-text)]">movie | series | cartoon | animated_series</code>
          . Для <code className="text-[var(--app-text)]">series</code> и{' '}
          <code className="text-[var(--app-text)]">animated_series</code> доступны{' '}
          <code className="text-[var(--app-text)]">seasonCount</code>,{' '}
          <code className="text-[var(--app-text)]">episodesPerSeason</code> и{' '}
          <code className="text-[var(--app-text)]">episodeRuntimeMinutes</code>.
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
          <Tooltip content="Очистить JSON" side="top">
            <button
              type="button"
              aria-label="Очистить JSON"
              disabled={busy || !value}
              className="flex size-8 items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-35"
              onClick={() => setValue('')}
            >
              <RotateCcw className="size-3.5" />
            </button>
          </Tooltip>
        </div>
      </div>

      <textarea
        value={value}
        aria-label="JSON фильмов"
        autoFocus
        spellCheck={false}
        placeholder='[{ "title": "Аркейн", "type": "animated_series", "seasonCount": 2, "episodesPerSeason": 9, "episodeRuntimeMinutes": 42 }]'
        className="focus:border-accent-500/45 focus:ring-accent-500/15 min-h-[360px] w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4 font-mono text-[13px] leading-6 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] focus:ring-2"
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
