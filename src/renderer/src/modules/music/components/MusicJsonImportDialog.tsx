import { Braces, LoaderCircle, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { CreateMusicItemInput } from '../../../../../shared/contracts/music'
import { createMusicItemInputSchema } from '../../../../../shared/validation/music'
import { AppDialog } from '../../../shared/ui/AppDialog'

interface MusicJsonImportDialogProps {
  open: boolean
  busy: boolean
  onOpenChange: (open: boolean) => void
  onImport: (items: CreateMusicItemInput[]) => Promise<void>
}

interface ParseResult {
  items: CreateMusicItemInput[]
  error: string | null
}

const EXAMPLE_JSON = `[
  {
    "title": "Blinding Lights",
    "type": "track",
    "year": 2019,
    "coverUrl": "https://example.com/cover.jpg",
    "artists": ["The Weeknd"],
    "album": "After Hours",
    "durationSeconds": 200,
    "trackCount": null,
    "genres": ["Synth-pop", "R&B"],
    "description": "",
    "status": "listened",
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
    type: source.type ?? 'track',
    year: source.year ?? null,
    coverUrl: source.coverUrl ?? null,
    artists: source.artists ?? [],
    album: source.album ?? '',
    durationSeconds: source.durationSeconds ?? null,
    trackCount: source.trackCount ?? null,
    genres: source.genres ?? [],
    description: source.description ?? '',
    status: source.status ?? 'want_to_listen',
    favorite: source.favorite ?? false,
    rating: source.rating ?? null,
    comments: source.comments ?? ''
  }
}

function parseMusicJson(value: string): ParseResult {
  const source = stripCodeFence(value)
  if (!source) return { items: [], error: null }

  let parsed: unknown
  try {
    parsed = JSON.parse(source) as unknown
  } catch {
    return { items: [], error: 'JSON содержит синтаксическую ошибку' }
  }

  const candidates = Array.isArray(parsed) ? parsed : [parsed]
  if (candidates.length === 0) return { items: [], error: 'Массив музыкальных записей пуст' }
  if (candidates.length > 100)
    return { items: [], error: 'За один раз можно добавить до 100 записей' }

  const items: CreateMusicItemInput[] = []
  for (const [index, candidate] of candidates.entries()) {
    const result = createMusicItemInputSchema.safeParse(normalizedCandidate(candidate))
    if (!result.success) {
      const issue = result.error.issues[0]
      const field = issue?.path.length ? ` · ${issue.path.map(String).join('.')}` : ''
      return {
        items: [],
        error: `Запись ${index + 1}${field}: ${issue?.message ?? 'Некорректные данные'}`
      }
    }
    items.push(result.data)
  }

  return { items, error: null }
}

export function MusicJsonImportDialog({
  open,
  busy,
  onOpenChange,
  onImport
}: MusicJsonImportDialogProps): React.JSX.Element {
  const [value, setValue] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const parsed = useMemo(() => parseMusicJson(value), [value])

  async function submit(): Promise<void> {
    if (parsed.error || parsed.items.length === 0) return
    setSubmitError(null)
    try {
      await onImport(parsed.items)
      setValue('')
      onOpenChange(false)
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : 'Не удалось добавить музыку')
    }
  }

  const error = submitError ?? parsed.error

  return (
    <AppDialog
      open={open}
      busy={busy}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setSubmitError(null)
        onOpenChange(nextOpen)
      }}
      title="Добавить музыку из JSON"
      description="Быстрое добавление одной или нескольких музыкальных записей"
      icon={<Braces />}
      size="xl"
      bodyClassName="space-y-3"
      footer={
        <>
          <button
            type="button"
            disabled={busy}
            className="h-10 rounded-xl border border-[var(--app-border)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-50"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={busy || parsed.items.length === 0 || Boolean(parsed.error)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-45"
            onClick={() => void submit()}
          >
            {busy && <LoaderCircle className="size-4 animate-spin" />}
            {parsed.items.length > 1 ? `Добавить ${parsed.items.length}` : 'Добавить'}
          </button>
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs leading-5 text-[var(--app-muted)]">
          Один объект или массив. Обязательное поле: <code>title</code>. Тип:{' '}
          <code>track | album | ep | single</code>. Статус:{' '}
          <code>want_to_listen | listened</code>.
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            className="h-8 rounded-lg border border-[var(--app-border)] px-3 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
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
        aria-label="JSON музыки"
        autoFocus
        spellCheck={false}
        placeholder='[{ "title": "Blinding Lights", "type": "track", "artists": ["The Weeknd"] }]'
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
      ) : parsed.items.length > 0 ? (
        <div className="text-xs text-emerald-300">Готово к добавлению: {parsed.items.length}</div>
      ) : null}
    </AppDialog>
  )
}
