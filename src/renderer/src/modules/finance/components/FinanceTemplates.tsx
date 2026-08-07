import { CalendarClock, Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { useState } from 'react'

import type {
  FinanceAccountSummary,
  FinanceTagSummary,
  FinanceTemplate,
  FinanceUserTransactionType
} from '../../../../../shared/contracts/finance'
import { formatMoneyMinor } from '../../../../../shared/finance-money'
import { financeClient } from '../api/finance-client'
import { FinanceButton, FinanceEmptyState, FinanceSurface } from './FinancePrimitives'
import { FinanceSection } from './FinanceSection'
import { FinanceConfirmDialog } from './dialogs/FinanceConfirmDialog'
import { FinanceTagDialog } from './dialogs/FinanceTagDialog'
import { FinanceTemplateDialog } from './dialogs/FinanceTemplateDialog'
import { FinanceTransactionDialog } from './dialogs/FinanceTransactionDialog'

interface Props {
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  templates: FinanceTemplate[]
  initialTemplate?: FinanceTemplate | null
  onInitialTemplateHandled?: () => void
  onChanged: () => void | Promise<void>
}

export function FinanceTemplates({
  accounts,
  tags,
  templates,
  initialTemplate,
  onInitialTemplateHandled,
  onChanged
}: Props): React.JSX.Element {
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<FinanceTemplate | null>(null)
  const [deleteTemplate, setDeleteTemplate] = useState<FinanceTemplate | null>(null)
  const [useTemplate, setUseTemplate] = useState<FinanceTemplate | null>(initialTemplate ?? null)
  const [dialogType, setDialogType] = useState<FinanceUserTransactionType>(
    initialTemplate?.type ?? 'expense'
  )
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(Boolean(initialTemplate))
  const [quickTagType, setQuickTagType] = useState<'income' | 'expense' | null>(null)

  return (
    <div className="space-y-4">
      <FinanceSection title="Шаблоны" icon={<CalendarClock aria-hidden="true" className="size-5" />}>
        {templates.length === 0 ? (
          <FinanceEmptyState
            icon={<CalendarClock className="size-6" />}
            title="Шаблонов пока нет"
            description="Сохраните часто повторяющиеся доходы, расходы или переводы."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 max-[780px]:grid-cols-1">
            {templates.map((template) => {
              const source = accounts.find((account) => account.id === template.sourceAccountId)
              return (
                <FinanceSurface
                  key={template.id}
                  as="article"
                  className="bg-[var(--app-card)] p-4 shadow-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-medium text-[var(--app-text)]">
                          {template.name}
                        </h3>
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] tracking-wider uppercase ${template.state === 'active' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-[var(--app-overlay-faint)] text-[var(--app-muted)]'}`}
                        >
                          {template.state === 'active' ? 'Активен' : 'Пауза'}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-[var(--app-muted)]">
                        {source
                          ? formatMoneyMinor(template.sourceAmountMinor, source.currencyCode)
                          : 'Счёт недоступен'}{' '}
                        ·{' '}
                        {template.type === 'income'
                          ? 'Доход'
                          : template.type === 'expense'
                            ? 'Расход'
                            : 'Перевод'}
                      </div>
                      <div className="mt-1 text-xs text-[var(--app-muted)]">
                        Следующая:{' '}
                        {template.nextOccurrenceAt
                          ? new Date(template.nextOccurrenceAt).toLocaleString('ru-RU', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })
                          : 'без расписания'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--app-border)] pt-3">
                    <FinanceButton
                      size="sm"
                      tone="primary"
                      onClick={() => {
                        setUseTemplate(template)
                        setDialogType(template.type)
                        setTransactionDialogOpen(true)
                      }}
                    >
                      Использовать
                    </FinanceButton>
                    <FinanceButton
                      size="sm"
                      onClick={() => {
                        setEditTemplate(template)
                        setTemplateDialogOpen(true)
                      }}
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                      Изменить
                    </FinanceButton>
                    <FinanceButton
                      size="sm"
                      onClick={() =>
                        void (async () => {
                          await financeClient.setTemplateState({
                            id: template.id,
                            state: template.state === 'active' ? 'paused' : 'active'
                          })
                          await onChanged()
                        })()
                      }
                    >
                      {template.state === 'active' ? (
                        <Pause aria-hidden="true" className="size-4" />
                      ) : (
                        <Play aria-hidden="true" className="size-4" />
                      )}
                      {template.state === 'active' ? 'Пауза' : 'Возобновить'}
                    </FinanceButton>
                    <FinanceButton
                      size="sm"
                      tone="danger"
                      onClick={() => setDeleteTemplate(template)}
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                      Удалить
                    </FinanceButton>
                  </div>
                </FinanceSurface>
              )
            })}
          </div>
        )}
      </FinanceSection>

      <FinanceTemplateDialog
        open={templateDialogOpen}
        template={editTemplate}
        accounts={accounts}
        tags={tags}
        onOpenChange={(open) => {
          setTemplateDialogOpen(open)
          if (!open) setEditTemplate(null)
        }}
        onSaved={async () => onChanged()}
      />
      <FinanceTransactionDialog
        open={transactionDialogOpen}
        initialType={dialogType}
        accounts={accounts}
        tags={tags}
        template={useTemplate}
        onOpenChange={(open) => {
          setTransactionDialogOpen(open)
          if (!open) {
            setUseTemplate(null)
            onInitialTemplateHandled?.()
          }
        }}
        onSaved={async () => onChanged()}
        onCreateTagRequested={setQuickTagType}
      />
      <FinanceTagDialog
        open={quickTagType !== null}
        initialType={quickTagType ?? 'expense'}
        onOpenChange={(open) => {
          if (!open) setQuickTagType(null)
        }}
        onSaved={async () => onChanged()}
      />
      <FinanceConfirmDialog
        open={deleteTemplate !== null}
        title="Удалить шаблон?"
        subject={deleteTemplate?.name}
        description="Созданные по шаблону операции останутся без изменений. Связь в истории будет сохранена снимком названия."
        onOpenChange={(open) => !open && setDeleteTemplate(null)}
        onConfirm={async () => {
          if (!deleteTemplate) return
          await financeClient.deleteTemplate({ id: deleteTemplate.id })
          setDeleteTemplate(null)
          await onChanged()
        }}
      />
    </div>
  )
}
