import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

const runtimeRoots = [join('out', 'main'), join('out', 'preload')]
const workspaceImportPattern =
  /(?:from\s*|require\(|import\()\s*['"]@mymind\/(?:contracts|core|persistence)(?:\/[^'"]*)?['"]/g

async function collectJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await collectJavaScriptFiles(path)))
    else if (entry.isFile() && ['.js', '.mjs', '.cjs'].includes(extname(entry.name)))
      files.push(path)
  }

  return files
}

const violations = []

for (const runtimeRoot of runtimeRoots) {
  for (const file of await collectJavaScriptFiles(runtimeRoot)) {
    const source = await readFile(file, 'utf8')
    const matches = source.match(workspaceImportPattern)
    if (matches?.length) {
      violations.push({
        file: relative(process.cwd(), file),
        matches: [...new Set(matches)]
      })
    }
  }
}

if (violations.length) {
  console.error('Electron runtime bundle still contains external MyMind workspace imports:')
  for (const violation of violations) {
    console.error(`- ${violation.file}`)
    for (const match of violation.matches) console.error(`  ${match}`)
  }
  process.exit(1)
}

console.log('Electron runtime bundle contains no external MyMind workspace imports.')
