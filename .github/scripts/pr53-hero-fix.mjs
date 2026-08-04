import { readFileSync, writeFileSync } from 'node:fs'

const notesHomePath = 'src/renderer/src/modules/notes/components/NotesHome.tsx'
let source = readFileSync(notesHomePath, 'utf8')

const headerMatch = source.match(
  /        <header className="flex items-start justify-between gap-6 px-1 max-\[820px\]:flex-col">[\s\S]*?        <\/header>/
)
const controlsMatch = source.match(
  /          <div className="grid grid-cols-\[minmax\(0,1fr\)_auto\] gap-3 max-\[980px\]:grid-cols-1">[\s\S]*?            <\/Tabs\.List>\n          <\/div>/
)
const statsMatch = source.match(
  /                <div className="grid grid-cols-3 gap-3 max-\[900px\]:grid-cols-1">[\s\S]*?                <\/div>\n\n                \{recentNotes/
)

if (!headerMatch || !controlsMatch || !statsMatch) {
  throw new Error('Unable to locate the Notes header, controls, or statistics block')
}

const header = headerMatch[0]
const controls = controlsMatch[0]
const statsWithMarker = statsMatch[0]
const stats = statsWithMarker.replace(/\n\n                \{recentNotes$/, '')
const tabsRoot = '        <Tabs.Root value={view} onValueChange={handleViewChange}>'

const indent = (value, spaces) => {
  const prefix = ' '.repeat(spaces)
  return value
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n')
}

const currentTop = `${header}\n\n${tabsRoot}\n${controls}`
const unifiedTop = [
  tabsRoot,
  '          <section data-notes-hero>',
  indent(header, 4),
  '',
  indent(controls, 2),
  '',
  '            {!isLoading &&',
  '              (overview.notes.length > 0 || overview.groups.length > 0) &&',
  "              view === 'all' && (",
  indent(stats.replace('<div className=', '<div data-notes-hero-stats className='), 2),
  '              )}',
  '          </section>'
].join('\n')

if (!source.includes(currentTop)) {
  throw new Error('Unable to locate the current Notes top layout')
}

source = source.replace(currentTop, unifiedTop)
source = source.replace(statsWithMarker, '                {recentNotes')

if (!source.includes('data-notes-hero') || !source.includes('data-notes-hero-stats')) {
  throw new Error('Unified Notes hero markers were not created')
}

writeFileSync(notesHomePath, source)

const cssPath = 'src/renderer/src/assets/notes-home-header.css'
writeFileSync(
  cssPath,
  `[data-notes-hero] {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: 1.5rem;
  border: 1px solid var(--app-border);
  border-radius: 1.5rem;
  background: var(--app-surface);
  box-shadow: 0 20px 70px rgb(0 0 0 / 16%);
}

[data-notes-hero]::before,
[data-notes-hero]::after {
  position: absolute;
  z-index: -1;
  border-radius: 9999px;
  content: '';
  pointer-events: none;
  filter: blur(64px);
}

[data-notes-hero]::before {
  top: -8rem;
  right: 2rem;
  width: 20rem;
  height: 20rem;
  background: color-mix(in srgb, var(--app-accent-500) 10%, transparent);
}

[data-notes-hero]::after {
  bottom: -11rem;
  left: -6rem;
  width: 20rem;
  height: 20rem;
  background: color-mix(in srgb, var(--app-accent-700) 10%, transparent);
}

[data-notes-hero] > * {
  position: relative;
  z-index: 1;
}

[data-notes-hero] > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.5rem;
}

[data-notes-hero] > header > :first-child {
  position: relative;
  min-height: 3rem;
  padding-left: 4rem;
}

[data-notes-hero] > header > :first-child::before {
  position: absolute;
  top: 0;
  left: 0;
  width: 3rem;
  height: 3rem;
  border: 1px solid color-mix(in srgb, var(--app-accent-500) 22%, transparent);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--app-accent-500) 12%, transparent);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 4%);
  content: '';
}

[data-notes-hero] > header > :first-child::after {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  width: 1.5rem;
  height: 1.5rem;
  background: var(--app-accent-500);
  content: '';
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M13.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.5L13.5 2Z'/%3E%3Cpath d='M13 2v7h7'/%3E%3C/svg%3E") center / contain no-repeat;
}

[data-notes-hero] > header + div {
  margin-top: 1rem;
}

[data-notes-hero-stats] {
  margin-top: 1rem;
}

@media (max-width: 820px) {
  [data-notes-hero] > header {
    flex-direction: column;
  }
}

@media (max-width: 720px) {
  [data-notes-hero] {
    padding: 1rem;
  }
}
`
)

const assetTestPath = 'src/renderer/src/assets/notes-home-header.test.ts'
let assetTest = readFileSync(assetTestPath, 'utf8')
assetTest = assetTest.replaceAll('[data-notes-home-container] > header', '[data-notes-hero]')
assetTest = assetTest.replace(
  "expect(styles).toContain('background-image: url')",
  "expect(styles).toContain('mask: url')\n    expect(styles).toContain('background: var(--app-accent-500)')\n    expect(styles).not.toContain('%23a78bfa')"
)
writeFileSync(assetTestPath, assetTest)

const pageTestPath = 'src/renderer/src/modules/notes/NotesPage.test.tsx'
let pageTest = readFileSync(pageTestPath, 'utf8')
const anchor =
  "    expect(document.querySelector('[data-notes-home-container]')).toHaveClass('max-w-[1240px]')\n"
const addition = `${anchor}
    const hero = document.querySelector('[data-notes-hero]')
    expect(hero).not.toBeNull()
    expect(hero).toContainElement(screen.getByRole('tab', { name: 'Все' }))
    expect(hero).toContainElement(screen.getByText('Всего заметок').closest('button'))
`

if (!pageTest.includes(anchor)) {
  throw new Error('Unable to locate Notes home width assertion')
}

pageTest = pageTest.replace(anchor, addition)
writeFileSync(pageTestPath, pageTest)
