const fs = require('node:fs')

const path =
  'src/renderer/src/modules/study/components/rich-text/RichTextSettings.tsx'

const source = fs.readFileSync(path, 'utf8')

const before = `      <SettingsSection title="Текст">
        <ToggleGroup.Root
          type="multiple"
          value={activeMarks}
          aria-label="Форматирование текста"
          className="flex flex-wrap gap-2"
          onValueChange={applyMarkValues}
        >
          <ToolbarToggle value="bold" label="Жирный">
            <Bold className="size-4" />
          </ToolbarToggle>

          <ToolbarToggle value="italic" label="Курсив">
            <Italic className="size-4" />
          </ToolbarToggle>

          <ToolbarToggle value="underline" label="Подчёркивание">
            <Underline className="size-4" />
          </ToolbarToggle>

          <ToolbarToggle value="strike" label="Зачёркивание">
            <Strikethrough className="size-4" />
          </ToolbarToggle>

          <ToolbarToggle value="code" label="Код">
            <Code2 className="size-4" />
          </ToolbarToggle>
        </ToggleGroup.Root>
      </SettingsSection>

      <SettingsSection title="Абзац">
        <ToggleGroup.Root
          type="single"
          value={editorState.blockquote ? 'blockquote' : ''}
          aria-label="Стиль абзаца"
          className="flex flex-wrap gap-2"
          onValueChange={() => {
            createCommandChain()?.toggleBlockquote().run()
          }}
        >
          <ToolbarToggle value="blockquote" label="Цитата">
            <Quote className="size-4" />
          </ToolbarToggle>
        </ToggleGroup.Root>
      </SettingsSection>`

const after = `      <SettingsSection title="Текст">
        <ToggleGroup.Root
          type="multiple"
          value={activeMarks}
          aria-label="Форматирование текста"
          className="flex flex-wrap gap-2"
          onValueChange={applyMarkValues}
        >
          <ToolbarToggle value="bold" label="Жирный">
            <Bold className="size-4" />
          </ToolbarToggle>

          <ToolbarToggle value="italic" label="Курсив">
            <Italic className="size-4" />
          </ToolbarToggle>

          <ToolbarToggle value="underline" label="Подчёркивание">
            <Underline className="size-4" />
          </ToolbarToggle>

          <ToolbarToggle value="strike" label="Зачёркивание">
            <Strikethrough className="size-4" />
          </ToolbarToggle>

          <ToolbarToggle value="code" label="Код">
            <Code2 className="size-4" />
          </ToolbarToggle>
        </ToggleGroup.Root>

        <ToggleGroup.Root
          type="single"
          value={editorState.blockquote ? 'blockquote' : ''}
          aria-label="Стиль цитаты"
          className="flex flex-wrap gap-2"
          onValueChange={() => {
            createCommandChain()?.toggleBlockquote().run()
          }}
        >
          <ToolbarToggle value="blockquote" label="Цитата">
            <Quote className="size-4" />
          </ToolbarToggle>
        </ToggleGroup.Root>
      </SettingsSection>`

if (!source.includes(before)) {
  throw new Error('Expected rich-text settings block was not found')
}

fs.writeFileSync(path, source.replace(before, after), 'utf8')
