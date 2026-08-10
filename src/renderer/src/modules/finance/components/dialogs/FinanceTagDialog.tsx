import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  LoaderCircle,
  type LucideIcon
} from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  FINANCE_ICON_NAMES,
  FINANCE_TAG_TYPES,
  type FinanceTagSummary,
  type FinanceTagType
} from '../../../../../../shared/contracts/finance'
import { cn } from '../../../../shared/lib/cn'
import { AppDialog } from '../../../../shared/ui/AppDialog'
import { financeClient } from '../../api/finance-client'
import { financeTagTypeLabels, getFinanceErrorMessage } from '../../lib/finance-ui'
import { FinanceButton, FinanceField, financeInputClassName } from '../FinancePrimitives'
import { FinanceIconPicker } from '../FinanceIconPicker'

const tagFormSchema = z.object({
  name: z.string().trim().min(1, 'Введите название').max(120),
  type: z.enum(FINANCE_TAG_TYPES),
  icon: z.enum(FINANCE_ICON_NAMES)
})

type TagFormValues = z.infer<typeof tagFormSchema>

const tagTypeOptions = [
  {
    value: 'expense',
    label: financeTagTypeLabels.expense,
    description: 'Категории расходов',
    icon: ArrowUpRight,
    activeClassName: 'border-red-500/45 bg-red-500/18 text-red-100 shadow-sm',
    activeIconClassName: 'bg-red-500/18 text-red-200'
  },
  {
    value: 'income',
    label: financeTagTypeLabels.income,
    description: 'Категории доходов',
    icon: ArrowDownLeft,
    activeClassName: 'border-emerald-500/45 bg-emerald-500/18 text-emerald-100 shadow-sm',
    activeIconClassName: 'bg-emerald-500/18 text-emerald-200'
  },
  {
    value: 'both',
    label: financeTagTypeLabels.both,
    description: 'Доходы и расходы',
    icon: ArrowRightLeft,
    activeClassName: 'border-amber-500/45 bg-amber-500/18 text-amber-100 shadow-sm',
    activeIconClassName: 'bg-amber-500/18 text-amber-200'
  }
] as const satisfies ReadonlyArray<{
  value: FinanceTagType
  label: string
  description: string
  icon: LucideIcon
  activeClassName: string
  activeIconClassName: string
}>

const idleCardClassName =
  'border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:border-[var(--app-border-strong)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'

interface FinanceTagDialogProps {
  open: boolean
  initialType?: FinanceTagType
  tag?: FinanceTagSummary | null
  onOpenChange: (open: boolean) => void
  onSaved: (tag: FinanceTagSummary) => void | Promise<void>
}

export function FinanceTagDialog(props: FinanceTagDialogProps): React.JSX.Element {
  return props.open ? <FinanceTagDialogContent {...props} /> : <></>
}

function FinanceTagDialogContent({
  open,
  initialType = 'expense',
  tag,
  onOpenChange,
  onSaved
}: FinanceTagDialogProps): React.JSX.Element {
  const [isSaving, setIsSaving] = useState(false)
  const [backendError, setBackendError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      name: tag?.name ?? '',
      type: tag?.type ?? initialType,
      icon: tag?.icon ?? 'tag'
    }
  })

  async function submit(values: TagFormValues): Promise<void> {
    setIsSaving(true)
    setBackendError(null)
    try {
      const saved = tag
        ? await financeClient.updateTag({ id: tag.id, ...values })
        : await financeClient.createTag(values)
      await onSaved(saved)
      onOpenChange(false)
    } catch (reason) {
      setBackendError(getFinanceErrorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tag ? 'Изменить тег' : 'Новый тег'}
      description="Теги классифицируют доходы и расходы и используются в отчётах и лимитах."
      size="md"
      layer="nested"
      busy={isSaving}
      closeLabel="Закрыть форму тега"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          void handleSubmit(submit)(event)
        }}
      >
        <FinanceField label="Название" error={errors.name?.message}>
          <input {...register('name')} autoFocus className={financeInputClassName} />
        </FinanceField>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-[var(--app-text)]">Назначение</legend>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <div
                role="radiogroup"
                aria-label="Назначение тега"
                className="grid grid-cols-3 gap-2 max-[520px]:grid-cols-1"
              >
                {tagTypeOptions.map((option) => {
                  const Icon = option.icon
                  const selected = field.value === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={isSaving}
                      className={cn(
                        'min-h-24 rounded-xl border p-3 text-left transition-[background-color,border-color,box-shadow,color] outline-none',
                        'focus-visible:ring-2 focus-visible:ring-violet-500/35',
                        'disabled:cursor-not-allowed disabled:opacity-45',
                        selected ? option.activeClassName : idleCardClassName
                      )}
                      onClick={() => field.onChange(option.value)}
                    >
                      <span
                        className={cn(
                          'flex size-8 items-center justify-center rounded-lg',
                          selected
                            ? option.activeIconClassName
                            : 'bg-[var(--app-control)] text-[var(--app-muted)]'
                        )}
                      >
                        <Icon aria-hidden="true" className="size-4" />
                      </span>
                      <span className="mt-2 block text-sm font-semibold">{option.label}</span>
                      <span className="mt-0.5 block text-xs leading-4 text-[var(--app-muted)]">
                        {option.description}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          />
          {errors.type?.message ? (
            <span className="mt-1.5 block text-xs text-red-300">{errors.type.message}</span>
          ) : tag && tag.transactionCount > 0 ? (
            <span className="mt-1.5 block text-xs leading-5 text-[var(--app-muted)]">
              Тип можно изменить только при совместимости со всей существующей историей.
            </span>
          ) : null}
        </fieldset>

        <div className="text-sm text-[var(--app-text)]">
          <span className="mb-1.5 block font-medium">Иконка</span>
          <Controller
            control={control}
            name="icon"
            render={({ field }) => (
              <FinanceIconPicker
                value={field.value}
                disabled={isSaving}
                pickerLabel="Иконка тега"
                ariaLabel="Выбрать иконку тега"
                onChange={field.onChange}
              />
            )}
          />
          {errors.icon?.message && (
            <span className="mt-1.5 block text-xs text-red-300">{errors.icon.message}</span>
          )}
        </div>

        {backendError && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/[0.07] p-3 text-sm text-red-200"
          >
            {backendError}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-[var(--app-border)] pt-4">
          <FinanceButton type="button" disabled={isSaving} onClick={() => onOpenChange(false)}>
            Отмена
          </FinanceButton>
          <FinanceButton type="submit" tone="primary" disabled={isSaving}>
            {isSaving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            {isSaving ? 'Сохраняем…' : tag ? 'Сохранить' : 'Создать тег'}
          </FinanceButton>
        </div>
      </form>
    </AppDialog>
  )
}
