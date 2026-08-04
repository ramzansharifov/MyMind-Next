import fs from 'node:fs'

const notesHomePath = 'src/renderer/src/modules/notes/components/NotesHome.tsx'
const notesStylesPath = 'src/renderer/src/assets/notes-home-header.css'
const notesStyleTestPath = 'src/renderer/src/assets/notes-home-header.test.ts'
const notesPageTestPath = 'src/renderer/src/modules/notes/NotesPage.test.tsx'

function replaceOnce(source, before, after, label) {
  const occurrences = source.split(before).length - 1
  if (occurrences !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${occurrences}`)
  }
  return source.replace(before, after)
}

let notesHome = fs.readFileSync(notesHomePath, 'utf8')
notesHome = replaceOnce(
  notesHome,
  "layout === 'grid' ? 'grid grid-cols-2 gap-3 max-[760px]:grid-cols-1' : 'flex flex-col gap-2'",
  "layout === 'grid'\n          ? 'grid grid-cols-3 gap-3 max-[960px]:grid-cols-2 max-[620px]:grid-cols-1'\n          : 'flex flex-col gap-2'",
  'NotesGrid responsive columns'
)
fs.writeFileSync(notesHomePath, notesHome)

let styles = fs.readFileSync(notesStylesPath, 'utf8')
styles = replaceOnce(
  styles,
  `[data-notes-create-card] {
  border: 2px dashed color-mix(in srgb, var(--app-accent-500) 62%, transparent) !important;
  background: transparent !important;
  box-shadow: 0 0 0 color-mix(in srgb, var(--app-accent-500) 0%, transparent);
  animation: notes-create-card-pulse 2.4s ease-in-out infinite;
}

[data-notes-create-card] > span:first-child {
  border-color: color-mix(in srgb, var(--app-accent-500) 34%, transparent) !important;
  background: transparent !important;
}

[data-notes-create-card]:hover,
[data-notes-create-card]:focus-visible {
  border-color: var(--app-accent-500) !important;
  background: transparent !important;
  box-shadow: 0 0 24px color-mix(in srgb, var(--app-accent-500) 22%, transparent) !important;
  animation-play-state: paused;
}

@keyframes notes-create-card-pulse {
  0%,
  100% {
    border-color: color-mix(in srgb, var(--app-accent-500) 42%, transparent);
    box-shadow: 0 0 0 color-mix(in srgb, var(--app-accent-500) 0%, transparent);
  }

  50% {
    border-color: color-mix(in srgb, var(--app-accent-500) 88%, transparent);
    box-shadow: 0 0 18px color-mix(in srgb, var(--app-accent-500) 18%, transparent);
  }
}
`,
  `[data-notes-create-card] {
  border: 3px dashed color-mix(in srgb, var(--app-accent-500) 78%, transparent) !important;
  background: transparent !important;
  box-shadow:
    0 0 12px color-mix(in srgb, var(--app-accent-500) 24%, transparent),
    inset 0 0 10px color-mix(in srgb, var(--app-accent-500) 8%, transparent);
  animation: notes-create-card-pulse 1.8s ease-in-out infinite;
}

[data-notes-create-card] > span:first-child {
  border-color: color-mix(in srgb, var(--app-accent-500) 42%, transparent) !important;
  background: transparent !important;
}

[data-notes-create-card]:hover,
[data-notes-create-card]:focus-visible {
  border-color: var(--app-accent-500) !important;
  background: transparent !important;
  box-shadow:
    0 0 28px color-mix(in srgb, var(--app-accent-500) 38%, transparent),
    inset 0 0 14px color-mix(in srgb, var(--app-accent-500) 12%, transparent) !important;
  animation-play-state: paused;
}

@keyframes notes-create-card-pulse {
  0%,
  100% {
    border-color: color-mix(in srgb, var(--app-accent-500) 48%, transparent);
    box-shadow:
      0 0 8px color-mix(in srgb, var(--app-accent-500) 16%, transparent),
      inset 0 0 8px color-mix(in srgb, var(--app-accent-500) 5%, transparent);
  }

  50% {
    border-color: var(--app-accent-500);
    box-shadow:
      0 0 24px color-mix(in srgb, var(--app-accent-500) 38%, transparent),
      inset 0 0 14px color-mix(in srgb, var(--app-accent-500) 12%, transparent);
  }
}
`,
  'create card glow styles'
)
fs.writeFileSync(notesStylesPath, styles)

let styleTest = fs.readFileSync(notesStyleTestPath, 'utf8')
styleTest = replaceOnce(
  styleTest,
  "expect(styles).toContain('border: 2px dashed')",
  "expect(styles).toContain('border: 3px dashed')",
  '3px border test'
)
styleTest = replaceOnce(
  styleTest,
  "expect(styles).toContain('0 0 18px')",
  "expect(styles).toContain('0 0 24px')",
  'glow strength test'
)
fs.writeFileSync(notesStyleTestPath, styleTest)

let pageTest = fs.readFileSync(notesPageTestPath, 'utf8')
pageTest = replaceOnce(
  pageTest,
  "expect(recentGrid?.className).toBe(allGrid?.className)",
  "expect(recentGrid?.className).toBe(allGrid?.className)\n    expect(recentGrid).toHaveClass('grid-cols-3')",
  'three-column UI test'
)
fs.writeFileSync(notesPageTestPath, pageTest)
