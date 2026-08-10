import { BookHeart, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  DIARY_ICON_NAMES,
  type DiaryIconName,
  type DiarySummary
} from '../../../../../shared/contracts/diary'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { IconPicker, type IconPickerOption } from '../../../shared/ui/IconPicker'
import { diaryClient } from '../api/diary-client'
import { getDiaryErrorMessage } from '../lib/diary-ui'
import { DiaryIcon } from './DiaryIcon'

const iconLabels: Record<DiaryIconName, string> = {
  'book-heart': 'Личный дневник',
  'book-open': 'Книга',
  'notebook-pen': 'Записи',
  feather: 'Перо',
  heart: 'Сердце',
  briefcase: 'Работа',
  lightbulb: 'Идеи',
  sparkles: 'Вдохновение',
  leaf: 'Спокойствие',
  coffee: 'Наблюдения'
}

const iconOptions: readonly IconPickerOption<DiaryIconName>[] = DIARY_ICON_NAMES.map((value) => ({
  value,
  label: iconLabels[value]
}))

export function DiaryDialog({
  open,
  diary,
  onOpenChange,
  onSaved
}: {
  open: boolean
  diary?: DiarySummary | null
  onOpenChange: (open: boolean) => void
  onSaved: (diary: DiarySummary) => void | Promise<void>
}): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState<DiaryIconName>('book-heart')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setTitle(diary?.title ?? '')
      setIcon(diary?.icon ?? 'book-heart')
      setError(null)
    })
    return () => {
      cancelled = true
    }
  }, [diary, open])

  async function submit(): Promise<void> {
    const normalizedTitle = title.trim()
    if (!normalizedTitle) {
      setError('Введите название дневника')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      const saved = diary
        ? await diaryClient.updateDiary({ id: diary.id, title: normalizedTitle, icon })
        : await diaryClient.createDiary({ title: normalizedTitle, icon })
      await onSaved(saved)
      onOpenChange(false)
    } catch (reason) {
      setError(getDiaryErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={diary ? 'Настроить дневник' : 'Новый дневник'}
      description="Название и иконка дневника"
      icon={<BookHeart aria-hidden="true" />}
      size="sm"
      busy={isSaving}
      footer={
        <>
          <button
            type="button"
            disabled={isSaving}
            className="rounded-lg border border-[var(--app-border)] px-4 py-2 text-sm text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-50"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={isSaving || !title.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void submit()}
          >
            {isSaving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            {diary ? 'Сохранить' : 'Создать'}
          </button>
        </>
      }
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault()
          void submit()
        }
      }}
    >
      <div className="space-y-4">
        <label className="block text-sm text-[var(--app-text)]">
          <span className="mb-1.5 block font-medium">Название</span>
          <input
            value={title}
            maxLength={120}
            autoFocus
            className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-control)] px-3 transition-colors outline-none placeholder:text-[var(--app-muted)] focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/15"
            placeholder="Например, Личный дневник"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <div className="text-sm text-[var(--app-text)]">
          <span className="mb-1.5 block font-medium">Иконка</span>
          <IconPicker
            value={icon}
            onChange={setIcon}
            options={iconOptions}
            label="Иконка дневника"
            align="start"
            renderIcon={(value) => <DiaryIcon name={value} className="size-5" />}
            trigger={
              <button
                type="button"
                className="flex h-12 w-full items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-control)] px-3 text-left transition-colors outline-none hover:bg-[var(--app-control-hover)] focus-visible:ring-2 focus-visible:ring-violet-500/30"
              >
                <span className="flex size-8 items-center justify-center rounded-lg border border-violet-500/15 bg-violet-500/10 text-violet-300">
                  <DiaryIcon name={icon} className="size-4" />
                </span>
                <span className="text-sm text-[var(--app-text)]">{iconLabels[icon]}</span>
              </button>
            }
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-sm text-red-200"
          >
            {error}
          </div>
        )}
      </div>
    </AppDialog>
  )
}
