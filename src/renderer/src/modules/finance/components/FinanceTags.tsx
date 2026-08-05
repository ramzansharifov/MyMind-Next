import { Gauge, Plus, Tag, Trash2 } from 'lucide-react'
import { useState } from 'react'

import type {
  FinanceAccountSummary,
  FinanceLimitStatus,
  FinanceTagSummary
} from '../../../../../shared/contracts/finance'
import { formatMoneyMinor } from '../../../../../shared/finance-money'
import { financeClient } from '../api/finance-client'
import { FinanceIcon, financeTagTypeLabels } from '../lib/finance-ui'
import { FinanceButton, FinanceEmptyState, FinanceSurface } from './FinancePrimitives'
import { FinanceConfirmDialog } from './dialogs/FinanceConfirmDialog'
import { FinanceLimitDialog } from './dialogs/FinanceLimitDialog'
import { FinanceTagDialog } from './dialogs/FinanceTagDialog'

interface Props {
  tags: FinanceTagSummary[]
  accounts: FinanceAccountSummary[]
  limits: FinanceLimitStatus[]
  baseCurrencyCode: string
  createType?: 'income' | 'expense' | null
  onCreateTypeHandled: () => void
  onChanged: () => void | Promise<void>
}

export function FinanceTags({
  tags,
  accounts,
  limits,
  baseCurrencyCode,
  createType,
  onCreateTypeHandled,
  onChanged
}: Props): React.JSX.Element {
  const [dialogOpen, setDialogOpen] = useState(Boolean(createType))
  const [editTag, setEditTag] = useState<FinanceTagSummary | null>(null)
  const [deleteTag, setDeleteTag] = useState<FinanceTagSummary | null>(null)
  const [limitTag, setLimitTag] = useState<FinanceTagSummary | null>(null)

  const openNew = (): void => {
    setEditTag(null)
    setDialogOpen(true)
  }
  const groups = [
    { type: 'income' as const, title: 'Доходы', description: 'Теги только для поступлений' },
    { type: 'expense' as const, title: 'Расходы', description: 'Теги только для списаний' },
    {
      type: 'both' as const,
      title: 'Универсальные',
      description: 'Можно использовать и для доходов, и для расходов'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--app-text)]">
            Категории доходов и расходов
          </h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Иконки выбираются из контролируемого набора Lucide.
          </p>
        </div>
        <FinanceButton tone="primary" onClick={openNew}>
          <Plus className="size-4" />
          Новый тег
        </FinanceButton>
      </div>
      {tags.length === 0 ? (
        <FinanceEmptyState
          icon={<Tag className="size-6" />}
          title="Пока нет тегов"
          description="Доход и расход требуют подходящего тега. Создайте первый, чтобы продолжить добавление операций."
          action={
            <FinanceButton tone="primary" onClick={openNew}>
              <Plus className="size-4" />
              Создать тег
            </FinanceButton>
          }
        />
      ) : (
        groups.map((group) => {
          const items = tags.filter((tag) => tag.type === group.type)
          return (
            <section key={group.type}>
              <div className="mb-3">
                <h3 className="font-semibold text-[var(--app-text)]">{group.title}</h3>
                <p className="mt-0.5 text-sm text-[var(--app-muted)]">{group.description}</p>
              </div>
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--app-border)] p-5 text-sm text-[var(--app-muted)]">
                  В этом разделе тегов пока нет.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 max-[1000px]:grid-cols-2 max-[620px]:grid-cols-1">
                  {items.map((tag) => {
                    const linkedLimit = limits.find((limit) => limit.tagId === tag.id)
                    return (
                      <FinanceSurface key={tag.id} className="p-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex size-11 items-center justify-center rounded-xl"
                            style={{ background: `${tag.color}22`, color: tag.color }}
                          >
                            <FinanceIcon name={tag.icon} className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate font-medium text-[var(--app-text)]">
                              {tag.name}
                            </h4>
                            <p className="text-xs text-[var(--app-muted)]">
                              {financeTagTypeLabels[tag.type]}
                            </p>
                          </div>
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <dt className="text-xs text-[var(--app-muted)]">Операций</dt>
                            <dd className="mt-1 font-medium text-[var(--app-text)]">
                              {tag.transactionCount}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-[var(--app-muted)]">Доля</dt>
                            <dd className="mt-1 font-medium text-[var(--app-text)]">
                              {tag.sharePercent.toFixed(1)}%
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-[var(--app-muted)]">Общая сумма</dt>
                            <dd className="mt-1 font-medium text-[var(--app-text)]">
                              {formatMoneyMinor(tag.totalAmountMinor, baseCurrencyCode)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-[var(--app-muted)]">Средняя сумма</dt>
                            <dd className="mt-1 font-medium text-[var(--app-text)]">
                              {formatMoneyMinor(tag.averageAmountMinor, baseCurrencyCode)}
                            </dd>
                          </div>
                        </dl>
                        {linkedLimit && (
                          <div className="mt-3 rounded-lg bg-amber-500/[0.07] px-3 py-2 text-xs text-amber-100">
                            Лимит: {linkedLimit.name} · {Math.round(linkedLimit.usagePercent)}%
                          </div>
                        )}
                        <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--app-border)] pt-3">
                          <FinanceButton
                            size="sm"
                            onClick={() => {
                              setEditTag(tag)
                              setDialogOpen(true)
                            }}
                          >
                            Изменить
                          </FinanceButton>
                          {tag.type !== 'income' && (
                            <FinanceButton size="sm" onClick={() => setLimitTag(tag)}>
                              <Gauge className="size-4" />
                              Лимит
                            </FinanceButton>
                          )}
                          <FinanceButton
                            size="sm"
                            tone="danger"
                            disabled={tag.transactionCount > 0}
                            title={
                              tag.transactionCount > 0
                                ? `Тег используется в ${tag.transactionCount} операциях`
                                : 'Удалить тег'
                            }
                            onClick={() => setDeleteTag(tag)}
                          >
                            <Trash2 className="size-4" />
                            Удалить
                          </FinanceButton>
                        </div>
                      </FinanceSurface>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })
      )}

      <FinanceTagDialog
        open={dialogOpen || Boolean(createType)}
        tag={editTag}
        initialType={createType ?? 'expense'}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditTag(null)
            onCreateTypeHandled()
          }
        }}
        onSaved={async () => {
          onCreateTypeHandled()
          await onChanged()
        }}
      />
      <FinanceLimitDialog
        open={limitTag !== null}
        initialTagId={limitTag?.id}
        accounts={accounts}
        tags={tags}
        baseCurrencyCode={baseCurrencyCode}
        onOpenChange={(open) => !open && setLimitTag(null)}
        onSaved={async () => {
          setLimitTag(null)
          await onChanged()
        }}
      />
      <FinanceConfirmDialog
        open={deleteTag !== null}
        title="Удалить тег?"
        subject={deleteTag?.name}
        description="Используемый тег удалить нельзя, чтобы история операций сохранила исходную категорию."
        disabledReason={
          deleteTag && deleteTag.transactionCount > 0
            ? `Тег используется в ${deleteTag.transactionCount} операциях.`
            : null
        }
        onOpenChange={(open) => !open && setDeleteTag(null)}
        onConfirm={async () => {
          if (!deleteTag) return
          await financeClient.deleteTag({ id: deleteTag.id })
          setDeleteTag(null)
          await onChanged()
        }}
      />
    </div>
  )
}
