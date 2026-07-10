import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ArrowDown, ArrowUp, Code2, Heading, Link2, Minus, Plus, Trash2, Type } from 'lucide-react'

import type {
  StudyBlock,
  StudyBlockType,
  StudyDocument
} from '../../../../../shared/contracts/study'
import {
  createStudyBlock,
  moveStudyBlock,
  removeStudyBlock,
  replaceStudyBlock
} from '../lib/study-document'

interface StudyBlockEditorProps {
  document: StudyDocument
  mode: 'edit' | 'read'
  onChange: (document: StudyDocument) => void
}

const blockTypes: Array<{
  type: StudyBlockType
  label: string
  icon: typeof Type
}> = [
  {
    type: 'text',
    label: 'Текст',
    icon: Type
  },
  {
    type: 'heading',
    label: 'Заголовок',
    icon: Heading
  },
  {
    type: 'code',
    label: 'Код',
    icon: Code2
  },
  {
    type: 'link',
    label: 'Ссылка',
    icon: Link2
  },
  {
    type: 'divider',
    label: 'Разделитель',
    icon: Minus
  }
]

export function StudyBlockEditor({
  document,
  mode,
  onChange
}: StudyBlockEditorProps): React.JSX.Element {
  if (mode === 'read') {
    return (
      <article className="mx-auto max-w-4xl space-y-5">
        {document.blocks.map((block) => (
          <StudyBlockReader key={block.id} block={block} />
        ))}
      </article>
    )
  }

  function addBlock(type: StudyBlockType): void {
    onChange({
      ...document,
      blocks: [...document.blocks, createStudyBlock(type)]
    })
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="space-y-3">
        {document.blocks.map((block, index) => (
          <StudyBlockCard
            key={block.id}
            block={block}
            isFirst={index === 0}
            isLast={index === document.blocks.length - 1}
            onChange={(replacement) => {
              onChange(replaceStudyBlock(document, block.id, replacement))
            }}
            onMove={(direction) => {
              onChange(moveStudyBlock(document, block.id, direction))
            }}
            onDelete={() => {
              onChange(removeStudyBlock(document, block.id))
            }}
          />
        ))}
      </div>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--app-border-strong)] py-3 text-sm font-medium text-[var(--app-muted)] transition-colors hover:border-violet-500/40 hover:bg-violet-500/[0.05] hover:text-violet-200"
          >
            <Plus aria-hidden="true" className="size-4" />
            Добавить блок
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={8}
            align="center"
            className="z-50 grid min-w-52 gap-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1.5"
          >
            {blockTypes.map((option) => {
              const Icon = option.icon

              return (
                <DropdownMenu.Item
                  key={option.type}
                  className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--app-text)] outline-none hover:bg-white/[0.06] focus:bg-white/[0.06]"
                  onSelect={() => addBlock(option.type)}
                >
                  <Icon aria-hidden="true" className="size-4 text-[var(--app-muted)]" />

                  {option.label}
                </DropdownMenu.Item>
              )
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}

interface StudyBlockCardProps {
  block: StudyBlock
  isFirst: boolean
  isLast: boolean
  onChange: (block: StudyBlock) => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
}

function StudyBlockCard({
  block,
  isFirst,
  isLast,
  onChange,
  onMove,
  onDelete
}: StudyBlockCardProps): React.JSX.Element {
  return (
    <section className="group rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 transition-colors focus-within:border-violet-500/35">
      <div className="mb-2 flex items-center gap-2">
        <span className="mr-auto text-[11px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
          {getBlockLabel(block.type)}
        </span>

        <button
          type="button"
          aria-label="Переместить блок вверх"
          disabled={isFirst}
          className="flex size-7 items-center justify-center rounded-md text-[var(--app-muted)] hover:bg-white/[0.06] hover:text-[var(--app-text)] disabled:opacity-25"
          onClick={() => onMove(-1)}
        >
          <ArrowUp aria-hidden="true" className="size-4" />
        </button>

        <button
          type="button"
          aria-label="Переместить блок вниз"
          disabled={isLast}
          className="flex size-7 items-center justify-center rounded-md text-[var(--app-muted)] hover:bg-white/[0.06] hover:text-[var(--app-text)] disabled:opacity-25"
          onClick={() => onMove(1)}
        >
          <ArrowDown aria-hidden="true" className="size-4" />
        </button>

        <button
          type="button"
          aria-label="Удалить блок"
          className="flex size-7 items-center justify-center rounded-md text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>

      <EditableBlock block={block} onChange={onChange} />
    </section>
  )
}

