import { Tooltip } from '../../../shared/ui/tooltip'
import { Braces, LoaderCircle, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { UpsertMovieInput } from '../../../../../shared/contracts/movies'
import { parseMoviesJson } from '@mymind/core/catalog-json-import'
import { AppDialog } from '../../../shared/ui/AppDialog'

interface MovieJsonImportDialogProps {
  open: boolean
  busy: boolean
  onOpenChange: (open: boolean) => void
  onImport: (movies: UpsertMovieInput[]) => Promise<void>
}

const EXAMPLE_JSON = `[`
  {
    "id": "movie-example-1",
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
    if (parsed.error || parsed.items.length === 0) return
    setSubmitError(null)
    try {
      await onImport(parsed.items)
      setValue('')
      onOpenChange(false)
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : 'Не удалось применить JSON фильмов')
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
      title="Применить JSON фильмов"
      description="Существующие записи обновятся, новые будут добавлены"
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
            disabled={busy || parsed.items.length === 0 || Boolean(parsed.error)}
            className="bg-accent-500 hover:bg-accent-400 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-45"
            onClick={() => void submit()}
          >
            {busy && <LoaderCircle className="size-4 animate-spin" />}
            {busy ? 'Применение…' : `Применить · ${parsed.items.length}`}
          </button>
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="max-w-3xl text-xs leading-5 text-[var(--app-muted)]">
          Если в JSON сохранён <code className="text-[var(--app-text)]">id</code> существующего
          фильма, запись будет обновлена на месте. Без <code className="text-[var(--app-text)]">id</code>{' '}
          MyMind ищет единственное точное совпадение по названию, типу и году; иначе создаёт новую
          запись. <code className="text-[var(--app-text)]">createdAt</code> и{' '}
          <code className="text-[var(--app-text)]">updatedAt</code> не импортируются.
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
        placeholder='[{ "id": "...", "title": "Аркейн", "type": "animated_series" }]'
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
      ) : parsed.items.length > 0 ? (
        <div className="text-xs text-emerald-300">Готово к применению: {parsed.items.length}</div>
      ) : null}
    </AppDialog>
  )
}
