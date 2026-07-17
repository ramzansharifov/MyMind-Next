import { ArrowRight, LayoutDashboard, LoaderCircle, Presentation } from 'lucide-react'
import { useState } from 'react'

import type { StudyBlock } from '../../../../../../shared/contracts/study'
import { requestAppModuleNavigation } from '../../../../app/module-navigation'
import { boardsClient } from '../../../boards/api/boards-client'

interface StudyBoardBlockProps {
  materialId: string
  block: Extract<StudyBlock, { type: 'board' }>
  mode: 'edit' | 'read'
  onChange?: (block: StudyBlock) => void
}

export function StudyBoardBlock({
  materialId,
  block,
  mode,
  onChange
}: StudyBoardBlockProps): React.JSX.Element {
  const [isOpening, setIsOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function openBoard(): Promise<void> {
    setIsOpening(true)
    setError(null)

    try {
      const board = await boardsClient.ensureStudyBoard({
        materialId,
        blockId: block.id
      })

      if (board.id !== block.boardId || board.title !== block.title) {
        onChange?.({
          ...block,
          boardId: board.id,
          title: board.title
        })
      }

      requestAppModuleNavigation({
        view: 'boards',
        resourceId: board.id
      })
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'Не удалось открыть доску')
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 right-0 size-52 rounded-full bg-[var(--app-accent-500)]/12 blur-3xl"
      />

      <div className="relative flex items-center gap-4 max-[640px]:items-start">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--app-accent-500)]/20 bg-[var(--app-accent-500)]/10 text-[var(--app-accent-300)]">
          <Presentation aria-hidden="true" className="size-6" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.1em] text-[var(--app-accent-300)] uppercase">
            Доска tldraw
          </p>
          <h3 className="mt-1 truncate text-lg font-semibold text-[var(--app-text)]">
            {block.title ?? 'Доска материала'}
          </h3>
          <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
            {block.boardId
              ? 'Доска связана с этим блоком и сохраняется в модуле «Доски».'
              : 'При первом открытии будет создана отдельная доска в защищённой папке «Обучение».'}
          </p>
          {error && (
            <p role="alert" className="mt-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={isOpening}
          className="relative flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[var(--app-accent-500)]/25 bg-[var(--app-accent-500)]/10 px-3 text-sm font-medium text-[var(--app-text)] transition-colors outline-none hover:bg-[var(--app-accent-500)]/18 focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)]/45 disabled:opacity-60 max-[640px]:absolute max-[640px]:top-0 max-[640px]:right-0"
          onClick={() => void openBoard()}
        >
          {isOpening ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : mode === 'read' ? (
            <LayoutDashboard aria-hidden="true" className="size-4" />
          ) : (
            <ArrowRight aria-hidden="true" className="size-4" />
          )}
          <span className="max-[720px]:hidden">
            {block.boardId ? 'Открыть доску' : 'Создать доску'}
          </span>
        </button>
      </div>
    </div>
  )
}
