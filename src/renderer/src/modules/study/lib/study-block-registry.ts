import type { StudyBlockType } from '../../../../../shared/contracts/study'

export interface StudyBlockDefinition {
  type: StudyBlockType
  label: string
  hasSettings: boolean
  isHeavy: boolean
}

export const studyBlockRegistry = {
  text: { type: 'text', label: 'Форматированный текст', hasSettings: true, isHeavy: true },
  heading: { type: 'heading', label: 'Заголовок', hasSettings: true, isHeavy: false },
  code: { type: 'code', label: 'Код', hasSettings: true, isHeavy: true },
  markdown: { type: 'markdown', label: 'Markdown', hasSettings: true, isHeavy: true },
  latex: { type: 'latex', label: 'LaTeX', hasSettings: true, isHeavy: true },
  mermaid: { type: 'mermaid', label: 'Mermaid', hasSettings: true, isHeavy: true },
  image: { type: 'image', label: 'Фото', hasSettings: true, isHeavy: false },
  video: { type: 'video', label: 'Видео', hasSettings: true, isHeavy: false },
  audio: { type: 'audio', label: 'Аудио', hasSettings: true, isHeavy: false },
  file: { type: 'file', label: 'Файл', hasSettings: true, isHeavy: false },
  divider: { type: 'divider', label: 'Разделитель', hasSettings: true, isHeavy: false }
} satisfies Record<StudyBlockType, StudyBlockDefinition>

export const studyBlockDefinitions = Object.values(studyBlockRegistry)

export function getStudyBlockDefinition(type: StudyBlockType): StudyBlockDefinition {
  return studyBlockRegistry[type]
}
