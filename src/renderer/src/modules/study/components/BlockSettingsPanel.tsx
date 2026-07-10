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
          <Settings2 className="size-4 text-violet-300" />
          Настройки блока
        </div>

        <p className="mt-3 text-sm leading-6 text-[var(--app-muted)]">Выбери блок в редакторе.</p>
      </aside>
    )
  }

  const Icon = getBlockIcon(block)

  return (
    <aside className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)]">
      <header className="flex items-center gap-3 border-b border-[var(--app-border)] px-4 py-3.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
          <Icon className="size-4" />
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

        {block.type === 'heading' && (
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
        )}

        {block.type === 'code' && (
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
        )}

        {block.type === 'link' && (
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
        )}

        {block.type === 'divider' && (
          <div className="grid gap-5">
            <label className="grid gap-2">
              <span className="flex items-center justify-between text-xs font-medium text-[var(--app-muted)]">
                <span>Толщина</span>
                <span>
                  {block.thickness ?? DEFAULT_DIVIDER_THICKNESS}
                  px
                </span>
              </span>

              <input
                type="range"
                min={1}
                max={12}
                value={block.thickness ?? DEFAULT_DIVIDER_THICKNESS}
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
                  value={block.color ?? DEFAULT_DIVIDER_COLOR}
                  className="size-7 cursor-pointer border-0 bg-transparent p-0"
                  onChange={(event) => {
                    onChange({
                      ...block,
                      color: event.target.value
                    })
                  }}
                />

                <span className="text-xs text-[var(--app-muted)]">
                  {block.color ?? DEFAULT_DIVIDER_COLOR}
                </span>
              </div>
            </label>
          </div>
        )}
      </div>
    </aside>
  )
}

function getBlockIcon(block: StudyBlock): typeof Type {
  if (block.type === 'heading') {
    return Heading
  }

  if (block.type === 'code') {
    return Code2
  }

  if (block.type === 'link') {
    return Link2
  }

  if (block.type === 'divider') {
    return Minus
  }

  return Type
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
