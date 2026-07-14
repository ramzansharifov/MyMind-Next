import type { StudyBlock, StudyBlockType } from '../../../../../shared/contracts/study'

type StudyBlockFor<Type extends StudyBlockType> = Extract<StudyBlock, { type: Type }>

export type StudyBlockRenderStrategy = StudyBlockType
export type StudyBlockSettingsStrategy = StudyBlockType

export interface StudyBlockDefinition<Type extends StudyBlockType> {
  type: Type
  label: string
  icon: Type
  factory: (id: string) => StudyBlockFor<Type>
  editStrategy: StudyBlockRenderStrategy
  readStrategy: StudyBlockRenderStrategy
  settingsStrategy: StudyBlockSettingsStrategy
  hasSettings: boolean
  isHeavy: boolean
}

type StudyBlockRegistry = {
  [Type in StudyBlockType]: StudyBlockDefinition<Type>
}

export const studyBlockRegistry = {
  text: {
    type: 'text',
    label: 'Форматированный текст',
    icon: 'text',
    factory: (id) => ({ id, type: 'text', text: '', html: '<p></p>' }),
    editStrategy: 'text',
    readStrategy: 'text',
    settingsStrategy: 'text',
    hasSettings: true,
    isHeavy: true
  },
  heading: {
    type: 'heading',
    label: 'Заголовок',
    icon: 'heading',
    factory: (id) => ({ id, type: 'heading', text: '', level: 1 }),
    editStrategy: 'heading',
    readStrategy: 'heading',
    settingsStrategy: 'heading',
    hasSettings: true,
    isHeavy: false
  },
  code: {
    type: 'code',
    label: 'Код',
    icon: 'code',
    factory: (id) => ({ id, type: 'code', source: '', language: 'text' }),
    editStrategy: 'code',
    readStrategy: 'code',
    settingsStrategy: 'code',
    hasSettings: true,
    isHeavy: true
  },
  markdown: {
    type: 'markdown',
    label: 'Markdown',
    icon: 'markdown',
    factory: (id) => ({ id, type: 'markdown', source: '', viewMode: 'write' }),
    editStrategy: 'markdown',
    readStrategy: 'markdown',
    settingsStrategy: 'markdown',
    hasSettings: true,
    isHeavy: true
  },
  latex: {
    type: 'latex',
    label: 'LaTeX',
    icon: 'latex',
    factory: (id) => ({
      id,
      type: 'latex',
      source: '',
      viewMode: 'write',
      displayMode: 'display',
      alignment: 'center',
      scale: 100
    }),
    editStrategy: 'latex',
    readStrategy: 'latex',
    settingsStrategy: 'latex',
    hasSettings: true,
    isHeavy: true
  },
  mermaid: {
    type: 'mermaid',
    label: 'Mermaid',
    icon: 'mermaid',
    factory: (id) => ({
      id,
      type: 'mermaid',
      source: '',
      viewMode: 'write',
      theme: 'dark',
      scale: 100
    }),
    editStrategy: 'mermaid',
    readStrategy: 'mermaid',
    settingsStrategy: 'mermaid',
    hasSettings: true,
    isHeavy: true
  },
  image: {
    type: 'image',
    label: 'Фото',
    icon: 'image',
    factory: (id) => ({
      id,
      type: 'image',
      source: { type: 'local' },
      imageFit: 'contain',
      imageHeight: 360
    }),
    editStrategy: 'image',
    readStrategy: 'image',
    settingsStrategy: 'image',
    hasSettings: true,
    isHeavy: false
  },
  video: {
    type: 'video',
    label: 'Видео',
    icon: 'video',
    factory: (id) => ({ id, type: 'video', source: { type: 'local' } }),
    editStrategy: 'video',
    readStrategy: 'video',
    settingsStrategy: 'video',
    hasSettings: true,
    isHeavy: false
  },
  audio: {
    type: 'audio',
    label: 'Аудио',
    icon: 'audio',
    factory: (id) => ({ id, type: 'audio', source: { type: 'local' } }),
    editStrategy: 'audio',
    readStrategy: 'audio',
    settingsStrategy: 'audio',
    hasSettings: true,
    isHeavy: false
  },
  file: {
    type: 'file',
    label: 'Файл',
    icon: 'file',
    factory: (id) => ({ id, type: 'file', source: { type: 'local' } }),
    editStrategy: 'file',
    readStrategy: 'file',
    settingsStrategy: 'file',
    hasSettings: true,
    isHeavy: false
  },
  divider: {
    type: 'divider',
    label: 'Разделитель',
    icon: 'divider',
    factory: (id) => ({
      id,
      type: 'divider',
      variant: 'solid',
      thickness: 1,
      color: '#6d5dfc'
    }),
    editStrategy: 'divider',
    readStrategy: 'divider',
    settingsStrategy: 'divider',
    hasSettings: true,
    isHeavy: false
  }
} satisfies StudyBlockRegistry

export const studyBlockDefinitions = Object.values(studyBlockRegistry)

export function getStudyBlockDefinition(
  type: StudyBlockType
): (typeof studyBlockRegistry)[StudyBlockType] {
  return studyBlockRegistry[type]
}
