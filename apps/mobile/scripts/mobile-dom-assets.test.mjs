import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const boardPath = path.join(mobileRoot, 'src', 'modules', 'boards', 'BoardCanvasDom.tsx')
const sourcePath = path.join(mobileRoot, 'src', 'shared', 'ui', 'StudySourceBlockDom.tsx')

const [board, source] = await Promise.all([
  readFile(boardPath, 'utf8'),
  readFile(sourcePath, 'utf8')
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
