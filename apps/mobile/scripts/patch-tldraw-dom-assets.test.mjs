import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import {
  inlineTldrawDomAssets,
  TLDRAW_DOM_ASSET_PATCH_MARKER
} from './patch-tldraw-dom-assets.mjs'

const requireFromHere = createRequire(import.meta.url)
const packageJsonPath = requireFromHere.resolve('@tldraw/assets/package.json')
const packageDirectory = path.dirname(packageJsonPath)
const importsPath = path.join(packageDirectory, 'imports.js')
const source = await readFile(importsPath, 'utf8')

assert.equal(source.includes(TLDRAW_DOM_ASSET_PATCH_MARKER), true)
assert.doesNotMatch(
  source,
  /^import\s+[A-Za-z0-9_$]+\s+from\s+['"]\.\/[^'"]+\.(?:json|svg|png|woff2)['"]\s*$/m
)
assert.match(source, /data:image\/svg\+xml;charset=utf-8,/)
assert.match(source, /data:application\/json;charset=utf-8,/)
assert.match(source, /data:font\/woff2;base64,/)
assert.match(source, /data:image\/png;base64,/)

const secondPass = await inlineTldrawDomAssets(source, packageDirectory)
assert.equal(secondPass.changed, false)
assert.equal(secondPass.source, source)

console.log('tldraw Expo DOM asset inlining regression passed')
