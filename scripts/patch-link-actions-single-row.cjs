const fs = require('node:fs')

const settingsPath =
  'src/renderer/src/modules/study/components/rich-text/RichTextSettings.tsx'
const testPath =
  'src/renderer/src/modules/study/components/rich-text/RichTextSettings.test.tsx'

function replaceRequired(source, search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Could not find ${label}`)
  }

  return source.replace(search, replacement)
}

let settings = fs.readFileSync(settingsPath, 'utf8')

settings = replaceRequired(
  settings,
  `      <SettingsSection title="Внутренняя ссылка" vertical>
        <button
          type="button"
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-(--app-border) bg-(--app-workspace) px-3 text-sm font-medium text-(--app-text) transition-colors outline-none hover:border-violet-500/35 hover:bg-violet-500/10 focus-visible:ring-2 focus-visible:ring-violet-500/35"
          onMouseDown={(event) => {
            event.preventDefault()
          }}
          onClick={() => {
            editor.view.dom.dispatchEvent(new CustomEvent(STUDY_OPEN_INTERNAL_LINK_PICKER_EVENT))
          }}
        >
          <Link2 aria-hidden="true" className="size-4 text-violet-300" />
          Создать внутреннюю ссылку
        </button>

        <p className="text-xs leading-5 text-(--app-muted)">
          Также можно ввести [[ в тексте. Горячая клавиша: Ctrl+Shift+K.
        </p>
      </SettingsSection>
      <SettingsSection title="Ссылка">
        <LinkPopover
          disabled={false}
          active={editorState.linkActive}
          currentHref={editorState.href}
          onApply={applyLink}
          onRemove={removeLink}
        />
      </SettingsSection>`,
  `      <SettingsSection title="Ссылки" vertical>
        <div data-testid="link-actions" className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-label="Создать внутреннюю ссылку"
            className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg border border-(--app-border) bg-(--app-workspace) px-2 text-xs font-medium text-(--app-text) transition-colors outline-none hover:border-violet-500/35 hover:bg-violet-500/10 focus-visible:ring-2 focus-visible:ring-violet-500/35"
            onMouseDown={(event) => {
              event.preventDefault()
            }}
            onClick={() => {
              editor.view.dom.dispatchEvent(
                new CustomEvent(STUDY_OPEN_INTERNAL_LINK_PICKER_EVENT)
              )
            }}
          >
            <Link2 aria-hidden="true" className="size-4 shrink-0 text-violet-300" />
            <span className="truncate">Внутренняя</span>
          </button>

          <LinkPopover
            disabled={false}
            active={editorState.linkActive}
            currentHref={editorState.href}
            label="Обычная"
            ariaLabel="обычную ссылку"
            onApply={applyLink}
            onRemove={removeLink}
          />
        </div>

        <p className="text-xs leading-5 text-(--app-muted)">
          Внутреннюю ссылку также можно создать через [[ или Ctrl+Shift+K.
        </p>
      </SettingsSection>`,
  'separate link sections'
)

settings = replaceRequired(
  settings,
  `function LinkPopover({
  disabled,
  active,
  currentHref,
  onApply,
  onRemove
}: {
  disabled: boolean
  active: boolean
  currentHref: string
  onApply: (href: string) => boolean
  onRemove: () => void
}): React.JSX.Element {`,
  `function LinkPopover({
  disabled,
  active,
  currentHref,
  label,
  ariaLabel,
  onApply,
  onRemove
}: {
  disabled: boolean
  active: boolean
  currentHref: string
  label: string
  ariaLabel: string
  onApply: (href: string) => boolean
  onRemove: () => void
}): React.JSX.Element {`,
  'LinkPopover props'
)

settings = replaceRequired(
  settings,
  `        <button
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center justify-center gap-2 rounded-lg border',
            active
              ? 'border-violet-500/45 bg-violet-500/15 text-violet-200'
              : 'border-(--app-border) bg-(--app-workspace) text-(--app-muted)',
            'hover:bg-white/[0.05] hover:text-(--app-text)',
            'focus-visible:ring-2 focus-visible:ring-violet-500/35 focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-35'
          )}
        >
          <Link2 aria-hidden="true" className="size-4" />
          {active ? 'Изменить ссылку' : 'Добавить ссылку'}
        </button>`,
  `        <button
          type="button"
          aria-label={active ? \`Изменить \${ariaLabel}\` : \`Добавить \${ariaLabel}\`}
          disabled={disabled}
          className={cn(
            'flex h-10 min-w-0 w-full items-center justify-center gap-2 rounded-lg border px-2 text-xs font-medium',
            active
              ? 'border-violet-500/45 bg-violet-500/15 text-violet-200'
              : 'border-(--app-border) bg-(--app-workspace) text-(--app-muted)',
            'hover:bg-white/[0.05] hover:text-(--app-text)',
            'focus-visible:ring-2 focus-visible:ring-violet-500/35 focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-35'
          )}
        >
          <Link2 aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">{active ? 'Изменить' : label}</span>
        </button>`,
  'LinkPopover trigger'
)

fs.writeFileSync(settingsPath, settings)

let test = fs.readFileSync(testPath, 'utf8')

test = replaceRequired(
  test,
  `  it('keeps quote formatting in the text section and toggles the active paragraph', async () => {
    const user = userEvent.setup()

    editor = new Editor({
      extensions: createRichTextExtensions(false),
      content: '<p>Важная мысль</p>'
    })

    render(
      <TooltipProvider>
        <RichTextSettings editor={editor} />
      </TooltipProvider>
    )

    const textSection = screen.getByRole('heading', { name: 'Текст' }).closest('section')

    expect(textSection).not.toBeNull()
    expect(screen.queryByRole('heading', { name: 'Абзац' })).not.toBeInTheDocument()

    const quoteControl = within(textSection!).getByRole('radio', {
      name: 'Цитата'
    })

    expect(quoteControl).toHaveAttribute('aria-checked', 'false')

    await user.click(quoteControl)

    expect(editor.isActive('blockquote')).toBe(true)
    expect(editor.getHTML()).toContain('<blockquote><p>Важная мысль</p></blockquote>')
    expect(quoteControl).toHaveAttribute('aria-checked', 'true')

    await user.click(quoteControl)

    expect(editor.isActive('blockquote')).toBe(false)
    expect(editor.getHTML()).not.toContain('<blockquote>')
    expect(editor.getHTML()).toContain('<p>Важная мысль</p>')
    expect(quoteControl).toHaveAttribute('aria-checked', 'false')
  })
})`,
  `  it('keeps quote formatting in the text section and toggles the active paragraph', async () => {
    const user = userEvent.setup()

    editor = new Editor({
      extensions: createRichTextExtensions(false),
      content: '<p>Важная мысль</p>'
    })

    render(
      <TooltipProvider>
        <RichTextSettings editor={editor} />
      </TooltipProvider>
    )

    const textSection = screen.getByRole('heading', { name: 'Текст' }).closest('section')

    expect(textSection).not.toBeNull()
    expect(screen.queryByRole('heading', { name: 'Абзац' })).not.toBeInTheDocument()

    const quoteControl = within(textSection!).getByRole('radio', {
      name: 'Цитата'
    })

    expect(quoteControl).toHaveAttribute('aria-checked', 'false')

    await user.click(quoteControl)

    expect(editor.isActive('blockquote')).toBe(true)
    expect(editor.getHTML()).toContain('<blockquote><p>Важная мысль</p></blockquote>')
    expect(quoteControl).toHaveAttribute('aria-checked', 'true')

    await user.click(quoteControl)

    expect(editor.isActive('blockquote')).toBe(false)
    expect(editor.getHTML()).not.toContain('<blockquote>')
    expect(editor.getHTML()).toContain('<p>Важная мысль</p>')
    expect(quoteControl).toHaveAttribute('aria-checked', 'false')
  })

  it('keeps internal and regular link actions in one row', () => {
    editor = new Editor({
      extensions: createRichTextExtensions(false),
      content: '<p>Текст со ссылкой</p>'
    })

    render(
      <TooltipProvider>
        <RichTextSettings editor={editor} />
      </TooltipProvider>
    )

    const linksSection = screen.getByRole('heading', { name: 'Ссылки' }).closest('section')

    expect(linksSection).not.toBeNull()
    expect(screen.queryByRole('heading', { name: 'Внутренняя ссылка' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ссылка' })).not.toBeInTheDocument()

    const actions = within(linksSection!).getByTestId('link-actions')

    expect(actions).toHaveClass('grid-cols-2')
    expect(
      within(actions).getByRole('button', { name: 'Создать внутреннюю ссылку' })
    ).toBeInTheDocument()
    expect(
      within(actions).getByRole('button', { name: 'Добавить обычную ссылку' })
    ).toBeInTheDocument()
  })
})`,
  'test suite ending'
)

fs.writeFileSync(testPath, test)
