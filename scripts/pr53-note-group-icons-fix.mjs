import fs from 'node:fs'

const path = 'scripts/pr53-note-group-icons.mjs'
const source = fs.readFileSync(path, 'utf8')
const before = 'opens a group as a dedicated notes page'
const after = 'opens a group as a block-only page with an internal back action and create card'
const occurrences = source.split(before).length - 1

if (occurrences !== 2) {
  throw new Error(`Expected two test-anchor occurrences, found ${occurrences}`)
}

fs.writeFileSync(path, source.replaceAll(before, after))
