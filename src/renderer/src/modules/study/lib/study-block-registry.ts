import {
  Code2,
  FileAudio,
  FileCode2,
  FileImage,
  Files,
  FileVideo,
  Heading,
  Minus,
  Sigma,
  Type,
  Workflow,
  type LucideIcon
} from 'lucide-react'

import type { StudyBlock, StudyBlockType } from '../../../../../shared/contracts/study'

type StudyBlockFor<Type extends StudyBlockType> = Extract<StudyBlock, { type: Type }>

export type StudyBlockRenderStrategy = StudyBlockType
export type StudyBlockSettingsStrategy = StudyBlockType

export interface StudyBlockDefinition<Type extends StudyBlockType> {
  type: Type
  label: string
  icon: LucideIcon
  factory: (id: string) => StudyBlockFor<Type>
  editStrategy: Type
  readStrategy: Type
  settingsStrategy: Type
}

type StudyBlockRegistry = {
  [Type in StudyBlockType]: StudyBlockDefinition<Type>
}

export const studyBlockRegistry = {
  text: {
    type: 'text',
    label: 'Форматированный текст',
    icon: Type,
    factory: (id) => ({ id, type: 'text', text: '', html: '<p></p>' }),
    editStrategy: 'text',
    readStrategy: 'text',
    settingsStrategy: 'text'
  },
  heading: {
    type: 'heading',
    label: 'Заголовок',
    icon: Heading,
    factory: (id) => ({ id, type: 'heading', text: '', level: 1 }),
    editStrategy: 'heading',
    readStrategy: 'heading',
    settingsStrategy: 'heading'
  },
  code: {
    type: 'code',
    label: 'Код',
    icon: Code2,
    factory: (id) => ({ id, type: 'code', source: '', language: 'text' }),
    editStrategy: 'code',
    readStrategy: 'code',
    settingsStrategy: 'code'
  },
  markdown: {
    type: 'markdown',
    label: 'Markdown',
    icon: FileCode2,
    factory: (id) => ({ id, type: 'markdown', source: '', viewMode: 'write' }),
    editStrategy: 'markdown',
    readStrategy: 'markdown',
    settingsStrategy: 'markdown'
  },
  latex: {
    type: 'latex',
    label: 'LaTeX',
    icon: Sigma,
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
    settingsStrategy: 'latex'
  },
  mermaid: {
    type: 'mermaid',
    label: 'Mermaid',
    icon: Workflow,
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
    settingsStrategy: 'mermaid'
  },
  image: {
    type: 'image',
    label: 'Фото',
    icon: FileImage,
    factory: (id) => ({
      id,
      type: 'image',
      source: { type: 'local' },
      imageFit: 'contain',
      imageHeight: 360
    }),
    editStrategy: 'image',
    readStrategy: 'image',
    settingsStrategy: 'image'
  },
  video: {
    type: 'video',
    label: 'Видео',
    icon: FileVideo,
    factory: (id) => ({ id, type: 'video', source: { type: 'local' } }),
    editStrategy: 'video',
    readStrategy: 'video',
    settingsStrategy: 'video'
  },
  audio: {
    type: 'audio',
    label: 'Аудио',
    icon: FileAudio,
    factory: (id) => ({ id, type: 'audio', source: { type: 'local' } }),
    editStrategy: 'audio',
    readStrategy: 'audio',
    settingsStrategy: 'audio'
  },
  file: {
    type: 'file',
    label: 'Файл',
    icon: Files,
    factory: (id) => ({ id, type: 'file', source: { type: 'local' } }),
    editStrategy: 'file',
    readStrategy: 'file',
    settingsStrategy: 'file'
  },
  divider: {
    type: 'divider',
    label: 'Разделитель',
    icon: Minus,
    factory: (id) => ({
      id,
      type: 'divider',
      variant: 'solid',
      thickness: 1,
      color: '#6d5dfc'
    }),
    editStrategy: 'divider',
    readStrategy: 'divider',
    settingsStrategy: 'divider'
  }
} satisfies StudyBlockRegistry

export const studyBlockDefinitions = Object.values(studyBlockRegistry)

export function getStudyBlockDefinition<Type extends StudyBlockType>(
  type: Type
): (typeof studyBlockRegistry)[Type] {
  return studyBlockRegistry[type]
}
