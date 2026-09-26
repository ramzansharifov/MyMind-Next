import { Braces, Check, Copy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import {
  stringifyMovieJson,
  type MovieRecord
} from '../../../../../shared/contracts/movies'
import { AppDialog } from '../../../shared/ui/AppDialog'

interface MovieJsonViewerDialogProps {
  open: boolean
  title: string
  description: string
  value: MovieRecord | readonly MovieRecord[]
  onOpenChange(open: boolean): void
}

export function MovieJsonViewerDialog({
  open,
  title,
  description,
  value,
  onOpenChange
}: MovieJsonViewerDialogProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const json = useMemo(() => stringifyMovieJson(value), [value])

  useEffect(() => {
    if (!open) {
      setCopied(false)
      setCopyError(null)
    }
  }, [open])

  async function copyJson(): Promise<void> {
    setCopyError(null)
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
    } catch {
      setCopyError('Не удалось скопировать JSON в буфер обмена')
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      icon={<Braces />}
      size="xl"
      bodyClassName="space-y-3"
      footer={
        <>
          <button
            type="button"
            className="h-10 rounded-xl border border-[var(--app-border)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
            onClick={() => onOpenChange(false)}
          >
            Закрыть
          </button>
          <button
            type="button"
            className="bg-accent-500 hover:bg-accent-400 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition-colors"
            onClick={() => void copyJson()}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Скопировано' : 'Копировать'}
          </button>
        </>
      }
    >
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 py-2.5 text-xs leading-5 text-[var(--app-muted)]">
        Это полная сохранённая запись MyMind: включая служебные поля
        <code className="mx-1 text-[var(--app-text)]">id</code>,
        <code className="mx-1 text-[var(--app-text)]">createdAt</code>и
        <code className="ml-1 text-[var(--app-text)]">updatedAt</code>. Текущий импорт JSON
        проигнорирует эти служебные поля, поэтому скопированные данные можно использовать и как
        источник для повторного импорта.
      </div>

      <textarea
        readOnly
        spellCheck={false}
        aria-label="JSON данных фильмов"
        value={json}
        className="focus:border-accent-500/45 focus:ring-accent-500/15 min-h-[420px] w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4 font-mono text-[13px] leading-6 text-[var(--app-text)] outline-none focus:ring-2"
      />

      {copyError ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {copyError}
        </div>
      ) : null}
    </AppDialog>
  )
}
