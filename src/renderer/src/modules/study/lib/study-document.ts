import type {
  StudyBlock,
  StudyBlockType,
  StudyDocument,
  StudyTextBlock
} from '../../../../../shared/contracts/study'

export const DEFAULT_DIVIDER_THICKNESS = 1
export const DEFAULT_DIVIDER_COLOR = '#6d5dfc'
export const DEFAULT_HEADING_COLOR = '#f2f3f5'
export const DEFAULT_HEADING_BACKGROUND_COLOR = '#181a20'

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
  if (type === 'markdown') {
    return {
      id,
      type,
      source: '',
      viewMode: 'split'
    }
  }
  if (type === 'latex') {
    return {
      id,
      type,
      source: '',
      viewMode: 'split',
      displayMode: 'display',
      alignment: 'center',
      scale: 100
    }
  }
  if (type === 'mermaid') {
    return {
      id,
      type,
      source: '',
      viewMode: 'split',
      theme: 'dark',
      scale: 100
    }
  }
  if (type === 'file') {
    return {
      id,
      type,
      kind: 'image',
      source: {
        type: 'local'
      },
      imageFit: 'contain',
      imageHeight: 360
    }
  }

  if (type === 'divider') {
    return {
      id,
      type,
      thickness: DEFAULT_DIVIDER_THICKNESS,
      color: DEFAULT_DIVIDER_COLOR
    }
  }

  return {
    id,
    type: 'text',
    text: '',
    html: '<p></p>'
  }
}

export function insertStudyBlock(
  document: StudyDocument,
  index: number,
  block: StudyBlock
): StudyDocument {
  const nextIndex = Math.max(0, Math.min(index, document.blocks.length))

  const blocks = [...document.blocks]

  blocks.splice(nextIndex, 0, block)

  return {
    ...document,
    blocks
  }
}

export function cloneStudyBlock(block: StudyBlock): StudyBlock {
  return {
    ...block,
    id: crypto.randomUUID()
  }
}

export function createEmptyStudyDocument(): StudyDocument {
  return {
    version: 1,
    blocks: [createStudyBlock('text')]
  }
}

export function getStudyTextBlockHtml(block: StudyTextBlock): string {
  const html = block.html?.trim()

  if (html) {
    return html
  }

  return plainTextToHtml(block.text)
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

function plainTextToHtml(value: string): string {
  const paragraphs = value
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) {
    return '<p></p>'
  }

  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
