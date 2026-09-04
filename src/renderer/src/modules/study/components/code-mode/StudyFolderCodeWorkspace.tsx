import * as Tabs from '@radix-ui/react-tabs'
import { Braces, LayoutGrid } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import type { StudyCodeApplyResult, StudyNode } from '../../../../../../shared/contracts/study'
import { AppDialog } from '../../../../shared/ui/AppDialog'
import { Tooltip } from '../../../../shared/ui/tooltip'
import { StudyCodeWorkspace } from './StudyCodeWorkspace'
import './StudyFolderCodeWorkspace.css'

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
  'flex size-9 items-center justify-center rounded-md border border-transparent text-[var(--app-muted)] transition-colors outline-none hover:bg-white/[0.04] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-accent-500/35 data-[state=active]:border-accent-500/30 data-[state=active]:bg-accent-500/15 data-[state=active]:text-accent-200 data-[state=active]:shadow-sm'

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
              className="bg-accent-500/15 text-accent-200 rounded-lg px-3 py-2 text-sm font-medium"
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
