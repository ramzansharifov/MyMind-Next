import { readFileSync, writeFileSync } from 'node:fs'

const path = 'scripts/apply-boards-module.mjs'
let content = readFileSync(path, 'utf8')

const original = `function replaceOnce(path, before, after) {
  const content = read(path)

  if (content.includes(after)) {
    return
  }

  const first = content.indexOf(before)
  const last = content.lastIndexOf(before)

  if (first < 0 || first !== last) {
    throw new Error(\`Expected exactly one match in \${path}: \${before.slice(0, 100)}\`)
  }

  write(path, \`\${content.slice(0, first)}\${after}\${content.slice(first + before.length)}\`)
}`

const replacement = `function escapeRegExp(value) {
  return value.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&')
}

function createWhitespacePattern(value) {
  return value
    .trim()
    .split(/\\s+/)
    .map(escapeRegExp)
    .join('\\\\s+')
}

function replaceOnce(path, before, after) {
  const content = read(path)

  if (content.includes(after)) {
    return
  }

  const first = content.indexOf(before)
  const last = content.lastIndexOf(before)

  if (first >= 0 && first === last) {
    write(path, \`\${content.slice(0, first)}\${after}\${content.slice(first + before.length)}\`)
    return
  }

  const pattern = new RegExp(createWhitespacePattern(before), 'g')
  const matches = [...content.matchAll(pattern)]

  if (matches.length !== 1 || matches[0].index === undefined) {
    throw new Error(\`Expected exactly one match in \${path}: \${before.slice(0, 100)}\`)
  }

  const match = matches[0]
  const index = match.index
  write(path, \`\${content.slice(0, index)}\${after}\${content.slice(index + match[0].length)}\`)
}`

if (!content.includes(original)) {
  throw new Error('replaceOnce helper was not found')
}

content = content.replace(original, replacement)
writeFileSync(path, content, 'utf8')
