import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const boardPath = path.join(mobileRoot, 'src', 'modules', 'boards', 'BoardCanvasDom.tsx')
const sourcePath = path.join(mobileRoot, 'src', 'shared', 'ui', 'StudySourceBlockDom.tsx')
const viewportPath = path.join(mobileRoot, 'src', 'shared', 'ui', 'DomViewportMeta.tsx')
const domAssetPath = path.join(mobileRoot, 'src', 'shared', 'platform', 'domAssetUrl.ts')
const richTextPath = path.join(mobileRoot, 'src', 'shared', 'ui', 'NotesRichTextDom.tsx')
const richContentPath = path.join(mobileRoot, 'src', 'shared', 'ui', 'RichContentDom.tsx')
const youtubePath = path.join(mobileRoot, 'src', 'shared', 'ui', 'StudyYouTubeDom.tsx')
const metroPath = path.join(mobileRoot, 'metro.config.js')

const [board, source, viewport, domAsset, richText, richContent, youtube, metro] = await Promise.all([
  readFile(boardPath, 'utf8'),
  readFile(sourcePath, 'utf8'),
  readFile(viewportPath, 'utf8'),
  readFile(domAssetPath, 'utf8'),
  readFile(richTextPath, 'utf8'),
  readFile(richContentPath, 'utf8'),
  readFile(youtubePath, 'utf8'),
  readFile(metroPath, 'utf8')
])

assert.match(
  board,
  /@tldraw\/assets\/imports/,
  'BoardCanvasDom must bundle tldraw assets through @tldraw/assets/imports'
)
assert.doesNotMatch(
  board,
  /@tldraw\/assets\/urls|getAssetUrlsByMetaUrl/,
  'BoardCanvasDom must not use import.meta/network tldraw asset URLs in Expo DOM'
)
assert.match(
  board,
  /normalizeBundledDomAssetUrl/,
  'BoardCanvasDom must normalize Metro asset modules before handing URLs to tldraw'
)
assert.match(
  domAsset,
  /data:application\/json/,
  'The shared DOM asset normalizer must convert bundled translation JSON modules to fetchable data URLs'
)
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
  ['BoardCanvasDom', board],
  ['NotesRichTextDom', richText],
  ['RichContentDom', richContent],
  ['StudySourceBlockDom', source],
  ['StudyYouTubeDom', youtube]
]) {
  assert.match(contents, /DomViewportMeta/, `${name} must use the shared mobile DOM viewport`)
}
assert.match(
  board,
  /locale=["']ru["']/,
  'BoardCanvasDom should use the Russian tldraw locale used by the rest of MyMind'
)
assert.match(
  metro,
  /['"]woff2['"]/,
  'Metro must treat tldraw .woff2 fonts as bundled assets'
)
assert.match(
  metro,
  /resolver\.assetExts/,
  'Metro font support must be configured through resolver.assetExts'
)

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
