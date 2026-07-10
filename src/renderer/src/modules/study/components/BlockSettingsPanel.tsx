import type { Editor } from '@tiptap/core'
import { Code2, Heading, Link2, Minus, Settings2, Type } from 'lucide-react'

import type { StudyBlock } from '../../../../../shared/contracts/study'
import { DEFAULT_DIVIDER_COLOR, DEFAULT_DIVIDER_THICKNESS } from '../lib/study-document'
import { RichTextSettings } from './rich-text/RichTextSettings'

interface BlockSettingsPanelProps {
  block: StudyBlock | null
  textEditor: Editor | null
  editorRevision: number
  onChange: (block: StudyBlock) => void
}

export function BlockSettingsPanel({
  block,
  textEditor,
  editorRevision,
  onChange
}: BlockSettingsPanelProps): React.JSX.Element {
  if (!block) {
    return (
      <aside className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
          <Settings2 aria-hidden="true" className="size-4 text-violet-300" />
          Настройки блока
        </div>

        <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">Выбери блок в редакторе.</p>
      </aside>
    )
  }

  return (
    <aside className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]">
      <header className="flex items-center gap-3 border-b border-[var(--app-border)] px-4 py-3.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
          <BlockTypeIcon type={block.type} />
        </div>

        <div>
          <p className="text-sm font-medium text-[var(--app-text)]">{getBlockTitle(block)}</p>

          <p className="text-xs text-[var(--app-muted)]">Настройки активного блока</p>
        </div>
      </header>

      <div className="p-4">
        {block.type === 'text' && (
          <RichTextSettings editor={textEditor} revision={editorRevision} />
        )}

        {block.type === 'heading' && <HeadingSettings block={block} onChange={onChange} />}

        {block.type === 'code' && <CodeSettings block={block} onChange={onChange} />}

        {block.type === 'link' && <LinkSettings block={block} onChange={onChange} />}

        {block.type === 'divider' && <DividerSettings block={block} onChange={onChange} />}
      </div>
    </aside>
  )
}

function HeadingSettings({
  block,
  onChange
}: {
  block: Extract<StudyBlock, { type: 'heading' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium text-[var(--app-muted)]">Уровень заголовка</span>

      <select
        value={block.level}
        className="h-10 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45"
        onChange={(event) => {
          onChange({
            ...block,
            level: Number(event.target.value) as 1 | 2 | 3
          })
        }}
      >
        <option value={1}>H1 — крупный</option>
        <option value={2}>H2 — средний</option>
        <option value={3}>H3 — малый</option>
      </select>
    </label>
  )
}

function CodeSettings({
  block,
  onChange
}: {
  block: Extract<StudyBlock, { type: 'code' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-medium text-[var(--app-muted)]">Язык</span>

      <select
        value={block.language}
        className="h-10 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45"
        onChange={(event) => {
          onChange({
            ...block,
            language: event.target.value
          })
        }}
      >
        <option value="text">Обычный текст</option>
        <option value="javascript">JavaScript</option>
        <option value="typescript">TypeScript</option>
        <option value="python">Python</option>
        <option value="html">HTML</option>
        <option value="css">CSS</option>
        <option value="sql">SQL</option>
        <option value="json">JSON</option>
        <option value="bash">Bash</option>
        <option value="cpp">C++</option>
        <option value="java">Java</option>
      </select>
    </label>
  )
}

function LinkSettings({
  block,
  onChange
}: {
  block: Extract<StudyBlock, { type: 'link' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  return (
    <div className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-xs font-medium text-[var(--app-muted)]">Название</span>

        <input
          value={block.title}
          placeholder="Название ссылки"
          className="h-10 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
          onChange={(event) => {
            onChange({
              ...block,
              title: event.target.value
            })
          }}
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-medium text-[var(--app-muted)]">URL</span>

        <input
          value={block.url}
          placeholder="https://example.com"
          className="h-10 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
          onChange={(event) => {
            onChange({
              ...block,
              url: event.target.value
            })
          }}
        />
      </label>
    </div>
  )
}

function DividerSettings({
  block,
  onChange
}: {
  block: Extract<StudyBlock, { type: 'divider' }>
  onChange: (block: StudyBlock) => void
}): React.JSX.Element {
  const thickness = block.thickness ?? DEFAULT_DIVIDER_THICKNESS

  const color = block.color ?? DEFAULT_DIVIDER_COLOR

  return (
    <div className="grid gap-5">
      <label className="grid gap-2">
        <span className="flex items-center justify-between text-xs font-medium text-[var(--app-muted)]">
          <span>Толщина</span>
          <span>{thickness}px</span>
        </span>

        <input
          type="range"
          min={1}
          max={12}
          value={thickness}
          className="accent-violet-500"
          onChange={(event) => {
            onChange({
              ...block,
              thickness: Number(event.target.value)
            })
          }}
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs font-medium text-[var(--app-muted)]">Цвет</span>

        <div className="flex h-10 items-center gap-3 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-2">
          <input
            type="color"
            value={color}
            aria-label="Цвет разделителя"
            className="size-7 cursor-pointer border-0 bg-transparent p-0"
            onChange={(event) => {
              onChange({
                ...block,
                color: event.target.value
              })
            }}
          />

          <span className="text-xs text-[var(--app-muted)]">{color}</span>
        </div>
      </label>
    </div>
  )
}

function BlockTypeIcon({ type }: { type: StudyBlock['type'] }): React.JSX.Element {
  if (type === 'heading') {
    return <Heading aria-hidden="true" className="size-4" />
  }

  if (type === 'code') {
    return <Code2 aria-hidden="true" className="size-4" />
  }

  if (type === 'link') {
    return <Link2 aria-hidden="true" className="size-4" />
  }

  if (type === 'divider') {
    return <Minus aria-hidden="true" className="size-4" />
  }

  return <Type aria-hidden="true" className="size-4" />
}

function getBlockTitle(block: StudyBlock): string {
  if (block.type === 'heading') {
    return 'Заголовок'
  }

  if (block.type === 'code') {
    return 'Блок кода'
  }

  if (block.type === 'link') {
    return 'Ссылка'
  }

  if (block.type === 'divider') {
    return 'Разделитель'
  }

  return 'Форматированный текст'
}
