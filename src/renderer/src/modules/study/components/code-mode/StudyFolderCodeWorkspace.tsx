import * as Tabs from '@radix-ui/react-tabs'
import { Braces, LayoutGrid } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import type { StudyCodeApplyResult, StudyNode } from '../../../../../../shared/contracts/study'
import { AppDialog } from '../../../../shared/ui/AppDialog'
import { StudyCodeWorkspace } from './StudyCodeWorkspace'

interface StudyFolderCodeWorkspaceProps {
  node: StudyNode
  children: ReactNode
  onApplied: (result: StudyCodeApplyResult) => void | Promise<void>
}

export function StudyFolderCodeWorkspace({
  node,
  children,
  onApplied
}: StudyFolderCodeWorkspaceProps): React.JSX.Element {
  const [mode, setMode] = useState<'overview' | 'code'>('overview')
  const [codeDirty, setCodeDirty] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)

  function requestMode(value: string): void {
    if (value !== 'overview' && value !== 'code') return
    if (value === mode) return

    if (mode === 'code' && value === 'overview' && codeDirty) {
      setDiscardOpen(true)
      return
    }

    setMode(value)
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-[var(--app-workspace)]">
      <div className="flex min-h-12 shrink-0 items-center border-b border-[var(--app-border)] px-5 max-[720px]:px-3">
        <Tabs.Root value={mode} onValueChange={requestMode}>
          <Tabs.List
            aria-label="Режим папки обучения"
            className="inline-flex rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-1"
          >
            <Tabs.Trigger
              value="overview"
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] data-[state=active]:bg-[var(--app-surface-raised)] data-[state=active]:text-[var(--app-text)]"
            >
              <LayoutGrid aria-hidden="true" className="size-3.5" />
              Обзор
            </Tabs.Trigger>
            <Tabs.Trigger
              value="code"
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] data-[state=active]:bg-[var(--app-surface-raised)] data-[state=active]:text-[var(--app-text)]"
            >
              <Braces aria-hidden="true" className="size-3.5" />
              Код
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
      </div>

      <div className="min-h-0 flex-1">
        {mode === 'code' ? (
          <StudyCodeWorkspace node={node} onApplied={onApplied} onDirtyChange={setCodeDirty} />
        ) : (
          children
        )}
      </div>

      <AppDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Отменить изменения кода?"
        description="Несохранённый DSL папки не был применён."
        footer={
          <>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm text-[var(--app-muted)]"
              onClick={() => setDiscardOpen(false)}
            >
              Остаться
            </button>
            <button
              type="button"
              className="rounded-lg bg-violet-500/15 px-3 py-2 text-sm font-medium text-violet-200"
              onClick={() => {
                setDiscardOpen(false)
                setCodeDirty(false)
                setMode('overview')
              }}
            >
              Отменить и перейти
            </button>
          </>
        }
      >
        <p className="text-sm text-[var(--app-muted)]">Сохраните DSL, если хотите применить изменения.</p>
      </AppDialog>
    </section>
  )
}
