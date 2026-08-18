import * as Tabs from '@radix-ui/react-tabs'
import { Braces, LayoutGrid } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import type { StudyCodeApplyResult, StudyNode } from '../../../../../../shared/contracts/study'
import { AppDialog } from '../../../../shared/ui/AppDialog'
import { Tooltip } from '../../../../shared/ui/tooltip'
import { StudyCodeWorkspace } from './StudyCodeWorkspace'

export type StudyFolderWorkspaceMode = 'overview' | 'code'

export interface StudyFolderCodeControls {
  mode: StudyFolderWorkspaceMode
  modeTabs: ReactNode
  codeWorkspace: ReactNode
  openOverview: () => void
  openCode: () => void
}

interface StudyFolderCodeWorkspaceProps {
  node: StudyNode
  children: ReactNode | ((controls: StudyFolderCodeControls) => ReactNode)
  onApplied: (result: StudyCodeApplyResult) => void | Promise<void>
  initialMode?: StudyFolderWorkspaceMode
}

const modeTriggerClassName =
  'flex size-9 items-center justify-center rounded-md text-[var(--app-muted)] transition-colors outline-none hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35 data-[state=active]:bg-[var(--app-surface-raised)] data-[state=active]:text-[var(--app-text)]'

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

  const modeTabs = (
    <Tabs.Root value={mode} onValueChange={requestMode}>
      <Tabs.List
        aria-label="Режим папки обучения"
        className="inline-flex rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-1"
      >
        <Tooltip content="Обзор папки" side="bottom">
          <Tabs.Trigger value="overview" aria-label="Обзор" className={modeTriggerClassName}>
            <LayoutGrid aria-hidden="true" className="size-4" />
          </Tabs.Trigger>
        </Tooltip>
        <Tooltip content="Редактировать структуру папки через DSL" side="bottom">
          <Tabs.Trigger value="code" aria-label="Код структуры" className={modeTriggerClassName}>
            <Braces aria-hidden="true" className="size-4" />
          </Tabs.Trigger>
        </Tooltip>
      </Tabs.List>
    </Tabs.Root>
  )

  const codeWorkspace = (
    <StudyCodeWorkspace node={node} onApplied={onApplied} onDirtyChange={setCodeDirty} />
  )

  const controls: StudyFolderCodeControls = {
    mode,
    modeTabs,
    codeWorkspace,
    openOverview: () => requestMode('overview'),
    openCode: () => requestMode('code')
  }

  return (
    <section
      data-study-folder-code-workspace
      data-folder-mode={mode}
      className="h-full min-h-0 bg-[var(--app-workspace)]"
    >
      {typeof children === 'function'
        ? children(controls)
        : mode === 'code'
          ? codeWorkspace
          : children}

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
