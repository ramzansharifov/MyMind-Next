import fs from 'node:fs'

const path = 'scripts/pr53-note-group-icons.mjs'
let source = fs.readFileSync(path, 'utf8')

const oldTestTitle = 'opens a group as a dedicated notes page'
const currentTestTitle = 'opens a group as a block-only page with an internal back action and create card'
const titleOccurrences = source.split(oldTestTitle).length - 1

if (titleOccurrences !== 2) {
  throw new Error(`Expected two test-anchor occurrences, found ${titleOccurrences}`)
}

source = source.replaceAll(oldTestTitle, currentTestTitle)

const testSectionStart = `  const path = 'src/renderer/src/modules/notes/NotesPage.test.tsx'
  let source = read(path)

  source = replaceOnce(`
const testSectionWithProvider = `  const path = 'src/renderer/src/modules/notes/NotesPage.test.tsx'
  let source = read(path)

  source = replaceOnce(
    source,
    "import type { NoteGroup, NotesOverview } from '../../../../shared/contracts/notes'\\n",
    "import type { NoteGroup, NotesOverview } from '../../../../shared/contracts/notes'\\nimport { TooltipProvider } from '../../shared/ui/tooltip'\\n",
    'NotesPage tooltip provider import'
  )
  source = replaceOnce(`

if (!source.includes(testSectionStart)) {
  throw new Error('NotesPage test integration section was not found')
}

source = source.replace(testSectionStart, testSectionWithProvider)

const iconTestRender = `  it('updates a group icon through the shared folder icon picker', async () => {
    const user = userEvent.setup()
    render(<NotesPage />)`
const iconTestRenderWithProvider = `  it('updates a group icon through the shared folder icon picker', async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <NotesPage />
      </TooltipProvider>
    )`

if (!source.includes(iconTestRender)) {
  throw new Error('Icon picker test render was not found')
}

source = source.replace(iconTestRender, iconTestRenderWithProvider)
fs.writeFileSync(path, source)
