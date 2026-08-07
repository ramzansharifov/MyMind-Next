import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  FINANCE_ICON_NAMES,
  FINANCE_TAG_TYPES,
  type FinanceTagSummary,
  type FinanceTagType
} from '../../../../../../shared/contracts/finance'
import { AppDialog } from '../../../../shared/ui/AppDialog'
import { financeClient } from '../../api/finance-client'
import { financeTagTypeLabels, getFinanceErrorMessage } from '../../lib/finance-ui'
import { FinanceButton, FinanceField, financeInputClassName } from '../FinancePrimitives'

const tagFormSchema = z.object({
  name: z.string().trim().min(1, 'Введите название').max(120),
  type: z.enum(FINANCE_TAG_TYPES),
  icon: z.enum(FINANCE_ICON_NAMES),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Выберите корректный цвет')
})

type TagFormValues = z.infer<typeof tagFormSchema>

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
    handleSubmit,
    formState: { errors }
  } = useForm<TagFormValues>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      name: tag?.name ?? '',
      type: tag?.type ?? initialType,
      icon: tag?.icon ?? 'tag',
      color: tag?.color ?? '#8b5cf6'
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

        <FinanceField
          label="Назначение"
          error={errors.type?.message}
          hint={
            tag && tag.transactionCount > 0
              ? 'Тип можно изменить только при совместимости со всей существующей историей.'
              : undefined
          }
        >
          <select {...register('type')} className={financeInputClassName}>
            {FINANCE_TAG_TYPES.map((type) => (
              <option key={type} value={type}>
                {financeTagTypeLabels[type]}
              </option>
            ))}
          </select>
        </FinanceField>

        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-4">
          <FinanceField label="Иконка" error={errors.icon?.message}>
            <select {...register('icon')} className={financeInputClassName}>
              {FINANCE_ICON_NAMES.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
          </FinanceField>
          <FinanceField label="Цвет" error={errors.color?.message}>
            <input
              {...register('color')}
              type="color"
              className={`${financeInputClassName} p-1`}
            />
          </FinanceField>
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
