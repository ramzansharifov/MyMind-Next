import * as Tabs from '@radix-ui/react-tabs'
import { Braces, LayoutGrid } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import type { StudyCodeApplyResult, StudyNode } from '../../../../../../shared/contracts/study'
import { AppDialog } from '../../../../shared/ui/AppDialog'
import { Tooltip } from '../../../../shared/ui/tooltip'
import { StudyCodeWorkspace } from './StudyCodeWorkspace'

type StudyFolderWorkspaceMode = 'overview' | 'code'

export interface StudyFolderCodeControls {
  openCode: () => void
}

interface StudyFolderCodeWorkspaceProps {
  node: StudyNode
  children: ReactNode | ((controls: StudyFolderCodeControls) => ReactNode)
  onApplied: (result: StudyCodeApplyResult) => void | Promise<void>
  initialMode?: StudyFolderWorkspaceMode
}

export function StudyFolderCodeWorkspace({
  node,
  children,
  onApplied,
  initialMode = 'overview'
}: StudyFolderCodeWorkspaceProps): React.JSX.Element {
  const [mode, setMode] = useState<StudyFolderWorkspaceMode>(initialMode)
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

  const overview =
    typeof children === 'function'
      ? children({
          openCode: () => requestMode('code')
        })
      : children

  return (
    <section
      data-study-folder-code-workspace
      data-folder-mode={mode}
      className="flex h-full min-h-0 flex-col bg-[var(--app-workspace)]"
    >
      <div className="flex min-h-12 shrink-0 items-center border-b border-[var(--app-border)] px-5 max-[720px]:px-3">
        <Tabs.Root value={mode} onValueChange={requestMode}>
          <Tabs.List
            aria-label="Режим папки обучения"
            className="inline-flex rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-1"
          >
            <Tooltip content="Обычный обзор папки" side="bottom">
              <Tabs.Trigger
                value="overview"
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] data-[state=active]:bg-[var(--app-surface-raised)] data-[state=active]:text-[var(--app-text)]"
              >
                <LayoutGrid aria-hidden="true" className="size-3.5" />
                Обзор
              </Tabs.Trigger>
            </Tooltip>
            <Tooltip content="Редактировать всю вложенную структуру папки через DSL" side="bottom">
              <Tabs.Trigger
                value="code"
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] data-[state=active]:bg-[var(--app-surface-raised)] data-[state=active]:text-[var(--app-text)]"
              >
                <Braces aria-hidden="true" className="size-3.5" />
                Код структуры
              </Tabs.Trigger>
            </Tooltip>
          </Tabs.List>
        </Tabs.Root>
      </div>

      <div className="min-h-0 flex-1">
        {mode === 'code' ? (
          <StudyCodeWorkspace node={node} onApplied={onApplied} onDirtyChange={setCodeDirty} />
        ) : (
          overview
        )}
      </div>

      <AppDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Отменить изменения структуры?"
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
        <p className="text-sm text-[var(--app-muted)]">
          Сохраните DSL, если хотите применить изменения папок, материалов и их содержимого.
        </p>
      </AppDialog>
    </section>
  )
}
