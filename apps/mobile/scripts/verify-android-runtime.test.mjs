import assert from 'node:assert/strict'
import test from 'node:test'

function decodeXml(value) {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

function findNodeCenter(xml, label) {
  const nodePattern = /<node\b[^>]*\/>/g
  const attributePattern = /([\w-]+)="([^"]*)"/g

  for (const match of xml.matchAll(nodePattern)) {
    const attributes = Object.create(null)
    for (const attribute of match[0].matchAll(attributePattern)) {
      attributes[attribute[1]] = decodeXml(attribute[2])
    }

    if (attributes.text !== label && attributes['content-desc'] !== label) continue
    const bounds = /^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/.exec(attributes.bounds || '')
    if (!bounds) continue

    const [, left, top, right, bottom] = bounds.map(Number)
    if (right <= left || bottom <= top) continue
    return {
      x: Math.round((left + right) / 2),
      y: Math.round((top + bottom) / 2)
    }
  }

  return null
}

test('findNodeCenter resolves an accessibility label and bounds', () => {
  const xml = '<node text="" content-desc="Заметки" bounds="[10,20][110,80]" />'
  assert.deepEqual(findNodeCenter(xml, 'Заметки'), { x: 60, y: 50 })
})

test('findNodeCenter ignores malformed or zero-sized bounds', () => {
  assert.equal(findNodeCenter('<node text="Заметки" bounds="[1,1][1,1]" />', 'Заметки'), null)
  assert.equal(findNodeCenter('<node text="Заметки" bounds="broken" />', 'Заметки'), null)
})
