import type { StudyFolderIconName } from '../../../../../shared/contracts/study'

export interface StudyFolderIconOption {
  value: StudyFolderIconName
  label: string
}

export const STUDY_FOLDER_ICON_OPTIONS: StudyFolderIconOption[] = [
  {
    value: 'folder',
    label: 'Папка'
  },
  {
    value: 'book',
    label: 'Книга'
  },
  {
    value: 'graduation',
    label: 'Учёба'
  },
  {
    value: 'science',
    label: 'Наука'
  },
  {
    value: 'calculator',
    label: 'Математика'
  },
  {
    value: 'code',
    label: 'Программирование'
  },
  {
    value: 'languages',
    label: 'Языки'
  },
  {
    value: 'history',
    label: 'История'
  },
  {
    value: 'microscope',
    label: 'Исследование'
  },
  {
    value: 'art',
    label: 'Искусство'
  },
  {
    value: 'music',
    label: 'Музыка'
  },
  {
    value: 'work',
    label: 'Работа'
  }
]
