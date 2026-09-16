import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = path.join(mobileRoot, 'src', 'shared', 'ui', 'StudySourceBlockDom.tsx')
const viewportPath = path.join(mobileRoot, 'src', 'shared', 'ui', 'DomViewportMeta.tsx')
const richTextPath = path.join(mobileRoot, 'src', 'shared', 'ui', 'NotesRichTextDom.tsx')
const richContentPath = path.join(mobileRoot, 'src', 'shared', 'ui', 'RichContentDom.tsx')
const youtubePath = path.join(mobileRoot, 'src', 'shared', 'ui', 'StudyYouTubeDom.tsx')

const [source, viewport, richText, richContent, youtube] = await Promise.all([
  readFile(sourcePath, 'utf8'),
  readFile(viewportPath, 'utf8'),
  readFile(richTextPath, 'utf8'),
  readFile(richContentPath, 'utf8'),
  readFile(youtubePath, 'utf8')
])

assert.match(
  viewport,
  /name=["']viewport["']/,
  'Expo DOM surfaces must provide the mobile viewport metadata required by embedded web UI'
)
assert.match(
  viewport,
  /width=device-width, initial-scale=1, viewport-fit=cover/,
  'Expo DOM viewport must use the device width and mobile safe areas'
)

for (const [name, contents] of [
  ['NotesRichTextDom', richText],
  ['RichContentDom', richContent],
  ['StudySourceBlockDom', source],
  ['StudyYouTubeDom', youtube]
]) {
  assert.match(contents, /DomViewportMeta/, `${name} must use the shared mobile DOM viewport`)
}

assert.doesNotMatch(
  source,
  /katex\/dist\/katex\.min\.css/,
  'StudySourceBlockDom must not import KaTeX CSS that references local font files'
)
assert.match(
  source,
  /output:\s*['"]mathml['"]/,
  'StudySourceBlockDom should render KaTeX as MathML without external font assets'
)

console.log('Mobile DOM asset regression passed')
