import { Tooltip } from '../../../shared/ui/tooltip'
import { Braces, LoaderCircle, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { CreateMusicItemInput } from '../../../../../shared/contracts/music'
import { parseMusicJson } from '@mymind/core/catalog-json-import'
import { AppDialog } from '../../../shared/ui/AppDialog'

interface MusicJsonImportDialogProps {
  open: boolean
  busy: boolean
  onOpenChange: (open: boolean) => void
  onImport: (items: CreateMusicItemInput[]) => Promise<void>
}

const EXAMPLE_JSON = `[
  {
    "title": "Blinding Lights",
    "artist": "The Weeknd",
    "year": 2019,
    "durationSeconds": 200,
    "favorite": true
  }
]`

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
      description="Быстрое добавление одного или нескольких треков"
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
            className="bg-accent-500 hover:bg-accent-400 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-45"
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
          Один объект или массив до 100 треков. Обязательные поля: <code>title</code> и{' '}
          <code>artist</code>. Дополнительно: <code>year</code>, <code>durationSeconds</code> и{' '}
          <code>favorite</code>.
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
        aria-label="JSON музыки"
        autoFocus
        spellCheck={false}
        placeholder='[{ "title": "Blinding Lights", "artist": "The Weeknd", "year": 2019 }]'
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
        <div className="text-xs text-emerald-300">Готово к добавлению: {parsed.items.length}</div>
      ) : null}
    </AppDialog>
  )
}
