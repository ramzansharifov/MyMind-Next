const fs = require('node:fs')

const filePath = 'src/renderer/src/modules/study/components/rich-text/RichTextSettings.tsx'
let source = fs.readFileSync(filePath, 'utf8')

function replaceOnce(from, to, label) {
  if (!source.includes(from)) {
    throw new Error(`Could not find ${label}`)
  }

  source = source.replace(from, to)
}

replaceOnce(
  '\nexport function RichTextSettings',
  `\nconst activeFormattingControlClassName =\n  'border-[color-mix(in_srgb,var(--app-accent-500)_72%,white_8%)] bg-[color-mix(in_srgb,var(--app-accent-500)_24%,var(--app-workspace))] text-[color-mix(in_srgb,var(--app-accent-400)_88%,white)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--app-accent-500)_22%,transparent),0_0_14px_color-mix(in_srgb,var(--app-accent-500)_14%,transparent)]'\n\nexport function RichTextSettings`,
  'active formatting class constant'
)

const activeProps = [
  ['<ToolbarToggle value="bold" label="Жирный">', '<ToolbarToggle value="bold" label="Жирный" active={editorState.bold}>'],
  ['<ToolbarToggle value="italic" label="Курсив">', '<ToolbarToggle value="italic" label="Курсив" active={editorState.italic}>'],
  [
    '<ToolbarToggle value="underline" label="Подчёркивание">',
    '<ToolbarToggle value="underline" label="Подчёркивание" active={editorState.underline}>'
  ],
  [
    '<ToolbarToggle value="strike" label="Зачёркивание">',
    '<ToolbarToggle value="strike" label="Зачёркивание" active={editorState.strike}>'
  ],
  ['<ToolbarToggle value="code" label="Код">', '<ToolbarToggle value="code" label="Код" active={editorState.code}>'],
  [
    '<ToolbarToggle value="blockquote" label="Цитата">',
    '<ToolbarToggle value="blockquote" label="Цитата" active={editorState.blockquote}>'
  ],
  [
    '<ToolbarToggle value="bullet" label="Маркированный список">',
    '<ToolbarToggle value="bullet" label="Маркированный список" active={editorState.bulletList}>'
  ],
  [
    '<ToolbarToggle value="ordered" label="Нумерованный список">',
    '<ToolbarToggle value="ordered" label="Нумерованный список" active={editorState.orderedList}>'
  ],
  [
    '<ToolbarToggle value="left" label="Слева">',
    '<ToolbarToggle value="left" label="Слева" active={editorState.alignment === \'left\'}>'
  ],
  [
    '<ToolbarToggle value="center" label="По центру">',
    '<ToolbarToggle value="center" label="По центру" active={editorState.alignment === \'center\'}>'
  ],
  [
    '<ToolbarToggle value="right" label="Справа">',
    '<ToolbarToggle value="right" label="Справа" active={editorState.alignment === \'right\'}>'
  ],
  [
    '<ToolbarToggle value="justify" label="По ширине">',
    '<ToolbarToggle value="justify" label="По ширине" active={editorState.alignment === \'justify\'}>'
  ]
]

for (const [from, to] of activeProps) {
  replaceOnce(from, to, from)
}

replaceOnce(
  `function ToolbarToggle({\n  value,\n  label,\n  children\n}: {\n  value: string\n  label: string\n  children: ReactNode\n}): React.JSX.Element {`,
  `function ToolbarToggle({\n  value,\n  label,\n  active,\n  children\n}: {\n  value: string\n  label: string\n  active: boolean\n  children: ReactNode\n}): React.JSX.Element {`,
  'ToolbarToggle props'
)

replaceOnce(
  `      <ToggleGroup.Item\n        value={value}\n        aria-label={label}\n        className={cn(\n          'flex size-9 items-center justify-center rounded-lg border',\n          'border-(--app-border) bg-(--app-workspace) text-(--app-muted)',\n          'transition-colors outline-none',\n          'hover:bg-white/[0.05] hover:text-(--app-text)',\n          'focus-visible:ring-2 focus-visible:ring-(--app-accent-500)/40',\n          'data-[state=on]:border-[color-mix(in_srgb,var(--app-accent-500)_72%,white_8%)]',\n          'data-[state=on]:bg-[color-mix(in_srgb,var(--app-accent-500)_24%,var(--app-workspace))]',\n          'data-[state=on]:text-[color-mix(in_srgb,var(--app-accent-400)_88%,white)]',\n          'data-[state=on]:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--app-accent-500)_22%,transparent),0_0_14px_color-mix(in_srgb,var(--app-accent-500)_14%,transparent)]'\n        )}`,
  `      <ToggleGroup.Item\n        value={value}\n        aria-label={label}\n        data-active={active ? 'true' : 'false'}\n        className={cn(\n          'flex size-9 items-center justify-center rounded-lg border',\n          active\n            ? activeFormattingControlClassName\n            : 'border-(--app-border) bg-(--app-workspace) text-(--app-muted)',\n          'transition-colors outline-none',\n          'hover:bg-white/[0.05] hover:text-(--app-text)',\n          'focus-visible:ring-2 focus-visible:ring-(--app-accent-500)/40'\n        )}`,
  'ToolbarToggle active classes'
)

replaceOnce(
  `              ? 'border-[color-mix(in_srgb,var(--app-accent-500)_72%,white_8%)] bg-[color-mix(in_srgb,var(--app-accent-500)_24%,var(--app-workspace))] text-[color-mix(in_srgb,var(--app-accent-400)_88%,white)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--app-accent-500)_22%,transparent),0_0_14px_color-mix(in_srgb,var(--app-accent-500)_14%,transparent)]'`,
  `              ? activeFormattingControlClassName`,
  'active link classes'
)

fs.writeFileSync(filePath, source)