function EditableBlock({
  block,
  onChange
}: {
  block: StudyBlock
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  if (block.type === 'text') {
    return (
      <textarea
        value={block.text}
        rows={5}
        placeholder="Начни писать..."
        className="w-full resize-y bg-transparent text-sm leading-7 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
        onChange={(event) => {
          onChange({
            ...block,
            text: event.target.value
          })
        }}
      />
    )
  }

  if (block.type === 'heading') {
    return (
      <div className="grid gap-3 sm:grid-cols-[100px_minmax(0,1fr)]">
        <select
          value={block.level}
          className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-3 py-2 text-sm outline-none"
          onChange={(event) => {
            onChange({
              ...block,
              level: Number(event.target.value) as 1 | 2 | 3
            })
          }}
        >
          <option value={1}>H1</option>
          <option value={2}>H2</option>
          <option value={3}>H3</option>
        </select>

        <input
          value={block.text}
          placeholder="Заголовок"
          className="min-w-0 bg-transparent text-lg font-semibold text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
          onChange={(event) => {
            onChange({
              ...block,
              text: event.target.value
            })
          }}
        />
      </div>
    )
  }

  if (block.type === 'code') {
    return (
      <div className="space-y-3">
        <input
          value={block.language}
          placeholder="Язык"
          className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-raised)] px-3 py-2 text-sm outline-none"
          onChange={(event) => {
            onChange({
              ...block,
              language: event.target.value
            })
          }}
        />

        <textarea
          value={block.source}
          rows={8}
          spellCheck={false}
          placeholder="Код..."
          className="w-full resize-y rounded-lg bg-[#090a0c] p-4 font-mono text-sm leading-6 text-zinc-200 outline-none"
          onChange={(event) => {
            onChange({
              ...block,
              source: event.target.value
            })
          }}
        />
      </div>
    )
  }

  if (block.type === 'link') {
    return (
      <div className="grid gap-3">
        <input
          value={block.title}
          placeholder="Название ссылки"
          className="w-full rounded-lg border border-[var(--app-border)] bg-transparent px-3 py-2 text-sm outline-none"
          onChange={(event) => {
            onChange({
              ...block,
              title: event.target.value
            })
          }}
        />

        <input
          value={block.url}
          placeholder="https://..."
          className="w-full rounded-lg border border-[var(--app-border)] bg-transparent px-3 py-2 text-sm outline-none"
          onChange={(event) => {
            onChange({
              ...block,
              url: event.target.value
            })
          }}
        />
      </div>
    )
  }

  return (
    <div className="py-4">
      <div className="h-px bg-[var(--app-border-strong)]" />
    </div>
  )
}

function StudyBlockReader({ block }: { block: StudyBlock }): React.JSX.Element {
  if (block.type === 'text') {
    return (
      <p className="text-[15px] leading-7 whitespace-pre-wrap text-zinc-300">
        {block.text || 'Пустой текстовый блок'}
      </p>
    )
  }

  if (block.type === 'heading') {
    const className = block.level === 1 ? 'text-3xl' : block.level === 2 ? 'text-2xl' : 'text-xl'

    return (
      <h2 className={`${className} font-semibold tracking-tight text-[var(--app-text)]`}>
        {block.text || 'Без заголовка'}
      </h2>
    )
  }

  if (block.type === 'code') {
    return (
      <pre className="overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[#090a0c] p-4 font-mono text-sm leading-6 text-zinc-200">
        <code>{block.source}</code>
      </pre>
    )
  }

  if (block.type === 'link') {
    return (
      <a
        href={block.url}
        className="inline-flex items-center gap-2 text-sm font-medium text-violet-300 hover:underline"
      >
        <Link2 aria-hidden="true" className="size-4" />

        {block.title || block.url || 'Пустая ссылка'}
      </a>
    )
  }

  return (
    <div className="py-4">
      <div className="h-px bg-[var(--app-border-strong)]" />
    </div>
  )
}

function getBlockLabel(type: StudyBlockType): string {
  return blockTypes.find((option) => option.type === type)?.label ?? type
}
