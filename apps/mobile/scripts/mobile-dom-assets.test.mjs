import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const boardPath = path.join(mobileRoot, 'src', 'modules', 'boards', 'BoardCanvasDom.tsx')
const sourcePath = path.join(mobileRoot, 'src', 'shared', 'ui', 'StudySourceBlockDom.tsx')
const metroPath = path.join(mobileRoot, 'metro.config.js')

const [board, source, metro] = await Promise.all([
  readFile(boardPath, 'utf8'),
  readFile(sourcePath, 'utf8'),
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
  /normalizeBundledAssetUrl/,
  'BoardCanvasDom must normalize Metro asset modules before handing URLs to tldraw'
)
assert.match(
  board,
  /data:application\/json/,
  'BoardCanvasDom must convert bundled translation JSON modules to fetchable data URLs'
)
assert.match(
  board,
  /name=["']viewport["']/,
  'BoardCanvasDom must provide the mobile viewport metadata required by tldraw'
)
assert.match(
  board,
  /viewport-fit=cover/,
  'BoardCanvasDom viewport must allow tldraw to position controls against mobile safe areas'
)
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
