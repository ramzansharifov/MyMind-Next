const fs = require('node:fs')

function replaceOnce(source, from, to, label) {
  const firstIndex = source.indexOf(from)

  if (firstIndex < 0) {
    throw new Error(`Missing patch anchor: ${label}`)
  }

  if (source.indexOf(from, firstIndex + from.length) >= 0) {
    throw new Error(`Ambiguous patch anchor: ${label}`)
  }

  return source.slice(0, firstIndex) + to + source.slice(firstIndex + from.length)
}

const cssPath = 'src/renderer/src/assets/main.css'
let css = fs.readFileSync(cssPath, 'utf8')

css = replaceOnce(
  css,
  `  --app-header-height: 4rem;\n`,
  `  --app-header-height: 4rem;\n\n  --app-format-active-bg: color-mix(\n    in srgb,\n    var(--app-accent-500) 26%,\n    var(--app-surface-raised)\n  );\n  --app-format-active-bg-hover: color-mix(\n    in srgb,\n    var(--app-accent-500) 34%,\n    var(--app-surface-raised)\n  );\n  --app-format-active-border: color-mix(\n    in srgb,\n    var(--app-accent-400) 78%,\n    var(--app-border-strong)\n  );\n  --app-format-active-text: var(--app-accent-100);\n  --app-format-active-ring: color-mix(in srgb, var(--app-accent-400) 38%, transparent);\n`,
  'dark active formatting tokens'
)

css = replaceOnce(
  css,
  `  --app-reader-surface: #eef1f5;\n`,
  `  --app-reader-surface: #eef1f5;\n  --app-format-active-bg: color-mix(in srgb, var(--app-accent-500) 18%, white);\n  --app-format-active-bg-hover: color-mix(in srgb, var(--app-accent-500) 24%, white);\n  --app-format-active-border: color-mix(\n    in srgb,\n    var(--app-accent-500) 68%,\n    var(--app-border-strong)\n  );\n  --app-format-active-text: var(--app-accent-800);\n  --app-format-active-ring: color-mix(in srgb, var(--app-accent-500) 25%, transparent);\n`,
  'light active formatting tokens'
)

css = replaceOnce(
  css,
  `button {\n  border: 0;\n}\n`,
  `button {\n  border: 0;\n}\n\n.rich-text-format-control[data-state='on'],\n.rich-text-format-control[data-active='true'] {\n  color: var(--app-format-active-text);\n  background: var(--app-format-active-bg);\n  border-color: var(--app-format-active-border);\n  box-shadow:\n    0 0 0 1px var(--app-format-active-ring),\n    inset 0 1px 0 rgb(255 255 255 / 10%);\n}\n\n.rich-text-format-control[data-state='on']:hover,\n.rich-text-format-control[data-active='true']:hover {\n  color: var(--app-format-active-text);\n  background: var(--app-format-active-bg-hover);\n}\n`,
  'active formatting control styles'
)

fs.writeFileSync(cssPath, css)

const settingsPath =
  'src/renderer/src/modules/study/components/rich-text/RichTextSettings.tsx'
let settings = fs.readFileSync(settingsPath, 'utf8')

settings = replaceOnce(
  settings,
  `        className={cn(\n          'flex size-9 items-center justify-center rounded-lg border',\n          'border-(--app-border) bg-(--app-workspace) text-(--app-muted)',\n          'transition-colors outline-none',\n          'hover:bg-white/[0.05] hover:text-(--app-text)',\n          'focus-visible:ring-2 focus-visible:ring-violet-500/35',\n          'data-[state=on]:border-violet-500/45',\n          'data-[state=on]:bg-violet-500/15',\n          'data-[state=on]:text-violet-200'\n        )}`,
  `        className={cn(\n          'rich-text-format-control flex size-9 items-center justify-center rounded-lg border',\n          'border-(--app-border) bg-(--app-workspace) text-(--app-muted)',\n          'transition-colors outline-none',\n          'hover:bg-white/[0.05] hover:text-(--app-text)',\n          'focus-visible:ring-2 focus-visible:ring-violet-500/35'\n        )}`,
  'toolbar toggle active classes'
)

settings = replaceOnce(
  settings,
  `          aria-label={active ? \`Изменить \${ariaLabel}\` : \`Добавить \${ariaLabel}\`}\n          disabled={disabled}\n          className={cn(\n            'flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-lg border px-2 text-xs font-medium',\n            active\n              ? 'border-violet-500/45 bg-violet-500/15 text-violet-200'\n              : 'border-(--app-border) bg-(--app-workspace) text-(--app-muted)',\n            'hover:bg-white/[0.05] hover:text-(--app-text)',\n`,
  `          aria-label={active ? \`Изменить \${ariaLabel}\` : \`Добавить \${ariaLabel}\`}\n          data-active={active ? 'true' : undefined}\n          disabled={disabled}\n          className={cn(\n            'rich-text-format-control flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-lg border px-2 text-xs font-medium',\n            'border-(--app-border) bg-(--app-workspace) text-(--app-muted)',\n            'hover:bg-white/[0.05] hover:text-(--app-text)',\n`,
  'regular link active classes'
)

fs.writeFileSync(settingsPath, settings)

const testPath =
  'src/renderer/src/modules/study/components/rich-text/RichTextSettings.test.tsx'
let tests = fs.readFileSync(testPath, 'utf8')

tests = replaceOnce(
  tests,
  `    expect(quoteControl).toHaveAttribute('aria-checked', 'false')\n\n    await user.click(quoteControl)\n`,
  `    expect(quoteControl).toHaveAttribute('aria-checked', 'false')\n    expect(quoteControl).toHaveAttribute('data-state', 'off')\n    expect(quoteControl).toHaveClass('rich-text-format-control')\n\n    await user.click(quoteControl)\n`,
  'inactive quote assertions'
)

tests = replaceOnce(
  tests,
  `    expect(quoteControl).toHaveAttribute('aria-checked', 'true')\n\n    await user.click(quoteControl)\n`,
  `    expect(quoteControl).toHaveAttribute('aria-checked', 'true')\n    expect(quoteControl).toHaveAttribute('data-state', 'on')\n\n    await user.click(quoteControl)\n`,
  'active quote assertions'
)

tests = replaceOnce(
  tests,
  `    expect(quoteControl).toHaveAttribute('aria-checked', 'false')\n  })\n\n  it('keeps internal and regular link actions in one row', () => {\n`,
  `    expect(quoteControl).toHaveAttribute('aria-checked', 'false')\n    expect(quoteControl).toHaveAttribute('data-state', 'off')\n  })\n\n  it('marks active text and regular link controls visibly', () => {\n    editor = new Editor({\n      extensions: createRichTextExtensions(false),\n      content: '<p><strong><a href="https://example.com">Активный текст</a></strong></p>'\n    })\n    editor.commands.setTextSelection(2)\n\n    render(\n      <TooltipProvider>\n        <RichTextSettings editor={editor} />\n      </TooltipProvider>\n    )\n\n    const boldControl = screen.getByRole('button', { name: 'Жирный' })\n    const linkControl = screen.getByRole('button', { name: 'Изменить обычную ссылку' })\n\n    expect(boldControl).toHaveAttribute('data-state', 'on')\n    expect(boldControl).toHaveClass('rich-text-format-control')\n    expect(linkControl).toHaveAttribute('data-active', 'true')\n    expect(linkControl).toHaveClass('rich-text-format-control')\n  })\n\n  it('keeps internal and regular link actions in one row', () => {\n`,
  'active control test'
)

fs.writeFileSync(testPath, tests)
