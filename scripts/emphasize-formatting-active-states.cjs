const fs = require('node:fs')

const componentPath =
  'src/renderer/src/modules/study/components/rich-text/RichTextSettings.tsx'
const testPath =
  'src/renderer/src/modules/study/components/rich-text/RichTextSettings.test.tsx'

let component = fs.readFileSync(componentPath, 'utf8')

const oldToggleClasses = `          'focus-visible:ring-2 focus-visible:ring-violet-500/35',
          'data-[state=on]:border-violet-500/45',
          'data-[state=on]:bg-violet-500/15',
          'data-[state=on]:text-violet-200'`
const newToggleClasses = `          'focus-visible:ring-2 focus-visible:ring-(--app-accent-500)/40',
          'data-[state=on]:border-[color-mix(in_srgb,var(--app-accent-500)_72%,white_8%)]',
          'data-[state=on]:bg-[color-mix(in_srgb,var(--app-accent-500)_24%,var(--app-workspace))]',
          'data-[state=on]:text-[color-mix(in_srgb,var(--app-accent-400)_88%,white)]',
          'data-[state=on]:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--app-accent-500)_22%,transparent),0_0_14px_color-mix(in_srgb,var(--app-accent-500)_14%,transparent)]'`

if (!component.includes(oldToggleClasses)) {
  throw new Error('Toolbar toggle classes were not found')
}
component = component.replace(oldToggleClasses, newToggleClasses)

const oldLinkActive = `              ? 'border-violet-500/45 bg-violet-500/15 text-violet-200'`
const newLinkActive = `              ? 'border-[color-mix(in_srgb,var(--app-accent-500)_72%,white_8%)] bg-[color-mix(in_srgb,var(--app-accent-500)_24%,var(--app-workspace))] text-[color-mix(in_srgb,var(--app-accent-400)_88%,white)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--app-accent-500)_22%,transparent),0_0_14px_color-mix(in_srgb,var(--app-accent-500)_14%,transparent)]'`

if (!component.includes(oldLinkActive)) {
  throw new Error('Active link classes were not found')
}
component = component.replace(oldLinkActive, newLinkActive)

component = component.replaceAll(
  'focus-visible:ring-violet-500/35',
  'focus-visible:ring-(--app-accent-500)/40'
)

fs.writeFileSync(componentPath, component)

let test = fs.readFileSync(testPath, 'utf8')
const testAnchor = `    expect(quoteControl).toHaveAttribute('aria-checked', 'true')`
const testReplacement = `    expect(quoteControl).toHaveAttribute('aria-checked', 'true')
    expect(quoteControl.className).toContain('var(--app-accent-500)')
    expect(quoteControl.className).toContain('data-[state=on]:shadow')`

if (!test.includes(testAnchor)) {
  throw new Error('Quote active-state assertion anchor was not found')
}

test = test.replace(testAnchor, testReplacement)
fs.writeFileSync(testPath, test)
