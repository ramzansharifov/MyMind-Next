import { Tooltip } from '../../../shared/ui/tooltip'
import { Eye, EyeOff, KeyRound, Sparkles, Star, WandSparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type {
  CreatePasswordItemInput,
  PasswordGroupRecord,
  PasswordItemRecord,
  PasswordItemType,
  UpdatePasswordItemInput
} from '../../../../../shared/contracts/passwords'
import { cn } from '../../../shared/lib/cn'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { AppCheckbox } from '../../../shared/ui/AppCheckbox'
import { AppSlider } from '../../../shared/ui/AppSlider'
import { AppSelect } from '../../../shared/ui/AppSelect'
import { passwordsClient } from '../api/passwords-client'
import { PASSWORD_TYPE_OPTIONS } from '../password-options'

const ITEM_FORM_ID = 'password-item-editor-form'
const NO_GROUP = '__none__'

interface PasswordItemDialogProps {
  open: boolean
  item: PasswordItemRecord | null
  groups: PasswordGroupRecord[]
  initialGroupId: string | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: CreatePasswordItemInput | UpdatePasswordItemInput) => Promise<void>
}

export function PasswordItemDialog({
  open,
  item,
  groups,
  initialGroupId,
  busy,
  onOpenChange,
  onSave
}: PasswordItemDialogProps): React.JSX.Element {
  const [type, setType] = useState<PasswordItemType>('login')
  const [groupId, setGroupId] = useState<string>(NO_GROUP)
  const [title, setTitle] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [website, setWebsite] = useState('')
  const [notes, setNotes] = useState('')
  const [favorite, setFavorite] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [generatorLength, setGeneratorLength] = useState(20)
  const [lowercase, setLowercase] = useState(true)
  const [uppercase, setUppercase] = useState(true)
  const [digits, setDigits] = useState(true)
  const [symbols, setSymbols] = useState(true)
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setType(item?.type ?? 'login')
    setGroupId(item?.groupId ?? initialGroupId ?? NO_GROUP)
    setTitle(item?.title ?? '')
    setUsername(item?.username ?? '')
    setPassword(item?.password ?? '')
    setWebsite(item?.website ?? '')
    setNotes(item?.notes ?? '')
    setFavorite(item?.favorite ?? false)
    setPasswordVisible(false)
    setGeneratorOpen(false)
    setError(null)
  }, [initialGroupId, item, open])

  const groupOptions = useMemo(
    () => [
      { value: NO_GROUP, label: 'Без группы' },
      ...groups.map((group) => ({ value: group.id, label: group.name }))
    ],
    [groups]
  )

  async function generate(): Promise<void> {
    if (generating) return
    setGenerating(true)
    setError(null)
    try {
      const generated = await passwordsClient.generatePassword({
        length: generatorLength,
        lowercase,
        uppercase,
        digits,
        symbols,
        excludeAmbiguous
      })
      setPassword(generated)
      setPasswordVisible(true)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сгенерировать пароль')
    } finally {
      setGenerating(false)
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!title.trim() || !password || busy) return

    setError(null)
    const payload: CreatePasswordItemInput = {
      groupId: groupId === NO_GROUP ? null : groupId,
      type,
      title: title.trim(),
      username: type === 'login' ? username.trim() : '',
      password,
      website: website.trim(),
      notes,
      tags: item?.tags ?? [],
      customFields: item?.customFields ?? [],
      favorite
    }

    try {
      await onSave(item ? { ...payload, id: item.id } : payload)
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить запись')
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={item ? 'Изменить запись' : 'Новая запись'}
      description="Логины и пароли сохраняются в зашифрованном хранилище."
      icon={<KeyRound />}
      size="lg"
      busy={busy || generating}
      footer={
        <>
          <button
            type="button"
            disabled={busy || generating}
            className="h-10 rounded-xl px-4 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-45"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </button>
          <button
            type="submit"
            form={ITEM_FORM_ID}
            disabled={busy || generating || !title.trim() || !password}
            className="bg-accent-500 hover:bg-accent-400 h-10 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-45"
          >
            {busy ? 'Сохраняем…' : item ? 'Сохранить' : 'Добавить'}
          </button>
        </>
      }
    >
      <form id={ITEM_FORM_ID} className="space-y-5" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-[var(--app-muted)]">Тип</span>
            <AppSelect
              ariaLabel="Тип записи пароля"
              value={type}
              options={PASSWORD_TYPE_OPTIONS}
              onValueChange={(value) => setType(value as PasswordItemType)}
            />
          </div>
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-[var(--app-muted)]">Группа</span>
            <AppSelect
              ariaLabel="Группа записи пароля"
              value={groupId}
              options={groupOptions}
              onValueChange={setGroupId}
            />
          </div>
          <button
            type="button"
            aria-pressed={favorite}
            className={cn(
              'flex h-11 w-full items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-medium whitespace-nowrap transition-colors sm:w-auto',
              favorite
                ? 'border-amber-400/25 bg-amber-500/10 text-amber-200'
                : 'border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]'
            )}
            onClick={() => setFavorite((current) => !current)}
          >
            <Star className={cn('size-4', favorite && 'fill-current')} />
            <span>{favorite ? 'В избранном' : 'Добавить в избранное'}</span>
          </button>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--app-muted)]">Название</span>
          <input
            autoFocus
            value={title}
            maxLength={160}
            placeholder={type === 'login' ? 'Например, GitHub' : 'Например, PIN от сейфа'}
            className="focus:border-accent-500/45 focus:ring-accent-500/15 h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:ring-2"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        {type === 'login' && (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[var(--app-muted)]">Логин / email</span>
            <input
              value={username}
              maxLength={240}
              autoComplete="off"
              placeholder="user@example.com"
              className="focus:border-accent-500/45 focus:ring-accent-500/15 h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:ring-2"
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[var(--app-muted)]">Пароль</span>
            <button
              type="button"
              className="text-accent-300 hover:text-accent-200 inline-flex items-center gap-1.5 text-xs font-medium"
              onClick={() => setGeneratorOpen((current) => !current)}
            >
              <WandSparkles className="size-3.5" /> Генератор
            </button>
          </div>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <input
                value={password}
                type={passwordVisible ? 'text' : 'password'}
                maxLength={1024}
                autoComplete="new-password"
                placeholder="Введите или сгенерируйте пароль"
                className="focus:border-accent-500/45 focus:ring-accent-500/15 h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 pr-11 font-mono text-sm text-[var(--app-text)] outline-none placeholder:font-sans placeholder:text-[var(--app-muted)]/60 focus:ring-2"
                onChange={(event) => setPassword(event.target.value)}
              />
              <Tooltip content={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'} side="top">
                <button
                  type="button"
                  aria-label={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                  className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                  onClick={() => setPasswordVisible((current) => !current)}
                >
                  {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {generatorOpen && (
          <div className="border-accent-400/15 bg-accent-500/[0.06] rounded-2xl border p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-accent-300 size-4" />
              <span className="text-sm font-semibold text-[var(--app-text)]">Генератор пароля</span>
              <span className="text-accent-200 ml-auto text-sm font-semibold">
                {generatorLength}
              </span>
            </div>
            <AppSlider
              ariaLabel="Длина генерируемого пароля"
              min={8}
              max={64}
              value={generatorLength}
              className="mt-4"
              onValueChange={setGeneratorLength}
            />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                ['Строчные буквы', lowercase, setLowercase],
                ['Заглавные буквы', uppercase, setUppercase],
                ['Цифры', digits, setDigits],
                ['Символы', symbols, setSymbols],
                ['Исключить похожие', excludeAmbiguous, setExcludeAmbiguous]
              ].map(([label, checked, setter], index) => {
                const optionId = `password-generator-option-${index}`
                return (
                  <label
                    key={String(label)}
                    htmlFor={optionId}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2 text-xs text-[var(--app-muted)]"
                  >
                    <AppCheckbox
                      id={optionId}
                      ariaLabel={String(label)}
                      checked={Boolean(checked)}
                      onCheckedChange={(nextChecked) =>
                        (setter as React.Dispatch<React.SetStateAction<boolean>>)(nextChecked)
                      }
                    />
                    {String(label)}
                  </label>
                )
              })}
            </div>
            <button
              type="button"
              disabled={generating || (!lowercase && !uppercase && !digits && !symbols)}
              className="bg-accent-500 hover:bg-accent-400 mt-3 inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-45"
              onClick={() => void generate()}
            >
              <Sparkles className="size-4" /> {generating ? 'Генерируем…' : 'Сгенерировать'}
            </button>
          </div>
        )}

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--app-muted)]">Сайт / адрес</span>
          <input
            value={website}
            maxLength={2048}
            placeholder="github.com"
            className="focus:border-accent-500/45 focus:ring-accent-500/15 h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:ring-2"
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--app-muted)]">Заметки</span>
          <textarea
            value={notes}
            rows={4}
            maxLength={20_000}
            placeholder="Например, где используется этот доступ или как восстановить аккаунт…"
            className="focus:border-accent-500/45 focus:ring-accent-500/15 w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 py-3 text-sm leading-6 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:ring-2"
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            {error}
          </div>
        )}
      </form>
    </AppDialog>
  )
}
