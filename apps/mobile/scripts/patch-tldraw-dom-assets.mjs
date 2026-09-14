import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const requireFromHere = createRequire(import.meta.url)

export const TLDRAW_DOM_ASSET_PATCH_MARKER = '/* MyMind Expo DOM inline tldraw assets */'

const ASSET_IMPORT_PATTERN =
  /^import\s+([A-Za-z0-9_$]+)\s+from\s+['"]\.\/([^'"]+\.(?:json|svg|png|woff2))['"]\s*$/gm

function mimeTypeFor(relativePath) {
  if (relativePath.endsWith('.json')) return 'application/json;charset=utf-8'
  if (relativePath.endsWith('.svg')) return 'image/svg+xml;charset=utf-8'
  if (relativePath.endsWith('.png')) return 'image/png'
  if (relativePath.endsWith('.woff2')) return 'font/woff2'
  throw new Error(`Unsupported tldraw DOM asset: ${relativePath}`)
}

function encodeAsset(relativePath, buffer) {
  const mimeType = mimeTypeFor(relativePath)

  if (relativePath.endsWith('.json') || relativePath.endsWith('.svg')) {
    return `data:${mimeType},${encodeURIComponent(buffer.toString('utf8'))}`
  }

  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

function assertPatchedSource(source) {
  if (!source.includes(TLDRAW_DOM_ASSET_PATCH_MARKER)) {
    throw new Error('Missing MyMind tldraw DOM asset patch marker')
  }
  if (ASSET_IMPORT_PATTERN.test(source)) {
    ASSET_IMPORT_PATTERN.lastIndex = 0
    throw new Error('Some tldraw DOM asset imports were not inlined')
  }
  ASSET_IMPORT_PATTERN.lastIndex = 0

  for (const required of [
    'data:image/svg+xml;charset=utf-8,',
    'data:application/json;charset=utf-8,',
    'data:font/woff2;base64,',
    'data:image/png;base64,'
  ]) {
    if (!source.includes(required)) {
      throw new Error(`Incomplete tldraw DOM asset patch: missing ${required}`)
    }
  }
}

export async function inlineTldrawDomAssets(source, packageDirectory) {
  if (source.includes(TLDRAW_DOM_ASSET_PATCH_MARKER)) {
    assertPatchedSource(source)
    return { source, changed: false, inlined: 0 }
  }

  const matches = [...source.matchAll(ASSET_IMPORT_PATTERN)]
  ASSET_IMPORT_PATTERN.lastIndex = 0
  if (matches.length < 20) {
    throw new Error(
      `Unsupported @tldraw/assets imports.js layout: only ${matches.length} asset imports found`
    )
  }

  let next = source
  let inlined = 0

  for (const match of matches) {
    const [statement, identifier, relativePath] = match
    if (!identifier || !relativePath) continue

    const absolutePath = path.join(packageDirectory, relativePath)
    const buffer = await readFile(absolutePath)
    const dataUrl = encodeAsset(relativePath, buffer)
    next = next.replace(statement, `const ${identifier} = ${JSON.stringify(dataUrl)}`)
    inlined += 1
  }

  next = `${TLDRAW_DOM_ASSET_PATCH_MARKER}\n${next}`
  assertPatchedSource(next)
  return { source: next, changed: true, inlined }
}

export async function patchInstalledTldrawAssets() {
  const packageJsonPath = requireFromHere.resolve('@tldraw/assets/package.json')
  const packageDirectory = path.dirname(packageJsonPath)
  const importsPath = path.join(packageDirectory, 'imports.js')
  const source = await readFile(importsPath, 'utf8')
  const patched = await inlineTldrawDomAssets(source, packageDirectory)

  if (patched.changed) {
    await writeFile(importsPath, patched.source, 'utf8')
    console.log(
      `[MyMind] Inlined ${patched.inlined} tldraw assets for Expo DOM Android compatibility.`
    )
  }

  return importsPath
}

const invokedAsScript =
  process.argv[1] != null && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href

if (invokedAsScript) await patchInstalledTldrawAssets()
