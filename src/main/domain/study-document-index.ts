import {
  STUDY_DOCUMENT_LIMITS,
  type StudyBlock,
  type StudyBlockType,
  type StudyDocument
} from '../../shared/contracts/study'

type PlainTextExtractor = (block: StudyBlock) => string

function getAttachmentText(block: StudyBlock): string {
  if (
    block.type !== 'image' &&
    block.type !== 'video' &&
    block.type !== 'audio' &&
    block.type !== 'file'
  ) {
    return ''
  }

  const sourceName = block.source.type === 'local' ? block.source.asset?.name : block.source.url
  return [block.title, sourceName].filter((value): value is string => Boolean(value)).join('\n')
}

export const studyBlockPlainTextExtractors = {
  text: (block) => (block.type === 'text' ? block.text : ''),
  heading: (block) => (block.type === 'heading' ? block.text : ''),
  code: (block) => (block.type === 'code' ? block.source : ''),
  markdown: (block) => (block.type === 'markdown' ? block.source : ''),
  latex: (block) => (block.type === 'latex' ? block.source : ''),
  mermaid: (block) => (block.type === 'mermaid' ? block.source : ''),
  image: getAttachmentText,
  video: getAttachmentText,
  audio: getAttachmentText,
  file: getAttachmentText,
  divider: () => ''
} satisfies Record<StudyBlockType, PlainTextExtractor>

export function truncateStudyPlainText(
  value: string,
  limit: number = STUDY_DOCUMENT_LIMITS.maxPlainTextLength
): string {
  if (value.length <= limit) return value

  return Array.from(value).slice(0, limit).join('')
}

export function documentToPlainText(document: StudyDocument): string {
  const plainText = document.blocks
    .map((block) => studyBlockPlainTextExtractors[block.type](block))
    .filter(Boolean)
    .join('\n\n')
    .trim()

  return truncateStudyPlainText(plainText)
}
