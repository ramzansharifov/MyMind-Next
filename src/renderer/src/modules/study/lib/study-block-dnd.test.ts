import { describe, expect, it } from 'vitest'

import type { StudyBlock, StudyDocument } from '../../../../../shared/contracts/study'
import { moveStudyBlockByDrop } from './study-block-dnd'

describe('moveStudyBlockByDrop', () => {
  it('moves a block after another block', () => {
    const document = createDocument([
      createBlock('first'),
      createBlock('second'),
      createBlock('third')
    ])

    const result = moveStudyBlockByDrop(document, 'first', 'third', 'after')

    expect(result.blocks.map((block) => block.id)).toEqual(['second', 'third', 'first'])
  })

  it('moves a block before another block', () => {
    const document = createDocument([
      createBlock('first'),
      createBlock('second'),
      createBlock('third')
    ])

    const result = moveStudyBlockByDrop(document, 'third', 'first', 'before')

    expect(result.blocks.map((block) => block.id)).toEqual(['third', 'first', 'second'])
  })

  it('keeps the document when the position does not change', () => {
    const document = createDocument([createBlock('first'), createBlock('second')])

    expect(moveStudyBlockByDrop(document, 'first', 'second', 'before')).toBe(document)
  })

  it('ignores unknown blocks', () => {
    const document = createDocument([createBlock('first')])

    expect(moveStudyBlockByDrop(document, 'missing', 'first', 'before')).toBe(document)
  })
})

function createDocument(blocks: StudyBlock[]): StudyDocument {
  return {
    version: 1,
    blocks
  }
}

function createBlock(id: string): StudyBlock {
  return {
    id,
    type: 'heading',
    text: id,
    level: 1
  }
}
