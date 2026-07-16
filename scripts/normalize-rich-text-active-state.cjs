const fs = require('node:fs')

function replaceOnce(source, from, to, label) {
  const index = source.indexOf(from)

  if (index < 0) {
    throw new Error(`Missing patch anchor: ${label}`)
  }

  if (source.indexOf(from, index + from.length) >= 0) {
    throw new Error(`Ambiguous patch anchor: ${label}`)
  }

  return source.slice(0, index) + to + source.slice(index + from.length)
}

const settingsPath =
  'src/renderer/src/modules/study/components/rich-text/RichTextSettings.tsx'
let settings = fs.readFileSync(settingsPath, 'utf8')

settings = replaceOnce(
  settings,
  `          data-active={active ? 'true' : undefined}\n`,
  `          data-active={String(active)}\n`,
  'stable regular link active state'
)

fs.writeFileSync(settingsPath, settings)

const testPath =
  'src/renderer/src/modules/study/components/rich-text/RichTextSettings.test.tsx'
let tests = fs.readFileSync(testPath, 'utf8')

tests = replaceOnce(
  tests,
  `    expect(regularLinkControl).not.toHaveAttribute('data-active')\n`,
  `    expect(regularLinkControl).toHaveAttribute('data-active', 'false')\n`,
  'inactive regular link assertion'
)

fs.writeFileSync(testPath, tests)
