import { Copy, Pencil, Trash2 } from 'lucide-react'
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
import { FinanceTemplateDialog } from './dialogs/FinanceTemplateDialog'
import { FinanceTransactionDialog } from './dialogs/FinanceTransactionDialog'

interface Props {
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  templates: FinanceTemplate[]
  onChanged: () => void | Promise<void>
}

export function FinanceTemplates({
  accounts,
  tags,
  templates,
  onChanged
}: Props): React.JSX.Element {
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<FinanceTemplate | null>(null)
  const [deleteTemplate, setDeleteTemplate] = useState<FinanceTemplate | null>(null)
  const [useTemplate, setUseTemplate] = useState<FinanceTemplate | null>(null)
  const [dialogType, setDialogType] = useState<FinanceUserTransactionType>('expense')
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false)

  return (
    <div className="space-y-4">
      <FinanceSection title="Шаблоны" icon={<Copy aria-hidden="true" className="size-5" />}>
        {templates.length === 0 ? (
          <FinanceEmptyState
            icon={<Copy className="size-6" />}
            title="Шаблонов пока нет"
            description="Сохраните часто используемые доходы, расходы или переводы и подставляйте их в форму одним нажатием."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 max-[780px]:grid-cols-1">
            {templates.map((template) => {
              const source = accounts.find((account) => account.id === template.sourceAccountId)
              const destination = accounts.find(
                (account) => account.id === template.destinationAccountId
              )
              const tag = tags.find((item) => item.id === template.tagId)
              const typeLabel =
                template.type === 'income'
                  ? 'Доход'
                  : template.type === 'expense'
                    ? 'Расход'
                    : 'Перевод'

              return (
                <FinanceSurface
                  key={template.id}
                  as="article"
                  className="bg-[var(--app-card)] p-4 shadow-none"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-medium text-[var(--app-text)]">
                        {template.name}
                      </h3>
                      <span className="rounded-md border border-[var(--app-border)] bg-[var(--app-overlay-faint)] px-1.5 py-0.5 text-[10px] tracking-wider text-[var(--app-muted)] uppercase">
                        {typeLabel}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-[var(--app-text)]">
                      {source
                        ? formatMoneyMinor(template.sourceAmountMinor, source.currencyCode)
                        : 'Счёт недоступен'}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                      {template.type === 'transfer'
                        ? `${source?.name ?? 'Счёт недоступен'} → ${destination?.name ?? 'Счёт недоступен'}`
                        : `${source?.name ?? 'Счёт недоступен'}${tag ? ` · ${tag.name}` : ''}`}
                    </div>
                    {template.comment && (
                      <p className="mt-2 line-clamp-2 text-xs text-[var(--app-muted)]">
                        {template.comment}
                      </p>
                    )}
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
          if (!open) setUseTemplate(null)
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
