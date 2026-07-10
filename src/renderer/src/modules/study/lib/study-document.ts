import type {
  StudyBlock,
  StudyBlockType,
  StudyDocument
} from '../../../../../shared/contracts/study'

export function createStudyBlock(type: StudyBlockType): StudyBlock {
  const id = crypto.randomUUID()

  if (type === 'heading') {
    return {
      id,
      type,
      text: '',
      level: 1
    }
  }

  if (type === 'code') {
    return {
      id,
      type,
      source: '',
      language: 'text'
    }
  }

  if (type === 'divider') {
    return {
      id,
      type
    }
  }

  if (type === 'link') {
    return {
      id,
      type,
      title: '',
      url: ''
    }
  }

  return {
    id,
    type: 'text',
    text: ''
  }
}

export function createEmptyStudyDocument(): StudyDocument {
  return {
    version: 1,
    blocks: [createStudyBlock('text')]
  }
}

export function replaceStudyBlock(
  document: StudyDocument,
  blockId: string,
  replacement: StudyBlock
): StudyDocument {
  return {
    ...document,
    blocks: document.blocks.map((block) => (block.id === blockId ? replacement : block))
  }
}

export function moveStudyBlock(
  document: StudyDocument,
  blockId: string,
  direction: -1 | 1
): StudyDocument {
  const currentIndex = document.blocks.findIndex((block) => block.id === blockId)
  const nextIndex = currentIndex + direction

  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= document.blocks.length) {
    return document
  }

  const blocks = [...document.blocks]
  const [block] = blocks.splice(currentIndex, 1)

  blocks.splice(nextIndex, 0, block)

  return {
    ...document,
    blocks
  }
}

export function removeStudyBlock(document: StudyDocument, blockId: string): StudyDocument {
  const blocks = document.blocks.filter((block) => block.id !== blockId)

  return {
    ...document,
    blocks: blocks.length > 0 ? blocks : [createStudyBlock('text')]
  }
}
