import { Eye, EyeOff, KeyRound, Plus, Sparkles, Star, Trash2, WandSparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type {
  CreatePasswordItemInput,
  PasswordCustomField,
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

function uniqueTags(value: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of value.split(',')) {
    const tag = raw.trim()
    const key = tag.toLocaleLowerCase('ru-RU')
    if (!tag || seen.has(key)) continue
    seen.add(key)
    result.push(tag)
  }
  return result
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
  const [tagsText, setTagsText] = useState('')
  const [customFields, setCustomFields] = useState<PasswordCustomField[]>([])
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
    setTagsText(item?.tags.join(', ') ?? '')
    setCustomFields(item?.customFields ?? [])
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

  function updateCustomField(index: number, patch: Partial<PasswordCustomField>): void {
    setCustomFields((current) =>
      current.map((field, fieldIndex) => (fieldIndex === index ? { ...field, ...patch } : field))
    )
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
      tags: uniqueTags(tagsText),
      customFields: customFields
        .map((field) => ({ label: field.label.trim(), value: field.value }))
        .filter((field) => field.label.length > 0),
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
      description="Логины, пароли и дополнительные секретные поля сохраняются в зашифрованном хранилище."
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
            className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-45"
          >
            {busy ? 'Сохраняем…' : item ? 'Сохранить' : 'Добавить'}
          </button>
        </>
      }
    >
      <form id={ITEM_FORM_ID} className="space-y-5" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--app-muted)]">Название</span>
          <input
            autoFocus
            value={title}
            maxLength={160}
            placeholder={type === 'login' ? 'Например, GitHub' : 'Например, PIN от сейфа'}
            className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
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
              className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[var(--app-muted)]">Пароль</span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-300 hover:text-violet-200"
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
                className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 pr-11 font-mono text-sm text-[var(--app-text)] outline-none placeholder:font-sans placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                aria-label={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={() => setPasswordVisible((current) => !current)}
              >
                {passwordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
        </div>

        {generatorOpen && (
          <div className="rounded-2xl border border-violet-400/15 bg-violet-500/[0.06] p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-violet-300" />
              <span className="text-sm font-semibold text-[var(--app-text)]">Генератор пароля</span>
              <span className="ml-auto text-sm font-semibold text-violet-200">
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
              className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-45"
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
            className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--app-muted)]">Теги</span>
          <input
            value={tagsText}
            placeholder="Работа, Git, Разработка"
            className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
            onChange={(event) => setTagsText(event.target.value)}
          />
          <span className="block text-[11px] text-[var(--app-muted)]">
            Разделяйте теги запятыми.
          </span>
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-[var(--app-muted)]">
              Дополнительные секретные поля
            </span>
            <button
              type="button"
              disabled={customFields.length >= 20}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-300 hover:text-violet-200 disabled:opacity-40"
              onClick={() => setCustomFields((current) => [...current, { label: '', value: '' }])}
            >
              <Plus className="size-3.5" /> Добавить поле
            </button>
          </div>
          {customFields.map((field, index) => (
            <div
              key={index}
              className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_40px] gap-2"
            >
              <input
                value={field.label}
                maxLength={80}
                placeholder="Название"
                className="h-10 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
                onChange={(event) => updateCustomField(index, { label: event.target.value })}
              />
              <input
                value={field.value}
                type="password"
                maxLength={4000}
                placeholder="Значение"
                className="h-10 min-w-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 font-mono text-sm text-[var(--app-text)] outline-none placeholder:font-sans placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
                onChange={(event) => updateCustomField(index, { value: event.target.value })}
              />
              <button
                type="button"
                aria-label="Удалить дополнительное поле"
                className="flex size-10 items-center justify-center rounded-xl text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                onClick={() =>
                  setCustomFields((current) =>
                    current.filter((_, fieldIndex) => fieldIndex !== index)
                  )
                }
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--app-muted)]">Заметки</span>
          <textarea
            value={notes}
            rows={4}
            maxLength={20_000}
            placeholder="Например, где используется этот доступ или как восстановить аккаунт…"
            className="w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 py-3 text-sm leading-6 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>

        <button
          type="button"
          aria-pressed={favorite}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
            favorite
              ? 'border-amber-400/25 bg-amber-500/10 text-amber-200'
              : 'border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]'
          )}
          onClick={() => setFavorite((current) => !current)}
        >
          <Star className={cn('size-4', favorite && 'fill-current')} />
          <span className="text-sm font-medium">Добавить в избранное</span>
        </button>

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
